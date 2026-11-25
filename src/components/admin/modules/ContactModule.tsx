import React, { useEffect, useState } from 'react';
import { Save, Search } from 'lucide-react';
import { apiFetch, formatDateShort } from '../../../lib/api.ts';
import type { ContactSubmission } from '../../../types.ts';

interface ContactInfo {
  contact_email: string;
  phone: string;
  whatsapp_number: string;
  office_address: string;
  edmonton_contact: string;
  nigeria_contact: string;
  business_hours: string;
  contact_form_enabled: boolean;
}

export const ContactModule: React.FC<{
  onToast: (type: 'success' | 'error', text: string) => void;
}> = ({ onToast }) => {
  const [tab, setTab] = useState<'submissions' | 'info'>('submissions');
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [info, setInfo] = useState<ContactInfo>({
    contact_email: '',
    phone: '',
    whatsapp_number: '',
    office_address: '',
    edmonton_contact: '',
    nigeria_contact: '',
    business_hours: '',
    contact_form_enabled: true,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ submissions: ContactSubmission[]; contactInfo: ContactInfo | null }>(
        '/api/admin/contacts'
      );
      setSubmissions(res.submissions);
      if (res.contactInfo) setInfo(res.contactInfo);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to load contact records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateSubmissionStatus = async (id: number, status: string) => {
    try {
      await apiFetch(`/api/admin/contacts/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      onToast('success', 'Enquiry status updated.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to update enquiry.');
    }
  };

  const saveContactInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/contact-info', { method: 'PUT', body: JSON.stringify(info) });
      onToast('success', 'Organization contact details updated.');
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to save contact info.');
    }
  };

  const filtered = submissions.filter((s) => {
    if (!search) return true;
    return `${s.name} ${s.email} ${s.subject} ${s.message}`.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) {
    return <div className="bg-white border border-stone-200 rounded-xl p-8 text-sm text-stone-500">Loading contacts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">Contact Management</h1>
          <p className="text-sm text-stone-600 mt-1">
            View public contact enquiries and update Edmonton, Nigeria, email, phone, and WhatsApp details.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-stone-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('submissions')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              tab === 'submissions' ? 'bg-white text-[#4A0E36] shadow-sm' : 'text-stone-600'
            }`}
          >
            Inbox ({submissions.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('info')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              tab === 'info' ? 'bg-white text-[#4A0E36] shadow-sm' : 'text-stone-600'
            }`}
          >
            Contact Details & Offices
          </button>
        </div>
      </div>

      {tab === 'submissions' ? (
        <div className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contact messages..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-sm text-stone-500">No contact submissions received yet.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FAF5EE] border-b border-stone-200 text-xs text-stone-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Sender</th>
                    <th className="px-4 py-3 font-semibold">Subject & Region</th>
                    <th className="px-4 py-3 font-semibold">Message</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-stone-900">{s.name}</div>
                        <div className="text-xs text-stone-500">{s.email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-stone-800">{s.subject || 'General'}</div>
                        <div className="text-stone-500">{s.region}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-600 max-w-sm">{s.message}</td>
                      <td className="px-4 py-3 text-xs text-stone-500 tabular-nums">{formatDateShort(s.created_at)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={s.status}
                          onChange={(e) => updateSubmissionStatus(s.id, e.target.value)}
                          className="px-2.5 py-1 rounded-lg border border-stone-300 text-xs bg-white"
                        >
                          <option value="new">New</option>
                          <option value="responded">Responded</option>
                          <option value="resolved">Resolved</option>
                          <option value="archived">Archived</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={saveContactInfo} className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Official Organization Email</label>
              <input
                type="email"
                value={info.contact_email}
                onChange={(e) => setInfo({ ...info, contact_email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={info.phone}
                onChange={(e) => setInfo({ ...info, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">WhatsApp Number (optional)</label>
              <input
                type="text"
                value={info.whatsapp_number}
                onChange={(e) => setInfo({ ...info, whatsapp_number: e.target.value })}
                placeholder="+1780..."
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Office Address</label>
              <input
                type="text"
                value={info.office_address}
                onChange={(e) => setInfo({ ...info, office_address: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Edmonton Contact Info</label>
              <input
                type="text"
                value={info.edmonton_contact}
                onChange={(e) => setInfo({ ...info, edmonton_contact: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Nigeria Contact Info</label>
              <input
                type="text"
                value={info.nigeria_contact}
                onChange={(e) => setInfo({ ...info, nigeria_contact: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Business Hours</label>
            <input
              type="text"
              value={info.business_hours}
              onChange={(e) => setInfo({ ...info, business_hours: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={info.contact_form_enabled}
              onChange={(e) => setInfo({ ...info, contact_form_enabled: e.target.checked })}
            />
            <span>Enable public contact form submissions</span>
          </label>
          <div className="pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold"
            >
              <Save className="w-4 h-4" />
              <span>Save Contact Settings</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
