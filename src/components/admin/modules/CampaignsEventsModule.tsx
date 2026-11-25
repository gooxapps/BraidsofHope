import React, { useEffect, useState } from 'react';
import { Calendar, Flag, Image as ImageIcon, Plus, Save, Trash2 } from 'lucide-react';
import { apiFetch, formatCurrency, formatDateShort } from '../../../lib/api.ts';
import type { Campaign, EventItem } from '../../../types.ts';
import { SafeImage } from '../../BrandMark.tsx';
import { ConfirmModal } from '../AdminToast.tsx';
import { MediaPickerModal } from './MediaPickerModal.tsx';

export const CampaignsEventsModule: React.FC<{
  onToast: (type: 'success' | 'error', text: string) => void;
}> = ({ onToast }) => {
  const [tab, setTab] = useState<'campaigns' | 'events'>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [donationsUnlocked, setDonationsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editingCamp, setEditingCamp] = useState<(Campaign & { targetDollars: string }) | null>(null);
  const [showNewCamp, setShowNewCamp] = useState(false);
  const [newCamp, setNewCamp] = useState({
    title: '',
    summary: '',
    description: '',
    poster_url: '',
    start_date: '',
    end_date: '',
    fundraising_target_dollars: '',
    currency: 'CAD',
    status: 'draft',
    is_featured: false,
    is_published: false,
  });

  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    image_url: '',
    registration_link: '',
    status: 'upcoming',
    is_published: true,
  });

  const [pickerTarget, setPickerTarget] = useState<'edit_camp' | 'new_camp' | 'new_event' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'campaign' | 'event'; id: number; title: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{
        donationsUnlocked: boolean;
        campaigns: Campaign[];
        events: EventItem[];
      }>('/api/admin/campaigns');
      setDonationsUnlocked(res.donationsUnlocked);
      setCampaigns(res.campaigns);
      setEvents(res.events);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to load campaigns & events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateCamp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/campaigns', { method: 'POST', body: JSON.stringify(newCamp) });
      setShowNewCamp(false);
      setNewCamp({
        title: '',
        summary: '',
        description: '',
        poster_url: '',
        start_date: '',
        end_date: '',
        fundraising_target_dollars: '',
        currency: 'CAD',
        status: 'draft',
        is_featured: false,
        is_published: false,
      });
      onToast('success', 'Campaign created.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to create campaign.');
    }
  };

  const handleSaveCamp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCamp) return;
    try {
      await apiFetch(`/api/admin/campaigns/${editingCamp.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...editingCamp,
          fundraising_target_dollars: Number(editingCamp.targetDollars) || 0,
        }),
      });
      setEditingCamp(null);
      onToast('success', 'Campaign updated.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to update campaign.');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/events', { method: 'POST', body: JSON.stringify(newEvent) });
      setShowNewEvent(false);
      setNewEvent({
        title: '',
        description: '',
        event_date: '',
        location: '',
        image_url: '',
        registration_link: '',
        status: 'upcoming',
        is_published: true,
      });
      onToast('success', 'Event created.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to create event.');
    }
  };

  const toggleEventPublish = async (ev: EventItem) => {
    try {
      await apiFetch(`/api/admin/events/${ev.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_published: !ev.is_published }),
      });
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to update event.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const endpoint =
        deleteTarget.kind === 'campaign'
          ? `/api/admin/campaigns/${deleteTarget.id}`
          : `/api/admin/events/${deleteTarget.id}`;
      await apiFetch(endpoint, { method: 'DELETE' });
      setDeleteTarget(null);
      onToast('success', `${deleteTarget.kind === 'campaign' ? 'Campaign' : 'Event'} deleted.`);
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to delete item.');
    }
  };

  if (loading) {
    return <div className="bg-white border border-stone-200 rounded-xl p-8 text-sm text-stone-500">Loading campaigns & events...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">Events & Fundraising Campaigns</h1>
          <p className="text-sm text-stone-600 mt-1">
            Manage outreach campaigns, the upcoming Christmas fundraising programme, and community events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-stone-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setTab('campaigns')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                tab === 'campaigns' ? 'bg-white text-[#4A0E36] shadow-sm' : 'text-stone-600'
              }`}
            >
              Campaigns ({campaigns.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('events')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                tab === 'events' ? 'bg-white text-[#4A0E36] shadow-sm' : 'text-stone-600'
              }`}
            >
              Events ({events.length})
            </button>
          </div>
          <button
            type="button"
            onClick={() => (tab === 'campaigns' ? setShowNewCamp(true) : setShowNewEvent(true))}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>{tab === 'campaigns' ? 'New Campaign' : 'New Event'}</span>
          </button>
        </div>
      </div>

      {tab === 'campaigns' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden flex flex-col">
              {c.poster_url && (
                <div className="aspect-[16/9] bg-stone-100 overflow-hidden">
                  <SafeImage src={c.poster_url} alt={c.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                    <span className="capitalize font-semibold text-[#0E7C7B]">
                      {c.status} · {c.is_published ? 'Published' : 'Unpublished'}
                      {c.is_featured ? ' · Featured' : ''}
                    </span>
                    {c.is_christmas_programme && (
                      <span className="font-semibold text-[#4A0E36]">Christmas Programme</span>
                    )}
                  </div>
                  <h2 className="font-display text-xl font-bold text-[#4A0E36]">{c.title}</h2>
                  <p className="text-sm text-stone-600">{c.summary}</p>
                  <div className="text-xs text-stone-500 tabular-nums pt-1">
                    {c.start_date ? `Starts ${formatDateShort(c.start_date)}` : 'Start date to be supplied'}
                    {c.end_date ? ` · Ends ${formatDateShort(c.end_date)}` : ''}
                  </div>
                  <div className="text-xs text-stone-700 font-medium tabular-nums">
                    Target:{' '}
                    {c.fundraising_target_cents > 0
                      ? formatCurrency(c.fundraising_target_cents, c.currency)
                      : 'To be supplied'}
                    {donationsUnlocked && (
                      <span className="text-[#0E7C7B] ml-2">
                        · Verified Raised: {formatCurrency(c.verified_raised_cents || 0, c.currency)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingCamp({
                        ...c,
                        targetDollars: c.fundraising_target_cents ? String(c.fundraising_target_cents / 100) : '',
                      })
                    }
                    className="px-4 py-1.5 rounded-lg bg-[#4A0E36] text-white text-xs font-semibold"
                  >
                    Edit Campaign
                  </button>
                  {!c.is_christmas_programme && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ kind: 'campaign', id: c.id, title: c.title })}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center space-y-3">
          <Calendar className="w-8 h-8 text-stone-400 mx-auto" />
          <div className="text-sm text-stone-600">No events have been created yet.</div>
          <button
            type="button"
            onClick={() => setShowNewEvent(true)}
            className="px-4 py-2 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold"
          >
            Create First Event
          </button>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
          {events.map((ev) => (
            <div key={ev.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-semibold text-[#4A0E36]">{ev.title}</div>
                <div className="text-xs text-stone-500">
                  {ev.event_date ? formatDateShort(ev.event_date) : 'Date TBA'} · {ev.location || 'Location TBA'} ·{' '}
                  {ev.is_published ? 'Published' : 'Draft'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleEventPublish(ev)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium"
                >
                  {ev.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ kind: 'event', id: ev.id, title: ev.title })}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Campaign Modal */}
      {editingCamp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCamp}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-display text-xl font-bold text-[#4A0E36]">Edit Campaign</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  value={editingCamp.title}
                  onChange={(e) => setEditingCamp({ ...editingCamp, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Status</label>
                <select
                  value={editingCamp.status}
                  onChange={(e) => setEditingCamp({ ...editingCamp, status: e.target.value as Campaign['status'] })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
                >
                  <option value="draft">Draft</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={editingCamp.start_date}
                  onChange={(e) => setEditingCamp({ ...editingCamp, start_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={editingCamp.end_date}
                  onChange={(e) => setEditingCamp({ ...editingCamp, end_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Fundraising Target ({editingCamp.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editingCamp.targetDollars}
                  onChange={(e) => setEditingCamp({ ...editingCamp, targetDollars: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm tabular-nums"
                />
              </div>
              <div className="flex items-end gap-4 pb-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={editingCamp.is_published}
                    onChange={(e) => setEditingCamp({ ...editingCamp, is_published: e.target.checked })}
                  />
                  <span>Published</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={editingCamp.is_featured}
                    onChange={(e) => setEditingCamp({ ...editingCamp, is_featured: e.target.checked })}
                  />
                  <span>Feature on Homepage</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Short Summary</label>
              <input
                type="text"
                value={editingCamp.summary}
                onChange={(e) => setEditingCamp({ ...editingCamp, summary: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Full Description & Activities</label>
              <textarea
                rows={4}
                value={editingCamp.description}
                onChange={(e) => setEditingCamp({ ...editingCamp, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPickerTarget('edit_camp')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Select Poster Image</span>
              </button>
              {editingCamp.poster_url && <span className="text-xs text-stone-500 truncate">{editingCamp.poster_url}</span>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCamp(null)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-sm"
              >
                Cancel
              </button>
              <button type="submit" className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold">
                <Save className="w-4 h-4" />
                <span>Save Campaign</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Campaign Modal */}
      {showNewCamp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateCamp} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-display text-xl font-bold text-[#4A0E36]">Create Fundraising Campaign</h3>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={newCamp.title}
                onChange={(e) => setNewCamp({ ...newCamp, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Summary</label>
              <input
                type="text"
                value={newCamp.summary}
                onChange={(e) => setNewCamp({ ...newCamp, summary: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Status</label>
                <select
                  value={newCamp.status}
                  onChange={(e) => setNewCamp({ ...newCamp, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
                >
                  <option value="draft">Draft</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Target (CAD)</label>
                <input
                  type="number"
                  min="0"
                  value={newCamp.fundraising_target_dollars}
                  onChange={(e) => setNewCamp({ ...newCamp, fundraising_target_dollars: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPickerTarget('new_camp')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{newCamp.poster_url ? 'Poster Selected' : 'Select Poster'}</span>
              </button>
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={newCamp.is_published}
                  onChange={(e) => setNewCamp({ ...newCamp, is_published: e.target.checked })}
                />
                <span>Publish immediately</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowNewCamp(false)} className="px-4 py-2 rounded-lg border border-stone-300 text-sm">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold">
                Create Campaign
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Event Modal */}
      {showNewEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateEvent} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-display text-xl font-bold text-[#4A0E36]">Create Community Event</h3>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Event Title *</label>
              <input
                type="text"
                required
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Event Date</label>
                <input
                  type="date"
                  value={newEvent.event_date}
                  onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Location</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowNewEvent(false)} className="px-4 py-2 rounded-lg border border-stone-300 text-sm">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold">
                Create Event
              </button>
            </div>
          </form>
        </div>
      )}

      <MediaPickerModal
        open={pickerTarget !== null}
        defaultFolder="Campaigns"
        onSelect={(url) => {
          if (pickerTarget === 'edit_camp' && editingCamp) setEditingCamp({ ...editingCamp, poster_url: url });
          if (pickerTarget === 'new_camp') setNewCamp((prev) => ({ ...prev, poster_url: url }));
          if (pickerTarget === 'new_event') setNewEvent((prev) => ({ ...prev, image_url: url }));
        }}
        onClose={() => setPickerTarget(null)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Item"
        message={`Delete "${deleteTarget?.title}" permanently?`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
