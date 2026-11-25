import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Lock, Save } from 'lucide-react';
import { apiFetch } from '../../../lib/api.ts';
import type { SiteSettings } from '../../../types.ts';
import { MediaPickerModal } from './MediaPickerModal.tsx';

export const SettingsModule: React.FC<{
  onToast: (type: 'success' | 'error', text: string) => void;
}> = ({ onToast }) => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [donationsUnlocked, setDonationsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    apiFetch<{
      settings: SiteSettings | null;
      developerEntitlements: { advanced_donations_unlocked: boolean };
    }>('/api/admin/settings')
      .then((res) => {
        setSettings(res.settings);
        setDonationsUnlocked(res.developerEntitlements.advanced_donations_unlocked);
      })
      .catch((err) => onToast('error', err instanceof Error ? err.message : 'Unable to load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await apiFetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });
      onToast('success', 'Website SEO & configuration settings saved.');
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to save settings.');
    }
  };

  if (loading || !settings) {
    return <div className="bg-white border border-stone-200 rounded-xl p-8 text-sm text-stone-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">SEO & Website Settings</h1>
        <p className="text-sm text-stone-600 mt-1">
          Configure search metadata, announcement bar, regional defaults, cookie notice, and indexing.
        </p>
      </div>

      {/* Developer Entitlement Read-Only Box */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF5EE] text-[#4A0E36] flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#4A0E36]">
              Platform Feature Entitlement: Advanced Donations ({donationsUnlocked ? 'Unlocked' : 'Locked'})
            </div>
            <div className="text-xs text-stone-500">
              Controlled exclusively by the platform developer environment configuration. Cannot be overridden here.
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={saveSettings} className="bg-white border border-stone-200 rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Website Title</label>
            <input
              type="text"
              value={settings.site_title}
              onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Default SEO Title</label>
            <input
              type="text"
              value={settings.default_seo_title}
              onChange={(e) => setSettings({ ...settings, default_seo_title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-stone-700 mb-1">Website Description</label>
            <textarea
              rows={2}
              value={settings.site_description}
              onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-stone-700 mb-1">Default SEO Description</label>
            <textarea
              rows={2}
              value={settings.default_seo_description}
              onChange={(e) => setSettings({ ...settings, default_seo_description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Social Sharing Image URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.social_share_image}
                onChange={(e) => setSettings({ ...settings, social_share_image: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="px-3 py-2 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold inline-flex items-center gap-1"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Pick</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Time Zone</label>
              <input
                type="text"
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Currency</label>
              <input
                type="text"
                value={settings.default_currency}
                onChange={(e) => setSettings({ ...settings, default_currency: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Language</label>
              <input
                type="text"
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Announcement Bar */}
        <div className="pt-4 border-t border-stone-200 space-y-3">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#4A0E36] cursor-pointer">
            <input
              type="checkbox"
              checked={settings.announcement_bar_enabled}
              onChange={(e) => setSettings({ ...settings, announcement_bar_enabled: e.target.checked })}
            />
            <span>Enable Website Announcement Bar</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Announcement text..."
              value={settings.announcement_bar_text}
              onChange={(e) => setSettings({ ...settings, announcement_bar_text: e.target.value })}
              className="px-3 py-2 rounded-lg border border-stone-300 text-sm"
            />
            <input
              type="text"
              placeholder="Optional link (/events-campaigns)"
              value={settings.announcement_bar_link}
              onChange={(e) => setSettings({ ...settings, announcement_bar_link: e.target.value })}
              className="px-3 py-2 rounded-lg border border-stone-300 text-sm"
            />
          </div>
        </div>

        {/* Privacy Cookie Notice & Search Indexing */}
        <div className="pt-4 border-t border-stone-200 space-y-3">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#4A0E36] cursor-pointer">
            <input
              type="checkbox"
              checked={settings.cookie_notice_enabled}
              onChange={(e) => setSettings({ ...settings, cookie_notice_enabled: e.target.checked })}
            />
            <span>Show Cookie / Privacy Notice Banner</span>
          </label>
          <textarea
            rows={2}
            value={settings.cookie_notice_text}
            onChange={(e) => setSettings({ ...settings, cookie_notice_text: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
          />
          <div className="flex flex-wrap gap-6 pt-1 text-sm text-stone-700">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.robots_index}
                onChange={(e) => setSettings({ ...settings, robots_index: e.target.checked })}
              />
              <span>Allow search engine indexing (robots.txt)</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sitemap_enabled}
                onChange={(e) => setSettings({ ...settings, sitemap_enabled: e.target.checked })}
              />
              <span>Enable XML Sitemap (/sitemap.xml)</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold"
        >
          <Save className="w-4 h-4" />
          <span>Save All Settings</span>
        </button>
      </form>

      <MediaPickerModal
        open={pickerOpen}
        defaultFolder="General"
        onSelect={(url) => setSettings((prev) => (prev ? { ...prev, social_share_image: url } : prev))}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
};
