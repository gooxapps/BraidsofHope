import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, Lock, Search } from 'lucide-react';
import { apiFetch, formatCurrency, formatDateShort } from '../../../lib/api.ts';
import type { DonationRecord } from '../../../types.ts';

export const DonationsModule: React.FC<{
  onToast: (type: 'success' | 'error', text: string) => void;
}> = ({ onToast }) => {
  const [unlocked, setUnlocked] = useState(false);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [selected, setSelected] = useState<DonationRecord | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [nextStatus, setNextStatus] = useState<DonationRecord['status']>('pending');

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (methodFilter !== 'all') q.set('method', methodFilter);
      const res = await apiFetch<{
        donationsUnlocked: boolean;
        donations: DonationRecord[];
      }>(`/api/admin/donations?${q.toString()}`);
      setUnlocked(res.donationsUnlocked);
      setDonations(res.donations);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to load donations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter, methodFilter]);

  const handleUpdateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      await apiFetch(`/api/admin/donations/${selected.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus, internal_notes: noteInput }),
      });
      onToast('success', 'Donation record updated.');
      setSelected(null);
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to update donation.');
    }
  };

  const exportCsv = () => {
    const header = ['ID', 'Donor Name', 'Donor Email', 'Campaign', 'Amount', 'Currency', 'Method', 'Status', 'Reference', 'Date'];
    const rows = donations.map((d) => [
      d.id,
      `"${(d.donor_name || '').replace(/"/g, '""')}"`,
      `"${(d.donor_email || '').replace(/"/g, '""')}"`,
      `"${(d.campaign_title || 'General').replace(/"/g, '""')}"`,
      (d.amount_cents / 100).toFixed(2),
      d.currency,
      d.payment_method,
      d.status,
      `"${(d.transaction_ref || '').replace(/"/g, '""')}"`,
      d.created_at,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `braidsofhope-donations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="bg-white border border-stone-200 rounded-xl p-8 text-sm text-stone-500">Loading donation module...</div>;
  }

  if (!unlocked) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">Donation Management</h1>
          <p className="text-sm text-stone-600 mt-1">
            Payment records, manual transfer verification, and campaign fundraising ledger.
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-8 max-w-2xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#FAF5EE] text-[#4A0E36] flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-display text-xl font-bold text-[#4A0E36]">Advanced Donation Module Locked</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            The advanced donation and payment verification module is governed by the developer entitlement
            configuration (<code className="font-mono text-xs bg-stone-100 px-1.5 py-0.5 rounded">ENABLE_ADVANCED_DONATIONS</code>).
            Charity administrators cannot override this entitlement from the dashboard. Contact the platform developer
            when you are ready to unlock online donations and bank transfer verification.
          </p>
        </div>
      </div>
    );
  }

  const verifiedTotal = donations
    .filter((d) => d.status === 'successful')
    .reduce((sum, d) => sum + d.amount_cents, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">Donation Management</h1>
          <p className="text-sm text-stone-600 mt-1 tabular-nums">
            Verified Donations Total: <strong className="text-[#0E7C7B]">{formatCurrency(verifiedTotal)}</strong> · Only
            successful/verified records count toward campaign totals.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={donations.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search donor name, email, or reference..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="awaiting_verification">Awaiting Verification</option>
          <option value="pending">Pending</option>
          <option value="successful">Successful (Verified)</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
        >
          <option value="all">All Methods</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="card">Card</option>
        </select>
        <button type="button" onClick={load} className="px-4 py-2 rounded-lg bg-[#4A0E36] text-white text-xs font-semibold">
          Filter
        </button>
      </div>

      {/* Donations Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
        {donations.length === 0 ? (
          <div className="p-10 text-center text-sm text-stone-500">No donation records found matching your filters.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAF5EE] border-b border-stone-200 text-xs text-stone-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Donor</th>
                <th className="px-4 py-3 font-semibold">Campaign</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold">Method & Ref</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {donations.map((d) => (
                <tr key={d.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-900">{d.donor_name || 'Anonymous'}</div>
                    <div className="text-xs text-stone-500">{d.donor_email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-700">{d.campaign_title || 'General Fund'}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatCurrency(d.amount_cents, d.currency)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="capitalize">{d.payment_method.replace('_', ' ')}</div>
                    <div className="font-mono text-stone-500">{d.transaction_ref}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold capitalize">
                    <span
                      className={
                        d.status === 'successful'
                          ? 'text-emerald-700'
                          : d.status === 'awaiting_verification'
                          ? 'text-amber-700'
                          : 'text-stone-600'
                      }
                    >
                      {d.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500 tabular-nums">{formatDateShort(d.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(d);
                        setNextStatus(d.status);
                        setNoteInput(d.internal_notes || '');
                      }}
                      className="px-3 py-1 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold"
                    >
                      Review / Verify
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateDonation} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-display text-xl font-bold text-[#4A0E36]">Review Donation #{selected.id}</h3>
            <div className="text-xs text-stone-600 space-y-1 bg-[#FAF5EE] p-3 rounded-lg">
              <div>
                Donor: <strong>{selected.donor_name}</strong> ({selected.donor_email})
              </div>
              <div className="tabular-nums">
                Amount: <strong>{formatCurrency(selected.amount_cents, selected.currency)}</strong>
              </div>
              <div className="font-mono">Ref: {selected.transaction_ref}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Verification Status</label>
              <select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as DonationRecord['status'])}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
              >
                <option value="pending">Pending</option>
                <option value="awaiting_verification">Awaiting Verification</option>
                <option value="successful">Successful (Verified)</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Internal Verification Notes</label>
              <textarea
                rows={3}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Record</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
