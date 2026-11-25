import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save, Trash2 } from 'lucide-react';
import { apiFetch } from '../../../lib/api.ts';
import type { FooterSettings, NavigationItem } from '../../../types.ts';

export const NavigationFooterModule: React.FC<{
  onToast: (type: 'success' | 'error', text: string) => void;
}> = ({ onToast }) => {
  const [nav, setNav] = useState<NavigationItem[]>([]);
  const [footer, setFooter] = useState<FooterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [newLink, setNewLink] = useState({ label: '', href: '', parent_id: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ navigation: NavigationItem[]; footer: FooterSettings | null }>(
        '/api/admin/navigation'
      );
      setNav(res.navigation);
      setFooter(res.footer);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to load navigation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addNavLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/navigation', {
        method: 'POST',
        body: JSON.stringify({
          label: newLink.label,
          href: newLink.href,
          parent_id: newLink.parent_id ? Number(newLink.parent_id) : null,
          is_visible: true,
          sort_order: nav.length + 1,
        }),
      });
      setNewLink({ label: '', href: '', parent_id: '' });
      onToast('success', 'Navigation link added.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to add link.');
    }
  };

  const updateNavLink = async (item: NavigationItem, patch: Partial<NavigationItem>) => {
    const updated = { ...item, ...patch };
    setNav((prev) => prev.map((n) => (n.id === item.id ? updated : n)));
    try {
      await apiFetch(`/api/admin/navigation/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
      onToast('success', 'Navigation updated.');
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to update link.');
    }
  };

  const moveNav = async (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= nav.length) return;
    const copy = [...nav];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    setNav(copy);
    await apiFetch('/api/admin/navigation/reorder', {
      method: 'PUT',
      body: JSON.stringify({ orderedIds: copy.map((n) => n.id) }),
    });
    onToast('success', 'Menu order saved.');
  };

  const deleteNavLink = async (id: number) => {
    await apiFetch(`/api/admin/navigation/${id}`, { method: 'DELETE' });
    onToast('success', 'Navigation link deleted.');
    await load();
  };

  const saveFooter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!footer) return;
    try {
      await apiFetch('/api/admin/footer', {
        method: 'PUT',
        body: JSON.stringify(footer),
      });
      onToast('success', 'Footer & social links published.');
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to save footer.');
    }
  };

  if (loading) {
    return <div className="bg-white border border-stone-200 rounded-xl p-8 text-sm text-stone-500">Loading navigation...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">Navigation, Footer & Social Media</h1>
        <p className="text-sm text-stone-600 mt-1">
          Configure header menu links, dropdown items, footer appearance, and official social media profiles.
        </p>
      </div>

      {/* Header Navigation Management */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-[#4A0E36]">Header Navigation Menu</h2>

        <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
          {nav.map((item, idx) => (
            <div key={item.id} className="p-3.5 flex flex-wrap items-center gap-3 bg-white">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveNav(idx, -1)}
                  className="p-1 rounded hover:bg-stone-100 disabled:opacity-30"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === nav.length - 1}
                  onClick={() => moveNav(idx, 1)}
                  className="p-1 rounded hover:bg-stone-100 disabled:opacity-30"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={item.label}
                onChange={(e) =>
                  setNav((prev) => prev.map((n) => (n.id === item.id ? { ...n, label: e.target.value } : n)))
                }
                onBlur={() => updateNavLink(item, {})}
                className="px-3 py-1.5 rounded-lg border border-stone-300 text-sm font-medium w-40"
              />
              <input
                type="text"
                value={item.href}
                onChange={(e) =>
                  setNav((prev) => prev.map((n) => (n.id === item.id ? { ...n, href: e.target.value } : n)))
                }
                onBlur={() => updateNavLink(item, {})}
                className="px-3 py-1.5 rounded-lg border border-stone-300 text-sm font-mono flex-1 min-w-[140px]"
              />
              <select
                value={item.parent_id ? String(item.parent_id) : ''}
                onChange={(e) =>
                  updateNavLink(item, { parent_id: e.target.value ? Number(e.target.value) : null })
                }
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
              >
                <option value="">Top-Level Link</option>
                {nav
                  .filter((p) => p.id !== item.id && !p.parent_id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      Dropdown under: {p.label}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => updateNavLink(item, { is_visible: !item.is_visible })}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs"
              >
                {item.is_visible ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-[#0E7C7B]" />
                    <span>Visible</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-stone-400" />
                    <span>Hidden</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => deleteNavLink(item.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={addNavLink} className="flex flex-wrap items-center gap-2.5 pt-2">
          <input
            type="text"
            required
            placeholder="Link Label (e.g. Annual Report)"
            value={newLink.label}
            onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
            className="px-3 py-2 rounded-lg border border-stone-300 text-sm"
          />
          <input
            type="text"
            required
            placeholder="Destination (/annual-report)"
            value={newLink.href}
            onChange={(e) => setNewLink({ ...newLink, href: e.target.value })}
            className="px-3 py-2 rounded-lg border border-stone-300 text-sm font-mono flex-1 min-w-[180px]"
          />
          <select
            value={newLink.parent_id}
            onChange={(e) => setNewLink({ ...newLink, parent_id: e.target.value })}
            className="px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
          >
            <option value="">Top-Level Menu</option>
            {nav
              .filter((p) => !p.parent_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  Dropdown under {p.label}
                </option>
              ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0E7C7B] text-white text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Add Link</span>
          </button>
        </form>
      </div>

      {/* Footer & Social Media Management */}
      {footer && (
        <form onSubmit={saveFooter} className="bg-white border border-stone-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <h2 className="font-semibold text-[#4A0E36]">Footer & Social Media Configuration</h2>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold"
            >
              <Save className="w-4 h-4" />
              <span>Save Footer & Social Links</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Footer Description</label>
              <input
                type="text"
                value={footer.description}
                onChange={(e) => setFooter({ ...footer, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Copyright Text</label>
              <input
                type="text"
                value={footer.copyright_text}
                onChange={(e) => setFooter({ ...footer, copyright_text: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-stone-700 mb-1">Footer Mission Blurb</label>
              <textarea
                rows={2}
                value={footer.mission_blurb}
                onChange={(e) => setFooter({ ...footer, mission_blurb: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Footer Background Colour</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={footer.bg_color || '#3B0A2B'}
                  onChange={(e) => setFooter({ ...footer, bg_color: e.target.value })}
                  className="w-10 h-9 rounded border border-stone-300 p-0.5 bg-white"
                />
                <input
                  type="text"
                  value={footer.bg_color}
                  onChange={(e) => setFooter({ ...footer, bg_color: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Footer Text Colour</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={footer.text_color || '#FAF5EE'}
                  onChange={(e) => setFooter({ ...footer, text_color: e.target.value })}
                  className="w-10 h-9 rounded border border-stone-300 p-0.5 bg-white"
                />
                <input
                  type="text"
                  value={footer.text_color}
                  onChange={(e) => setFooter({ ...footer, text_color: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-200 space-y-3">
            <div className="text-xs font-semibold text-stone-700">
              Official Social Media URLs (icons only display on the public website when a valid URL is provided)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok'].map((platform) => (
                <div key={platform}>
                  <label className="block text-xs font-medium text-stone-600 capitalize mb-1">{platform}</label>
                  <input
                    type="url"
                    placeholder={`https://${platform}.com/...`}
                    value={footer.social_links?.[platform] || ''}
                    onChange={(e) =>
                      setFooter({
                        ...footer,
                        social_links: { ...footer.social_links, [platform]: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
