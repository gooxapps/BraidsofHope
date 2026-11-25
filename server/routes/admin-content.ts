import { Router } from 'express';
import multer from 'multer';
import {
  getClientIp,
  isAdvancedDonationsUnlocked,
  logActivity,
  requireAuth,
  requirePermission,
} from '../auth.ts';
import { asBool, db } from '../db.ts';
import { deleteStoredImageIfSafe, isAllowedImageMime, storeUploadedImage } from '../storage.ts';

export const adminContentRouter = Router();
adminContentRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
});

function parseJsonSafe<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

// 1. OVERVIEW & NOTIFICATIONS
adminContentRouter.get('/overview', requirePermission('overview', 'view'), async (_req, res, next) => {
  try {
    const [
      contactCount,
      volunteerCount,
      partnershipCount,
      activeCampaignsCount,
      upcomingEventsCount,
      subscriberCount,
      unreadNotificationsCount,
      recentContacts,
      recentVolunteers,
      recentPartnerships,
      recentActivity,
    ] = await Promise.all([
      db.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM contact_submissions'),
      db.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM volunteer_applications'),
      db.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM partnership_enquiries'),
      db.queryOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM campaigns WHERE status = 'active'"),
      db.queryOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM events WHERE status = 'upcoming'"),
      db.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM newsletter_subscribers WHERE unsubscribed_at IS NULL'),
      db.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM admin_notifications WHERE is_read = $1', [false]),
      db.query<Record<string, unknown>>(
        "SELECT id, name as title, email, subject as detail, status, created_at, 'contact' as kind FROM contact_submissions ORDER BY created_at DESC LIMIT 5"
      ),
      db.query<Record<string, unknown>>(
        "SELECT id, full_name as title, email, opportunity_title as detail, status, created_at, 'volunteer' as kind FROM volunteer_applications ORDER BY created_at DESC LIMIT 5"
      ),
      db.query<Record<string, unknown>>(
        "SELECT id, organization_name as title, email, partnership_type as detail, status, created_at, 'partnership' as kind FROM partnership_enquiries ORDER BY created_at DESC LIMIT 5"
      ),
      db.query<Record<string, unknown>>(
        'SELECT id, admin_email, action, module, target_id, created_at FROM activity_logs ORDER BY created_at DESC LIMIT 12'
      ),
    ]);

    const donationsUnlocked = isAdvancedDonationsUnlocked();
    let donationStats: {
      total_verified_cents: number;
      verified_count: number;
      pending_verification_count: number;
    } | null = null;

    if (donationsUnlocked) {
      const verifiedRow = await db.queryOne<{ total_cents: number; cnt: number }>(
        "SELECT COALESCE(SUM(amount_cents), 0) as total_cents, COUNT(*) as cnt FROM donations WHERE status = 'successful'"
      );
      const pendingRow = await db.queryOne<{ cnt: number }>(
        "SELECT COUNT(*) as cnt FROM donations WHERE status = 'awaiting_verification'"
      );
      donationStats = {
        total_verified_cents: Number(verifiedRow?.total_cents ?? 0),
        verified_count: Number(verifiedRow?.cnt ?? 0),
        pending_verification_count: Number(pendingRow?.cnt ?? 0),
      };
    }

    const recentSubmissions = [...recentContacts, ...recentVolunteers, ...recentPartnerships]
      .sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime())
      .slice(0, 8);

    res.json({
      stats: {
        total_enquiries: Number(contactCount?.cnt ?? 0),
        volunteer_applications: Number(volunteerCount?.cnt ?? 0),
        partnership_enquiries: Number(partnershipCount?.cnt ?? 0),
        active_campaigns: Number(activeCampaignsCount?.cnt ?? 0),
        upcoming_events: Number(upcomingEventsCount?.cnt ?? 0),
        newsletter_subscribers: Number(subscriberCount?.cnt ?? 0),
        unread_notifications: Number(unreadNotificationsCount?.cnt ?? 0),
      },
      donationsUnlocked,
      donationStats,
      recentSubmissions,
      recentActivity,
    });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.get('/notifications', requirePermission('notifications', 'view'), async (_req, res, next) => {
  try {
    const rows = await db.query<Record<string, unknown>>(
      'SELECT * FROM admin_notifications ORDER BY is_read ASC, created_at DESC LIMIT 60'
    );
    res.json({
      notifications: rows.map((r) => ({ ...r, is_read: asBool(r.is_read) })),
    });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.patch('/notifications/:id/read', requirePermission('notifications', 'edit'), async (req, res, next) => {
  try {
    await db.execute('UPDATE admin_notifications SET is_read = $1 WHERE id = $2', [true, Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.post('/notifications/mark-all-read', requirePermission('notifications', 'edit'), async (_req, res, next) => {
  try {
    await db.execute('UPDATE admin_notifications SET is_read = $1 WHERE is_read = $2', [true, false]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 2. BRANDING & LOGO MANAGEMENT
adminContentRouter.get('/branding', requirePermission('branding', 'view'), async (_req, res, next) => {
  try {
    const branding = await db.queryOne<Record<string, unknown>>('SELECT * FROM branding_settings LIMIT 1');
    res.json({
      branding,
      draft: branding?.draft_json ? parseJsonSafe(String(branding.draft_json), null) : null,
    });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.put('/branding', requirePermission('branding', 'edit'), async (req, res, next) => {
  try {
    const existing = await db.queryOne<{ id: number }>('SELECT id FROM branding_settings LIMIT 1');
    if (!existing) {
      res.status(404).json({ error: 'Branding record not found.' });
      return;
    }

    const { mode, data } = req.body ?? {};
    const payload = data ?? req.body ?? {};
    const allowedFields = [
      'org_name',
      'tagline',
      'brand_description',
      'primary_color',
      'secondary_color',
      'accent_color',
      'background_color',
      'footer_bg_color',
      'footer_text_color',
      'heading_font',
      'body_font',
      'logo_main_url',
      'logo_alt_url',
      'logo_light_url',
      'logo_dark_url',
      'logo_transparent_url',
      'logo_footer_url',
      'favicon_url',
      'decorative_banner_url',
    ];

    const sanitized: Record<string, string> = {};
    for (const key of allowedFields) {
      if (typeof payload[key] === 'string') {
        sanitized[key] = payload[key].trim();
      }
    }

    if (mode === 'draft') {
      await db.execute(
        'UPDATE branding_settings SET draft_json = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [JSON.stringify(sanitized), existing.id]
      );
      await logActivity({
        adminUserId: req.adminUser!.id,
        adminEmail: req.adminUser!.email,
        action: 'branding_draft_saved',
        module: 'branding',
        ipAddress: getClientIp(req),
      });
      res.json({ ok: true, mode: 'draft' });
      return;
    }

    if (req.adminUser!.role_slug !== 'super_admin' && !req.adminUser!.permissions.branding?.can_publish) {
      res.status(403).json({ error: 'You do not have permission to publish branding changes.' });
      return;
    }

    await db.execute(
      `UPDATE branding_settings SET
        org_name = COALESCE($1, org_name),
        tagline = COALESCE($2, tagline),
        brand_description = COALESCE($3, brand_description),
        primary_color = COALESCE($4, primary_color),
        secondary_color = COALESCE($5, secondary_color),
        accent_color = COALESCE($6, accent_color),
        background_color = COALESCE($7, background_color),
        footer_bg_color = COALESCE($8, footer_bg_color),
        footer_text_color = COALESCE($9, footer_text_color),
        heading_font = COALESCE($10, heading_font),
        body_font = COALESCE($11, body_font),
        logo_main_url = COALESCE($12, logo_main_url),
        logo_alt_url = COALESCE($13, logo_alt_url),
        logo_light_url = COALESCE($14, logo_light_url),
        logo_dark_url = COALESCE($15, logo_dark_url),
        logo_transparent_url = COALESCE($16, logo_transparent_url),
        logo_footer_url = COALESCE($17, logo_footer_url),
        favicon_url = COALESCE($18, favicon_url),
        decorative_banner_url = COALESCE($19, decorative_banner_url),
        draft_json = '',
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $20`,
      [
        sanitized.org_name ?? null,
        sanitized.tagline ?? null,
        sanitized.brand_description ?? null,
        sanitized.primary_color ?? null,
        sanitized.secondary_color ?? null,
        sanitized.accent_color ?? null,
        sanitized.background_color ?? null,
        sanitized.footer_bg_color ?? null,
        sanitized.footer_text_color ?? null,
        sanitized.heading_font ?? null,
        sanitized.body_font ?? null,
        sanitized.logo_main_url ?? null,
        sanitized.logo_alt_url ?? null,
        sanitized.logo_light_url ?? null,
        sanitized.logo_dark_url ?? null,
        sanitized.logo_transparent_url ?? null,
        sanitized.logo_footer_url ?? null,
        sanitized.favicon_url ?? null,
        sanitized.decorative_banner_url ?? null,
        existing.id,
      ]
    );

    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: 'branding_published',
      module: 'branding',
      ipAddress: getClientIp(req),
    });

    res.json({ ok: true, mode: 'published' });
  } catch (err) {
    next(err);
  }
});

// 3. MEDIA LIBRARY
adminContentRouter.get('/media', requirePermission('media', 'view'), async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const folder = typeof req.query.folder === 'string' ? req.query.folder.trim() : '';

    const rows = await db.query<Record<string, unknown>>('SELECT * FROM media_files ORDER BY created_at DESC, id DESC');
    const filtered = rows.filter((r) => {
      if (folder && folder !== 'All' && String(r.folder) !== folder) return false;
      if (search) {
        const hay = `${r.original_name} ${r.alt_text} ${r.description} ${r.folder}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    const folders = Array.from(new Set(['General', 'Logos & Branding', 'Homepage Hero', 'About Us', 'Our Work', 'Campaigns', 'Events', 'Team', 'Stories', ...rows.map((r) => String(r.folder || 'General'))]));

    res.json({ media: filtered, folders });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.post(
  '/media/upload',
  requirePermission('media', 'edit'),
  upload.array('files', 10),
  async (req, res, next) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'Please select at least one image file to upload.' });
        return;
      }

      const folder = typeof req.body.folder === 'string' && req.body.folder.trim() ? req.body.folder.trim().slice(0, 80) : 'General';
      const defaultAlt = typeof req.body.alt_text === 'string' ? req.body.alt_text.trim().slice(0, 240) : '';
      const defaultDesc = typeof req.body.description === 'string' ? req.body.description.trim().slice(0, 500) : '';
      const width = Number(req.body.width) || 0;
      const height = Number(req.body.height) || 0;

      const created: Array<Record<string, unknown>> = [];
      for (const file of files) {
        if (!isAllowedImageMime(file.mimetype)) {
          res.status(400).json({ error: `Unsupported file type for ${file.originalname}. Allowed: PNG, JPG, JPEG, WEBP, SVG, ICO.` });
          return;
        }
        const stored = await storeUploadedImage({
          originalname: file.originalname,
          mimetype: file.mimetype,
          buffer: file.buffer,
        });

        const inserted = await db.queryOne<Record<string, unknown>>(
          `INSERT INTO media_files (filename, original_name, url, mime_type, file_size, width, height, folder, alt_text, description, storage_provider, uploaded_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
          [
            stored.filename,
            file.originalname.slice(0, 200),
            stored.url,
            stored.mimeType,
            stored.size,
            width,
            height,
            folder,
            defaultAlt || file.originalname.replace(/\.[^.]+$/, ''),
            defaultDesc,
            stored.storageProvider,
            req.adminUser!.id,
          ]
        );
        if (inserted) created.push(inserted);
      }

      await logActivity({
        adminUserId: req.adminUser!.id,
        adminEmail: req.adminUser!.email,
        action: 'media_uploaded',
        module: 'media',
        details: { count: created.length, folder },
        ipAddress: getClientIp(req),
      });

      res.status(201).json({ uploaded: created });
    } catch (err) {
      next(err);
    }
  }
);

adminContentRouter.patch('/media/:id', requirePermission('media', 'edit'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { original_name, folder, alt_text, description } = req.body ?? {};
    await db.execute(
      `UPDATE media_files SET
        original_name = COALESCE($1, original_name),
        folder = COALESCE($2, folder),
        alt_text = COALESCE($3, alt_text),
        description = COALESCE($4, description)
       WHERE id = $5`,
      [
        typeof original_name === 'string' ? original_name.trim().slice(0, 200) : null,
        typeof folder === 'string' ? folder.trim().slice(0, 80) : null,
        typeof alt_text === 'string' ? alt_text.trim().slice(0, 240) : null,
        typeof description === 'string' ? description.trim().slice(0, 500) : null,
        id,
      ]
    );
    const updated = await db.queryOne<Record<string, unknown>>('SELECT * FROM media_files WHERE id = $1', [id]);
    res.json({ media: updated });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.post(
  '/media/:id/replace',
  requirePermission('media', 'edit'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = await db.queryOne<Record<string, unknown>>('SELECT * FROM media_files WHERE id = $1', [id]);
      if (!existing) {
        res.status(404).json({ error: 'Media item not found.' });
        return;
      }
      const file = req.file;
      if (!file || !isAllowedImageMime(file.mimetype)) {
        res.status(400).json({ error: 'Please upload a valid PNG, JPG, WEBP, SVG, or ICO image.' });
        return;
      }
      const stored = await storeUploadedImage({
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
      });

      const oldUrl = String(existing.url);
      await db.execute(
        `UPDATE media_files SET filename = $1, url = $2, mime_type = $3, file_size = $4, storage_provider = $5 WHERE id = $6`,
        [stored.filename, stored.url, stored.mimeType, stored.size, stored.storageProvider, id]
      );

      // Propagate replacement URL anywhere the old URL was referenced
      const refUpdates: Array<[string, string[]]> = [
        [
          'branding_settings',
          ['logo_main_url', 'logo_alt_url', 'logo_light_url', 'logo_dark_url', 'logo_transparent_url', 'logo_footer_url', 'favicon_url', 'decorative_banner_url'],
        ],
        ['homepage_sections', ['image_url']],
        ['pages', ['hero_image_url']],
        ['programmes', ['image_url']],
        ['campaigns', ['poster_url']],
        ['events', ['image_url']],
        ['team_members', ['photo_url']],
        ['testimonials', ['photo_url']],
        ['impact_stories', ['photo_url']],
      ];
      for (const [table, cols] of refUpdates) {
        for (const col of cols) {
          await db.execute(`UPDATE ${table} SET ${col} = $1 WHERE ${col} = $2`, [stored.url, oldUrl]);
        }
      }

      await deleteStoredImageIfSafe(oldUrl, String(existing.storage_provider || 'local'));
      const updated = await db.queryOne<Record<string, unknown>>('SELECT * FROM media_files WHERE id = $1', [id]);
      await logActivity({
        adminUserId: req.adminUser!.id,
        adminEmail: req.adminUser!.email,
        action: 'media_replaced',
        module: 'media',
        targetId: id,
        ipAddress: getClientIp(req),
      });

      res.json({ media: updated });
    } catch (err) {
      next(err);
    }
  }
);

adminContentRouter.delete('/media/:id', requirePermission('media', 'delete'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const media = await db.queryOne<Record<string, unknown>>('SELECT * FROM media_files WHERE id = $1', [id]);
    if (!media) {
      res.status(404).json({ error: 'Media file not found.' });
      return;
    }
    const url = String(media.url);

    // Safety check: block deletion if referenced on live branding, pages, sections, programmes, or campaigns
    const checks = [
      db.queryOne<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM branding_settings WHERE logo_main_url=$1 OR logo_alt_url=$1 OR logo_light_url=$1 OR logo_dark_url=$1 OR logo_transparent_url=$1 OR logo_footer_url=$1 OR favicon_url=$1 OR decorative_banner_url=$1`,
        [url]
      ),
      db.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM homepage_sections WHERE image_url=$1', [url]),
      db.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM pages WHERE hero_image_url=$1', [url]),
      db.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM programmes WHERE image_url=$1', [url]),
      db.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM campaigns WHERE poster_url=$1', [url]),
      db.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM events WHERE image_url=$1', [url]),
    ];
    const counts = await Promise.all(checks);
    const totalRefs = counts.reduce((sum, r) => sum + Number(r?.cnt ?? 0), 0);
    if (totalRefs > 0 && req.query.force !== 'true') {
      res.status(409).json({
        error: `This image is currently used in ${totalRefs} active website placement(s). Replace it there first before deleting.`,
      });
      return;
    }

    await db.execute('DELETE FROM media_files WHERE id = $1', [id]);
    await deleteStoredImageIfSafe(url, String(media.storage_provider || 'local'));
    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: 'media_deleted',
      module: 'media',
      targetId: id,
      ipAddress: getClientIp(req),
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 4. HOMEPAGE EDITOR
adminContentRouter.get('/homepage', requirePermission('homepage', 'view'), async (_req, res, next) => {
  try {
    const rows = await db.query<Record<string, unknown>>(
      'SELECT * FROM homepage_sections ORDER BY sort_order ASC, id ASC'
    );
    res.json({
      sections: rows.map((s) => ({
        ...s,
        is_visible: asBool(s.is_visible),
        is_system: asBool(s.is_system),
        config: parseJsonSafe(String(s.config_json || '{}'), {}),
        draft: s.draft_json ? parseJsonSafe(String(s.draft_json), null) : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.post('/homepage', requirePermission('homepage', 'edit'), async (req, res, next) => {
  try {
    const { title, subtitle, body_text, image_url, bg_color, cta_label, cta_link, is_visible } = req.body ?? {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'Section title is required.' });
      return;
    }
    const maxOrder = await db.queryOne<{ m: number }>('SELECT COALESCE(MAX(sort_order), 0) as m FROM homepage_sections');
    const nextOrder = Number(maxOrder?.m ?? 0) + 1;
    const key = `custom-${Date.now()}`;

    const created = await db.queryOne<Record<string, unknown>>(
      `INSERT INTO homepage_sections (
        section_key, section_type, title, subtitle, body_text, image_url, bg_color,
        cta_label, cta_link, is_visible, is_system, sort_order
      ) VALUES ($1,'custom',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        key,
        title.trim(),
        typeof subtitle === 'string' ? subtitle.trim() : '',
        typeof body_text === 'string' ? body_text.trim() : '',
        typeof image_url === 'string' ? image_url.trim() : '',
        typeof bg_color === 'string' ? bg_color.trim() : '#FAF5EE',
        typeof cta_label === 'string' ? cta_label.trim() : '',
        typeof cta_link === 'string' ? cta_link.trim() : '',
        is_visible !== false,
        false,
        nextOrder,
      ]
    );
    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: 'homepage_section_created',
      module: 'homepage',
      targetId: created?.id as number,
      ipAddress: getClientIp(req),
    });
    res.status(201).json({ section: created });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.put('/homepage/reorder', requirePermission('homepage', 'edit'), async (req, res, next) => {
  try {
    const { orderedIds } = req.body ?? {};
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array is required.' });
      return;
    }
    for (let i = 0; i < orderedIds.length; i++) {
      await db.execute('UPDATE homepage_sections SET sort_order = $1 WHERE id = $2', [i + 1, Number(orderedIds[i])]);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.put('/homepage/:id', requirePermission('homepage', 'edit'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { mode, data } = req.body ?? {};
    const payload = data ?? req.body ?? {};

    if (mode === 'draft') {
      await db.execute(
        'UPDATE homepage_sections SET draft_json = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [JSON.stringify(payload), id]
      );
      res.json({ ok: true, mode: 'draft' });
      return;
    }

    if (req.adminUser!.role_slug !== 'super_admin' && !req.adminUser!.permissions.homepage?.can_publish) {
      res.status(403).json({ error: 'You do not have permission to publish homepage changes.' });
      return;
    }

    await db.execute(
      `UPDATE homepage_sections SET
        title = COALESCE($1, title),
        subtitle = COALESCE($2, subtitle),
        body_text = COALESCE($3, body_text),
        image_url = COALESCE($4, image_url),
        bg_color = COALESCE($5, bg_color),
        cta_label = COALESCE($6, cta_label),
        cta_link = COALESCE($7, cta_link),
        secondary_cta_label = COALESCE($8, secondary_cta_label),
        secondary_cta_link = COALESCE($9, secondary_cta_link),
        config_json = COALESCE($10, config_json),
        is_visible = COALESCE($11, is_visible),
        draft_json = '',
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $12`,
      [
        typeof payload.title === 'string' ? payload.title : null,
        typeof payload.subtitle === 'string' ? payload.subtitle : null,
        typeof payload.body_text === 'string' ? payload.body_text : null,
        typeof payload.image_url === 'string' ? payload.image_url : null,
        typeof payload.bg_color === 'string' ? payload.bg_color : null,
        typeof payload.cta_label === 'string' ? payload.cta_label : null,
        typeof payload.cta_link === 'string' ? payload.cta_link : null,
        typeof payload.secondary_cta_label === 'string' ? payload.secondary_cta_label : null,
        typeof payload.secondary_cta_link === 'string' ? payload.secondary_cta_link : null,
        payload.config ? JSON.stringify(payload.config) : null,
        typeof payload.is_visible === 'boolean' ? payload.is_visible : null,
        id,
      ]
    );
    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: 'homepage_section_published',
      module: 'homepage',
      targetId: id,
      ipAddress: getClientIp(req),
    });
    res.json({ ok: true, mode: 'published' });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.delete('/homepage/:id', requirePermission('homepage', 'delete'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const sec = await db.queryOne<{ is_system: unknown }>('SELECT is_system FROM homepage_sections WHERE id = $1', [id]);
    if (!sec) {
      res.status(404).json({ error: 'Section not found.' });
      return;
    }
    if (asBool(sec.is_system)) {
      res.status(400).json({ error: 'Core homepage sections cannot be deleted, but you can hide them instead.' });
      return;
    }
    await db.execute('DELETE FROM homepage_sections WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 5. PAGES MANAGEMENT
adminContentRouter.get('/pages', requirePermission('pages', 'view'), async (_req, res, next) => {
  try {
    const rows = await db.query<Record<string, unknown>>('SELECT * FROM pages ORDER BY sort_order ASC, id ASC');
    res.json({
      pages: rows.map((p) => ({
        ...p,
        is_system_page: asBool(p.is_system_page),
        blocks: parseJsonSafe(String(p.content_blocks_json || '[]'), []),
        draft_blocks: p.draft_blocks_json ? parseJsonSafe(String(p.draft_blocks_json), null) : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.post('/pages', requirePermission('pages', 'edit'), async (req, res, next) => {
  try {
    const { title, slug, subtitle, hero_image_url, blocks, seo_title, seo_description, status } = req.body ?? {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'Page title is required.' });
      return;
    }
    const cleanSlug = (typeof slug === 'string' && slug.trim() ? slug : title)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const dup = await db.queryOne<{ id: number }>('SELECT id FROM pages WHERE slug = $1', [cleanSlug]);
    if (dup) {
      res.status(409).json({ error: 'A page with this URL slug already exists.' });
      return;
    }

    const pageStatus = status === 'published' ? 'published' : 'draft';
    const created = await db.queryOne<Record<string, unknown>>(
      `INSERT INTO pages (slug, title, subtitle, hero_image_url, content_blocks_json, seo_title, seo_description, status, is_system_page, sort_order, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,99,$10) RETURNING *`,
      [
        cleanSlug,
        title.trim(),
        typeof subtitle === 'string' ? subtitle.trim() : '',
        typeof hero_image_url === 'string' ? hero_image_url.trim() : '',
        JSON.stringify(Array.isArray(blocks) ? blocks : []),
        typeof seo_title === 'string' ? seo_title.trim() : title.trim(),
        typeof seo_description === 'string' ? seo_description.trim() : '',
        pageStatus,
        false,
        pageStatus === 'published' ? new Date().toISOString() : null,
      ]
    );
    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: 'page_created',
      module: 'pages',
      targetId: created?.id as number,
      details: { slug: cleanSlug },
      ipAddress: getClientIp(req),
    });
    res.status(201).json({ page: created });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.put('/pages/:id', requirePermission('pages', 'edit'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.queryOne<Record<string, unknown>>('SELECT * FROM pages WHERE id = $1', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Page not found.' });
      return;
    }

    const { mode, title, subtitle, hero_image_url, blocks, seo_title, seo_description, status, note } = req.body ?? {};

    if (mode === 'draft') {
      await db.execute(
        `UPDATE pages SET
          title = COALESCE($1, title),
          subtitle = COALESCE($2, subtitle),
          hero_image_url = COALESCE($3, hero_image_url),
          draft_blocks_json = $4,
          seo_title = COALESCE($5, seo_title),
          seo_description = COALESCE($6, seo_description),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [
          typeof title === 'string' ? title : null,
          typeof subtitle === 'string' ? subtitle : null,
          typeof hero_image_url === 'string' ? hero_image_url : null,
          JSON.stringify(Array.isArray(blocks) ? blocks : parseJsonSafe(String(existing.content_blocks_json), [])),
          typeof seo_title === 'string' ? seo_title : null,
          typeof seo_description === 'string' ? seo_description : null,
          id,
        ]
      );
      res.json({ ok: true, mode: 'draft' });
      return;
    }

    // Save a revision snapshot of the previous published content
    await db.execute(
      `INSERT INTO page_revisions (page_id, title, content_blocks_json, created_by, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        id,
        String(existing.title),
        String(existing.content_blocks_json || '[]'),
        req.adminUser!.id,
        typeof note === 'string' ? note.slice(0, 200) : 'Published update',
      ]
    );

    const nextStatus = status === 'draft' ? 'draft' : 'published';
    await db.execute(
      `UPDATE pages SET
        title = COALESCE($1, title),
        subtitle = COALESCE($2, subtitle),
        hero_image_url = COALESCE($3, hero_image_url),
        content_blocks_json = COALESCE($4, content_blocks_json),
        draft_blocks_json = '',
        seo_title = COALESCE($5, seo_title),
        seo_description = COALESCE($6, seo_description),
        status = $7,
        updated_at = CURRENT_TIMESTAMP,
        published_at = CASE WHEN $7 = 'published' THEN CURRENT_TIMESTAMP ELSE published_at END
       WHERE id = $8`,
      [
        typeof title === 'string' ? title : null,
        typeof subtitle === 'string' ? subtitle : null,
        typeof hero_image_url === 'string' ? hero_image_url : null,
        Array.isArray(blocks) ? JSON.stringify(blocks) : null,
        typeof seo_title === 'string' ? seo_title : null,
        typeof seo_description === 'string' ? seo_description : null,
        nextStatus,
        id,
      ]
    );

    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: nextStatus === 'published' ? 'page_published' : 'page_unpublished',
      module: 'pages',
      targetId: id,
      ipAddress: getClientIp(req),
    });

    res.json({ ok: true, status: nextStatus });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.get('/pages/:id/revisions', requirePermission('pages', 'view'), async (req, res, next) => {
  try {
    const rows = await db.query<Record<string, unknown>>(
      'SELECT id, page_id, title, note, created_at FROM page_revisions WHERE page_id = $1 ORDER BY created_at DESC LIMIT 20',
      [Number(req.params.id)]
    );
    res.json({ revisions: rows });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.post('/pages/:id/restore/:revId', requirePermission('pages', 'edit'), async (req, res, next) => {
  try {
    const rev = await db.queryOne<{ title: string; content_blocks_json: string }>(
      'SELECT title, content_blocks_json FROM page_revisions WHERE id = $1 AND page_id = $2',
      [Number(req.params.revId), Number(req.params.id)]
    );
    if (!rev) {
      res.status(404).json({ error: 'Revision not found.' });
      return;
    }
    await db.execute(
      `UPDATE pages SET title = $1, content_blocks_json = $2, draft_blocks_json = '', updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [rev.title, rev.content_blocks_json, Number(req.params.id)]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.delete('/pages/:id', requirePermission('pages', 'delete'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const page = await db.queryOne<{ is_system_page: unknown }>('SELECT is_system_page FROM pages WHERE id = $1', [id]);
    if (!page) {
      res.status(404).json({ error: 'Page not found.' });
      return;
    }
    if (asBool(page.is_system_page)) {
      res.status(400).json({ error: 'Core system pages cannot be deleted. You can unpublish them instead.' });
      return;
    }
    await db.execute('DELETE FROM pages WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 6. ABOUT US TEAM & BOARD MEMBERS
adminContentRouter.get('/team', requirePermission('about', 'view'), async (_req, res, next) => {
  try {
    const rows = await db.query<Record<string, unknown>>('SELECT * FROM team_members ORDER BY sort_order ASC, id ASC');
    res.json({ members: rows.map((r) => ({ ...r, is_published: asBool(r.is_published) })) });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.post('/team', requirePermission('about', 'edit'), async (req, res, next) => {
  try {
    const { name, role_title, bio, photo_url, category, is_published, sort_order } = req.body ?? {};
    if (!name || !role_title) {
      res.status(400).json({ error: 'Name and role title are required.' });
      return;
    }
    const created = await db.queryOne<Record<string, unknown>>(
      `INSERT INTO team_members (name, role_title, bio, photo_url, category, is_published, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        String(name).trim(),
        String(role_title).trim(),
        typeof bio === 'string' ? bio.trim() : '',
        typeof photo_url === 'string' ? photo_url.trim() : '',
        typeof category === 'string' ? category.trim() : 'Team',
        is_published !== false,
        Number(sort_order) || 1,
      ]
    );
    res.status(201).json({ member: created });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.put('/team/:id', requirePermission('about', 'edit'), async (req, res, next) => {
  try {
    const { name, role_title, bio, photo_url, category, is_published, sort_order } = req.body ?? {};
    await db.execute(
      `UPDATE team_members SET
        name = COALESCE($1, name),
        role_title = COALESCE($2, role_title),
        bio = COALESCE($3, bio),
        photo_url = COALESCE($4, photo_url),
        category = COALESCE($5, category),
        is_published = COALESCE($6, is_published),
        sort_order = COALESCE($7, sort_order)
       WHERE id = $8`,
      [
        typeof name === 'string' ? name.trim() : null,
        typeof role_title === 'string' ? role_title.trim() : null,
        typeof bio === 'string' ? bio.trim() : null,
        typeof photo_url === 'string' ? photo_url.trim() : null,
        typeof category === 'string' ? category.trim() : null,
        typeof is_published === 'boolean' ? is_published : null,
        typeof sort_order === 'number' ? sort_order : null,
        Number(req.params.id),
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.delete('/team/:id', requirePermission('about', 'delete'), async (req, res, next) => {
  try {
    await db.execute('DELETE FROM team_members WHERE id = $1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 7. OUR WORK PROGRAMMES
adminContentRouter.get('/programmes', requirePermission('programmes', 'view'), async (_req, res, next) => {
  try {
    const rows = await db.query<Record<string, unknown>>('SELECT * FROM programmes ORDER BY sort_order ASC, id ASC');
    res.json({ programmes: rows.map((r) => ({ ...r, is_published: asBool(r.is_published) })) });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.post('/programmes', requirePermission('programmes', 'edit'), async (req, res, next) => {
  try {
    const { title, short_description, full_description, icon_name, image_url, supporting_info, cta_label, cta_link, is_published, sort_order } =
      req.body ?? {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'Programme title is required.' });
      return;
    }
    const slug = `${title
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')}-${Date.now().toString().slice(-4)}`;

    const created = await db.queryOne<Record<string, unknown>>(
      `INSERT INTO programmes (slug, title, short_description, full_description, icon_name, image_url, supporting_info, cta_label, cta_link, is_published, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        slug,
        title.trim(),
        typeof short_description === 'string' ? short_description.trim() : '',
        typeof full_description === 'string' ? full_description.trim() : '',
        typeof icon_name === 'string' ? icon_name.trim() : 'HeartHandshake',
        typeof image_url === 'string' ? image_url.trim() : '',
        typeof supporting_info === 'string' ? supporting_info.trim() : '',
        typeof cta_label === 'string' ? cta_label.trim() : 'Learn More',
        typeof cta_link === 'string' ? cta_link.trim() : '/get-involved',
        is_published !== false,
        Number(sort_order) || 10,
      ]
    );
    res.status(201).json({ programme: created });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.put('/programmes/:id', requirePermission('programmes', 'edit'), async (req, res, next) => {
  try {
    const { title, short_description, full_description, icon_name, image_url, supporting_info, cta_label, cta_link, is_published, sort_order } =
      req.body ?? {};
    await db.execute(
      `UPDATE programmes SET
        title = COALESCE($1, title),
        short_description = COALESCE($2, short_description),
        full_description = COALESCE($3, full_description),
        icon_name = COALESCE($4, icon_name),
        image_url = COALESCE($5, image_url),
        supporting_info = COALESCE($6, supporting_info),
        cta_label = COALESCE($7, cta_label),
        cta_link = COALESCE($8, cta_link),
        is_published = COALESCE($9, is_published),
        sort_order = COALESCE($10, sort_order),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $11`,
      [
        typeof title === 'string' ? title.trim() : null,
        typeof short_description === 'string' ? short_description.trim() : null,
        typeof full_description === 'string' ? full_description.trim() : null,
        typeof icon_name === 'string' ? icon_name.trim() : null,
        typeof image_url === 'string' ? image_url.trim() : null,
        typeof supporting_info === 'string' ? supporting_info.trim() : null,
        typeof cta_label === 'string' ? cta_label.trim() : null,
        typeof cta_link === 'string' ? cta_link.trim() : null,
        typeof is_published === 'boolean' ? is_published : null,
        typeof sort_order === 'number' ? sort_order : null,
        Number(req.params.id),
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.delete('/programmes/:id', requirePermission('programmes', 'delete'), async (req, res, next) => {
  try {
    await db.execute('DELETE FROM programmes WHERE id = $1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 8. NAVIGATION & FOOTER
adminContentRouter.get('/navigation', requirePermission('navigation', 'view'), async (_req, res, next) => {
  try {
    const nav = await db.query<Record<string, unknown>>('SELECT * FROM navigation_items ORDER BY sort_order ASC, id ASC');
    const footer = await db.queryOne<Record<string, unknown>>('SELECT * FROM footer_settings LIMIT 1');
    res.json({
      navigation: nav.map((n) => ({
        ...n,
        is_visible: asBool(n.is_visible),
        open_in_new_tab: asBool(n.open_in_new_tab),
      })),
      footer: footer
        ? {
            ...footer,
            show_newsletter: asBool(footer.show_newsletter),
            quick_links: parseJsonSafe(String(footer.quick_links_json || '[]'), []),
            social_links: parseJsonSafe(String(footer.social_links_json || '{}'), {}),
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.post('/navigation', requirePermission('navigation', 'edit'), async (req, res, next) => {
  try {
    const { label, href, parent_id, is_visible, open_in_new_tab, sort_order } = req.body ?? {};
    if (!label || !href) {
      res.status(400).json({ error: 'Link label and destination are required.' });
      return;
    }
    const created = await db.queryOne<Record<string, unknown>>(
      `INSERT INTO navigation_items (label, href, parent_id, is_visible, open_in_new_tab, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        String(label).trim(),
        String(href).trim(),
        parent_id ? Number(parent_id) : null,
        is_visible !== false,
        Boolean(open_in_new_tab),
        Number(sort_order) || 10,
      ]
    );
    res.status(201).json({ item: created });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.put('/navigation/reorder', requirePermission('navigation', 'edit'), async (req, res, next) => {
  try {
    const { orderedIds } = req.body ?? {};
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array required.' });
      return;
    }
    for (let i = 0; i < orderedIds.length; i++) {
      await db.execute('UPDATE navigation_items SET sort_order = $1 WHERE id = $2', [i + 1, Number(orderedIds[i])]);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.put('/navigation/:id', requirePermission('navigation', 'edit'), async (req, res, next) => {
  try {
    const { label, href, parent_id, is_visible, open_in_new_tab, sort_order } = req.body ?? {};
    await db.execute(
      `UPDATE navigation_items SET
        label = COALESCE($1, label),
        href = COALESCE($2, href),
        parent_id = $3,
        is_visible = COALESCE($4, is_visible),
        open_in_new_tab = COALESCE($5, open_in_new_tab),
        sort_order = COALESCE($6, sort_order)
       WHERE id = $7`,
      [
        typeof label === 'string' ? label.trim() : null,
        typeof href === 'string' ? href.trim() : null,
        parent_id ? Number(parent_id) : null,
        typeof is_visible === 'boolean' ? is_visible : null,
        typeof open_in_new_tab === 'boolean' ? open_in_new_tab : null,
        typeof sort_order === 'number' ? sort_order : null,
        Number(req.params.id),
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.delete('/navigation/:id', requirePermission('navigation', 'delete'), async (req, res, next) => {
  try {
    await db.execute('DELETE FROM navigation_items WHERE id = $1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.put('/footer', requirePermission('navigation', 'edit'), async (req, res, next) => {
  try {
    const existing = await db.queryOne<{ id: number }>('SELECT id FROM footer_settings LIMIT 1');
    if (!existing) {
      res.status(404).json({ error: 'Footer settings not found.' });
      return;
    }
    const {
      description,
      copyright_text,
      mission_blurb,
      show_newsletter,
      newsletter_heading,
      newsletter_subtext,
      quick_links,
      social_links,
      bg_color,
      text_color,
    } = req.body ?? {};

    await db.execute(
      `UPDATE footer_settings SET
        description = COALESCE($1, description),
        copyright_text = COALESCE($2, copyright_text),
        mission_blurb = COALESCE($3, mission_blurb),
        show_newsletter = COALESCE($4, show_newsletter),
        newsletter_heading = COALESCE($5, newsletter_heading),
        newsletter_subtext = COALESCE($6, newsletter_subtext),
        quick_links_json = COALESCE($7, quick_links_json),
        social_links_json = COALESCE($8, social_links_json),
        bg_color = COALESCE($9, bg_color),
        text_color = COALESCE($10, text_color),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $11`,
      [
        typeof description === 'string' ? description : null,
        typeof copyright_text === 'string' ? copyright_text : null,
        typeof mission_blurb === 'string' ? mission_blurb : null,
        typeof show_newsletter === 'boolean' ? show_newsletter : null,
        typeof newsletter_heading === 'string' ? newsletter_heading : null,
        typeof newsletter_subtext === 'string' ? newsletter_subtext : null,
        Array.isArray(quick_links) ? JSON.stringify(quick_links) : null,
        social_links && typeof social_links === 'object' ? JSON.stringify(social_links) : null,
        typeof bg_color === 'string' ? bg_color : null,
        typeof text_color === 'string' ? text_color : null,
        existing.id,
      ]
    );
    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: 'footer_updated',
      module: 'navigation',
      ipAddress: getClientIp(req),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
