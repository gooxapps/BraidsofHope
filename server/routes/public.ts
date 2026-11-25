import { Router } from 'express';
import {
  createAdminNotification,
  extractBearerToken,
  isAdvancedDonationsUnlocked,
  resolveAdminFromToken,
} from '../auth.ts';
import { asBool, db } from '../db.ts';

export const publicRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseJsonSafe<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

publicRouter.get('/bootstrap', async (req, res, next) => {
  try {
    let isPreview = false;
    if (req.query.preview === 'true') {
      const token = extractBearerToken(req);
      if (token) {
        const admin = await resolveAdminFromToken(token);
        if (admin) isPreview = true;
      }
    }

    const siteSettings = await db.queryOne<Record<string, unknown>>('SELECT * FROM site_settings LIMIT 1');
    const brandingRaw = await db.queryOne<Record<string, unknown>>('SELECT * FROM branding_settings LIMIT 1');
    const footerRaw = await db.queryOne<Record<string, unknown>>('SELECT * FROM footer_settings LIMIT 1');

    let branding = brandingRaw;
    if (isPreview && brandingRaw?.draft_json && String(brandingRaw.draft_json).trim()) {
      const draft = parseJsonSafe<Record<string, unknown>>(String(brandingRaw.draft_json), {});
      branding = { ...brandingRaw, ...draft };
    }

    const navRows = await db.query<Record<string, unknown>>(
      'SELECT * FROM navigation_items ORDER BY sort_order ASC, id ASC'
    );
    const navigation = navRows
      .filter((n) => asBool(n.is_visible))
      .map((n) => ({
        ...n,
        is_visible: asBool(n.is_visible),
        open_in_new_tab: asBool(n.open_in_new_tab),
      }));

    const sectionRows = await db.query<Record<string, unknown>>(
      'SELECT * FROM homepage_sections ORDER BY sort_order ASC, id ASC'
    );
    const homepageSections = sectionRows
      .map((s) => {
        let merged = { ...s };
        if (isPreview && s.draft_json && String(s.draft_json).trim()) {
          const draft = parseJsonSafe<Record<string, unknown>>(String(s.draft_json), {});
          merged = { ...merged, ...draft };
        }
        return {
          ...merged,
          is_visible: asBool(merged.is_visible),
          is_system: asBool(merged.is_system),
          config: parseJsonSafe<Record<string, unknown>>(String(merged.config_json || '{}'), {}),
        };
      })
      .filter((s) => isPreview || s.is_visible);

    const pageRows = await db.query<Record<string, unknown>>(
      'SELECT * FROM pages ORDER BY sort_order ASC, id ASC'
    );
    const pages = pageRows
      .filter((p) => isPreview || p.status === 'published')
      .map((p) => {
        const blocksSource =
          isPreview && p.draft_blocks_json && String(p.draft_blocks_json).trim()
            ? String(p.draft_blocks_json)
            : String(p.content_blocks_json || '[]');
        return {
          ...p,
          is_system_page: asBool(p.is_system_page),
          blocks: parseJsonSafe<Array<Record<string, unknown>>>(blocksSource, []),
        };
      });

    const progRows = await db.query<Record<string, unknown>>(
      'SELECT * FROM programmes ORDER BY sort_order ASC, id ASC'
    );
    const programmes = progRows
      .filter((pr) => isPreview || asBool(pr.is_published))
      .map((pr) => ({
        ...pr,
        is_published: asBool(pr.is_published),
      }));

    const donationsUnlocked = isAdvancedDonationsUnlocked();

    const campaignRows = await db.query<Record<string, unknown>>(
      'SELECT * FROM campaigns ORDER BY is_featured DESC, created_at DESC'
    );

    const verifiedTotalsRows = donationsUnlocked
      ? await db.query<{ campaign_id: number; total_cents: number }>(
          `SELECT campaign_id, COALESCE(SUM(amount_cents), 0) as total_cents
           FROM donations
           WHERE status = 'successful' AND campaign_id IS NOT NULL
           GROUP BY campaign_id`
        )
      : [];

    const totalsMap = new Map<number, number>();
    for (const row of verifiedTotalsRows) {
      totalsMap.set(Number(row.campaign_id), Number(row.total_cents || 0));
    }

    const campaigns = campaignRows
      .filter((c) => isPreview || asBool(c.is_published))
      .map((c) => ({
        ...c,
        is_featured: asBool(c.is_featured),
        is_published: asBool(c.is_published),
        is_christmas_programme: asBool(c.is_christmas_programme),
        verified_raised_cents: donationsUnlocked ? totalsMap.get(Number(c.id)) ?? 0 : 0,
      }));

    const eventRows = await db.query<Record<string, unknown>>(
      'SELECT * FROM events ORDER BY event_date ASC, id DESC'
    );
    const events = eventRows
      .filter((e) => isPreview || asBool(e.is_published))
      .map((e) => ({
        ...e,
        is_published: asBool(e.is_published),
      }));

    const testimonialRows = await db.query<Record<string, unknown>>(
      'SELECT * FROM testimonials ORDER BY is_featured DESC, created_at DESC'
    );
    const testimonials = testimonialRows
      .filter((t) => isPreview || asBool(t.is_published))
      .map((t) => ({
        ...t,
        is_published: asBool(t.is_published),
        is_featured: asBool(t.is_featured),
        permission_confirmed: asBool(t.permission_confirmed),
      }));

    const storyRows = await db.query<Record<string, unknown>>(
      'SELECT * FROM impact_stories ORDER BY is_featured DESC, created_at DESC'
    );
    const impactStories = storyRows
      .filter((s) => isPreview || asBool(s.is_published))
      .map((s) => ({
        ...s,
        is_published: asBool(s.is_published),
        is_featured: asBool(s.is_featured),
        permission_confirmed: asBool(s.permission_confirmed),
      }));

    const teamRows = await db.query<Record<string, unknown>>(
      'SELECT * FROM team_members ORDER BY sort_order ASC, id ASC'
    );
    const teamMembers = teamRows
      .filter((m) => isPreview || asBool(m.is_published))
      .map((m) => ({
        ...m,
        is_published: asBool(m.is_published),
      }));

    const oppRows = await db.query<Record<string, unknown>>(
      'SELECT * FROM volunteer_opportunities ORDER BY sort_order ASC, id ASC'
    );
    const volunteerOpportunities = oppRows
      .filter((o) => isPreview || asBool(o.is_published))
      .map((o) => ({
        ...o,
        is_published: asBool(o.is_published),
      }));

    const footer = footerRaw
      ? {
          ...footerRaw,
          show_newsletter: asBool(footerRaw.show_newsletter),
          quick_links: parseJsonSafe<Array<{ label: string; href: string }>>(
            String(footerRaw.quick_links_json || '[]'),
            []
          ),
          social_links: parseJsonSafe<Record<string, string>>(String(footerRaw.social_links_json || '{}'), {}),
        }
      : null;

    const normalizedSettings = siteSettings
      ? {
          ...siteSettings,
          announcement_bar_enabled: asBool(siteSettings.announcement_bar_enabled),
          cookie_notice_enabled: asBool(siteSettings.cookie_notice_enabled),
          robots_index: asBool(siteSettings.robots_index),
          sitemap_enabled: asBool(siteSettings.sitemap_enabled),
          contact_form_enabled: asBool(siteSettings.contact_form_enabled),
          newsletter_double_opt_in: asBool(siteSettings.newsletter_double_opt_in),
        }
      : null;

    res.json({
      isPreview,
      donationsUnlocked,
      siteSettings: normalizedSettings,
      branding,
      navigation,
      footer,
      homepageSections,
      pages,
      programmes,
      campaigns,
      events,
      testimonials,
      impactStories,
      teamMembers,
      volunteerOpportunities,
    });
  } catch (err) {
    next(err);
  }
});

