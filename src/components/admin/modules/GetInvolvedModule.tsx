import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { apiFetch, formatDateShort } from '../../../lib/api.ts';
import type { PartnershipEnquiry, VolunteerApplication, VolunteerOpportunity } from '../../../types.ts';

export const GetInvolvedModule: React.FC<{
  onToast: (type: 'success' | 'error', text: string) => void;
}> = ({ onToast }) => {
  const [tab, setTab] = useState<'volunteers' | 'partnerships' | 'opportunities'>('volunteers');
  const [volunteers, setVolunteers] = useState<VolunteerApplication[]>([]);
  const [partnerships, setPartnerships] = useState<PartnershipEnquiry[]>([]);
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const [showNewOpp, setShowNewOpp] = useState(false);
  const [newOpp, setNewOpp] = useState({ title: '', location: '', commitment: '', description: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{
        opportunities: VolunteerOpportunity[];
        volunteers: VolunteerApplication[];
        partnerships: PartnershipEnquiry[];
      }>('/api/admin/get-involved');
      setOpportunities(res.opportunities);
      setVolunteers(res.volunteers);
      setPartnerships(res.partnerships);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to load Get Involved data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateVolunteerStatus = async (id: number, status: string) => {
    try {
      await apiFetch(`/api/admin/volunteers/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      onToast('success', 'Volunteer application status updated.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to update status.');
    }
  };

  const updatePartnershipStatus = async (id: number, status: string) => {
    try {
      await apiFetch(`/api/admin/partnerships/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      onToast('success', 'Partnership enquiry status updated.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to update status.');
    }
  };

  const createOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/volunteer-opportunities', { method: 'POST', body: JSON.stringify(newOpp) });
      setShowNewOpp(false);
      setNewOpp({ title: '', location: '', commitment: '', description: '' });
      onToast('success', 'Volunteer opportunity added.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to create opportunity.');
    }
  };

  const deleteOpportunity = async (id: number) => {
    try {
      await apiFetch(`/api/admin/volunteer-opportunities/${id}`, { method: 'DELETE' });
      onToast('success', 'Opportunity removed.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to remove opportunity.');
    }
  };

  const filteredVolunteers = volunteers.filter((v) => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (search) {
      const hay = `${v.full_name} ${v.email} ${v.city_country} ${v.opportunity_title}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const filteredPartnerships = partnerships.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search) {
      const hay = `${p.organization_name} ${p.contact_name} ${p.email} ${p.partnership_type}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="bg-white border border-stone-200 rounded-xl p-8 text-sm text-stone-500">Loading Get Involved...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">Get Involved Management</h1>
          <p className="text-sm text-stone-600 mt-1">
            Review volunteer applications, partnership enquiries, and manage public volunteer opportunities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-stone-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setTab('volunteers')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                tab === 'volunteers' ? 'bg-white text-[#4A0E36] shadow-sm' : 'text-stone-600'
              }`}
            >
              Volunteers ({volunteers.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('partnerships')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                tab === 'partnerships' ? 'bg-white text-[#4A0E36] shadow-sm' : 'text-stone-600'
              }`}
            >
              Partnerships ({partnerships.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('opportunities')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                tab === 'opportunities' ? 'bg-white text-[#4A0E36] shadow-sm' : 'text-stone-600'
              }`}
            >
              Opportunities ({opportunities.length})
            </button>
          </div>
          {tab === 'opportunities' && (
            <button
              type="button"
              onClick={() => setShowNewOpp(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Add Opportunity</span>
            </button>
          )}
        </div>
      </div>

      {tab !== 'opportunities' && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search submissions..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="reviewing">Reviewing</option>
            <option value="approved">Approved</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      )}

      {tab === 'volunteers' && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
          {filteredVolunteers.length === 0 ? (
            <div className="p-10 text-center text-sm text-stone-500">No volunteer applications received yet.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAF5EE] border-b border-stone-200 text-xs text-stone-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Applicant</th>
                  <th className="px-4 py-3 font-semibold">Role / Availability</th>
                  <th className="px-4 py-3 font-semibold">Message</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredVolunteers.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">{v.full_name}</div>
                      <div className="text-xs text-stone-500">
                        {v.email} {v.phone ? `· ${v.phone}` : ''}
                      </div>
                      {v.city_country && <div className="text-xs text-stone-400">{v.city_country}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-700">
                      <div className="font-medium">{v.opportunity_title || 'General'}</div>
                      <div className="text-stone-500">{v.availability}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600 max-w-xs">{v.message || '—'}</td>
                    <td className="px-4 py-3 text-xs text-stone-500 tabular-nums">{formatDateShort(v.created_at)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={v.status}
                        onChange={(e) => updateVolunteerStatus(v.id, e.target.value)}
                        className="px-2.5 py-1 rounded-lg border border-stone-300 text-xs bg-white"
                      >
                        <option value="new">New</option>
                        <option value="reviewing">Reviewing</option>
                        <option value="approved">Approved</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'partnerships' && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
          {filteredPartnerships.length === 0 ? (
            <div className="p-10 text-center text-sm text-stone-500">No partnership enquiries received yet.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAF5EE] border-b border-stone-200 text-xs text-stone-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Organization</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Proposal</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPartnerships.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">{p.organization_name}</div>
                      <div className="text-xs text-stone-500">
                        {p.contact_name} · {p.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-700">{p.partnership_type}</td>
                    <td className="px-4 py-3 text-xs text-stone-600 max-w-xs">{p.message || '—'}</td>
                    <td className="px-4 py-3 text-xs text-stone-500 tabular-nums">{formatDateShort(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={p.status}
                        onChange={(e) => updatePartnershipStatus(p.id, e.target.value)}
                        className="px-2.5 py-1 rounded-lg border border-stone-300 text-xs bg-white"
                      >
                        <option value="new">New</option>
                        <option value="reviewing">Reviewing</option>
                        <option value="approved">Approved</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'opportunities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opportunities.map((opp) => (
            <div key={opp.id} className="bg-white border border-stone-200 rounded-xl p-5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-medium text-[#0E7C7B]">
                  {opp.location} · {opp.commitment}
                </div>
                <div className="font-semibold text-[#4A0E36]">{opp.title}</div>
                <p className="text-xs text-stone-600">{opp.description}</p>
              </div>
              <button
                type="button"
                onClick={() => deleteOpportunity(opp.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showNewOpp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={createOpportunity} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-display text-xl font-bold text-[#4A0E36]">Add Volunteer Opportunity</h3>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Role Title *</label>
              <input
                type="text"
                required
                value={newOpp.title}
                onChange={(e) => setNewOpp({ ...newOpp, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Location</label>
                <input
                  type="text"
                  value={newOpp.location}
                  onChange={(e) => setNewOpp({ ...newOpp, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Commitment</label>
                <input
                  type="text"
                  value={newOpp.commitment}
                  onChange={(e) => setNewOpp({ ...newOpp, commitment: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={newOpp.description}
                onChange={(e) => setNewOpp({ ...newOpp, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowNewOpp(false)} className="px-4 py-2 rounded-lg border border-stone-300 text-sm">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold">
                Add Opportunity
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
