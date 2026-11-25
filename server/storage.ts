import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ALLOWED_MIME_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
};

export const UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');

export function ensureUploadsDir(): void {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export function sanitizeSvgContent(rawBuffer: Buffer): Buffer {
  let svg = rawBuffer.toString('utf8');
  svg = svg
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:')
    .replace(/data\s*:\s*text\/html/gi, 'blocked:');
  return Buffer.from(svg, 'utf8');
}

export interface StoredFileResult {
  filename: string;
  url: string;
  storageProvider: 'vercel_blob' | 'local';
  size: number;
  mimeType: string;
}

export function isAllowedImageMime(mimeType: string): boolean {
  return Boolean(ALLOWED_MIME_EXTENSIONS[mimeType.toLowerCase()]);
}

export async function storeUploadedImage(file: {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}): Promise<StoredFileResult> {
  const mime = file.mimetype.toLowerCase();
  const ext = ALLOWED_MIME_EXTENSIONS[mime];
  if (!ext) {
    throw new Error('Unsupported file format. Allowed formats: PNG, JPG, JPEG, WEBP, SVG, ICO.');
  }

  let bufferToStore = file.buffer;
  if (mime === 'image/svg+xml') {
    bufferToStore = sanitizeSvgContent(file.buffer);
  }

  const baseName = path
    .basename(file.originalname, path.extname(file.originalname))
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'media';

  const uniqueFilename = `${baseName}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (blobToken) {
    const uploadRes = await fetch(`https://blob.vercel-storage.com/braidsofhope/${uniqueFilename}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${blobToken}`,
        'Content-Type': mime,
        'x-api-version': '7',
      },
      body: new Uint8Array(bufferToStore),
    });

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      throw new Error(`Vercel Blob upload failed: ${errBody}`);
    }
    const payload = (await uploadRes.json()) as { url: string };
    return {
      filename: uniqueFilename,
      url: payload.url,
      storageProvider: 'vercel_blob',
      size: bufferToStore.length,
      mimeType: mime,
    };
  }

  ensureUploadsDir();
  const targetPath = path.resolve(UPLOADS_DIR, uniqueFilename);
  if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
    throw new Error('Invalid upload path');
  }
  fs.writeFileSync(targetPath, bufferToStore);

  return {
    filename: uniqueFilename,
    url: `/uploads/${uniqueFilename}`,
    storageProvider: 'local',
    size: bufferToStore.length,
    mimeType: mime,
  };
}

export async function deleteStoredImageIfSafe(url: string, storageProvider: string): Promise<void> {
  if (storageProvider === 'vercel_blob' && process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    try {
      await fetch('https://blob.vercel-storage.com/delete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN.trim()}`,
          'Content-Type': 'application/json',
          'x-api-version': '7',
        },
        body: JSON.stringify({ urls: [url] }),
      });
    } catch {
      // Ignore remote deletion errors after DB record removal
    }
    return;
  }

  if (url.startsWith('/uploads/')) {
    const filename = url.slice('/uploads/'.length);
    const resolved = path.resolve(UPLOADS_DIR, filename);
    if (resolved.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }
  }
}