publicRouter.post('/contact', async (req, res, next) => {
  try {
    const { name, email, phone, subject, region, message } = req.body ?? {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Please provide your name.' });
      return;
    }
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      res.status(400).json({ error: 'Please enter a message.' });
      return;
    }

    const row = await db.queryOne<{ id: number }>(
      `INSERT INTO contact_submissions (name, email, phone, subject, region, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'new') RETURNING id`,
      [
        name.trim().slice(0, 140),
        email.trim().toLowerCase().slice(0, 180),
        typeof phone === 'string' ? phone.trim().slice(0, 60) : '',
        typeof subject === 'string' ? subject.trim().slice(0, 200) : 'General Enquiry',
        typeof region === 'string' ? region.trim().slice(0, 80) : 'Canada',
        message.trim().slice(0, 4000),
      ]
    );

    await createAdminNotification({
      type: 'contact',
      title: 'New Contact Submission',
      message: `${name.trim()} sent an enquiry (${typeof subject === 'string' && subject.trim() ? subject.trim() : 'General Enquiry'}).`,
      linkModule: 'contact',
      relatedId: row?.id,
    });

    res.status(201).json({ ok: true, id: row?.id, message: 'Thank you for reaching out. Our team will respond shortly.' });
  } catch (err) {
    next(err);
  }
});

