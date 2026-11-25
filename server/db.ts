import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { Pool } from 'pg';

export type DbDialect = 'postgres' | 'sqlite';

class DualDatabase {
  public dialect: DbDialect;
  private pgPool: Pool | null = null;
  private sqliteDb: Database.Database | null = null;

  constructor() {
    const dbUrl = process.env.DATABASE_URL?.trim();
    if (dbUrl) {
      this.dialect = 'postgres';
      this.pgPool = new Pool({
        connectionString: dbUrl,
        ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
      });
    } else {
      this.dialect = 'sqlite';
      const dataDir = path.resolve(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = path.join(dataDir, 'braidsofhope.db');
      this.sqliteDb = new Database(dbPath);
      this.sqliteDb.pragma('journal_mode = WAL');
      this.sqliteDb.pragma('foreign_keys = ON');
    }
  }

  private convertSqlAndParamsForSqlite(sql: string, params: unknown[]): { sql: string; params: unknown[] } {
    const expandedParams: unknown[] = [];
    const convertedSql = sql.replace(/\$(\d+)/g, (_, indexStr: string) => {
      const idx = Number(indexStr) - 1;
      const val = params[idx];
      if (typeof val === 'boolean') {
        expandedParams.push(val ? 1 : 0);
      } else if (val === undefined) {
        expandedParams.push(null);
      } else {
        expandedParams.push(val);
      }
      return '?';
    });
    return { sql: convertedSql, params: expandedParams };
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (this.dialect === 'postgres' && this.pgPool) {
      const cleanParams = params.map((p) => (p === undefined ? null : p));
      const res = await this.pgPool.query(sql, cleanParams);
      return res.rows as T[];
    }
    if (this.sqliteDb) {
      const { sql: sqSql, params: sqParams } = this.convertSqlAndParamsForSqlite(sql, params);
      const stmt = this.sqliteDb.prepare(sqSql);
      const trimmed = sqSql.trim().toUpperCase();
      if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.includes('RETURNING')) {
        return stmt.all(...sqParams) as T[];
      }
      stmt.run(...sqParams);
      return [];
    }
    throw new Error('Database not initialized');
  }

  async queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
    if (this.dialect === 'postgres' && this.pgPool) {
      const cleanParams = params.map((p) => (p === undefined ? null : p));
      const res = await this.pgPool.query(sql, cleanParams);
      return { changes: res.rowCount ?? 0 };
    }
    if (this.sqliteDb) {
      const { sql: sqSql, params: sqParams } = this.convertSqlAndParamsForSqlite(sql, params);
      const info = this.sqliteDb.prepare(sqSql).run(...sqParams);
      return { changes: info.changes };
    }
    throw new Error('Database not initialized');
  }

  async execRaw(sql: string): Promise<void> {
    if (this.dialect === 'postgres' && this.pgPool) {
      await this.pgPool.query(sql);
      return;
    }
    if (this.sqliteDb) {
      this.sqliteDb.exec(sql);
      return;
    }
  }
}

export const db = new DualDatabase();

export function asBool(val: unknown): boolean {
  return val === true || val === 1 || val === '1' || val === 'true';
}

