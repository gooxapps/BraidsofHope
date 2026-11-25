import { Router } from 'express';
import {
  buildTotpUri,
  extractBearerToken,
  generateRandomToken,
  generateTotpSecret,
  getClientIp,
  hashPassword,
  hashToken,
  isAdvancedDonationsUnlocked,
  logActivity,
  requireAuth,
  verifyPassword,
  verifyTotpCode,
} from '../auth.ts';
import { asBool, db } from '../db.ts';

export const adminAuthRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

adminAuthRouter.get('/status', async (_req, res, next) => {
  try {
    const countRow = await db.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM admin_users');
    const userCount = Number(countRow?.cnt ?? 0);
    const passcodeConfigured = Boolean(process.env.ADMIN_BOOTSTRAP_PASSCODE?.trim());

    res.json({
      needsInitialSetup: userCount === 0 && !passcodeConfigured,
      passcodeConfigured,
      donationsUnlocked: isAdvancedDonationsUnlocked(),
    });
  } catch (err) {
    next(err);
  }
});

// One-time first-run Super Administrator claim route (automatically locks once any admin exists or passcode is set)
adminAuthRouter.post('/setup', async (req, res, next) => {
  try {
    const passcodeConfigured = Boolean(process.env.ADMIN_BOOTSTRAP_PASSCODE?.trim());
    if (passcodeConfigured) {
      res.status(403).json({ error: 'Initial setup is disabled because server bootstrap passcode is configured.' });
      return;
    }
    const countRow = await db.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM admin_users');
    if (Number(countRow?.cnt ?? 0) > 0) {
      res.status(403).json({ error: 'An administrator account already exists. Please sign in.' });
      return;
    }

    const { full_name, email, password } = req.body ?? {};
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 10) {
      res.status(400).json({ error: 'Password must be at least 10 characters long.' });
      return;
    }

    const superRole = await db.queryOne<{ id: number }>(
      "SELECT id FROM admin_roles WHERE slug = 'super_admin' LIMIT 1"
    );
    if (!superRole) {
      res.status(500).json({ error: 'Super Administrator role not initialized.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const pwdHash = hashPassword(password);
    const createdUser = await db.queryOne<{ id: number }>(
      `INSERT INTO admin_users (email, full_name, password_hash, role_id, is_active, last_login_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING id`,
      [cleanEmail, full_name.trim().slice(0, 120), pwdHash, superRole.id, true]
    );

    if (!createdUser) {
      res.status(500).json({ error: 'Could not create Super Administrator.' });
      return;
    }

    const rawToken = generateRandomToken(32);
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    await db.execute(
      `INSERT INTO admin_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [createdUser.id, hashToken(rawToken), getClientIp(req), String(req.headers['user-agent'] || '').slice(0, 300), expiresAt]
    );

    await logActivity({
      adminUserId: createdUser.id,
      adminEmail: cleanEmail,
      action: 'initial_super_admin_claimed',
      module: 'users',
      targetId: createdUser.id,
      ipAddress: getClientIp(req),
    });

    res.status(201).json({
      token: rawToken,
      expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

adminAuthRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password, totp_code, bootstrap_passcode } = req.body ?? {};
    const ip = getClientIp(req);
    const ua = String(req.headers['user-agent'] || '').slice(0, 300);

    // Optional server-configured emergency Super Admin passcode flow
    const envPasscode = process.env.ADMIN_BOOTSTRAP_PASSCODE?.trim();
    if (bootstrap_passcode && typeof bootstrap_passcode === 'string' && envPasscode) {
      if (bootstrap_passcode.length === envPasscode.length && bootstrap_passcode === envPasscode) {
        let superAdmin = await db.queryOne<{ id: number; email: string }>(
          `SELECT u.id, u.email FROM admin_users u
           JOIN admin_roles r ON r.id = u.role_id
           WHERE r.slug = 'super_admin' AND u.is_active = $1 LIMIT 1`,
          [true]
        );
        if (!superAdmin) {
          const superRole = await db.queryOne<{ id: number }>(
            "SELECT id FROM admin_roles WHERE slug = 'super_admin' LIMIT 1"
          );
          if (superRole) {
            const fallbackEmail =
              typeof email === 'string' && EMAIL_REGEX.test(email.trim())
                ? email.trim().toLowerCase()
                : 'admin@braidsofhope.org';
            superAdmin = await db.queryOne<{ id: number; email: string }>(
              `INSERT INTO admin_users (email, full_name, password_hash, role_id, is_active)
               VALUES ($1, $2, $3, $4, $5) RETURNING id, email`,
              [fallbackEmail, 'Super Administrator', hashPassword(generateRandomToken(24)), superRole.id, true]
            );
          }
        }
        if (superAdmin) {
          const rawToken = generateRandomToken(32);
          const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
          await db.execute(
            `INSERT INTO admin_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [superAdmin.id, hashToken(rawToken), ip, ua, expiresAt]
          );
          await db.execute('UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [superAdmin.id]);
          await db.execute(
            `INSERT INTO login_attempts (email, success, ip_address, user_agent, failure_reason)
             VALUES ($1, $2, $3, $4, $5)`,
            [superAdmin.email, true, ip, ua, 'bootstrap_passcode']
          );
          await logActivity({
            adminUserId: superAdmin.id,
            adminEmail: superAdmin.email,
            action: 'admin_login_passcode',
            module: 'auth',
            ipAddress: ip,
          });
          res.json({ token: rawToken, expiresAt });
          return;
        }
      }
      await db.execute(
        `INSERT INTO login_attempts (email, success, ip_address, user_agent, failure_reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [String(email || 'passcode'), false, ip, ua, 'invalid_bootstrap_passcode']
      );
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await db.queryOne<{
      id: number;
      email: string;
      full_name: string;
      password_hash: string;
      is_active: unknown;
      two_factor_enabled: unknown;
      two_factor_secret: string | null;
    }>(
      `SELECT id, email, full_name, password_hash, is_active, two_factor_enabled, two_factor_secret
       FROM admin_users WHERE email = $1 LIMIT 1`,
      [cleanEmail]
    );

    if (!user || !verifyPassword(password, user.password_hash)) {
      await db.execute(
        `INSERT INTO login_attempts (email, success, ip_address, user_agent, failure_reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [cleanEmail, false, ip, ua, 'invalid_email_or_password']
      );
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!asBool(user.is_active)) {
      await db.execute(
        `INSERT INTO login_attempts (email, success, ip_address, user_agent, failure_reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [cleanEmail, false, ip, ua, 'account_disabled']
      );
      res.status(403).json({ error: 'This administrator account is currently deactivated.' });
      return;
    }

    if (asBool(user.two_factor_enabled) && user.two_factor_secret) {
      if (!totp_code || typeof totp_code !== 'string') {
        res.status(200).json({ requiresTwoFactor: true });
        return;
      }
      if (!verifyTotpCode(user.two_factor_secret, totp_code)) {
        await db.execute(
          `INSERT INTO login_attempts (email, success, ip_address, user_agent, failure_reason)
           VALUES ($1, $2, $3, $4, $5)`,
          [cleanEmail, false, ip, ua, 'invalid_2fa_code']
        );
        res.status(401).json({ error: 'Invalid two-factor authentication code.', requiresTwoFactor: true });
        return;
      }
    }

    const rawToken = generateRandomToken(32);
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    await db.execute(
      `INSERT INTO admin_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, hashToken(rawToken), ip, ua, expiresAt]
    );
    await db.execute('UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    await db.execute(
      `INSERT INTO login_attempts (email, success, ip_address, user_agent, failure_reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [cleanEmail, true, ip, ua, '']
    );

    await logActivity({
      adminUserId: user.id,
      adminEmail: cleanEmail,
      action: 'admin_login',
      module: 'auth',
      ipAddress: ip,
    });

    res.json({ token: rawToken, expiresAt });
  } catch (err) {
    next(err);
  }
});

adminAuthRouter.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const rawToken = extractBearerToken(req);
    if (rawToken) {
      await db.execute(
        'UPDATE admin_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1',
        [hashToken(rawToken)]
      );
    }
    await logActivity({
      adminUserId: req.adminUser?.id,
      adminEmail: req.adminUser?.email,
      action: 'admin_logout',
      module: 'auth',
      ipAddress: getClientIp(req),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminAuthRouter.get('/me', requireAuth, async (req, res) => {
  res.json({
    user: req.adminUser,
    donationsUnlocked: isAdvancedDonationsUnlocked(),
  });
});

adminAuthRouter.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body ?? {};
    if (!current_password || !new_password || typeof new_password !== 'string' || new_password.length < 10) {
      res.status(400).json({ error: 'New password must be at least 10 characters.' });
      return;
    }
    const user = await db.queryOne<{ id: number; password_hash: string }>(
      'SELECT id, password_hash FROM admin_users WHERE id = $1 LIMIT 1',
      [req.adminUser!.id]
    );
    if (!user || !verifyPassword(String(current_password), user.password_hash)) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }

    await db.execute(
      'UPDATE admin_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashPassword(new_password), user.id]
    );

    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: 'password_changed',
      module: 'auth',
      ipAddress: getClientIp(req),
    });

    res.json({ ok: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// Self-service Password Reset via single-use token
adminAuthRouter.post('/password-reset/request', async (req, res, next) => {
  try {
    const { email } = req.body ?? {};
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ error: 'Please provide a valid administrator email.' });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = await db.queryOne<{ id: number }>(
      'SELECT id FROM admin_users WHERE email = $1 AND is_active = $2 LIMIT 1',
      [cleanEmail, true]
    );

    if (user) {
      const rawToken = generateRandomToken(24);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await db.execute(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, hashToken(rawToken), expiresAt]
      );
      await logActivity({
        adminUserId: user.id,
        adminEmail: cleanEmail,
        action: 'password_reset_requested',
        module: 'auth',
        ipAddress: getClientIp(req),
      });
    }

    // Uniform response to avoid account enumeration
    res.json({
      ok: true,
      message:
        'If an active administrator account matches that email, a reset request has been logged. Contact your Super Administrator to issue a one-time reset token if outbound email is not configured.',
    });
  } catch (err) {
    next(err);
  }
});

adminAuthRouter.post('/password-reset/confirm', async (req, res, next) => {
  try {
    const { token, new_password } = req.body ?? {};
    if (!token || typeof token !== 'string' || !new_password || typeof new_password !== 'string' || new_password.length < 10) {
      res.status(400).json({ error: 'Valid reset token and a new password (10+ characters) are required.' });
      return;
    }

    const row = await db.queryOne<{ id: number; user_id: number; expires_at: string; used_at: string | null }>(
      'SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1 LIMIT 1',
      [hashToken(token.trim())]
    );

    if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) {
      res.status(400).json({ error: 'Reset token is invalid or has expired.' });
      return;
    }

    await db.execute(
      'UPDATE admin_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashPassword(new_password), row.user_id]
    );
    await db.execute('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [row.id]);
    await db.execute('UPDATE admin_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL', [
      row.user_id,
    ]);

    await logActivity({
      adminUserId: row.user_id,
      action: 'password_reset_completed',
      module: 'auth',
      ipAddress: getClientIp(req),
    });

    res.json({ ok: true, message: 'Password has been reset. You can now sign in with your new password.' });
  } catch (err) {
    next(err);
  }
});

// Two-Factor Authentication (TOTP) management
adminAuthRouter.post('/2fa/enroll', requireAuth, async (req, res) => {
  const secret = generateTotpSecret();
  const uri = buildTotpUri(req.adminUser!.email, secret);
  res.json({ secret, otpauthUri: uri });
});

adminAuthRouter.post('/2fa/enable', requireAuth, async (req, res, next) => {
  try {
    const { secret, code } = req.body ?? {};
    if (!secret || typeof secret !== 'string' || !code || typeof code !== 'string') {
      res.status(400).json({ error: 'Secret and 6-digit verification code are required.' });
      return;
    }
    if (!verifyTotpCode(secret, code)) {
      res.status(400).json({ error: 'Invalid verification code. Please check your authenticator clock and try again.' });
      return;
    }

    await db.execute(
      'UPDATE admin_users SET two_factor_enabled = $1, two_factor_secret = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [true, secret.trim(), req.adminUser!.id]
    );
    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: '2fa_enabled',
      module: 'auth',
      ipAddress: getClientIp(req),
    });
    res.json({ ok: true, message: 'Two-factor authentication is now enabled.' });
  } catch (err) {
    next(err);
  }
});

adminAuthRouter.post('/2fa/disable', requireAuth, async (req, res, next) => {
  try {
    const { password } = req.body ?? {};
    const user = await db.queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM admin_users WHERE id = $1 LIMIT 1',
      [req.adminUser!.id]
    );
    if (!user || !password || !verifyPassword(String(password), user.password_hash)) {
      res.status(401).json({ error: 'Password confirmation is required to disable 2FA.' });
      return;
    }
    await db.execute(
      'UPDATE admin_users SET two_factor_enabled = $1, two_factor_secret = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [false, req.adminUser!.id]
    );
    await logActivity({
      adminUserId: req.adminUser!.id,
      adminEmail: req.adminUser!.email,
      action: '2fa_disabled',
      module: 'auth',
      ipAddress: getClientIp(req),
    });
    res.json({ ok: true, message: 'Two-factor authentication has been disabled.' });
  } catch (err) {
    next(err);
  }
});
