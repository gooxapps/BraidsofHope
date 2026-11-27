import { db } from './db.ts';

export const ALL_MODULES = [
  'overview',
  'notifications',
  'branding',
  'media',
  'homepage',
  'pages',
  'about',
  'programmes',
  'campaigns',
  'donations',
  'get_involved',
  'contact',
  'testimonials',
  'navigation',
  'newsletter',
  'settings',
  'users',
] as const;

export type ModuleKey = (typeof ALL_MODULES)[number];

const ROLE_DEFINITIONS: Array<{
  slug: string;
  name: string;
  description: string;
  modules: Record<ModuleKey, { view: boolean; edit: boolean; publish: boolean; del: boolean }>;
}> = [
  {
    slug: 'super_admin',
    name: 'Super Administrator',
    description: 'Full administrative control across all website, campaign, donation, and user security modules.',
    modules: Object.fromEntries(
      ALL_MODULES.map((m) => [m, { view: true, edit: true, publish: true, del: true }])
    ) as Record<ModuleKey, { view: boolean; edit: boolean; publish: boolean; del: boolean }>,
  },
  {
    slug: 'website_admin',
    name: 'Website Administrator',
    description: 'Manages branding, media, pages, homepage, programmes, navigation, footer, and settings.',
    modules: {
      overview: { view: true, edit: false, publish: false, del: false },
      notifications: { view: true, edit: true, publish: false, del: false },
      branding: { view: true, edit: true, publish: true, del: false },
      media: { view: true, edit: true, publish: true, del: true },
      homepage: { view: true, edit: true, publish: true, del: true },
      pages: { view: true, edit: true, publish: true, del: true },
      about: { view: true, edit: true, publish: true, del: true },
      programmes: { view: true, edit: true, publish: true, del: true },
      campaigns: { view: true, edit: true, publish: true, del: false },
      donations: { view: false, edit: false, publish: false, del: false },
      get_involved: { view: true, edit: true, publish: true, del: false },
      contact: { view: true, edit: true, publish: true, del: false },
      testimonials: { view: true, edit: true, publish: true, del: true },
      navigation: { view: true, edit: true, publish: true, del: true },
      newsletter: { view: true, edit: true, publish: false, del: true },
      settings: { view: true, edit: true, publish: true, del: false },
      users: { view: false, edit: false, publish: false, del: false },
    },
  },
  {
    slug: 'content_manager',
    name: 'Content Manager',
    description: 'Edits pages, homepage sections, About Us story, Our Work programmes, media, and stories.',
    modules: {
      overview: { view: true, edit: false, publish: false, del: false },
      notifications: { view: true, edit: true, publish: false, del: false },
      branding: { view: false, edit: false, publish: false, del: false },
      media: { view: true, edit: true, publish: true, del: false },
      homepage: { view: true, edit: true, publish: true, del: false },
      pages: { view: true, edit: true, publish: true, del: false },
      about: { view: true, edit: true, publish: true, del: false },
      programmes: { view: true, edit: true, publish: true, del: false },
      campaigns: { view: false, edit: false, publish: false, del: false },
      donations: { view: false, edit: false, publish: false, del: false },
      get_involved: { view: true, edit: true, publish: true, del: false },
      contact: { view: true, edit: false, publish: false, del: false },
      testimonials: { view: true, edit: true, publish: true, del: false },
      navigation: { view: true, edit: true, publish: true, del: false },
      newsletter: { view: false, edit: false, publish: false, del: false },
      settings: { view: false, edit: false, publish: false, del: false },
      users: { view: false, edit: false, publish: false, del: false },
    },
  },
  {
    slug: 'donation_manager',
    name: 'Donation Manager',
    description: 'Reviews donations, verifies manual bank transfers, adds notes, and views campaign totals.',
    modules: {
      overview: { view: true, edit: false, publish: false, del: false },
      notifications: { view: true, edit: true, publish: false, del: false },
      branding: { view: false, edit: false, publish: false, del: false },
      media: { view: false, edit: false, publish: false, del: false },
      homepage: { view: false, edit: false, publish: false, del: false },
      pages: { view: false, edit: false, publish: false, del: false },
      about: { view: false, edit: false, publish: false, del: false },
      programmes: { view: false, edit: false, publish: false, del: false },
      campaigns: { view: true, edit: false, publish: false, del: false },
      donations: { view: true, edit: true, publish: true, del: false },
      get_involved: { view: false, edit: false, publish: false, del: false },
      contact: { view: false, edit: false, publish: false, del: false },
      testimonials: { view: false, edit: false, publish: false, del: false },
      navigation: { view: false, edit: false, publish: false, del: false },
      newsletter: { view: true, edit: false, publish: false, del: false },
      settings: { view: false, edit: false, publish: false, del: false },
      users: { view: false, edit: false, publish: false, del: false },
    },
  },
  {
    slug: 'campaign_manager',
    name: 'Campaign Manager',
    description: 'Manages fundraising campaigns, events, Christmas programme, volunteer drives, and impact stories.',
    modules: {
      overview: { view: true, edit: false, publish: false, del: false },
      notifications: { view: true, edit: true, publish: false, del: false },
      branding: { view: false, edit: false, publish: false, del: false },
      media: { view: true, edit: true, publish: true, del: false },
      homepage: { view: false, edit: false, publish: false, del: false },
      pages: { view: false, edit: false, publish: false, del: false },
      about: { view: false, edit: false, publish: false, del: false },
      programmes: { view: false, edit: false, publish: false, del: false },
      campaigns: { view: true, edit: true, publish: true, del: true },
      donations: { view: false, edit: false, publish: false, del: false },
      get_involved: { view: true, edit: true, publish: true, del: false },
      contact: { view: false, edit: false, publish: false, del: false },
      testimonials: { view: true, edit: true, publish: true, del: false },
      navigation: { view: false, edit: false, publish: false, del: false },
      newsletter: { view: false, edit: false, publish: false, del: false },
      settings: { view: false, edit: false, publish: false, del: false },
      users: { view: false, edit: false, publish: false, del: false },
    },
  },
];

