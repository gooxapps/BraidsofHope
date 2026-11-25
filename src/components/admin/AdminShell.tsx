import React, { useEffect, useState } from 'react';
import {
  Bell,
  BookOpen,
  Compass,
  ExternalLink,
  Eye,
  FileText,
  Flag,
  HandHeart,
  Heart,
  Home,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquareQuote,
  Palette,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { apiFetch, formatDateShort, setAuthToken } from '../../lib/api.ts';
import type { AdminNotification, AdminUser } from '../../types.ts';
import { BrandLogo } from '../BrandMark.tsx';
import { ToastStack, type ToastNotice } from './AdminToast.tsx';
import { AboutTeamModule } from './modules/AboutTeamModule.tsx';
import { BrandingModule } from './modules/BrandingModule.tsx';
import { CampaignsEventsModule } from './modules/CampaignsEventsModule.tsx';
import { ContactModule } from './modules/ContactModule.tsx';
import { DonationsModule } from './modules/DonationsModule.tsx';
import { GetInvolvedModule } from './modules/GetInvolvedModule.tsx';
import { HomepageModule } from './modules/HomepageModule.tsx';
import { MediaLibraryModule } from './modules/MediaLibraryModule.tsx';
import { NavigationFooterModule } from './modules/NavigationFooterModule.tsx';
import { NewsletterModule } from './modules/NewsletterModule.tsx';
import { OverviewModule } from './modules/OverviewModule.tsx';
import { PagesModule } from './modules/PagesModule.tsx';
import { ProgrammesModule } from './modules/ProgrammesModule.tsx';
import { SettingsModule } from './modules/SettingsModule.tsx';
import { StoriesModule } from './modules/StoriesModule.tsx';
import { UsersSecurityModule } from './modules/UsersSecurityModule.tsx';

interface AdminShellProps {
  onLoggedOut: () => void;
  onNavigatePublic: (path: string, preview?: boolean) => void;
}

const NAV_GROUPS = [
  {
    group: 'Overview',
    items: [{ key: 'overview', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    group: 'Branding & Media',
    items: [
      { key: 'branding', label: 'Branding & Logo', icon: Palette },
      { key: 'media', label: 'Media Library', icon: ImageIcon },
    ],
  },
  {
    group: 'Website Content',
    items: [
      { key: 'homepage', label: 'Homepage Editor', icon: Home },
      { key: 'pages', label: 'Pages Manager', icon: FileText },
      { key: 'about', label: 'About Us & Team', icon: BookOpen },
      { key: 'programmes', label: 'Our Work', icon: Compass },
      { key: 'navigation', label: 'Navigation & Footer', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Campaigns & Support',
    items: [
      { key: 'campaigns', label: 'Campaigns & Events', icon: Flag },
      { key: 'donations', label: 'Donations', icon: Heart },
      { key: 'get_involved', label: 'Get Involved', icon: HandHeart },
      { key: 'testimonials', label: 'Stories & Testimonials', icon: MessageSquareQuote },
    ],
  },
  {
    group: 'Communications & System',
    items: [
      { key: 'contact', label: 'Contact & Inbox', icon: Inbox },
      { key: 'newsletter', label: 'Newsletter', icon: Mail },
      { key: 'settings', label: 'SEO & Settings', icon: Settings },
      { key: 'users', label: 'Users & Audit Logs', icon: Users },
    ],
  },
];

export const AdminShell: React.FC<AdminShellProps> = ({ onLoggedOut, onNavigatePublic }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeModule, setActiveModule] = useState('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  // Account Security Modal (Change password + TOTP 2FA)
  const [securityOpen, setSecurityOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '' });
  const [totpEnroll, setTotpEnroll] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState('');
  const [disable2faPwd, setDisable2faPwd] = useState('');

  const pushToast = (type: 'success' | 'error', text: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const canViewModule = (key: string): boolean => {
    if (!user) return false;
    if (user.role_slug === 'super_admin') return true;
    return Boolean(user.permissions[key]?.can_view);
  };

  const loadNotifications = async () => {
    try {
      const res = await apiFetch<{ notifications: AdminNotification[] }>('/api/admin/notifications');
      setNotifications(res.notifications);
    } catch {
      // Ignore if role lacks notifications permission
    }
  };

  useEffect(() => {
    apiFetch<{ user: AdminUser }>('/api/admin/auth/me')
      .then((res) => {
        setUser(res.user);
        loadNotifications();
      })
      .catch(() => {
        setAuthToken(null);
        onLoggedOut();
      })
      .finally(() => setLoadingUser(false));
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network error on logout
    }
    setAuthToken(null);
    onLoggedOut();
  };

  const markRead = async (n: AdminNotification) => {
    try {
      await apiFetch(`/api/admin/notifications/${n.id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      if (n.link_module && canViewModule(n.link_module)) {
        setActiveModule(n.link_module);
        setNotifOpen(false);
      }
    } catch {
      // Ignore
    }
  };

  const markAllRead = async () => {
    await apiFetch('/api/admin/notifications/mark-all-read', { method: 'POST' });
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/auth/change-password', { method: 'POST', body: JSON.stringify(pwdForm) });
      setPwdForm({ current_password: '', new_password: '' });
      pushToast('success', 'Password changed successfully.');
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Unable to change password.');
    }
  };

  const start2faEnrollment = async () => {
    try {
      const res = await apiFetch<{ secret: string; otpauthUri: string }>('/api/admin/auth/2fa/enroll', {
        method: 'POST',
      });
      setTotpEnroll(res);
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Could not start 2FA enrollment.');
    }
  };

  const enable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpEnroll) return;
    try {
      await apiFetch('/api/admin/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ secret: totpEnroll.secret, code: totpVerifyCode }),
      });
      setTotpEnroll(null);
      setTotpVerifyCode('');
      setUser((u) => (u ? { ...u, two_factor_enabled: true } : u));
      pushToast('success', 'Two-factor authentication enabled.');
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Verification failed.');
    }
  };

  const disable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ password: disable2faPwd }),
      });
      setDisable2faPwd('');
      setUser((u) => (u ? { ...u, two_factor_enabled: false } : u));
      pushToast('success', 'Two-factor authentication disabled.');
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Unable to disable 2FA.');
    }
  };

  if (loadingUser || !user) {
    return (
      <div className="min-h-screen bg-[#FAF5EE] flex items-center justify-center text-sm text-stone-600">
        Verifying administrator session...
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const activeLabel =
    NAV_GROUPS.flatMap((g) => g.items).find((i) => i.key === activeModule)?.label || 'Dashboard';

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#3B0A2B] text-[#FAF5EE]">
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
        <BrandLogo orgName="BraidsofHope" tagline="Admin Portal" variant="light" showTagline size="sm" />
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          className="lg:hidden p-1.5 rounded hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((grp) => {
          const visibleItems = grp.items.filter((item) => canViewModule(item.key));
          if (visibleItems.length === 0) return null;
          return (
            <div key={grp.group} className="space-y-1">
              <div className="px-3 text-[11px] font-semibold text-white/50 tracking-wide">{grp.group}</div>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setActiveModule(item.key);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                      isActive
                        ? 'bg-[#F38B1C] text-white font-semibold'
                        : 'text-white/85 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/10 space-y-2.5">
        <div className="text-xs">
          <div className="font-semibold truncate">{user.full_name}</div>
          <div className="text-white/60 truncate">{user.role_name}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSecurityOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Security</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-red-600/80 text-xs font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF5EE] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">{renderSidebarContent()}</aside>

      {/* Mobile Sidebar Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-72 max-w-[85vw] h-full">{renderSidebarContent()}</div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileNavOpen(false)} />
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-stone-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-lg text-stone-700 hover:bg-stone-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-stone-500 flex items-center gap-2 truncate">
              <span className="font-semibold text-[#4A0E36]">Admin</span>
              <span>/</span>
              <span className="text-stone-800 font-medium truncate">{activeLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigatePublic('/', true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#0E7C7B] text-[#0E7C7B] text-xs font-semibold hover:bg-[#0E7C7B]/5 whitespace-nowrap shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Drafts</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigatePublic('/', false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 whitespace-nowrap shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Site</span>
            </button>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  loadNotifications();
                }}
                aria-label="Notifications"
                className="relative p-2 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F38B1C] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#4A0E36]">Notifications</span>
                    {unreadCount > 0 && (
                      <button type="button" onClick={markAllRead} className="text-xs text-[#0E7C7B] hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-stone-500">No notifications yet.</div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => markRead(n)}
                          className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors ${
                            !n.is_read ? 'bg-[#FAF5EE]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#4A0E36]">{n.title}</span>
                            <span className="text-[10px] text-stone-400 tabular-nums">
                              {formatDateShort(n.created_at)}
                            </span>
                          </div>
                          <div className="text-xs text-stone-600 mt-0.5">{n.message}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Active Module Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeModule === 'overview' && <OverviewModule onNavigateModule={setActiveModule} />}
          {activeModule === 'branding' && (
            <BrandingModule onToast={pushToast} onPreviewSite={() => onNavigatePublic('/', true)} />
          )}
          {activeModule === 'media' && <MediaLibraryModule onToast={pushToast} />}
          {activeModule === 'homepage' && (
            <HomepageModule onToast={pushToast} onPreviewSite={() => onNavigatePublic('/', true)} />
          )}
          {activeModule === 'pages' && (
            <PagesModule onToast={pushToast} onPreviewSite={(p) => onNavigatePublic(p || '/', true)} />
          )}
          {activeModule === 'about' && <AboutTeamModule onToast={pushToast} />}
          {activeModule === 'programmes' && <ProgrammesModule onToast={pushToast} />}
          {activeModule === 'campaigns' && <CampaignsEventsModule onToast={pushToast} />}
          {activeModule === 'donations' && <DonationsModule onToast={pushToast} />}
          {activeModule === 'get_involved' && <GetInvolvedModule onToast={pushToast} />}
          {activeModule === 'contact' && <ContactModule onToast={pushToast} />}
          {activeModule === 'testimonials' && <StoriesModule onToast={pushToast} />}
          {activeModule === 'navigation' && <NavigationFooterModule onToast={pushToast} />}
          {activeModule === 'newsletter' && <NewsletterModule onToast={pushToast} />}
          {activeModule === 'settings' && <SettingsModule onToast={pushToast} />}
          {activeModule === 'users' && <UsersSecurityModule currentUserId={user.id} onToast={pushToast} />}
        </main>
      </div>

      {/* Account Security Modal (Password & TOTP 2FA) */}
      {securityOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-display text-xl font-bold text-[#4A0E36]">Account Security</h3>
              <button type="button" onClick={() => setSecurityOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <h4 className="text-sm font-semibold text-stone-800">Change Password</h4>
              <input
                type="password"
                required
                placeholder="Current password"
                value={pwdForm.current_password}
                onChange={(e) => setPwdForm({ ...pwdForm, current_password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
              <input
                type="password"
                required
                minLength={10}
                placeholder="New password (min 10 characters)"
                value={pwdForm.new_password}
                onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
              <button type="submit" className="px-4 py-2 rounded-lg bg-[#4A0E36] text-white text-xs font-semibold">
                Update Password
              </button>
            </form>

            <div className="pt-4 border-t border-stone-200 space-y-3">
              <h4 className="text-sm font-semibold text-stone-800">
                Two-Factor Authentication (TOTP Authenticator App)
              </h4>
              {user.two_factor_enabled ? (
                <form onSubmit={disable2fa} className="space-y-3">
                  <p className="text-xs text-emerald-700 font-medium">2FA is currently active on your account.</p>
                  <input
                    type="password"
                    required
                    placeholder="Confirm current password to disable 2FA"
                    value={disable2faPwd}
                    onChange={(e) => setDisable2faPwd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                  <button type="submit" className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-xs font-semibold">
                    Disable 2FA
                  </button>
                </form>
              ) : totpEnroll ? (
                <form onSubmit={enable2fa} className="space-y-3">
                  <p className="text-xs text-stone-600">
                    Add this secret key to Google Authenticator, 1Password, or Authy, then enter the 6-digit code:
                  </p>
                  <div className="p-3 rounded-lg bg-[#FAF5EE] border border-stone-200 font-mono text-xs break-all select-all">
                    {totpEnroll.secret}
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={totpVerifyCode}
                    onChange={(e) => setTotpVerifyCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm font-mono tracking-widest"
                  />
                  <button type="submit" className="px-4 py-2 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold">
                    Verify & Enable 2FA
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={start2faEnrollment}
                  className="px-4 py-2 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold"
                >
                  Enable Two-Factor Authentication
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
};
