import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { asBool, db, runMigrations } from './db.ts';
import { adminAuthRouter } from './routes/admin-auth.ts';
import { adminContentRouter } from './routes/admin-content.ts';
import { adminOperationsRouter } from './routes/admin-operations.ts';
import { publicRouter } from './routes/public.ts';
import { seedInitialData } from './seed.ts';
import { UPLOADS_DIR, ensureUploadsDir } from './storage.ts';

let initPromise: Promise<void> | null = null;
let cachedApp: Express | null = null;

export async function ensureBackendInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await runMigrations();
      await seedInitialData();
      if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
        ensureUploadsDir();
      }
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
}

export function createBaseApp(): Express {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));

  // Serve local uploaded media when Vercel Blob is not configured
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, dialect: db.dialect });
  });

  // Dynamic SEO robots.txt & sitemap.xml
  app.get('/robots.txt', async (_req, res) => {
    try {
      const settings = await db.queryOne<{ robots_index: unknown; sitemap_enabled: unknown }>(
        'SELECT robots_index, sitemap_enabled FROM site_settings LIMIT 1'
      );
      const allowIndex = settings ? asBool(settings.robots_index) : true;
      const sitemapEnabled = settings ? asBool(settings.sitemap_enabled) : true;
      const lines = ['User-agent: *', allowIndex ? 'Allow: /' : 'Disallow: /', 'Disallow: /admin'];
      if (sitemapEnabled) {
        const base = process.env.APP_URL?.replace(/\/$/, '') || '';
        lines.push(`Sitemap: ${base}/sitemap.xml`);
      }
      res.type('text/plain').send(lines.join('\n'));
    } catch {
      res.type('text/plain').send('User-agent: *\nDisallow: /admin');
    }
  });

  app.get('/sitemap.xml', async (_req, res) => {
    try {
      const settings = await db.queryOne<{ sitemap_enabled: unknown }>(
        'SELECT sitemap_enabled FROM site_settings LIMIT 1'
      );
      if (settings && !asBool(settings.sitemap_enabled)) {
        res.status(404).send('Sitemap disabled');
        return;
      }
      const pages = await db.query<{ slug: string; updated_at: string }>(
        "SELECT slug, updated_at FROM pages WHERE status = 'published' ORDER BY sort_order ASC"
      );
      const base = process.env.APP_URL?.replace(/\/$/, '') || '';
      const urls = pages
        .map((p) => {
          const loc = p.slug === 'home' ? `${base}/` : `${base}/${p.slug}`;
          return `<url><loc>${loc}</loc></url>`;
        })
        .join('');
      res
        .type('application/xml')
        .send(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
        );
    } catch {
      res.status(500).send('Failed to build sitemap');
    }
  });

  // API Routes
  app.use('/api/public', publicRouter);
  app.use('/api/admin/auth', adminAuthRouter);
  app.use('/api/admin', adminContentRouter);
  app.use('/api/admin', adminOperationsRouter);

  // Centralized API error handler
  app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    res.status(500).json({ error: message });
  });

  return app;
}

export async function getInitializedApp(): Promise<Express> {
  await ensureBackendInitialized();
  if (!cachedApp) {
    cachedApp = createBaseApp();
  }
  return cachedApp;
}
