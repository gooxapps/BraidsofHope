import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { asBool, db } from './db.ts';
import type { ModuleKey } from './seed.ts';

const RUNTIME_FALLBACK_SECRET = crypto
  .createHash('sha256')
  .update(
    process.env.DATABASE_URL?.trim() ||
      process.env.POSTGRES_URL?.trim() ||
      process.env.ADMIN_BOOTSTRAP_PASSCODE?.trim() ||
      'braidsofhope-runtime-session-seed'
  )
  .digest('hex');

export function getSessionSecret(): string {
  return process.env.SESSION_SECRET?.trim() || RUNTIME_FALLBACK_SECRET;
}

export function isAdvancedDonationsUnlocked(): boolean {
  return process.env.ENABLE_ADVANCED_DONATIONS === 'true';
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

export function hashToken(rawToken: string): string {
  return crypto.createHmac('sha256', getSessionSecret()).update(rawToken).digest('hex');
}

export function generateRandomToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

// RFC 4648 Base32 for TOTP 2FA
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpSecret(): string {
  const bytes = crypto.randomBytes(20);
  let bits = '';
  for (const b of bytes) {
    bits += b.toString(2).padStart(8, '0');
  }
  let out = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    out += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return out;
}

function base32ToBuffer(secret: string): Buffer {
  const cleaned = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function computeTotpAtCounter(secret: string, counter: number): string {
  const key = base32ToBuffer(secret);
  const buf = Buffer.alloc(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    buf[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const normalized = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  const currentCounter = Math.floor(Date.now() / 1000 / 30);
  for (const drift of [-1, 0, 1]) {
    const expected = computeTotpAtCounter(secret, currentCounter + drift);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(normalized))) {
      return true;
    }
  }
  return false;
}

export function buildTotpUri(email: string, secret: string): string {
  const issuer = encodeURIComponent('BraidsofHope Admin');
  const account = encodeURIComponent(email);
  return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

export interface ModulePermission {
  can_view: boolean;
  can_edit: boolean;
  can_publish: boolean;
  can_delete: boolean;
}

export interface AuthenticatedAdmin {
  id: number;
  email: string;
  full_name: string;
  role_id: number;
  role_slug: string;
  role_name: string;
  two_factor_enabled: boolean;
  permissions: Record<string, ModulePermission>;
  session_id: number;
}

declare global {
  namespace Express {
    interface Request {
      adminUser?: AuthenticatedAdmin;
    }
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '';
}

export async function resolveAdminFromToken(rawToken: string): Promise<AuthenticatedAdmin | null> {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const session = await db.queryOne<{
    id: number;
    user_id: number;
    expires_at: string;
    revoked_at: string | null;
  }>(
    `SELECT id, user_id, expires_at, revoked_at FROM admin_sessions WHERE token_hash = $1 LIMIT 1`,
    [tokenHash]
  );
  if (!session || session.revoked_at) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) return null;

  const user = await db.queryOne<{
    id: number;
    email: string;
    full_name: string;
    role_id: number;
    is_active: unknown;
    two_factor_enabled: unknown;
    role_slug: string;
    role_name: string;
  }>(
    `SELECT u.id, u.email, u.full_name, u.role_id, u.is_active, u.two_factor_enabled,
            r.slug as role_slug, r.name as role_name
     FROM admin_users u
     JOIN admin_roles r ON r.id = u.role_id
     WHERE u.id = $1 LIMIT 1`,
    [session.user_id]
  );

  if (!user || !asBool(user.is_active)) return null;

  const permRows = await db.query<{
    module_key: string;
    can_view: unknown;
    can_edit: unknown;
    can_publish: unknown;
    can_delete: unknown;
  }>(
    `SELECT module_key, can_view, can_edit, can_publish, can_delete
     FROM admin_permissions WHERE role_id = $1`,
    [user.role_id]
  );

  const permissions: Record<string, ModulePermission> = {};
  for (const row of permRows) {
    permissions[row.module_key] = {
      can_view: asBool(row.can_view),
      can_edit: asBool(row.can_edit),
      can_publish: asBool(row.can_publish),
      can_delete: asBool(row.can_delete),
    };
  }

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role_id: user.role_id,
    role_slug: user.role_slug,
    role_name: user.role_name,
    two_factor_enabled: asBool(user.two_factor_enabled),
    permissions,
    session_id: session.id,
  };
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const admin = await resolveAdminFromToken(token);
    if (!admin) {
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }
    req.adminUser = admin;
    next();
  } catch (err) {
    next(err);
  }
}

export function requirePermission(
  moduleKey: ModuleKey,
  action: 'view' | 'edit' | 'publish' | 'delete' = 'view'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const admin = req.adminUser;
    if (!admin) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (admin.role_slug === 'super_admin') {
      next();
      return;
    }
    const perm = admin.permissions[moduleKey];
    const allowed =
      perm &&
      ((action === 'view' && perm.can_view) ||
        (action === 'edit' && perm.can_edit) ||
        (action === 'publish' && perm.can_publish) ||
        (action === 'delete' && perm.can_delete));
    if (!allowed) {
      res.status(403).json({ error: 'You do not have permission to perform this action in this module' });
      return;
    }
    next();
  };
}

export async function logActivity(params: {
  adminUserId?: number | null;
  adminEmail?: string;
  action: string;
  module: string;
  targetId?: string | number;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  await db.execute(
    `INSERT INTO activity_logs (admin_user_id, admin_email, action, module, target_id, details_json, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      params.adminUserId ?? null,
      params.adminEmail ?? '',
      params.action,
      params.module,
      params.targetId !== undefined ? String(params.targetId) : '',
      JSON.stringify(params.details ?? {}),
      params.ipAddress ?? '',
    ]
  );
}

export async function createAdminNotification(params: {
  type: string;
  title: string;
  message: string;
  linkModule: string;
  relatedId?: number;
}): Promise<void> {
  await db.execute(
    `INSERT INTO admin_notifications (type, title, message, link_module, related_id, is_read)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [params.type, params.title, params.message, params.linkModule, params.relatedId ?? null, false]
  );
}
