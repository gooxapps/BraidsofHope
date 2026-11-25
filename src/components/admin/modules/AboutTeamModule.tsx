import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Plus, Save, Trash2 } from 'lucide-react';
import { apiFetch } from '../../../lib/api.ts';
import type { PageRecord, TeamMember } from '../../../types.ts';
import { SafeImage } from '../../BrandMark.tsx';
import { ConfirmModal } from '../AdminToast.tsx';
import { MediaPickerModal } from './MediaPickerModal.tsx';

export const AboutTeamModule: React.FC<{
  onToast: (type: 'success' | 'error', text: string) => void;
}> = ({ onToast }) => {
  const [aboutPage, setAboutPage] = useState<PageRecord | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({
    name: '',
    role_title: '',
    bio: '',
    photo_url: '',
    category: 'Team',
    is_published: true,
    sort_order: 1,
  });
  const [pickerTarget, setPickerTarget] = useState<'about_hero' | 'new_member' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [pagesRes, teamRes] = await Promise.all([
        apiFetch<{ pages: PageRecord[] }>('/api/admin/pages'),
        apiFetch<{ members: TeamMember[] }>('/api/admin/team'),
      ]);
      const about = pagesRes.pages.find((p) => p.slug === 'about-us') || null;
      setAboutPage(about);
      setMembers(teamRes.members);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to load About Us data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveAboutContent = async () => {
    if (!aboutPage) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/pages/${aboutPage.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          mode: 'publish',
          status: 'published',
          title: aboutPage.title,
          subtitle: aboutPage.subtitle,
          hero_image_url: aboutPage.hero_image_url,
          blocks: aboutPage.blocks,
          seo_title: aboutPage.seo_title,
          seo_description: aboutPage.seo_description,
          note: 'Updated via About Us manager',
        }),
      });
      onToast('success', 'About Us page published.');
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to save About Us.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/team', { method: 'POST', body: JSON.stringify(memberForm) });
      setShowAddMember(false);
      setMemberForm({ name: '', role_title: '', bio: '', photo_url: '', category: 'Team', is_published: true, sort_order: 1 });
      onToast('success', 'Team / Board member added.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to add member.');
    }
  };

  const toggleMemberPublish = async (m: TeamMember) => {
    try {
      await apiFetch(`/api/admin/team/${m.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_published: !m.is_published }),
      });
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to update member.');
    }
  };

  const handleDeleteMember = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/admin/team/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      onToast('success', 'Member removed.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to remove member.');
    }
  };

  if (loading) {
    return <div className="bg-white border border-stone-200 rounded-xl p-8 text-sm text-stone-500">Loading About Us...</div>;
  }

  return (
    <div className="space-y-8">
      {/* About Us Narrative Editor */}
      {aboutPage && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">About Us & Organization Story</h1>
              <p className="text-sm text-stone-600 mt-1">
                Manage the meaning of BraidsofHope, story, history, mission, vision, and core values.
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={saveAboutContent}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save & Publish About Us'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-4 space-y-2">
              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                <SafeImage src={aboutPage.hero_image_url} alt="About Us" className="w-full h-full object-cover" />
              </div>
              <button
                type="button"
                onClick={() => setPickerTarget('about_hero')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Replace About Photograph</span>
              </button>
            </div>
            <div className="md:col-span-8 space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">About Page Headline</label>
                <input
                  type="text"
                  value={aboutPage.title}
                  onChange={(e) => setAboutPage({ ...aboutPage, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={aboutPage.subtitle}
                  onChange={(e) => setAboutPage({ ...aboutPage, subtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {aboutPage.blocks.map((b, idx) => (
              <div key={b.id} className="border border-stone-200 rounded-xl p-4 space-y-2.5">
                <input
                  type="text"
                  value={b.heading}
                  onChange={(e) => {
                    const next = [...aboutPage.blocks];
                    next[idx] = { ...b, heading: e.target.value };
                    setAboutPage({ ...aboutPage, blocks: next });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-sm font-semibold text-[#4A0E36]"
                />
                <textarea
                  rows={4}
                  value={b.body}
                  onChange={(e) => {
                    const next = [...aboutPage.blocks];
                    next[idx] = { ...b, body: e.target.value };
                    setAboutPage({ ...aboutPage, blocks: next });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team & Board Members (Only genuine supplied members) */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-[#4A0E36]">Team & Board Members</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Add verified staff, leadership, or board member profiles when ready to display publicly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddMember(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team / Board Member</span>
          </button>
        </div>

        {members.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-stone-300 rounded-xl text-sm text-stone-500">
            No team or board members have been added yet. Profiles will only appear on the public About Us page after you add and publish them.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m) => (
              <div key={m.id} className="border border-stone-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {m.photo_url && (
                      <SafeImage src={m.photo_url} alt={m.name} className="w-12 h-12 rounded-full object-cover" />
                    )}
                    <div>
                      <div className="font-semibold text-sm text-[#4A0E36]">{m.name}</div>
                      <div className="text-xs text-[#0E7C7B]">
                        {m.role_title} · {m.category}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(m)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {m.bio && <p className="text-xs text-stone-600">{m.bio}</p>}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className={m.is_published ? 'text-emerald-700 font-medium' : 'text-stone-500'}>
                    {m.is_published ? 'Published' : 'Hidden'}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleMemberPublish(m)}
                    className="text-[#4A0E36] font-semibold hover:underline"
                  >
                    {m.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddMember && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleAddMember} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-display text-xl font-bold text-[#4A0E36]">Add Team or Board Member</h3>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={memberForm.name}
                onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Role / Title *</label>
                <input
                  type="text"
                  required
                  value={memberForm.role_title}
                  onChange={(e) => setMemberForm({ ...memberForm, role_title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Group</label>
                <select
                  value={memberForm.category}
                  onChange={(e) => setMemberForm({ ...memberForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
                >
                  <option value="Team">Team</option>
                  <option value="Board">Board of Directors</option>
                  <option value="Volunteer Lead">Volunteer Lead</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Biography</label>
              <textarea
                rows={3}
                value={memberForm.bio}
                onChange={(e) => setMemberForm({ ...memberForm, bio: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPickerTarget('new_member')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{memberForm.photo_url ? 'Photo Selected' : 'Select Profile Photo'}</span>
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-sm"
              >
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold">
                Save Member
              </button>
            </div>
          </form>
        </div>
      )}

      <MediaPickerModal
        open={pickerTarget !== null}
        defaultFolder={pickerTarget === 'about_hero' ? 'About Us' : 'Team'}
        onSelect={(url) => {
          if (pickerTarget === 'about_hero' && aboutPage) setAboutPage({ ...aboutPage, hero_image_url: url });
          if (pickerTarget === 'new_member') setMemberForm((prev) => ({ ...prev, photo_url: url }));
        }}
        onClose={() => setPickerTarget(null)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="Remove Member"
        message={`Remove ${deleteTarget?.name} from the team & board directory?`}
        confirmLabel="Remove"
        destructive
        onConfirm={handleDeleteMember}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
