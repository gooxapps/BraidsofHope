import React, { useEffect, useState } from 'react';
import { Download, Save, Search, Trash2 } from 'lucide-react';
import { apiFetch, formatDateShort } from '../../../lib/api.ts';
import type { NewsletterSubscriber } from '../../../types.ts';

export const NewsletterModule: React.FC<{
  onToast: (type: 'success' | 'error', text: string) => void;
}> = ({ onToast }) => {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [doubleOptIn, setDoubleOptIn] = useState(true);
  const [consentText, setConsentText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{
        subscribers: NewsletterSubscriber[];
        settings: { newsletter_double_opt_in: boolean; newsletter_consent_text: string } | null;
      }>('/api/admin/newsletter');
      setSubscribers(res.subscribers);
      if (res.settings) {
        setDoubleOptIn(res.settings.newsletter_double_opt_in);
        setConsentText(res.settings.newsletter_consent_text || '');
      }
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to load subscribers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = subscribers.filter((s) => {
    if (!search) return true;
    return `${s.email} ${s.full_name}`.toLowerCase().includes(search.toLowerCase());
  });

  const exportCsv = () => {
    const header = ['Email', 'Full Name', 'Consent Confirmed', 'Status', 'Source', 'Subscribed Date'];
    const rows = filtered.map((s) => [
      `"${s.email}"`,
      `"${(s.full_name || '').replace(/"/g, '""')}"`,
      s.consent_confirmed ? 'Yes' : 'No',
      s.confirmation_status,
      s.source,
      s.subscribed_at,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `braidsofhope-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const removeSubscriber = async (id: number) => {
    try {
      await apiFetch(`/api/admin/newsletter/${id}`, { method: 'DELETE' });
      onToast('success', 'Subscriber removed.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to remove subscriber.');
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify({
          newsletter_double_opt_in: doubleOptIn,
          newsletter_consent_text: consentText,
        }),
      });
      onToast('success', 'CASL newsletter settings saved.');
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to save newsletter settings.');
    }
  };

  if (loading) {
    return <div className="bg-white border border-stone-200 rounded-xl p-8 text-sm text-stone-500">Loading newsletter...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">Newsletter Management</h1>
          <p className="text-sm text-stone-600 mt-1">
            Manage subscribers and Canadian Anti-Spam Legislation (CASL) consent settings.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Export Subscriber CSV</span>
        </button>
      </div>

      {/* CASL Settings */}
      <form onSubmit={saveSettings} className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-[#4A0E36]">Canadian CASL Consent & Confirmation</h2>
        <label className="inline-flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
          <input type="checkbox" checked={doubleOptIn} onChange={(e) => setDoubleOptIn(e.target.checked)} />
          <span>Require subscription confirmation status (Double Opt-In workflow)</span>
        </label>
        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1">Explicit Consent Checkbox Label</label>
          <textarea
            rows={2}
            value={consentText}
            onChange={(e) => setConsentText(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4A0E36] text-white text-xs font-semibold"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Compliance Settings</span>
        </button>
      </form>

      {/* Search + Subscribers Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-stone-200">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subscribers..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 text-sm"
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-stone-500">No newsletter subscribers yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAF5EE] border-b border-stone-200 text-xs text-stone-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">CASL Consent</th>
                <th className="px-4 py-3 font-semibold">Subscribed</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-stone-900">{s.email}</td>
                  <td className="px-4 py-3 text-xs capitalize text-[#0E7C7B] font-medium">
                    {s.confirmation_status.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-xs">{s.consent_confirmed ? 'Confirmed' : 'No'}</td>
                  <td className="px-4 py-3 text-xs text-stone-500 tabular-nums">{formatDateShort(s.subscribed_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => removeSubscriber(s.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
