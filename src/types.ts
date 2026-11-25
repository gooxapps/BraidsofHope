export interface BrandingSettings {
  id: number;
  org_name: string;
  tagline: string;
  brand_description: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  footer_bg_color: string;
  footer_text_color: string;
  heading_font: string;
  body_font: string;
  logo_main_url: string;
  logo_alt_url: string;
  logo_light_url: string;
  logo_dark_url: string;
  logo_transparent_url: string;
  logo_footer_url: string;
  favicon_url: string;
  decorative_banner_url: string;
  updated_at?: string;
}

export interface SiteSettings {
  id: number;
  site_title: string;
  site_description: string;
  default_seo_title: string;
  default_seo_description: string;
  social_share_image: string;
  announcement_bar_enabled: boolean;
  announcement_bar_text: string;
  announcement_bar_link: string;
  timezone: string;
  default_currency: string;
  language: string;
  cookie_notice_enabled: boolean;
  cookie_notice_text: string;
  robots_index: boolean;
  sitemap_enabled: boolean;
  contact_email: string;
  phone: string;
  whatsapp_number: string;
  office_address: string;
  edmonton_contact: string;
  nigeria_contact: string;
  business_hours: string;
  contact_form_enabled: boolean;
  newsletter_double_opt_in: boolean;
  newsletter_consent_text: string;
}

export interface NavigationItem {
  id: number;
  label: string;
  href: string;
  parent_id: number | null;
  is_visible: boolean;
  open_in_new_tab: boolean;
  sort_order: number;
}

export interface FooterSettings {
  id: number;
  description: string;
  copyright_text: string;
  mission_blurb: string;
  show_newsletter: boolean;
  newsletter_heading: string;
  newsletter_subtext: string;
  quick_links: Array<{ label: string; href: string }>;
  social_links: Record<string, string>;
  bg_color: string;
  text_color: string;
}

export interface HomepageSection {
  id: number;
  section_key: string;
  section_type: string;
  title: string;
  subtitle: string;
  body_text: string;
  image_url: string;
  bg_color: string;
  cta_label: string;
  cta_link: string;
  secondary_cta_label: string;
  secondary_cta_link: string;
  config: Record<string, unknown>;
  draft?: Record<string, unknown> | null;
  is_visible: boolean;
  is_system: boolean;
  sort_order: number;
}

export interface PageBlock {
  id: string;
  heading: string;
  body: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaLink?: string;
}

export interface PageRecord {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  hero_image_url: string;
  blocks: PageBlock[];
  draft_blocks?: PageBlock[] | null;
  seo_title: string;
  seo_description: string;
  status: 'published' | 'draft';
  is_system_page: boolean;
  sort_order: number;
  updated_at?: string;
  published_at?: string | null;
}

export interface Programme {
  id: number;
  slug: string;
  title: string;
  short_description: string;
  full_description: string;
  icon_name: string;
  image_url: string;
  supporting_info: string;
  cta_label: string;
  cta_link: string;
  is_published: boolean;
  sort_order: number;
}

export interface Campaign {
  id: number;
  slug: string;
  title: string;
  summary: string;
  description: string;
  poster_url: string;
  start_date: string;
  end_date: string;
  fundraising_target_cents: number;
  verified_raised_cents?: number;
  currency: string;
  status: 'draft' | 'upcoming' | 'active' | 'completed' | 'archived';
  is_featured: boolean;
  is_published: boolean;
  is_christmas_programme: boolean;
  created_at?: string;
}

export interface EventItem {
  id: number;
  title: string;
  description: string;
  event_date: string;
  end_date: string;
  location: string;
  image_url: string;
  registration_link: string;
  campaign_id: number | null;
  status: string;
  is_published: boolean;
}

export interface VolunteerOpportunity {
  id: number;
  title: string;
  location: string;
  commitment: string;
  description: string;
  is_published: boolean;
  sort_order: number;
}

export interface VolunteerApplication {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  city_country: string;
  availability: string;
  skills_interests: string;
  opportunity_title: string;
  message: string;
  status: string;
  internal_notes: string;
  created_at: string;
}

export interface PartnershipEnquiry {
  id: number;
  organization_name: string;
  contact_name: string;
  email: string;
  phone: string;
  partnership_type: string;
  message: string;
  status: string;
  internal_notes: string;
  created_at: string;
}

export interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  region: string;
  message: string;
  status: string;
  internal_notes: string;
  created_at: string;
}

export interface Testimonial {
  id: number;
  author_name: string;
  role_or_context: string;
  quote: string;
  photo_url: string;
  permission_confirmed: boolean;
  status: string;
  is_published: boolean;
  is_featured: boolean;
  created_at?: string;
}

export interface ImpactStory {
  id: number;
  title: string;
  summary: string;
  body: string;
  photo_url: string;
  location: string;
  permission_confirmed: boolean;
  status: string;
  is_published: boolean;
  is_featured: boolean;
  created_at?: string;
}

export interface TeamMember {
  id: number;
  name: string;
  role_title: string;
  bio: string;
  photo_url: string;
  category: string;
  is_published: boolean;
  sort_order: number;
}

export interface NewsletterSubscriber {
  id: number;
  email: string;
  full_name: string;
  consent_confirmed: boolean;
  confirmation_status: string;
  source: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
}

export interface DonationRecord {
  id: number;
  campaign_id: number | null;
  campaign_title?: string;
  donor_name: string;
  donor_email: string;
  amount_cents: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'awaiting_verification' | 'successful' | 'failed' | 'refunded';
  transaction_ref: string;
  internal_notes: string;
  verified_at: string | null;
  created_at: string;
}

export interface MediaFile {
  id: number;
  filename: string;
  original_name: string;
  url: string;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;
  folder: string;
  alt_text: string;
  description: string;
  storage_provider: string;
  created_at: string;
}

export interface ModulePermission {
  can_view: boolean;
  can_edit: boolean;
  can_publish: boolean;
  can_delete: boolean;
}

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role_id: number;
  role_slug: string;
  role_name: string;
  two_factor_enabled: boolean;
  permissions: Record<string, ModulePermission>;
}

export interface AdminNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  link_module: string;
  related_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface PublicBootstrapData {
  isPreview: boolean;
  donationsUnlocked: boolean;
  siteSettings: SiteSettings;
  branding: BrandingSettings;
  navigation: NavigationItem[];
  footer: FooterSettings;
  homepageSections: HomepageSection[];
  pages: PageRecord[];
  programmes: Programme[];
  campaigns: Campaign[];
  events: EventItem[];
  testimonials: Testimonial[];
  impactStories: ImpactStory[];
  teamMembers: TeamMember[];
  volunteerOpportunities: VolunteerOpportunity[];
}