export async function runMigrations(): Promise<void> {
  const idType = db.dialect === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const boolType = db.dialect === 'postgres' ? 'BOOLEAN' : 'INTEGER';
  const trueLit = db.dialect === 'postgres' ? 'TRUE' : '1';
  const falseLit = db.dialect === 'postgres' ? 'FALSE' : '0';

  const statements = [
    `CREATE TABLE IF NOT EXISTS admin_roles (
      id ${idType},
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      is_system ${boolType} NOT NULL DEFAULT ${trueLit},
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS admin_permissions (
      id ${idType},
      role_id INTEGER NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
      module_key TEXT NOT NULL,
      can_view ${boolType} NOT NULL DEFAULT ${falseLit},
      can_edit ${boolType} NOT NULL DEFAULT ${falseLit},
      can_publish ${boolType} NOT NULL DEFAULT ${falseLit},
      can_delete ${boolType} NOT NULL DEFAULT ${falseLit},
      UNIQUE(role_id, module_key)
    )`,

    `CREATE TABLE IF NOT EXISTS admin_users (
      id ${idType},
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role_id INTEGER NOT NULL REFERENCES admin_roles(id),
      is_active ${boolType} NOT NULL DEFAULT ${trueLit},
      two_factor_enabled ${boolType} NOT NULL DEFAULT ${falseLit},
      two_factor_secret TEXT,
      last_login_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS admin_sessions (
      id ${idType},
      user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS login_attempts (
      id ${idType},
      email TEXT NOT NULL,
      success ${boolType} NOT NULL DEFAULT ${falseLit},
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      failure_reason TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id ${idType},
      user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS site_settings (
      id ${idType},
      site_title TEXT NOT NULL,
      site_description TEXT NOT NULL,
      default_seo_title TEXT NOT NULL,
      default_seo_description TEXT NOT NULL,
      social_share_image TEXT DEFAULT '',
      announcement_bar_enabled ${boolType} NOT NULL DEFAULT ${falseLit},
      announcement_bar_text TEXT DEFAULT '',
      announcement_bar_link TEXT DEFAULT '',
      timezone TEXT NOT NULL DEFAULT 'America/Edmonton',
      default_currency TEXT NOT NULL DEFAULT 'CAD',
      language TEXT NOT NULL DEFAULT 'en-CA',
      cookie_notice_enabled ${boolType} NOT NULL DEFAULT ${trueLit},
      cookie_notice_text TEXT DEFAULT '',
      robots_index ${boolType} NOT NULL DEFAULT ${trueLit},
      sitemap_enabled ${boolType} NOT NULL DEFAULT ${trueLit},
      contact_email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      whatsapp_number TEXT DEFAULT '',
      office_address TEXT DEFAULT '',
      edmonton_contact TEXT DEFAULT '',
      nigeria_contact TEXT DEFAULT '',
      business_hours TEXT DEFAULT '',
      contact_form_enabled ${boolType} NOT NULL DEFAULT ${trueLit},
      newsletter_double_opt_in ${boolType} NOT NULL DEFAULT ${trueLit},
      newsletter_consent_text TEXT DEFAULT '',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS branding_settings (
      id ${idType},
      org_name TEXT NOT NULL,
      tagline TEXT NOT NULL,
      brand_description TEXT NOT NULL,
      primary_color TEXT NOT NULL DEFAULT '#4A0E36',
      secondary_color TEXT NOT NULL DEFAULT '#0E7C7B',
      accent_color TEXT NOT NULL DEFAULT '#F38B1C',
      background_color TEXT NOT NULL DEFAULT '#FAF5EE',
      footer_bg_color TEXT NOT NULL DEFAULT '#3B0A2B',
      footer_text_color TEXT NOT NULL DEFAULT '#FAF5EE',
      heading_font TEXT NOT NULL DEFAULT 'Playfair Display',
      body_font TEXT NOT NULL DEFAULT 'Plus Jakarta Sans',
      logo_main_url TEXT DEFAULT '',
      logo_alt_url TEXT DEFAULT '',
      logo_light_url TEXT DEFAULT '',
      logo_dark_url TEXT DEFAULT '',
      logo_transparent_url TEXT DEFAULT '',
      logo_footer_url TEXT DEFAULT '',
      favicon_url TEXT DEFAULT '',
      decorative_banner_url TEXT DEFAULT '',
      draft_json TEXT DEFAULT '',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS media_files (
      id ${idType},
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      url TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      width INTEGER DEFAULT 0,
      height INTEGER DEFAULT 0,
      folder TEXT NOT NULL DEFAULT 'General',
      alt_text TEXT DEFAULT '',
      description TEXT DEFAULT '',
      storage_provider TEXT NOT NULL DEFAULT 'local',
      uploaded_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS pages (
      id ${idType},
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      hero_image_url TEXT DEFAULT '',
      content_blocks_json TEXT NOT NULL DEFAULT '[]',
      draft_blocks_json TEXT DEFAULT '',
      seo_title TEXT DEFAULT '',
      seo_description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'published',
      is_system_page ${boolType} NOT NULL DEFAULT ${falseLit},
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      published_at TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS page_revisions (
      id ${idType},
      page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content_blocks_json TEXT NOT NULL,
      created_by INTEGER,
      note TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS homepage_sections (
      id ${idType},
      section_key TEXT UNIQUE NOT NULL,
      section_type TEXT NOT NULL DEFAULT 'custom',
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      body_text TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      bg_color TEXT DEFAULT '',
      cta_label TEXT DEFAULT '',
      cta_link TEXT DEFAULT '',
      secondary_cta_label TEXT DEFAULT '',
      secondary_cta_link TEXT DEFAULT '',
      config_json TEXT DEFAULT '{}',
      draft_json TEXT DEFAULT '',
      is_visible ${boolType} NOT NULL DEFAULT ${trueLit},
      is_system ${boolType} NOT NULL DEFAULT ${falseLit},
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS navigation_items (
      id ${idType},
      label TEXT NOT NULL,
      href TEXT NOT NULL,
      parent_id INTEGER,
      is_visible ${boolType} NOT NULL DEFAULT ${trueLit},
      open_in_new_tab ${boolType} NOT NULL DEFAULT ${falseLit},
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,

    `CREATE TABLE IF NOT EXISTS footer_settings (
      id ${idType},
      description TEXT DEFAULT '',
      copyright_text TEXT DEFAULT '',
      mission_blurb TEXT DEFAULT '',
      show_newsletter ${boolType} NOT NULL DEFAULT ${trueLit},
      newsletter_heading TEXT DEFAULT 'Stay Connected',
      newsletter_subtext TEXT DEFAULT '',
      quick_links_json TEXT DEFAULT '[]',
      social_links_json TEXT DEFAULT '{}',
      bg_color TEXT DEFAULT '#3B0A2B',
      text_color TEXT DEFAULT '#FAF5EE',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS programmes (
      id ${idType},
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      short_description TEXT DEFAULT '',
      full_description TEXT DEFAULT '',
      icon_name TEXT DEFAULT 'HeartHandshake',
      image_url TEXT DEFAULT '',
      supporting_info TEXT DEFAULT '',
      cta_label TEXT DEFAULT 'Learn More',
      cta_link TEXT DEFAULT '/get-involved',
      is_published ${boolType} NOT NULL DEFAULT ${trueLit},
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS campaigns (
      id ${idType},
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      description TEXT DEFAULT '',
      poster_url TEXT DEFAULT '',
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      fundraising_target_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'CAD',
      status TEXT NOT NULL DEFAULT 'draft',
      is_featured ${boolType} NOT NULL DEFAULT ${falseLit},
      is_published ${boolType} NOT NULL DEFAULT ${falseLit},
      is_christmas_programme ${boolType} NOT NULL DEFAULT ${falseLit},
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS events (
      id ${idType},
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      event_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      location TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      registration_link TEXT DEFAULT '',
      campaign_id INTEGER,
      status TEXT NOT NULL DEFAULT 'upcoming',
      is_published ${boolType} NOT NULL DEFAULT ${falseLit},
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS volunteer_opportunities (
      id ${idType},
      title TEXT NOT NULL,
      location TEXT DEFAULT '',
      commitment TEXT DEFAULT '',
      description TEXT DEFAULT '',
      is_published ${boolType} NOT NULL DEFAULT ${trueLit},
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS volunteer_applications (
      id ${idType},
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      city_country TEXT DEFAULT '',
      availability TEXT DEFAULT '',
      skills_interests TEXT DEFAULT '',
      opportunity_title TEXT DEFAULT '',
      message TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new',
      internal_notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS partnership_enquiries (
      id ${idType},
      organization_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      partnership_type TEXT DEFAULT '',
      message TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new',
      internal_notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS contact_submissions (
      id ${idType},
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      subject TEXT DEFAULT '',
      region TEXT DEFAULT 'Canada',
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      internal_notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS testimonials (
      id ${idType},
      author_name TEXT NOT NULL,
      role_or_context TEXT DEFAULT '',
      quote TEXT NOT NULL,
      photo_url TEXT DEFAULT '',
      permission_confirmed ${boolType} NOT NULL DEFAULT ${falseLit},
      status TEXT NOT NULL DEFAULT 'pending',
      is_published ${boolType} NOT NULL DEFAULT ${falseLit},
      is_featured ${boolType} NOT NULL DEFAULT ${falseLit},
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS impact_stories (
      id ${idType},
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      body TEXT DEFAULT '',
      photo_url TEXT DEFAULT '',
      location TEXT DEFAULT '',
      permission_confirmed ${boolType} NOT NULL DEFAULT ${falseLit},
      status TEXT NOT NULL DEFAULT 'draft',
      is_published ${boolType} NOT NULL DEFAULT ${falseLit},
      is_featured ${boolType} NOT NULL DEFAULT ${falseLit},
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS team_members (
      id ${idType},
      name TEXT NOT NULL,
      role_title TEXT NOT NULL,
      bio TEXT DEFAULT '',
      photo_url TEXT DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Team',
      is_published ${boolType} NOT NULL DEFAULT ${trueLit},
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id ${idType},
      email TEXT UNIQUE NOT NULL,
      full_name TEXT DEFAULT '',
      consent_confirmed ${boolType} NOT NULL DEFAULT ${trueLit},
      confirmation_status TEXT NOT NULL DEFAULT 'confirmed',
      source TEXT DEFAULT 'website_footer',
      subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      unsubscribed_at TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS donations (
      id ${idType},
      campaign_id INTEGER,
      donor_name TEXT DEFAULT '',
      donor_email TEXT DEFAULT '',
      amount_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'CAD',
      payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
      status TEXT NOT NULL DEFAULT 'pending',
      transaction_ref TEXT DEFAULT '',
      internal_notes TEXT DEFAULT '',
      verified_by INTEGER,
      verified_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS donation_transactions (
      id ${idType},
      donation_id INTEGER NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
      gateway TEXT NOT NULL DEFAULT 'manual',
      gateway_ref TEXT DEFAULT '',
      event_type TEXT NOT NULL DEFAULT 'recorded',
      amount_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      raw_note TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS admin_notifications (
      id ${idType},
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link_module TEXT DEFAULT 'overview',
      related_id INTEGER,
      is_read ${boolType} NOT NULL DEFAULT ${falseLit},
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS activity_logs (
      id ${idType},
      admin_user_id INTEGER,
      admin_email TEXT DEFAULT '',
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      target_id TEXT DEFAULT '',
      details_json TEXT DEFAULT '{}',
      ip_address TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const stmt of statements) {
    await db.execRaw(stmt);
  }
}