publicRouter.post('/volunteer', async (req, res, next) => {
  try {
    const { full_name, email, phone, city_country, availability, skills_interests, opportunity_title, message } =
      req.body ?? {};
    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      res.status(400).json({ error: 'Full name is required.' });
      return;
    }
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const row = await db.queryOne<{ id: number }>(
      `INSERT INTO volunteer_applications
       (full_name, email, phone, city_country, availability, skills_interests, opportunity_title, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new') RETURNING id`,
      [
        full_name.trim().slice(0, 140),
        email.trim().toLowerCase().slice(0, 180),
        typeof phone === 'string' ? phone.trim().slice(0, 60) : '',
        typeof city_country === 'string' ? city_country.trim().slice(0, 140) : '',
        typeof availability === 'string' ? availability.trim().slice(0, 140) : '',
        typeof skills_interests === 'string' ? skills_interests.trim().slice(0, 500) : '',
        typeof opportunity_title === 'string' ? opportunity_title.trim().slice(0, 200) : '',
        typeof message === 'string' ? message.trim().slice(0, 3000) : '',
      ]
    );

    await createAdminNotification({
      type: 'volunteer',
      title: 'New Volunteer Application',
      message: `${full_name.trim()} applied to volunteer${opportunity_title ? ` (${opportunity_title})` : ''}.`,
      linkModule: 'get_involved',
      relatedId: row?.id,
    });

    res.status(201).json({ ok: true, id: row?.id, message: 'Your volunteer application has been received.' });
  } catch (err) {
    next(err);
  }
});

publicRouter.post('/partnership', async (req, res, next) => {
  try {
    const { organization_name, contact_name, email, phone, partnership_type, message } = req.body ?? {};
    if (!organization_name || typeof organization_name !== 'string' || !organization_name.trim()) {
      res.status(400).json({ error: 'Organization name is required.' });
      return;
    }
    if (!contact_name || typeof contact_name !== 'string' || !contact_name.trim()) {
      res.status(400).json({ error: 'Contact person name is required.' });
      return;
    }
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const row = await db.queryOne<{ id: number }>(
      `INSERT INTO partnership_enquiries
       (organization_name, contact_name, email, phone, partnership_type, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'new') RETURNING id`,
      [
        organization_name.trim().slice(0, 180),
        contact_name.trim().slice(0, 140),
        email.trim().toLowerCase().slice(0, 180),
        typeof phone === 'string' ? phone.trim().slice(0, 60) : '',
        typeof partnership_type === 'string' ? partnership_type.trim().slice(0, 120) : 'Community Partner',
        typeof message === 'string' ? message.trim().slice(0, 3000) : '',
      ]
    );

    await createAdminNotification({
      type: 'partnership',
      title: 'New Partnership Enquiry',
      message: `${organization_name.trim()} submitted a partnership enquiry.`,
      linkModule: 'get_involved',
      relatedId: row?.id,
    });

    res.status(201).json({ ok: true, id: row?.id, message: 'Thank you. Our team will review your partnership enquiry.' });
  } catch (err) {
    next(err);
  }
});

