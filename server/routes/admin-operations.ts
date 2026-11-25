import { Router } from 'express';
import {
  generateRandomToken,
  getClientIp,
  hashPassword,
  hashToken,
  isAdvancedDonationsUnlocked,
  logActivity,
  requireAuth,
  requirePermission,
} from '../auth.ts';
import { asBool, db } from '../db.ts';

export const adminOperationsRouter = Router();
adminOperationsRouter.use(requireAuth);

// 1. CAMPAIGNS & EVENTS
adminOperationsRouter.get('/campaigns', requirePermission('campaigns', 'view'), async (_req, res, next) => {
  try {
    const unlocked = isAdvancedDonationsUnlocked();
    const campaigns = await db.query<Record<string, unknown>>(
      'SELECT * FROM campaigns ORDER BY is_christmas_programme DESC, is_featured DESC, created_at DESC'
    );
    const verifiedRows = unlocked
      ? await db.query<{ campaign_id: number; total_cents: number }>(
          `SELECT campaign_id, COALESCE(SUM(amount_cents), 0) as total_cents
           FROM donations WHERE status = 'successful' AND campaign_id IS NOT NULL GROUP BY campaign_id`
        )
      : [];
    const totals = new Map<number, number>();
    for (const r of verifiedRows) totals.set(Number(r.campaign_id), Number(r.total_cents || 0));

    const events = await db.query<Record<string, unknown>>('SELECT * FROM events ORDER BY event_date ASC, id DESC');

    res.json({
      donationsUnlocked: unlocked,
      campaigns: campaigns.map((c) => ({
        ...c,
        is_featured: asBool(c.is_featured),
        is_published: asBool(c.is_published),
        is_christmas_programme: asBool(c.is_christmas_programme),
        verified_raised_cents: unlocked ? totals.get(Number(c.id)) ?? 0 : 0,
      })),
      events: events.map((e) => ({
        ...e,
        is_published: asBool(e.is_published),
      })),
    });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.post('/campaigns', requirePermission('campaigns', 'edit'), async (req, res, next) => {
  try {
    const {
      title,
      summary,
      description,
      poster_url,
      start_date,
      end_date,
      fundraising_target_dollars,
      currency,
      status,
      is_featured,
      is_published,
      is_christmas_programme,
    } = req.body ?? {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'Campaign title is required.' });
      return;
    }

    const slug = `${title
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')}-${Date.now().toString().slice(-4)}`;
    const targetCents = Math.max(0, Math.round((Number(fundraising_target_dollars) || 0) * 100));

    const created = await db.queryOne<Record<string, unknown>>(
      `INSERT INTO campaigns (
        slug, title, summary, description, poster_url, start_date, end_date,
        fundraising_target_cents, currency, status, is_featured, is_published, is_christmas_programme
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        slug,
        title.trim(),
        typeof summary === 'string' ? summary.trim() : '',
        typeof description === 'string' ? description.trim() : '',
        typeof poster_url === 'string' ? poster_url.trim() : '',
        typeof start_date === 'string' ? start_date.trim() : '',
        typeof end_date === 'string' ? end_date.trim() : '',
        targetCents,
        typeof currency === 'string' ? currency.trim() : 'CAD',
        typeof status === 'string' ? status : 'draft',
        Boolean(is_featured),
        Boolean(is_published),
        Boolean(is_christmas_programme),
      ]
    );
    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: 'campaign_created',
      module: 'campaigns',
      targetId: created?.id as number,
      ipAddress: getClientIp(req),
    });
    res.status(201).json({ campaign: created });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.put('/campaigns/:id', requirePermission('campaigns', 'edit'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const {
      title,
      summary,
      description,
      poster_url,
      start_date,
      end_date,
      fundraising_target_dollars,
      currency,
      status,
      is_featured,
      is_published,
    } = req.body ?? {};

    const targetCents =
      fundraising_target_dollars !== undefined ? Math.max(0, Math.round((Number(fundraising_target_dollars) || 0) * 100)) : null;

    await db.execute(
      `UPDATE campaigns SET
        title = COALESCE($1, title),
        summary = COALESCE($2, summary),
        description = COALESCE($3, description),
        poster_url = COALESCE($4, poster_url),
        start_date = COALESCE($5, start_date),
        end_date = COALESCE($6, end_date),
        fundraising_target_cents = COALESCE($7, fundraising_target_cents),
        currency = COALESCE($8, currency),
        status = COALESCE($9, status),
        is_featured = COALESCE($10, is_featured),
        is_published = COALESCE($11, is_published),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $12`,
      [
        typeof title === 'string' ? title.trim() : null,
        typeof summary === 'string' ? summary.trim() : null,
        typeof description === 'string' ? description.trim() : null,
        typeof poster_url === 'string' ? poster_url.trim() : null,
        typeof start_date === 'string' ? start_date.trim() : null,
        typeof end_date === 'string' ? end_date.trim() : null,
        targetCents,
        typeof currency === 'string' ? currency.trim() : null,
        typeof status === 'string' ? status : null,
        typeof is_featured === 'boolean' ? is_featured : null,
        typeof is_published === 'boolean' ? is_published : null,
        id,
      ]
    );

    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: 'campaign_updated',
      module: 'campaigns',
      targetId: id,
      ipAddress: getClientIp(req),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.delete('/campaigns/:id', requirePermission('campaigns', 'delete'), async (req, res, next) => {
  try {
    await db.execute('DELETE FROM campaigns WHERE id = $1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.post('/events', requirePermission('campaigns', 'edit'), async (req, res, next) => {
  try {
    const { title, description, event_date, end_date, location, image_url, registration_link, campaign_id, status, is_published } =
      req.body ?? {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'Event title is required.' });
      return;
    }
    const created = await db.queryOne<Record<string, unknown>>(
      `INSERT INTO events (title, description, event_date, end_date, location, image_url, registration_link, campaign_id, status, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        title.trim(),
        typeof description === 'string' ? description.trim() : '',
        typeof event_date === 'string' ? event_date.trim() : '',
        typeof end_date === 'string' ? end_date.trim() : '',
        typeof location === 'string' ? location.trim() : '',
        typeof image_url === 'string' ? image_url.trim() : '',
        typeof registration_link === 'string' ? registration_link.trim() : '',
        campaign_id ? Number(campaign_id) : null,
        typeof status === 'string' ? status : 'upcoming',
        Boolean(is_published),
      ]
    );
    res.status(201).json({ event: created });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.put('/events/:id', requirePermission('campaigns', 'edit'), async (req, res, next) => {
  try {
    const { title, description, event_date, end_date, location, image_url, registration_link, campaign_id, status, is_published } =
      req.body ?? {};
    await db.execute(
      `UPDATE events SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        event_date = COALESCE($3, event_date),
        end_date = COALESCE($4, end_date),
        location = COALESCE($5, location),
        image_url = COALESCE($6, image_url),
        registration_link = COALESCE($7, registration_link),
        campaign_id = $8,
        status = COALESCE($9, status),
        is_published = COALESCE($10, is_published),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $11`,
      [
        typeof title === 'string' ? title.trim() : null,
        typeof description === 'string' ? description.trim() : null,
        typeof event_date === 'string' ? event_date.trim() : null,
        typeof end_date === 'string' ? end_date.trim() : null,
        typeof location === 'string' ? location.trim() : null,
        typeof image_url === 'string' ? image_url.trim() : null,
        typeof registration_link === 'string' ? registration_link.trim() : null,
        campaign_id ? Number(campaign_id) : null,
        typeof status === 'string' ? status : null,
        typeof is_published === 'boolean' ? is_published : null,
        Number(req.params.id),
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.delete('/events/:id', requirePermission('campaigns', 'delete'), async (req, res, next) => {
  try {
    await db.execute('DELETE FROM events WHERE id = $1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 2. DONATIONS (Strictly guarded by developer entitlement)
adminOperationsRouter.get('/donations', requirePermission('donations', 'view'), async (req, res, next) => {
  try {
    const unlocked = isAdvancedDonationsUnlocked();
    if (!unlocked) {
      res.json({
        donationsUnlocked: false,
        donations: [],
        transactions: [],
      });
      return;
    }

    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const method = typeof req.query.method === 'string' ? req.query.method.trim() : '';
    const campaignId = typeof req.query.campaign_id === 'string' ? req.query.campaign_id.trim() : '';

    const rows = await db.query<Record<string, unknown>>(
      `SELECT d.*, c.title as campaign_title
       FROM donations d
       LEFT JOIN campaigns c ON c.id = d.campaign_id
       ORDER BY d.created_at DESC, d.id DESC`
    );

    const filtered = rows.filter((d) => {
      if (status && status !== 'all' && d.status !== status) return false;
      if (method && method !== 'all' && d.payment_method !== method) return false;
      if (campaignId && campaignId !== 'all' && String(d.campaign_id || '') !== campaignId) return false;
      if (search) {
        const hay = `${d.donor_name} ${d.donor_email} ${d.transaction_ref} ${d.campaign_title || ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    const txRows = await db.query<Record<string, unknown>>(
      'SELECT * FROM donation_transactions ORDER BY created_at DESC LIMIT 100'
    );

    res.json({
      donationsUnlocked: true,
      donations: filtered,
      transactions: txRows,
    });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.put('/donations/:id', requirePermission('donations', 'edit'), async (req, res, next) => {
  try {
    if (!isAdvancedDonationsUnlocked()) {
      res.status(403).json({ error: 'Advanced donation management is locked by the developer entitlement.' });
      return;
    }
    const id = Number(req.params.id);
    const { status, internal_notes } = req.body ?? {};
    const allowedStatuses = ['pending', 'awaiting_verification', 'successful', 'failed', 'refunded'];
    const existing = await db.queryOne<Record<string, unknown>>('SELECT * FROM donations WHERE id = $1', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Donation record not found.' });
      return;
    }

    const nextStatus = typeof status === 'string' && allowedStatuses.includes(status) ? status : String(existing.status);
    await db.execute(
      `UPDATE donations SET
        status = $1,
        internal_notes = COALESCE($2, internal_notes),
        verified_by = CASE WHEN $1 = 'successful' AND verified_by IS NULL THEN $3 ELSE verified_by END,
        verified_at = CASE WHEN $1 = 'successful' AND verified_at IS NULL THEN CURRENT_TIMESTAMP ELSE verified_at END
       WHERE id = $4`,
      [nextStatus, typeof internal_notes === 'string' ? internal_notes : null, req.adminUser!.id, id]
    );

    if (nextStatus !== existing.status) {
      await db.execute(
        `INSERT INTO donation_transactions (donation_id, gateway, gateway_ref, event_type, amount_cents, status, raw_note)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          id,
          String(existing.payment_method),
          String(existing.transaction_ref),
          `status_changed_to_${nextStatus}`,
          Number(existing.amount_cents),
          nextStatus,
          `Updated by ${req.adminUser!.email}`,
        ]
      );
    }

    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: 'donation_updated',
      module: 'donations',
      targetId: id,
      details: { status: nextStatus },
      ipAddress: getClientIp(req),
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 3. GET INVOLVED (Opportunities, Volunteer Applications, Partnership Enquiries)
adminOperationsRouter.get('/get-involved', requirePermission('get_involved', 'view'), async (_req, res, next) => {
  try {
    const [opportunities, volunteers, partnerships] = await Promise.all([
      db.query<Record<string, unknown>>('SELECT * FROM volunteer_opportunities ORDER BY sort_order ASC, id ASC'),
      db.query<Record<string, unknown>>('SELECT * FROM volunteer_applications ORDER BY created_at DESC'),
      db.query<Record<string, unknown>>('SELECT * FROM partnership_enquiries ORDER BY created_at DESC'),
    ]);
    res.json({
      opportunities: opportunities.map((o) => ({ ...o, is_published: asBool(o.is_published) })),
      volunteers,
      partnerships,
    });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.post('/volunteer-opportunities', requirePermission('get_involved', 'edit'), async (req, res, next) => {
  try {
    const { title, location, commitment, description, is_published, sort_order } = req.body ?? {};
    if (!title) {
      res.status(400).json({ error: 'Opportunity title is required.' });
      return;
    }
    const created = await db.queryOne<Record<string, unknown>>(
      `INSERT INTO volunteer_opportunities (title, location, commitment, description, is_published, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        String(title).trim(),
        typeof location === 'string' ? location.trim() : '',
        typeof commitment === 'string' ? commitment.trim() : '',
        typeof description === 'string' ? description.trim() : '',
        is_published !== false,
        Number(sort_order) || 10,
      ]
    );
    res.status(201).json({ opportunity: created });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.put('/volunteer-opportunities/:id', requirePermission('get_involved', 'edit'), async (req, res, next) => {
  try {
    const { title, location, commitment, description, is_published, sort_order } = req.body ?? {};
    await db.execute(
      `UPDATE volunteer_opportunities SET
        title = COALESCE($1, title),
        location = COALESCE($2, location),
        commitment = COALESCE($3, commitment),
        description = COALESCE($4, description),
        is_published = COALESCE($5, is_published),
        sort_order = COALESCE($6, sort_order)
       WHERE id = $7`,
      [
        typeof title === 'string' ? title.trim() : null,
        typeof location === 'string' ? location.trim() : null,
        typeof commitment === 'string' ? commitment.trim() : null,
        typeof description === 'string' ? description.trim() : null,
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

adminOperationsRouter.delete('/volunteer-opportunities/:id', requirePermission('get_involved', 'edit'), async (req, res, next) => {
  try {
    await db.execute('DELETE FROM volunteer_opportunities WHERE id = $1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.put('/volunteers/:id', requirePermission('get_involved', 'edit'), async (req, res, next) => {
  try {
    const { status, internal_notes } = req.body ?? {};
    await db.execute(
      'UPDATE volunteer_applications SET status = COALESCE($1, status), internal_notes = COALESCE($2, internal_notes) WHERE id = $3',
      [typeof status === 'string' ? status : null, typeof internal_notes === 'string' ? internal_notes : null, Number(req.params.id)]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.put('/partnerships/:id', requirePermission('get_involved', 'edit'), async (req, res, next) => {
  try {
    const { status, internal_notes } = req.body ?? {};
    await db.execute(
      'UPDATE partnership_enquiries SET status = COALESCE($1, status), internal_notes = COALESCE($2, internal_notes) WHERE id = $3',
      [typeof status === 'string' ? status : null, typeof internal_notes === 'string' ? internal_notes : null, Number(req.params.id)]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 4. CONTACT SUBMISSIONS & CONTACT SETTINGS
adminOperationsRouter.get('/contacts', requirePermission('contact', 'view'), async (_req, res, next) => {
  try {
    const submissions = await db.query<Record<string, unknown>>(
      'SELECT * FROM contact_submissions ORDER BY created_at DESC'
    );
    const settings = await db.queryOne<Record<string, unknown>>(
      `SELECT contact_email, phone, whatsapp_number, office_address, edmonton_contact, nigeria_contact, business_hours, contact_form_enabled
       FROM site_settings LIMIT 1`
    );
    res.json({
      submissions,
      contactInfo: settings ? { ...settings, contact_form_enabled: asBool(settings.contact_form_enabled) } : null,
    });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.put('/contacts/:id', requirePermission('contact', 'edit'), async (req, res, next) => {
  try {
    const { status, internal_notes } = req.body ?? {};
    await db.execute(
      'UPDATE contact_submissions SET status = COALESCE($1, status), internal_notes = COALESCE($2, internal_notes) WHERE id = $3',
      [typeof status === 'string' ? status : null, typeof internal_notes === 'string' ? internal_notes : null, Number(req.params.id)]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.put('/contact-info', requirePermission('contact', 'edit'), async (req, res, next) => {
  try {
    const existing = await db.queryOne<{ id: number }>('SELECT id FROM site_settings LIMIT 1');
    if (!existing) {
      res.status(404).json({ error: 'Site settings not found.' });
      return;
    }
    const {
      contact_email,
      phone,
      whatsapp_number,
      office_address,
      edmonton_contact,
      nigeria_contact,
      business_hours,
      contact_form_enabled,
    } = req.body ?? {};

    await db.execute(
      `UPDATE site_settings SET
        contact_email = COALESCE($1, contact_email),
        phone = COALESCE($2, phone),
        whatsapp_number = COALESCE($3, whatsapp_number),
        office_address = COALESCE($4, office_address),
        edmonton_contact = COALESCE($5, edmonton_contact),
        nigeria_contact = COALESCE($6, nigeria_contact),
        business_hours = COALESCE($7, business_hours),
        contact_form_enabled = COALESCE($8, contact_form_enabled),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [
        typeof contact_email === 'string' ? contact_email.trim() : null,
        typeof phone === 'string' ? phone.trim() : null,
        typeof whatsapp_number === 'string' ? whatsapp_number.trim() : null,
        typeof office_address === 'string' ? office_address.trim() : null,
        typeof edmonton_contact === 'string' ? edmonton_contact.trim() : null,
        typeof nigeria_contact === 'string' ? nigeria_contact.trim() : null,
        typeof business_hours === 'string' ? business_hours.trim() : null,
        typeof contact_form_enabled === 'boolean' ? contact_form_enabled : null,
        existing.id,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 5. TESTIMONIALS & IMPACT STORIES
adminOperationsRouter.get('/stories', requirePermission('testimonials', 'view'), async (_req, res, next) => {
  try {
    const [testimonials, impactStories] = await Promise.all([
      db.query<Record<string, unknown>>('SELECT * FROM testimonials ORDER BY created_at DESC'),
      db.query<Record<string, unknown>>('SELECT * FROM impact_stories ORDER BY created_at DESC'),
    ]);
    res.json({
      testimonials: testimonials.map((t) => ({
        ...t,
        permission_confirmed: asBool(t.permission_confirmed),
        is_published: asBool(t.is_published),
        is_featured: asBool(t.is_featured),
      })),
      impactStories: impactStories.map((s) => ({
        ...s,
        permission_confirmed: asBool(s.permission_confirmed),
        is_published: asBool(s.is_published),
        is_featured: asBool(s.is_featured),
      })),
    });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.post('/testimonials', requirePermission('testimonials', 'edit'), async (req, res, next) => {
  try {
    const { author_name, role_or_context, quote, photo_url, permission_confirmed, status, is_published, is_featured } =
      req.body ?? {};
    if (!author_name || !quote) {
      res.status(400).json({ error: 'Author name and testimonial quote are required.' });
      return;
    }
    const created = await db.queryOne<Record<string, unknown>>(
      `INSERT INTO testimonials (author_name, role_or_context, quote, photo_url, permission_confirmed, status, is_published, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        String(author_name).trim(),
        typeof role_or_context === 'string' ? role_or_context.trim() : '',
        String(quote).trim(),
        typeof photo_url === 'string' ? photo_url.trim() : '',
        Boolean(permission_confirmed),
        typeof status === 'string' ? status : 'approved',
        Boolean(is_published),
        Boolean(is_featured),
      ]
    );
    res.status(201).json({ testimonial: created });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.put('/testimonials/:id', requirePermission('testimonials', 'edit'), async (req, res, next) => {
  try {
    const { author_name, role_or_context, quote, photo_url, permission_confirmed, status, is_published, is_featured } =
      req.body ?? {};
    await db.execute(
      `UPDATE testimonials SET
        author_name = COALESCE($1, author_name),
        role_or_context = COALESCE($2, role_or_context),
        quote = COALESCE($3, quote),
        photo_url = COALESCE($4, photo_url),
        permission_confirmed = COALESCE($5, permission_confirmed),
        status = COALESCE($6, status),
        is_published = COALESCE($7, is_published),
        is_featured = COALESCE($8, is_featured)
       WHERE id = $9`,
      [
        typeof author_name === 'string' ? author_name.trim() : null,
        typeof role_or_context === 'string' ? role_or_context.trim() : null,
        typeof quote === 'string' ? quote.trim() : null,
        typeof photo_url === 'string' ? photo_url.trim() : null,
        typeof permission_confirmed === 'boolean' ? permission_confirmed : null,
        typeof status === 'string' ? status : null,
        typeof is_published === 'boolean' ? is_published : null,
        typeof is_featured === 'boolean' ? is_featured : null,
        Number(req.params.id),
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.delete('/testimonials/:id', requirePermission('testimonials', 'delete'), async (req, res, next) => {
  try {
    await db.execute('DELETE FROM testimonials WHERE id = $1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.post('/impact-stories', requirePermission('testimonials', 'edit'), async (req, res, next) => {
  try {
    const { title, summary, body, photo_url, location, permission_confirmed, status, is_published, is_featured } = req.body ?? {};
    if (!title || !summary) {
      res.status(400).json({ error: 'Story title and summary are required.' });
      return;
    }
    const created = await db.queryOne<Record<string, unknown>>(
      `INSERT INTO impact_stories (title, summary, body, photo_url, location, permission_confirmed, status, is_published, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        String(title).trim(),
        String(summary).trim(),
        typeof body === 'string' ? body.trim() : '',
        typeof photo_url === 'string' ? photo_url.trim() : '',
        typeof location === 'string' ? location.trim() : '',
        Boolean(permission_confirmed),
        typeof status === 'string' ? status : 'approved',
        Boolean(is_published),
        Boolean(is_featured),
      ]
    );
    res.status(201).json({ story: created });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.put('/impact-stories/:id', requirePermission('testimonials', 'edit'), async (req, res, next) => {
  try {
    const { title, summary, body, photo_url, location, permission_confirmed, status, is_published, is_featured } = req.body ?? {};
    await db.execute(
      `UPDATE impact_stories SET
        title = COALESCE($1, title),
        summary = COALESCE($2, summary),
        body = COALESCE($3, body),
        photo_url = COALESCE($4, photo_url),
        location = COALESCE($5, location),
        permission_confirmed = COALESCE($6, permission_confirmed),
        status = COALESCE($7, status),
        is_published = COALESCE($8, is_published),
        is_featured = COALESCE($9, is_featured)
       WHERE id = $10`,
      [
        typeof title === 'string' ? title.trim() : null,
        typeof summary === 'string' ? summary.trim() : null,
        typeof body === 'string' ? body.trim() : null,
        typeof photo_url === 'string' ? photo_url.trim() : null,
        typeof location === 'string' ? location.trim() : null,
        typeof permission_confirmed === 'boolean' ? permission_confirmed : null,
        typeof status === 'string' ? status : null,
        typeof is_published === 'boolean' ? is_published : null,
        typeof is_featured === 'boolean' ? is_featured : null,
        Number(req.params.id),
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.delete('/impact-stories/:id', requirePermission('testimonials', 'delete'), async (req, res, next) => {
  try {
    await db.execute('DELETE FROM impact_stories WHERE id = $1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 6. NEWSLETTER
adminOperationsRouter.get('/newsletter', requirePermission('newsletter', 'view'), async (_req, res, next) => {
  try {
    const subscribers = await db.query<Record<string, unknown>>(
      'SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC'
    );
    const settings = await db.queryOne<{ newsletter_double_opt_in: unknown; newsletter_consent_text: string }>(
      'SELECT newsletter_double_opt_in, newsletter_consent_text FROM site_settings LIMIT 1'
    );
    res.json({
      subscribers: subscribers.map((s) => ({ ...s, consent_confirmed: asBool(s.consent_confirmed) })),
      settings: settings
        ? {
            newsletter_double_opt_in: asBool(settings.newsletter_double_opt_in),
            newsletter_consent_text: settings.newsletter_consent_text,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.put('/newsletter/settings', requirePermission('newsletter', 'edit'), async (req, res, next) => {
  try {
    const existing = await db.queryOne<{ id: number }>('SELECT id FROM site_settings LIMIT 1');
    if (!existing) {
      res.status(404).json({ error: 'Settings not found.' });
      return;
    }
    const { newsletter_double_opt_in, newsletter_consent_text } = req.body ?? {};
    await db.execute(
      `UPDATE site_settings SET
        newsletter_double_opt_in = COALESCE($1, newsletter_double_opt_in),
        newsletter_consent_text = COALESCE($2, newsletter_consent_text),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [
        typeof newsletter_double_opt_in === 'boolean' ? newsletter_double_opt_in : null,
        typeof newsletter_consent_text === 'string' ? newsletter_consent_text : null,
        existing.id,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.delete('/newsletter/:id', requirePermission('newsletter', 'delete'), async (req, res, next) => {
  try {
    await db.execute('DELETE FROM newsletter_subscribers WHERE id = $1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 7. SEO & SITE SETTINGS
adminOperationsRouter.get('/settings', requirePermission('settings', 'view'), async (_req, res, next) => {
  try {
    const s = await db.queryOne<Record<string, unknown>>('SELECT * FROM site_settings LIMIT 1');
    res.json({
      settings: s
        ? {
            ...s,
            announcement_bar_enabled: asBool(s.announcement_bar_enabled),
            cookie_notice_enabled: asBool(s.cookie_notice_enabled),
            robots_index: asBool(s.robots_index),
            sitemap_enabled: asBool(s.sitemap_enabled),
            contact_form_enabled: asBool(s.contact_form_enabled),
            newsletter_double_opt_in: asBool(s.newsletter_double_opt_in),
          }
        : null,
      // Read-only developer entitlement state — never editable via API
      developerEntitlements: {
        advanced_donations_unlocked: isAdvancedDonationsUnlocked(),
      },
    });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.put('/settings', requirePermission('settings', 'edit'), async (req, res, next) => {
  try {
    const existing = await db.queryOne<{ id: number }>('SELECT id FROM site_settings LIMIT 1');
    if (!existing) {
      res.status(404).json({ error: 'Site settings not found.' });
      return;
    }
    const {
      site_title,
      site_description,
      default_seo_title,
      default_seo_description,
      social_share_image,
      announcement_bar_enabled,
      announcement_bar_text,
      announcement_bar_link,
      timezone,
      default_currency,
      language,
      cookie_notice_enabled,
      cookie_notice_text,
      robots_index,
      sitemap_enabled,
    } = req.body ?? {};

    await db.execute(
      `UPDATE site_settings SET
        site_title = COALESCE($1, site_title),
        site_description = COALESCE($2, site_description),
        default_seo_title = COALESCE($3, default_seo_title),
        default_seo_description = COALESCE($4, default_seo_description),
        social_share_image = COALESCE($5, social_share_image),
        announcement_bar_enabled = COALESCE($6, announcement_bar_enabled),
        announcement_bar_text = COALESCE($7, announcement_bar_text),
        announcement_bar_link = COALESCE($8, announcement_bar_link),
        timezone = COALESCE($9, timezone),
        default_currency = COALESCE($10, default_currency),
        language = COALESCE($11, language),
        cookie_notice_enabled = COALESCE($12, cookie_notice_enabled),
        cookie_notice_text = COALESCE($13, cookie_notice_text),
        robots_index = COALESCE($14, robots_index),
        sitemap_enabled = COALESCE($15, sitemap_enabled),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $16`,
      [
        typeof site_title === 'string' ? site_title.trim() : null,
        typeof site_description === 'string' ? site_description.trim() : null,
        typeof default_seo_title === 'string' ? default_seo_title.trim() : null,
        typeof default_seo_description === 'string' ? default_seo_description.trim() : null,
        typeof social_share_image === 'string' ? social_share_image.trim() : null,
        typeof announcement_bar_enabled === 'boolean' ? announcement_bar_enabled : null,
        typeof announcement_bar_text === 'string' ? announcement_bar_text.trim() : null,
        typeof announcement_bar_link === 'string' ? announcement_bar_link.trim() : null,
        typeof timezone === 'string' ? timezone.trim() : null,
        typeof default_currency === 'string' ? default_currency.trim() : null,
        typeof language === 'string' ? language.trim() : null,
        typeof cookie_notice_enabled === 'boolean' ? cookie_notice_enabled : null,
        typeof cookie_notice_text === 'string' ? cookie_notice_text.trim() : null,
        typeof robots_index === 'boolean' ? robots_index : null,
        typeof sitemap_enabled === 'boolean' ? sitemap_enabled : null,
        existing.id,
      ]
    );

    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: 'site_settings_updated',
      module: 'settings',
      ipAddress: getClientIp(req),
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 8. USERS, ROLES, AUDIT LOGS & LOGIN ACTIVITY (Super Administrator Only)
adminOperationsRouter.get('/users', requirePermission('users', 'view'), async (_req, res, next) => {
  try {
    const [users, roles, permissions, loginAttempts, activityLogs] = await Promise.all([
      db.query<Record<string, unknown>>(
        `SELECT u.id, u.email, u.full_name, u.role_id, u.is_active, u.two_factor_enabled, u.last_login_at, u.created_at,
                r.slug as role_slug, r.name as role_name
         FROM admin_users u
         JOIN admin_roles r ON r.id = u.role_id
         ORDER BY u.id ASC`
      ),
      db.query<Record<string, unknown>>('SELECT * FROM admin_roles ORDER BY id ASC'),
      db.query<Record<string, unknown>>('SELECT * FROM admin_permissions ORDER BY role_id ASC, module_key ASC'),
      db.query<Record<string, unknown>>('SELECT * FROM login_attempts ORDER BY created_at DESC LIMIT 50'),
      db.query<Record<string, unknown>>('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100'),
    ]);

    res.json({
      users: users.map((u) => ({
        ...u,
        is_active: asBool(u.is_active),
        two_factor_enabled: asBool(u.two_factor_enabled),
      })),
      roles,
      permissions: permissions.map((p) => ({
        ...p,
        can_view: asBool(p.can_view),
        can_edit: asBool(p.can_edit),
        can_publish: asBool(p.can_publish),
        can_delete: asBool(p.can_delete),
      })),
      loginAttempts: loginAttempts.map((l) => ({ ...l, success: asBool(l.success) })),
      activityLogs,
    });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.post('/users', requirePermission('users', 'edit'), async (req, res, next) => {
  try {
    if (req.adminUser!.role_slug !== 'super_admin') {
      res.status(403).json({ error: 'Only Super Administrators can create new administrator accounts.' });
      return;
    }

    const { full_name, email, password, role_id } = req.body ?? {};
    if (!full_name || !email || !password || String(password).length < 10 || !role_id) {
      res.status(400).json({ error: 'Full name, valid email, role, and password (10+ characters) are required.' });
      return;
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await db.queryOne<{ id: number }>('SELECT id FROM admin_users WHERE email = $1', [cleanEmail]);
    if (existing) {
      res.status(409).json({ error: 'An administrator with this email already exists.' });
      return;
    }

    const role = await db.queryOne<{ id: number; slug: string }>('SELECT id, slug FROM admin_roles WHERE id = $1', [
      Number(role_id),
    ]);
    if (!role) {
      res.status(400).json({ error: 'Selected role does not exist.' });
      return;
    }

    const created = await db.queryOne<Record<string, unknown>>(
      `INSERT INTO admin_users (email, full_name, password_hash, role_id, is_active)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, email, full_name, role_id, is_active, created_at`,
      [cleanEmail, String(full_name).trim(), hashPassword(String(password)), role.id, true]
    );

    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: 'admin_user_created',
      module: 'users',
      targetId: created?.id as number,
      details: { email: cleanEmail, role: role.slug },
      ipAddress: getClientIp(req),
    });

    res.status(201).json({ user: created });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.put('/users/:id', requirePermission('users', 'edit'), async (req, res, next) => {
  try {
    if (req.adminUser!.role_slug !== 'super_admin') {
      res.status(403).json({ error: 'Only Super Administrators can modify administrator roles or status.' });
      return;
    }
    const targetId = Number(req.params.id);
    const { full_name, role_id, is_active } = req.body ?? {};

    if (targetId === req.adminUser!.id && is_active === false) {
      res.status(400).json({ error: 'You cannot deactivate your own active administrator account.' });
      return;
    }

    await db.execute(
      `UPDATE admin_users SET
        full_name = COALESCE($1, full_name),
        role_id = COALESCE($2, role_id),
        is_active = COALESCE($3, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [
        typeof full_name === 'string' ? full_name.trim() : null,
        role_id ? Number(role_id) : null,
        typeof is_active === 'boolean' ? is_active : null,
        targetId,
      ]
    );

    if (is_active === false) {
      await db.execute('UPDATE admin_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL', [
        targetId,
      ]);
    }

    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: 'admin_user_updated',
      module: 'users',
      targetId,
      ipAddress: getClientIp(req),
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminOperationsRouter.post('/users/:id/reset-token', requirePermission('users', 'edit'), async (req, res, next) => {
  try {
    if (req.adminUser!.role_slug !== 'super_admin') {
      res.status(403).json({ error: 'Only Super Administrators can issue password reset tokens.' });
      return;
    }
    const targetId = Number(req.params.id);
    const rawToken = generateRandomToken(20);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await db.execute(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [targetId, hashToken(rawToken), expiresAt]
    );

    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: 'password_reset_token_issued',
      module: 'users',
      targetId,
      ipAddress: getClientIp(req),
    });

    res.json({ resetToken: rawToken, expiresAt });
  } catch (err) {
    next(err);
  }
});
