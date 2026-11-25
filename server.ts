import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { asBool, db, runMigrations } from './server/db.ts';
import { adminAuthRouter } from './server/routes/admin-auth.ts';
import { adminContentRouter } from './server/routes/admin-content.ts';
import { adminOperationsRouter } from './server/routes/admin-operations.ts';
import { publicRouter } from './server/routes/public.ts';
import { seedInitialData } from './server/seed.ts';
import { UPLOADS_DIR, ensureUploadsDir } from './server/storage.ts';

async function startServer() {
  await runMigrations();
  await seedInitialData();
  ensureUploadsDir();

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
      const settings = await db.queryOne<{ sitemap_enabled: unknown }>('SELECT sitemap_enabled FROM site_settings LIMIT 1');
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
      res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
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

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        next();
        return;
      }
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found');
      }
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`BraidsofHope server running on http://0.0.0.0:${port} (db: ${db.dialect})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start BraidsofHope server:', err);
  process.exit(1);
});
