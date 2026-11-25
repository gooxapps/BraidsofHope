import React, { useEffect, useState } from 'react';
import { KeyRound, Plus, Shield } from 'lucide-react';
import { apiFetch, formatDateShort } from '../../../lib/api.ts';

interface AdminUserRow {
  id: number;
  email: string;
  full_name: string;
  role_id: number;
  role_slug: string;
  role_name: string;
  is_active: boolean;
  two_factor_enabled: boolean;
  last_login_at: string | null;
}

interface RoleRow {
  id: number;
  slug: string;
  name: string;
  description: string;
}

export const UsersSecurityModule: React.FC<{
  currentUserId: number;
  onToast: (type: 'success' | 'error', text: string) => void;
}> = ({ currentUserId, onToast }) => {
  const [tab, setTab] = useState<'users' | 'roles' | 'logins' | 'audit'>('users');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<
    Array<{ id: number; email: string; success: boolean; ip_address: string; failure_reason: string; created_at: string }>
  >([]);
  const [auditLogs, setAuditLogs] = useState<
    Array<{ id: number; admin_email: string; action: string; module: string; target_id: string; ip_address: string; created_at: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role_id: '' });
  const [issuedReset, setIssuedReset] = useState<{ email: string; token: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{
        users: AdminUserRow[];
        roles: RoleRow[];
        loginAttempts: typeof loginAttempts;
        activityLogs: typeof auditLogs;
      }>('/api/admin/users');
      setUsers(res.users);
      setRoles(res.roles);
      setLoginAttempts(res.loginAttempts);
      setAuditLogs(res.activityLogs);
      if (!newUser.role_id && res.roles.length > 0) {
        const contentRole = res.roles.find((r) => r.slug === 'content_manager') || res.roles[0];
        setNewUser((p) => ({ ...p, role_id: String(contentRole.id) }));
      }
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to load users & audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(newUser) });
      setShowAdd(false);
      setNewUser((p) => ({ ...p, full_name: '', email: '', password: '' }));
      onToast('success', 'Administrator account created.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to create administrator.');
    }
  };

  const updateUser = async (id: number, patch: { role_id?: number; is_active?: boolean }) => {
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
      onToast('success', 'Administrator updated.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to update administrator.');
    }
  };

  const generateResetToken = async (u: AdminUserRow) => {
    try {
      const res = await apiFetch<{ resetToken: string }>(`/api/admin/users/${u.id}/reset-token`, {
        method: 'POST',
      });
      setIssuedReset({ email: u.email, token: res.resetToken });
      onToast('success', 'One-time reset token generated (valid 30 minutes).');
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to issue reset token.');
    }
  };

  if (loading) {
    return <div className="bg-white border border-stone-200 rounded-xl p-8 text-sm text-stone-500">Loading security module...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">Users, Roles & Security Audit</h1>
          <p className="text-sm text-stone-600 mt-1">
            Manage authorized administrators, role permissions, login activity, and audit logs. Public registration is disabled.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-stone-200/70 rounded-lg">
            {(
              [
                ['users', `Administrators (${users.length})`],
                ['roles', 'Roles'],
                ['logins', 'Login Activity'],
                ['audit', 'Audit Logs'],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                  tab === k ? 'bg-white text-[#4A0E36] shadow-sm' : 'text-stone-600'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
          {tab === 'users' && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Add Administrator</span>
            </button>
          )}
        </div>
      </div>

      {issuedReset && (
        <div className="bg-[#FAF5EE] border border-[#0E7C7B]/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs space-y-1">
            <div className="font-semibold text-[#4A0E36]">
              One-Time Password Reset Token for {issuedReset.email} (valid 30 minutes)
            </div>
            <div className="font-mono bg-white px-3 py-1.5 rounded border border-stone-200 select-all">
              {issuedReset.token}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIssuedReset(null)}
            className="text-xs font-semibold text-stone-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAF5EE] border-b border-stone-200 text-xs text-stone-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Administrator</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">2FA</th>
                <th className="px-4 py-3 font-semibold">Last Login</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Security</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-900">{u.full_name}</div>
                    <div className="text-xs text-stone-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role_id}
                      disabled={u.id === currentUserId}
                      onChange={(e) => updateUser(u.id, { role_id: Number(e.target.value) })}
                      className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white disabled:opacity-60"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {u.two_factor_enabled ? (
                      <span className="text-emerald-700 font-semibold">Enabled</span>
                    ) : (
                      <span className="text-stone-400">Off</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500 tabular-nums">{formatDateShort(u.last_login_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={u.id === currentUserId}
                      onClick={() => updateUser(u.id, { is_active: !u.is_active })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border disabled:opacity-50 ${
                        u.is_active
                          ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                          : 'border-red-300 text-red-700 bg-red-50'
                      }`}
                    >
                      {u.is_active ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => generateResetToken(u)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Reset Token</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((r) => (
            <div key={r.id} className="bg-white border border-stone-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#4A0E36]" />
                <div className="font-semibold text-[#4A0E36]">{r.name}</div>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">{r.description}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'logins' && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAF5EE] border-b border-stone-200 text-xs text-stone-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Outcome</th>
                <th className="px-4 py-3 font-semibold">Reason / Notes</th>
                <th className="px-4 py-3 font-semibold">IP</th>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loginAttempts.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2.5 text-xs font-medium">{l.email}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold">
                    <span className={l.success ? 'text-emerald-700' : 'text-red-600'}>
                      {l.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-stone-500">{l.failure_reason || '—'}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-stone-500">{l.ip_address || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-stone-500 tabular-nums">{formatDateShort(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAF5EE] border-b border-stone-200 text-xs text-stone-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Administrator</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Module</th>
                <th className="px-4 py-3 font-semibold">IP</th>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {auditLogs.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2.5 text-xs font-medium">{a.admin_email || 'System'}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-[#4A0E36]">{a.action}</td>
                  <td className="px-4 py-2.5 text-xs capitalize">{a.module}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-stone-500">{a.ip_address || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-stone-500 tabular-nums">{formatDateShort(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={createUser} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-display text-xl font-bold text-[#4A0E36]">Create Administrator Account</h3>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Role *</label>
              <select
                value={newUser.role_id}
                onChange={(e) => setNewUser({ ...newUser, role_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Initial Password (min 10 chars) *</label>
              <input
                type="password"
                required
                minLength={10}
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-stone-300 text-sm">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold">
                Create Administrator
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
