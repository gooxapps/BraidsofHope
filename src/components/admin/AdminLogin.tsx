import React, { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { apiFetch, setAuthToken } from '../../lib/api.ts';
import { BrandLogo } from '../BrandMark.tsx';

interface AdminLoginProps {
  onAuthenticated: () => void;
  onBackToSite: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onAuthenticated, onBackToSite }) => {
  const [statusLoading, setStatusLoading] = useState(true);
  const [needsInitialSetup, setNeedsInitialSetup] = useState(false);
  const [passcodeConfigured, setPasscodeConfigured] = useState(false);

  const [mode, setMode] = useState<'login' | 'reset_request' | 'reset_confirm' | 'passcode'>('login');

  // Setup state
  const [setupForm, setSetupForm] = useState({ full_name: '', email: '', password: '', confirmPassword: '' });

  // Login state
  const [loginForm, setLoginForm] = useState({ email: '', password: '', totp_code: '' });
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);

  // Passcode state
  const [passcodeForm, setPasscodeForm] = useState({ email: '', bootstrap_passcode: '' });

  // Reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetConfirmForm, setResetConfirmForm] = useState({ token: '', new_password: '' });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  useEffect(() => {
    apiFetch<{ needsInitialSetup: boolean; passcodeConfigured: boolean }>('/api/admin/auth/status')
      .then((res) => {
        setNeedsInitialSetup(res.needsInitialSetup);
        setPasscodeConfigured(res.passcodeConfigured);
      })
      .catch(() => {
        setError('Unable to reach authentication service.');
      })
      .finally(() => setStatusLoading(false));
  }, []);

  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (setupForm.password !== setupForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<{ token: string }>('/api/admin/auth/setup', {
        method: 'POST',
        body: JSON.stringify({
          full_name: setupForm.full_name,
          email: setupForm.email,
          password: setupForm.password,
        }),
      });
      setAuthToken(res.token);
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setSubmitting(true);
    try {
      const res = await apiFetch<{ token?: string; requiresTwoFactor?: boolean }>('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      });
      if (res.requiresTwoFactor && !res.token) {
        setRequiresTwoFactor(true);
        setInfoMsg('Enter the 6-digit code from your authenticator app.');
        return;
      }
      if (res.token) {
        setAuthToken(res.token);
        onAuthenticated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasscodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await apiFetch<{ token: string }>('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: passcodeForm.email,
          bootstrap_passcode: passcodeForm.bootstrap_passcode,
        }),
      });
      if (res.token) {
        setAuthToken(res.token);
        onAuthenticated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid bootstrap passcode.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setSubmitting(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/admin/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail }),
      });
      setInfoMsg(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process reset request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setSubmitting(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/admin/auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify(resetConfirmForm),
      });
      setInfoMsg(res.message);
      setMode('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF5EE] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <BrandLogo orgName="BraidsofHope" tagline="Administration & Content Portal" showTagline size="lg" />
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {statusLoading ? (
            <div className="py-10 text-center text-sm text-stone-500">Checking administrator portal status...</div>
          ) : needsInitialSetup ? (
            <form onSubmit={handleInitialSetup} className="space-y-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#0E7C7B]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>First-Run Setup</span>
                </div>
                <h1 className="font-display text-2xl font-bold text-[#4A0E36]">Claim Super Administrator</h1>
                <p className="text-xs text-stone-600 leading-relaxed">
                  No administrator account exists yet. Create the primary Super Administrator account below. This setup
                  locks automatically once claimed.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={setupForm.full_name}
                  onChange={(e) => setSetupForm({ ...setupForm, full_name: e.target.value })}
                  placeholder="Charity Director"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Administrator Email</label>
                <input
                  type="email"
                  required
                  value={setupForm.email}
                  onChange={(e) => setSetupForm({ ...setupForm, email: e.target.value })}
                  placeholder="admin@braidsofhope.org"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Password (min 10 characters)</label>
                <input
                  type="password"
                  required
                  minLength={10}
                  value={setupForm.password}
                  onChange={(e) => setSetupForm({ ...setupForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  minLength={10}
                  value={setupForm.confirmPassword}
                  onChange={(e) => setSetupForm({ ...setupForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60"
              >
                {submitting ? 'Creating Account...' : 'Create Super Administrator'}
              </button>
            </form>
          ) : mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0E7C7B]">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Authorized Personnel Only</span>
                </div>
                <h1 className="font-display text-2xl font-bold text-[#4A0E36]">Admin Sign In</h1>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              {requiresTwoFactor && (
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">2FA Authenticator Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={loginForm.totp_code}
                    onChange={(e) => setLoginForm({ ...loginForm, totp_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm font-mono tracking-widest"
                  />
                </div>
              )}

              {error && <p className="text-xs text-red-600">{error}</p>}
              {infoMsg && <p className="text-xs text-[#0E7C7B]">{infoMsg}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60"
              >
                {submitting ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-stone-600 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setInfoMsg('');
                    setMode('reset_request');
                  }}
                  className="hover:text-[#4A0E36] underline"
                >
                  Forgot password?
                </button>
                {passcodeConfigured && (
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setMode('passcode');
                    }}
                    className="inline-flex items-center gap-1 hover:text-[#4A0E36] underline"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Passcode Access</span>
                  </button>
                )}
              </div>
            </form>
          ) : mode === 'passcode' ? (
            <form onSubmit={handlePasscodeLogin} className="space-y-4">
              <h1 className="font-display text-2xl font-bold text-[#4A0E36]">Server Passcode Sign In</h1>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Admin Email (optional)</label>
                <input
                  type="email"
                  value={passcodeForm.email}
                  onChange={(e) => setPasscodeForm({ ...passcodeForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Server Bootstrap Passcode</label>
                <input
                  type="password"
                  required
                  value={passcodeForm.bootstrap_passcode}
                  onChange={(e) => setPasscodeForm({ ...passcodeForm, bootstrap_passcode: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold"
              >
                {submitting ? 'Verifying...' : 'Sign In With Passcode'}
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-stone-600 underline"
              >
                Back to Email Login
              </button>
            </form>
          ) : mode === 'reset_request' ? (
            <form onSubmit={handleResetRequest} className="space-y-4">
              <h1 className="font-display text-2xl font-bold text-[#4A0E36]">Reset Password</h1>
              <p className="text-xs text-stone-600">
                Request a password reset or enter a reset token issued by your Super Administrator.
              </p>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Administrator Email</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              {infoMsg && <p className="text-xs text-[#0E7C7B]">{infoMsg}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold"
              >
                Log Reset Request
              </button>
              <div className="flex justify-between text-xs pt-1">
                <button type="button" onClick={() => setMode('login')} className="text-stone-600 underline">
                  Back to Sign In
                </button>
                <button type="button" onClick={() => setMode('reset_confirm')} className="text-[#0E7C7B] underline">
                  I have a reset token
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetConfirm} className="space-y-4">
              <h1 className="font-display text-2xl font-bold text-[#4A0E36]">Complete Password Reset</h1>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">One-Time Reset Token</label>
                <input
                  type="text"
                  required
                  value={resetConfirmForm.token}
                  onChange={(e) => setResetConfirmForm({ ...resetConfirmForm, token: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">New Password (min 10 characters)</label>
                <input
                  type="password"
                  required
                  minLength={10}
                  value={resetConfirmForm.new_password}
                  onChange={(e) => setResetConfirmForm({ ...resetConfirmForm, new_password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold"
              >
                Update Password
              </button>
              <button type="button" onClick={() => setMode('login')} className="text-xs text-stone-600 underline">
                Back to Sign In
              </button>
            </form>
          )}
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onBackToSite}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-[#4A0E36]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Website</span>
          </button>
        </div>
      </div>
    </div>
  );
};