export async function seedInitialData(): Promise<void> {
  // 1. Roles and permissions (idempotent upsert)
  for (const roleDef of ROLE_DEFINITIONS) {
    let role = await db.queryOne<{ id: number }>('SELECT id FROM admin_roles WHERE slug = $1', [roleDef.slug]);
    if (!role) {
      role = await db.queryOne<{ id: number }>(
        'INSERT INTO admin_roles (slug, name, description, is_system) VALUES ($1, $2, $3, $4) RETURNING id',
        [roleDef.slug, roleDef.name, roleDef.description, true]
      );
    }
    if (role) {
      for (const [moduleKey, perms] of Object.entries(roleDef.modules)) {
        const existingPerm = await db.queryOne<{ id: number }>(
          'SELECT id FROM admin_permissions WHERE role_id = $1 AND module_key = $2',
          [role.id, moduleKey]
        );
        if (!existingPerm) {
          await db.execute(
            `INSERT INTO admin_permissions (role_id, module_key, can_view, can_edit, can_publish, can_delete)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [role.id, moduleKey, perms.view, perms.edit, perms.publish, perms.del]
          );
        }
      }
    }
  }

  // 2. Site Settings
  const existingSettings = await db.queryOne<{ id: number }>('SELECT id FROM site_settings LIMIT 1');
  if (!existingSettings) {
    await db.execute(
      `INSERT INTO site_settings (
        site_title, site_description, default_seo_title, default_seo_description,
        social_share_image, announcement_bar_enabled, announcement_bar_text, announcement_bar_link,
        timezone, default_currency, language, cookie_notice_enabled, cookie_notice_text,
        robots_index, sitemap_enabled, contact_email, phone, whatsapp_number,
        office_address, edmonton_contact, nigeria_contact, business_hours,
        contact_form_enabled, newsletter_double_opt_in, newsletter_consent_text
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
      [
        'BraidsofHope — Weaving a Tapestry of Hope for Today and Tomorrow',
        'BraidsofHope is a registered charitable organization in Canada dedicated to bringing hope to underprivileged children and families through food support and essential care.',
        'BraidsofHope | Registered Canadian Charity',
        'Weaving a tapestry of hope for today and tomorrow. Supporting underprivileged children and families with food support, essential care, and community outreach across Canada and Nigeria.',
        '/src/assets/images/hero_children_joy_1795572430838.jpg',
        false,
        'Upcoming Christmas Fundraising Programme — Details coming soon.',
        '/events-campaigns',
        'America/Edmonton',
        'CAD',
        'en-CA',
        true,
        'We use essential cookies to keep this website secure and responsive. You may review our Privacy Policy for details on Canadian privacy compliance.',
        true,
        true,
        'braidsofhope@outlook.com',
        '',
        '',
        'Edmonton, Alberta, Canada',
        'Edmonton Chapter — Alberta, Canada (braidsofhope@outlook.com)',
        'Nigeria Outreach Coordination — Community Support',
        'Monday – Friday, 9:00 AM – 5:00 PM MST',
        true,
        true,
        'Yes, I consent to receive email updates, newsletters, and campaign news from BraidsofHope in accordance with Canadian Anti-Spam Legislation (CASL). I can unsubscribe at any time.',
      ]
    );
  }

  // 3. Branding Settings
  const existingBranding = await db.queryOne<{ id: number }>('SELECT id FROM branding_settings LIMIT 1');
  if (!existingBranding) {
    await db.execute(
      `INSERT INTO branding_settings (
        org_name, tagline, brand_description,
        primary_color, secondary_color, accent_color, background_color, footer_bg_color, footer_text_color,
        heading_font, body_font, logo_main_url, logo_footer_url, favicon_url
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        'BraidsofHope',
        'Weaving a tapestry of hope for today and tomorrow.',
        'A registered charitable organization in Canada dedicated to bringing hope to underprivileged children and families through food support and essential care.',
        '#52154E',
        '#0099A8',
        '#F57C00',
        '#FFFFFF',
        '#FAFAFC',
        '#1F2937',
        'Playfair Display',
        'Plus Jakarta Sans',
        '/assets/aistudio/image_654ecb55.png',
        '/assets/aistudio/image_654ecb55.png',
        '/assets/aistudio/image_654ecb55.png',
      ]
    );
  }

  // 4. Media Library initial assets (our generated high-resolution imagery)
  const existingMedia = await db.queryOne<{ id: number }>('SELECT id FROM media_files LIMIT 1');
  if (!existingMedia) {
    const seededMedia = [
      {
        filename: 'hero_children_joy_1795572430838.jpg',
        original_name: 'hero_children_joy.jpg',
        url: '/src/assets/images/hero_children_joy_1795572430838.jpg',
        folder: 'Homepage Hero',
        alt_text: 'Joyful children smiling together outdoors in warm golden light',
        description: 'Primary homepage hero photography representing hope and community.',
        width: 1408,
        height: 792,
      },
      {
        filename: 'story_hands_heart_1795572431498.jpg',
        original_name: 'story_hands_heart.jpg',
        url: '/src/assets/images/story_hands_heart_1795572431498.jpg',
        folder: 'About Us',
        alt_text: 'Hands of different generations gently holding a red heart together',
        description: 'Our Story visual symbolizing compassion, unity, and woven support.',
        width: 1200,
        height: 900,
      },
      {
        filename: 'programme_food_outreach_1795572432556.jpg',
        original_name: 'programme_food_outreach.jpg',
        url: '/src/assets/images/programme_food_outreach_1795572432556.jpg',
        folder: 'Our Work',
        alt_text: 'Community volunteers packing nutritious pantry boxes in a bright hall',
        description: 'Food Support programme outreach photography.',
        width: 1200,
        height: 900,
      },
      {
        filename: 'braidsofhope-official-logo.png',
        original_name: 'braidsofhope-logo.png',
        url: '/assets/aistudio/image_654ecb55.png',
        folder: 'Brand Assets',
        alt_text: 'Official BraidsofHope braided heart logo',
        description: 'Official BraidsofHope organization logo on white background.',
        width: 1200,
        height: 750,
      },
      {
        filename: 'campaign_christmas_hope_1795572431573.jpg',
        original_name: 'campaign_christmas_hope.jpg',
        url: '/src/assets/images/campaign_christmas_hope_1795572431573.jpg',
        folder: 'Campaigns',
        alt_text: 'Wrapped community holiday gift boxes with woven ribbons and evergreen',
        description: 'Christmas Fundraising Programme campaign image.',
        width: 1200,
        height: 900,
      },
    ];

    for (const item of seededMedia) {
      await db.execute(
        `INSERT INTO media_files (filename, original_name, url, mime_type, file_size, width, height, folder, alt_text, description, storage_provider)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          item.filename,
          item.original_name,
          item.url,
          'image/jpeg',
          245000,
          item.width,
          item.height,
          item.folder,
          item.alt_text,
          item.description,
          'local',
        ]
      );
    }
  }

  // 5. Homepage Sections
  const existingSections = await db.queryOne<{ id: number }>('SELECT id FROM homepage_sections LIMIT 1');
  if (!existingSections) {
    const sections = [
      {
        section_key: 'hero',
        section_type: 'hero',
        title: 'Together, We Can Make a Difference',
        subtitle: 'Weaving a tapestry of hope for today and tomorrow.',
        body_text:
          'BraidsofHope is a registered charitable organization in Canada dedicated to bringing hope to underprivileged children and families through food support and essential care.',
        image_url: '/src/assets/images/hero_children_joy_1795572430838.jpg',
        bg_color: '#FFFFFF',
        cta_label: 'Donate Now',
        cta_link: '/donate',
        secondary_cta_label: 'Get Involved',
        secondary_cta_link: '/get-involved',
        config_json: JSON.stringify({
          quoteText: 'Every act of kindness is a thread... Together, we weave a tapestry of hope.',
          locationTag: 'Canada · Nigeria',
        }),
        is_system: true,
        sort_order: 1,
      },
      {
        section_key: 'values',
        section_type: 'values',
        title: 'Our Core Values',
        subtitle: 'Guided by dignity, transparency, and community solidarity.',
        body_text: '',
        image_url: '',
        bg_color: '#FFFFFF',
        cta_label: '',
        cta_link: '',
        secondary_cta_label: '',
        secondary_cta_link: '',
        config_json: JSON.stringify({
          items: [
            { title: 'Compassion', subtitle: 'Caring for those in need', icon: 'Heart' },
            { title: 'Community', subtitle: 'Stronger together', icon: 'Users' },
            { title: 'Hope', subtitle: 'A brighter future', icon: 'Handshake' },
            { title: 'Impact', subtitle: 'Real change in lives', icon: 'Sprout' },
          ],
        }),
        is_system: true,
        sort_order: 2,
      },
      {
        section_key: 'story_and_work',
        section_type: 'story_and_work',
        title: 'Our Story',
        subtitle: 'Weaving a tapestry of hope for today and tomorrow.',
        body_text:
          'BraidsofHope represents the weaving together of acts of kindness, compassion, generosity, and support to create a tapestry of hope for today and tomorrow.',
        image_url: '/src/assets/images/story_hands_heart_1795572431498.jpg',
        bg_color: '#FFFFFF',
        cta_label: 'Learn More About Us',
        cta_link: '/about-us',
        secondary_cta_label: 'Explore Our Work',
        secondary_cta_link: '/our-work',
        config_json: JSON.stringify({
          workHeading: 'Our Work',
          workSubheading: 'Making a difference where it matters most.',
        }),
        is_system: true,
        sort_order: 3,
      },
      {
        section_key: 'mission_vision',
        section_type: 'mission_vision',
        title: 'Mission & Vision',
        subtitle: 'Rooted in purposeful, compassionate action.',
        body_text:
          'Welcome to BraidsofHope. We partner with families, volunteers, and community allies to provide dignified essentials and sustainable support.',
        image_url: '/src/assets/images/programme_food_outreach_1795572432556.jpg',
        bg_color: '#FFFFFF',
        cta_label: 'Read Our Story',
        cta_link: '/about-us',
        secondary_cta_label: '',
        secondary_cta_link: '',
        config_json: JSON.stringify({
          welcomeMessage:
            'Welcome to BraidsofHope — a community-driven Canadian charity bringing practical care and lasting encouragement to families.',
          missionStatement:
            'To bring hope to underprivileged children and families by providing food support, essential items, and compassionate care.',
          visionStatement:
            'A world where every child and family has access to basic nourishment, essential care, and a supportive community to thrive.',
        }),
        is_visible: false,
        is_system: true,
        sort_order: 4,
      },
      {
        section_key: 'featured_initiatives',
        section_type: 'initiatives',
        title: 'Take Action With Us',
        subtitle: 'Join our programmes, volunteer efforts, and upcoming seasonal outreach.',
        body_text: '',
        image_url: '/src/assets/images/campaign_christmas_hope_1795572431573.jpg',
        bg_color: '#FFFFFF',
        cta_label: '',
        cta_link: '',
        secondary_cta_label: '',
        secondary_cta_link: '',
        config_json: JSON.stringify({
          cards: [
            {
              title: 'Support Our Christmas Programme',
              description: 'Upcoming seasonal outreach to bring joy and support to children and families.',
              ctaLabel: 'View Programme',
              ctaLink: '/events-campaigns',
              color: '#52154E',
            },
            {
              title: 'Get Involved',
              description: 'Volunteer, partner, or support our community outreach mission.',
              ctaLabel: 'Join Us',
              ctaLink: '/get-involved',
              color: '#0099A8',
            },
            {
              title: 'Make a Donation',
              description: 'Every contribution helps sustain food support and essential care.',
              ctaLabel: 'Give Hope Today',
              ctaLink: '/donate',
              color: '#F57C00',
            },
          ],
        }),
        is_visible: true,
        is_system: true,
        sort_order: 5,
      },
    ];

    for (const s of sections) {
      const visible = 'is_visible' in s && typeof s.is_visible === 'boolean' ? s.is_visible : true;
      await db.execute(
        `INSERT INTO homepage_sections (
          section_key, section_type, title, subtitle, body_text, image_url, bg_color,
          cta_label, cta_link, secondary_cta_label, secondary_cta_link,
          config_json, is_visible, is_system, sort_order
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          s.section_key,
          s.section_type,
          s.title,
          s.subtitle,
          s.body_text,
          s.image_url,
          s.bg_color,
          s.cta_label,
          s.cta_link,
          s.secondary_cta_label,
          s.secondary_cta_link,
          s.config_json,
          visible,
          s.is_system,
          s.sort_order,
        ]
      );
    }
  }

  // 6. System Pages
  const existingPages = await db.queryOne<{ id: number }>('SELECT id FROM pages LIMIT 1');
  if (!existingPages) {
    const pagesSeed = [
      {
        slug: 'home',
        title: 'Home',
        subtitle: 'Weaving a tapestry of hope for today and tomorrow.',
        hero_image_url: '/src/assets/images/hero_children_joy_1795572430838.jpg',
        content_blocks_json: JSON.stringify([
          {
            id: 'home-intro',
            heading: 'Together, We Can Make a Difference',
            body: 'Homepage content is actively orchestrated through the Homepage Editor.',
            ctaLabel: 'Get Involved',
            ctaLink: '/get-involved',
          },
        ]),
        seo_title: 'BraidsofHope — Registered Canadian Charity',
        seo_description:
          'BraidsofHope brings hope to underprivileged children and families through food support, essential items, and compassionate community care.',
        is_system_page: true,
        sort_order: 1,
      },
      {
        slug: 'about-us',
        title: 'About Us',
        subtitle: 'The story, meaning, and values behind BraidsofHope.',
        hero_image_url: '/src/assets/images/story_hands_heart_1795572431498.jpg',
        content_blocks_json: JSON.stringify([
          {
            id: 'meaning',
            heading: 'The Meaning of BraidsofHope',
            body: 'Just like individual strands woven together into a strong braid, BraidsofHope brings together acts of kindness, compassion, generosity, and community care to create lasting strength and hope for families.',
          },
          {
            id: 'story',
            heading: 'Our Story & History',
            body: 'Founded as a registered charitable organization in Canada, BraidsofHope was born from a commitment to stand alongside underprivileged children and families with practical nourishment, essential household items, and heartfelt solidarity.',
          },
          {
            id: 'mission',
            heading: 'Our Mission',
            body: 'To bring hope to underprivileged children and families by providing food support, essential items, and compassionate care.',
          },
          {
            id: 'vision',
            heading: 'Our Vision',
            body: 'A compassionate world where children and families experience dignity, security, and community support.',
          },
          {
            id: 'values',
            heading: 'Core Values',
            body: 'Compassion, Community, Hope, Integrity, and Measurable Impact guide every programme we run.',
          },
        ]),
        seo_title: 'About Us | BraidsofHope',
        seo_description: 'Learn about BraidsofHope, our mission, vision, core values, and community story.',
        is_system_page: true,
        sort_order: 2,
      },
      {
        slug: 'our-work',
        title: 'Our Work',
        subtitle: 'Practical support programmes making a difference where it matters most.',
        hero_image_url: '/src/assets/images/programme_food_outreach_1795572432556.jpg',
        content_blocks_json: JSON.stringify([
          {
            id: 'work-overview',
            heading: 'Charitable Support Programmes',
            body: 'Our programmes focus on addressing immediate household essentials while uplifting children and families with dignity and care.',
          },
        ]),
        seo_title: 'Our Work | BraidsofHope',
        seo_description: 'Explore BraidsofHope programmes in food support, essential items, children and family care, and community outreach.',
        is_system_page: true,
        sort_order: 3,
      },
      {
        slug: 'get-involved',
        title: 'Get Involved',
        subtitle: 'Volunteer, partner, or stand alongside our community outreach.',
        hero_image_url: '/src/assets/images/programme_food_outreach_1795572432556.jpg',
        content_blocks_json: JSON.stringify([
          {
            id: 'volunteer-intro',
            heading: 'Volunteer With BraidsofHope',
            body: 'Volunteers help organize food hampers, coordinate community drives, and extend warm support to families. Submit a volunteer application below to connect with our coordination team.',
          },
          {
            id: 'partner-intro',
            heading: 'Community & Corporate Partnerships',
            body: 'We welcome collaboration with local businesses, faith groups, schools, and community organizations aligned with our charitable mission.',
          },
        ]),
        seo_title: 'Get Involved | BraidsofHope',
        seo_description: 'Volunteer or partner with BraidsofHope to support underprivileged children and families.',
        is_system_page: true,
        sort_order: 4,
      },
      {
        slug: 'donate',
        title: 'Donate',
        subtitle: 'Support food security, essential items, and family care.',
        hero_image_url: '/src/assets/images/story_hands_heart_1795572431498.jpg',
        content_blocks_json: JSON.stringify([
          {
            id: 'donate-overview',
            heading: 'Give Hope Today',
            body: 'Your generosity helps sustain food hampers, essential household care, and seasonal family programmes.',
          },
        ]),
        seo_title: 'Donate | BraidsofHope',
        seo_description: 'Support BraidsofHope charitable programmes for children and families.',
        is_system_page: true,
        sort_order: 5,
      },
      {
        slug: 'events-campaigns',
        title: 'Events & Campaigns',
        subtitle: 'Upcoming outreach initiatives and seasonal fundraising programmes.',
        hero_image_url: '/src/assets/images/campaign_christmas_hope_1795572431573.jpg',
        content_blocks_json: JSON.stringify([
          {
            id: 'campaigns-overview',
            heading: 'Active & Upcoming Initiatives',
            body: 'Follow our ongoing community initiatives and seasonal programmes, including our upcoming Christmas Fundraising Programme.',
          },
        ]),
        seo_title: 'Events & Campaigns | BraidsofHope',
        seo_description: 'View BraidsofHope fundraising campaigns, seasonal programmes, and community events.',
        is_system_page: true,
        sort_order: 6,
      },
      {
        slug: 'contact-us',
        title: 'Contact Us',
        subtitle: 'Reach our teams in Canada and Nigeria.',
        hero_image_url: '',
        content_blocks_json: JSON.stringify([
          {
            id: 'contact-overview',
            heading: 'We Would Love to Hear From You',
            body: 'Whether you have questions about volunteering, partnerships, community programmes, or support, send us a message below.',
          },
        ]),
        seo_title: 'Contact Us | BraidsofHope',
        seo_description: 'Get in touch with BraidsofHope in Edmonton, Canada or our Nigeria outreach team.',
        is_system_page: true,
        sort_order: 7,
      },
      {
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        subtitle: 'How BraidsofHope protects personal information in Canada.',
        hero_image_url: '',
        content_blocks_json: JSON.stringify([
          {
            id: 'privacy-1',
            heading: 'Commitment to Canadian Privacy Standards',
            body: 'BraidsofHope respects your privacy and handles personal information submitted through contact, volunteer, partnership, newsletter, and donation forms in accordance with applicable Canadian privacy laws.',
          },
          {
            id: 'privacy-2',
            heading: 'How Information Is Used',
            body: 'Information you provide is used solely to respond to enquiries, coordinate volunteer or partnership activities, deliver requested newsletter updates (with explicit CASL consent), and administer charitable records.',
          },
        ]),
        seo_title: 'Privacy Policy | BraidsofHope',
        seo_description: 'Read BraidsofHope privacy policy and Canadian data protection practices.',
        is_system_page: true,
        sort_order: 8,
      },
      {
        slug: 'terms-conditions',
        title: 'Terms and Conditions',
        subtitle: 'Terms governing use of the BraidsofHope website.',
        hero_image_url: '',
        content_blocks_json: JSON.stringify([
          {
            id: 'terms-1',
            heading: 'Use of Website',
            body: 'By accessing the BraidsofHope website, you agree to use its public resources lawfully and respectfully. All organization branding and materials belong to BraidsofHope.',
          },
        ]),
        seo_title: 'Terms and Conditions | BraidsofHope',
        seo_description: 'Terms and conditions for using the BraidsofHope website.',
        is_system_page: true,
        sort_order: 9,
      },
    ];

    for (const p of pagesSeed) {
      await db.execute(
        `INSERT INTO pages (
          slug, title, subtitle, hero_image_url, content_blocks_json,
          seo_title, seo_description, status, is_system_page, sort_order, published_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP)`,
        [
          p.slug,
          p.title,
          p.subtitle,
          p.hero_image_url,
          p.content_blocks_json,
          p.seo_title,
          p.seo_description,
          'published',
          p.is_system_page,
          p.sort_order,
        ]
      );
    }
  }

  // 7. Navigation Items
  const existingNav = await db.queryOne<{ id: number }>('SELECT id FROM navigation_items LIMIT 1');
  if (!existingNav) {
    const navItems = [
      { label: 'Home', href: '/', sort_order: 1 },
      { label: 'About Us', href: '/about-us', sort_order: 2 },
      { label: 'Our Work', href: '/our-work', sort_order: 3 },
      { label: 'Get Involved', href: '/get-involved', sort_order: 4 },
      { label: 'Events & Campaigns', href: '/events-campaigns', sort_order: 5 },
      { label: 'Contact Us', href: '/contact-us', sort_order: 6 },
    ];
    for (const n of navItems) {
      await db.execute(
        `INSERT INTO navigation_items (label, href, parent_id, is_visible, open_in_new_tab, sort_order)
         VALUES ($1, $2, NULL, $3, $4, $5)`,
        [n.label, n.href, true, false, n.sort_order]
      );
    }
  }

  // 8. Footer Settings
  const existingFooter = await db.queryOne<{ id: number }>('SELECT id FROM footer_settings LIMIT 1');
  if (!existingFooter) {
    await db.execute(
      `INSERT INTO footer_settings (
        description, copyright_text, mission_blurb, show_newsletter,
        newsletter_heading, newsletter_subtext, quick_links_json, social_links_json,
        bg_color, text_color
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        'Weaving a tapestry of hope for today and tomorrow.',
        '© 2026 BraidsofHope. Registered Charitable Organization in Canada. All rights reserved.',
        'To bring hope to underprivileged children and families by providing food support, essential items, and compassionate care.',
        true,
        'Stay Connected',
        'Subscribe to our newsletter for programme updates and community stories.',
        JSON.stringify([
          { label: 'Home', href: '/' },
          { label: 'About Us', href: '/about-us' },
          { label: 'Our Work', href: '/our-work' },
          { label: 'Get Involved', href: '/get-involved' },
          { label: 'Events & Campaigns', href: '/events-campaigns' },
          { label: 'Contact Us', href: '/contact-us' },
          { label: 'Privacy Policy', href: '/privacy-policy' },
          { label: 'Terms & Conditions', href: '/terms-conditions' },
        ]),
        JSON.stringify({
          facebook: '',
          instagram: '',
          linkedin: '',
          youtube: '',
          tiktok: '',
        }),
        '#FAFAFC',
        '#1F2937',
      ]
    );
  }

  // 9. Programmes (Our Work)
  const existingProgrammes = await db.queryOne<{ id: number }>('SELECT id FROM programmes LIMIT 1');
  if (!existingProgrammes) {
    const programmes = [
      {
        slug: 'food-support',
        title: 'Food Support',
        short_description: 'Nutritious pantry hampers and staple groceries for families facing food insecurity.',
        full_description:
          'We organize regular food hamper distributions containing culturally appropriate, nutritious staples so children and parents have reliable meals with dignity.',
        icon_name: 'ShoppingBasket',
        image_url: '/src/assets/images/programme_food_outreach_1795572432556.jpg',
        supporting_info: 'Supports households through community pantry partnerships and volunteer packing days.',
        cta_label: 'Support Food Outreach',
        cta_link: '/get-involved',
        sort_order: 1,
      },
      {
        slug: 'essential-items',
        title: 'Essential Items',
        short_description: 'Clothing, hygiene kits, and seasonal household necessities for everyday comfort.',
        full_description:
          'Families receive practical essentials—from warm seasonal clothing and school supplies to personal care and household kits.',
        icon_name: 'Package',
        image_url: '/src/assets/images/story_hands_heart_1795572431498.jpg',
        supporting_info: 'Items are curated based on genuine family needs and seasonal priorities.',
        cta_label: 'Contribute Essentials',
        cta_link: '/get-involved',
        sort_order: 2,
      },
      {
        slug: 'children-families',
        title: 'Children & Families',
        short_description: 'Targeted encouragement, educational supplies, and wraparound care for young lives.',
        full_description:
          'We stand beside vulnerable children and caregivers by easing daily household pressures and fostering nurturing community support.',
        icon_name: 'Users',
        image_url: '/src/assets/images/hero_children_joy_1795572430838.jpg',
        supporting_info: 'Focused on dignity, child wellbeing, and community connection.',
        cta_label: 'Partner With Us',
        cta_link: '/get-involved',
        sort_order: 3,
      },
      {
        slug: 'community-care',
        title: 'Community Care',
        short_description: 'Collaborative local outreach bridging Canada and Nigeria with compassionate action.',
        full_description:
          'Through local outreach coordination, volunteer mobilization, and seasonal initiatives, we strengthen community safety nets.',
        icon_name: 'HeartHandshake',
        image_url: '/src/assets/images/campaign_christmas_hope_1795572431573.jpg',
        supporting_info: 'Built on local relationships and transparent stewardship.',
        cta_label: 'Contact Our Team',
        cta_link: '/contact-us',
        sort_order: 4,
      },
    ];

    for (const pr of programmes) {
      await db.execute(
        `INSERT INTO programmes (
          slug, title, short_description, full_description, icon_name,
          image_url, supporting_info, cta_label, cta_link, is_published, sort_order
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          pr.slug,
          pr.title,
          pr.short_description,
          pr.full_description,
          pr.icon_name,
          pr.image_url,
          pr.supporting_info,
          pr.cta_label,
          pr.cta_link,
          true,
          pr.sort_order,
        ]
      );
    }
  }

  // 10. Upcoming Christmas Fundraising Programme (do not invent target or specific activities)
  const existingChristmas = await db.queryOne<{ id: number }>(
    'SELECT id FROM campaigns WHERE is_christmas_programme = $1 LIMIT 1',
    [true]
  );
  if (!existingChristmas) {
    await db.execute(
      `INSERT INTO campaigns (
        slug, title, summary, description, poster_url,
        start_date, end_date, fundraising_target_cents, currency,
        status, is_featured, is_published, is_christmas_programme
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        'christmas-fundraising-programme',
        'Christmas Fundraising Programme',
        'Upcoming seasonal outreach initiative. Official programme details and fundraising target will be published here once confirmed by BraidsofHope.',
        'Details, fundraising target, and programme activities for the upcoming Christmas Fundraising Programme will be supplied by BraidsofHope administrators.',
        '/src/assets/images/campaign_christmas_hope_1795572431573.jpg',
        '',
        '',
        0,
        'CAD',
        'upcoming',
        true,
        true,
        true,
      ]
    );
  }

  // 11. Volunteer Opportunities (generic real coordination pathways, no invented people)
  const existingOpps = await db.queryOne<{ id: number }>('SELECT id FROM volunteer_opportunities LIMIT 1');
  if (!existingOpps) {
    await db.execute(
      `INSERT INTO volunteer_opportunities (title, location, commitment, description, is_published, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        'Food Support & Hamper Packing Volunteer',
        'Edmonton, Canada',
        'Flexible / Event-based',
        'Assist with sorting, packing, and organizing nutritious food hampers and essential items for local outreach distributions.',
        true,
        1,
      ]
    );
    await db.execute(
      `INSERT INTO volunteer_opportunities (title, location, commitment, description, is_published, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        'Community Outreach & Event Support',
        'Canada & Nigeria Outreach',
        'Project-based',
        'Support seasonal community campaigns, awareness drives, and volunteer coordination.',
        true,
        2,
      ]
    );
  }

  // 12. Non-destructive one-time upgrade for untouched legacy seed defaults
  await db.execute(
    `UPDATE site_settings
     SET contact_email = $1,
         edmonton_contact = $2,
         site_title = $3
     WHERE contact_email = $4`,
    [
      'braidsofhope@outlook.com',
      'Edmonton Chapter — Alberta, Canada (braidsofhope@outlook.com)',
      'BraidsofHope — Weaving a Tapestry of Hope for Today and Tomorrow',
      'info@braidsofhope.org',
    ]
  );

  await db.execute(
    `UPDATE branding_settings
     SET tagline = $1,
         primary_color = $2,
         secondary_color = $3,
         accent_color = $4,
         background_color = $5,
         footer_bg_color = $6,
         footer_text_color = $7,
         logo_main_url = CASE WHEN logo_main_url = '' THEN $8 ELSE logo_main_url END,
         logo_footer_url = CASE WHEN logo_footer_url = '' THEN $8 ELSE logo_footer_url END,
         favicon_url = CASE WHEN favicon_url = '' THEN $8 ELSE favicon_url END
     WHERE primary_color = $9 AND background_color = $10`,
    [
      'Weaving a tapestry of hope for today and tomorrow.',
      '#52154E',
      '#0099A8',
      '#F57C00',
      '#FFFFFF',
      '#FAFAFC',
      '#1F2937',
      '/assets/aistudio/image_654ecb55.png',
      '#4A0E36',
      '#FAF5EE',
    ]
  );

  await db.execute(
    `UPDATE homepage_sections
     SET bg_color = $1, subtitle = $2
     WHERE section_key = 'hero' AND bg_color = '#4A0E36'`,
    ['#FFFFFF', 'Weaving a tapestry of hope for today and tomorrow.']
  );

  await db.execute(
    `UPDATE homepage_sections
     SET bg_color = '#FFFFFF'
     WHERE section_key IN ('values', 'story_and_work', 'featured_initiatives') AND bg_color = '#FAF5EE'`
  );

  await db.execute(
    `UPDATE footer_settings
     SET description = $1, bg_color = $2, text_color = $3
     WHERE bg_color = '#3B0A2B' AND text_color = '#FAF5EE'`,
    ['Weaving a tapestry of hope for today and tomorrow.', '#FAFAFC', '#1F2937']
  );

  const existingOfficialLogoMedia = await db.queryOne<{ id: number }>(
    'SELECT id FROM media_files WHERE url = $1 LIMIT 1',
    ['/assets/aistudio/image_654ecb55.png']
  );
  if (!existingOfficialLogoMedia) {
    await db.execute(
      `INSERT INTO media_files (filename, original_name, url, mime_type, file_size, width, height, folder, alt_text, description, storage_provider)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        'braidsofhope-official-logo.png',
        'braidsofhope-logo.png',
        '/assets/aistudio/image_654ecb55.png',
        'image/png',
        180000,
        1200,
        750,
        'Brand Assets',
        'Official BraidsofHope braided heart logo',
        'Official BraidsofHope organization logo on white background.',
        'local',
      ]
    );
  }
}