publicRouter.post('/newsletter', async (req, res, next) => {
  try {
    const { email, full_name, consent_confirmed, source } = req.body ?? {};
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    if (!consent_confirmed) {
      res.status(400).json({ error: 'Please confirm your consent to receive updates in accordance with Canadian privacy standards.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase().slice(0, 180);
    const settings = await db.queryOne<{ newsletter_double_opt_in: unknown }>(
      'SELECT newsletter_double_opt_in FROM site_settings LIMIT 1'
    );
    const doubleOptIn = settings ? asBool(settings.newsletter_double_opt_in) : true;
    const status = doubleOptIn ? 'pending_confirmation' : 'confirmed';

    const existing = await db.queryOne<{ id: number }>(
      'SELECT id FROM newsletter_subscribers WHERE email = $1 LIMIT 1',
      [cleanEmail]
    );

    if (existing) {
      await db.execute(
        `UPDATE newsletter_subscribers
         SET full_name = $1, consent_confirmed = $2, confirmation_status = $3, unsubscribed_at = NULL
         WHERE id = $4`,
        [
          typeof full_name === 'string' ? full_name.trim().slice(0, 140) : '',
          true,
          status,
          existing.id,
        ]
      );
    } else {
      await db.execute(
        `INSERT INTO newsletter_subscribers (email, full_name, consent_confirmed, confirmation_status, source)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          cleanEmail,
          typeof full_name === 'string' ? full_name.trim().slice(0, 140) : '',
          true,
          status,
          typeof source === 'string' ? source.trim().slice(0, 80) : 'website_footer',
        ]
      );
    }

    res.status(201).json({
      ok: true,
      confirmation_status: status,
      message: doubleOptIn
        ? 'Thank you for subscribing. Your subscription is recorded and awaiting confirmation.'
        : 'Thank you for subscribing to BraidsofHope updates.',
    });
  } catch (err) {
    next(err);
  }
});

publicRouter.post('/donations', async (req, res, next) => {
  try {
    if (!isAdvancedDonationsUnlocked()) {
      res.status(403).json({
        error: 'Online donation processing is currently locked by the platform entitlement configuration.',
      });
      return;
    }

    const { campaign_id, donor_name, donor_email, amount_dollars, currency, payment_method, transaction_ref } =
      req.body ?? {};
    const amountNum = Number(amount_dollars);
    if (!Number.isFinite(amountNum) || amountNum < 1 || amountNum > 1000000) {
      res.status(400).json({ error: 'Please enter a valid donation amount.' });
      return;
    }
    if (!donor_email || typeof donor_email !== 'string' || !EMAIL_REGEX.test(donor_email.trim())) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const amountCents = Math.round(amountNum * 100);
    const method = typeof payment_method === 'string' ? payment_method.trim() : 'bank_transfer';
    const initialStatus = method === 'bank_transfer' ? 'awaiting_verification' : 'pending';
    const ref =
      typeof transaction_ref === 'string' && transaction_ref.trim()
        ? transaction_ref.trim().slice(0, 120)
        : `BOH-${Date.now()}`;

    const donation = await db.queryOne<{ id: number }>(
      `INSERT INTO donations (campaign_id, donor_name, donor_email, amount_cents, currency, payment_method, status, transaction_ref)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        campaign_id ? Number(campaign_id) : null,
        typeof donor_name === 'string' ? donor_name.trim().slice(0, 140) : 'Anonymous Donor',
        donor_email.trim().toLowerCase().slice(0, 180),
        amountCents,
        typeof currency === 'string' ? currency.trim().slice(0, 10) : 'CAD',
        method,
        initialStatus,
        ref,
      ]
    );

    if (donation) {
      await db.execute(
        `INSERT INTO donation_transactions (donation_id, gateway, gateway_ref, event_type, amount_cents, status, raw_note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          donation.id,
          method,
          ref,
          'donation_submitted',
          amountCents,
          initialStatus,
          'Submitted via public donation form',
        ]
      );

      await createAdminNotification({
        type: initialStatus === 'awaiting_verification' ? 'donation_verification' : 'donation',
        title:
          initialStatus === 'awaiting_verification'
            ? 'Pending Manual Payment Verification'
            : 'New Donation Record',
        message: `${donor_name || 'Donor'} submitted ${amountNum.toFixed(2)} ${currency || 'CAD'} (${ref}).`,
        linkModule: 'donations',
        relatedId: donation.id,
      });
    }

    res.status(201).json({
      ok: true,
      id: donation?.id,
      status: initialStatus,
      transaction_ref: ref,
      message:
        initialStatus === 'awaiting_verification'
          ? 'Thank you. Your bank transfer reference has been recorded and awaits administrator verification.'
          : 'Thank you. Your donation record has been created.',
    });
  } catch (err) {
    next(err);
  }
});
