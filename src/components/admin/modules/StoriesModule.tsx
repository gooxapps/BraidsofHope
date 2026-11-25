import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../../../lib/api.ts';
import type { ImpactStory, Testimonial } from '../../../types.ts';
import { SafeImage } from '../../BrandMark.tsx';
import { MediaPickerModal } from './MediaPickerModal.tsx';

export const StoriesModule: React.FC<{
  onToast: (type: 'success' | 'error', text: string) => void;
}> = ({ onToast }) => {
  const [tab, setTab] = useState<'testimonials' | 'stories'>('testimonials');
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [stories, setStories] = useState<ImpactStory[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [tForm, setTForm] = useState({
    author_name: '',
    role_or_context: '',
    quote: '',
    photo_url: '',
    permission_confirmed: true,
    is_published: false,
    is_featured: false,
  });
  const [sForm, setSForm] = useState({
    title: '',
    summary: '',
    body: '',
    location: '',
    photo_url: '',
    permission_confirmed: true,
    is_published: false,
    is_featured: false,
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ testimonials: Testimonial[]; impactStories: ImpactStory[] }>('/api/admin/stories');
      setTestimonials(res.testimonials);
      setStories(res.impactStories);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to load stories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/testimonials', { method: 'POST', body: JSON.stringify(tForm) });
      setShowAdd(false);
      setTForm({
        author_name: '',
        role_or_context: '',
        quote: '',
        photo_url: '',
        permission_confirmed: true,
        is_published: false,
        is_featured: false,
      });
      onToast('success', 'Testimonial added.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to save testimonial.');
    }
  };

  const addStory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/impact-stories', { method: 'POST', body: JSON.stringify(sForm) });
      setShowAdd(false);
      setSForm({
        title: '',
        summary: '',
        body: '',
        location: '',
        photo_url: '',
        permission_confirmed: true,
        is_published: false,
        is_featured: false,
      });
      onToast('success', 'Impact story added.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to save impact story.');
    }
  };

  const updateTestimonial = async (t: Testimonial, patch: Partial<Testimonial>) => {
    try {
      await apiFetch(`/api/admin/testimonials/${t.id}`, { method: 'PUT', body: JSON.stringify(patch) });
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to update.');
    }
  };

  const updateStory = async (s: ImpactStory, patch: Partial<ImpactStory>) => {
    try {
      await apiFetch(`/api/admin/impact-stories/${s.id}`, { method: 'PUT', body: JSON.stringify(patch) });
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to update.');
    }
  };

  const deleteTestimonial = async (id: number) => {
    await apiFetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
    onToast('success', 'Testimonial deleted.');
    await load();
  };

  const deleteStory = async (id: number) => {
    await apiFetch(`/api/admin/impact-stories/${id}`, { method: 'DELETE' });
    onToast('success', 'Impact story deleted.');
    await load();
  };

  if (loading) {
    return <div className="bg-white border border-stone-200 rounded-xl p-8 text-sm text-stone-500">Loading stories...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">Testimonials & Impact Stories</h1>
          <p className="text-sm text-stone-600 mt-1">
            Publish genuine, permission-confirmed community stories and testimonials. Feature selected entries on the homepage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-stone-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setTab('testimonials')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                tab === 'testimonials' ? 'bg-white text-[#4A0E36] shadow-sm' : 'text-stone-600'
              }`}
            >
              Testimonials ({testimonials.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('stories')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                tab === 'stories' ? 'bg-white text-[#4A0E36] shadow-sm' : 'text-stone-600'
              }`}
            >
              Impact Stories ({stories.length})
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>{tab === 'testimonials' ? 'Add Testimonial' : 'Add Impact Story'}</span>
          </button>
        </div>
      </div>

      {tab === 'testimonials' ? (
        testimonials.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl p-10 text-center text-sm text-stone-500">
            No testimonials have been added yet. Add only genuine, permission-confirmed testimonials.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {testimonials.map((t) => (
              <div key={t.id} className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {t.photo_url && (
                      <SafeImage src={t.photo_url} alt={t.author_name} className="w-11 h-11 rounded-full object-cover" />
                    )}
                    <div>
                      <div className="font-semibold text-[#4A0E36]">{t.author_name}</div>
                      <div className="text-xs text-stone-500">{t.role_or_context}</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => deleteTestimonial(t.id)} className="p-1 text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-stone-700 italic">"{t.quote}"</p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.is_published}
                        onChange={(e) => updateTestimonial(t, { is_published: e.target.checked, status: e.target.checked ? 'approved' : 'pending' })}
                      />
                      <span>Published</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.is_featured}
                        onChange={(e) => updateTestimonial(t, { is_featured: e.target.checked })}
                      />
                      <span>Feature on Home</span>
                    </label>
                  </div>
                  <span className="text-stone-500">
                    {t.permission_confirmed ? 'Permission Confirmed' : 'Permission Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : stories.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center text-sm text-stone-500">
          No impact stories have been added yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {stories.map((s) => (
            <div key={s.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              {s.photo_url && (
                <div className="aspect-[16/9] overflow-hidden">
                  <SafeImage src={s.photo_url} alt={s.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-[#4A0E36]">{s.title}</div>
                    {s.location && <div className="text-xs text-stone-500">{s.location}</div>}
                  </div>
                  <button type="button" onClick={() => deleteStory(s.id)} className="p-1 text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-stone-700">{s.summary}</p>
                <div className="flex items-center gap-4 pt-2 border-t border-stone-100 text-xs">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.is_published}
                      onChange={(e) => updateStory(s, { is_published: e.target.checked })}
                    />
                    <span>Published</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.is_featured}
                      onChange={(e) => updateStory(s, { is_featured: e.target.checked })}
                    />
                    <span>Feature on Home</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          {tab === 'testimonials' ? (
            <form onSubmit={addTestimonial} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <h3 className="font-display text-xl font-bold text-[#4A0E36]">Add Genuine Testimonial</h3>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Author Name *</label>
                <input
                  type="text"
                  required
                  value={tForm.author_name}
                  onChange={(e) => setTForm({ ...tForm, author_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Role / Context</label>
                <input
                  type="text"
                  value={tForm.role_or_context}
                  onChange={(e) => setTForm({ ...tForm, role_or_context: e.target.value })}
                  placeholder="Community Volunteer, Edmonton"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Quote *</label>
                <textarea
                  rows={3}
                  required
                  value={tForm.quote}
                  onChange={(e) => setTForm({ ...tForm, quote: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{tForm.photo_url ? 'Photo Selected' : 'Attach Photo'}</span>
                </button>
                <label className="inline-flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={tForm.permission_confirmed}
                    onChange={(e) => setTForm({ ...tForm, permission_confirmed: e.target.checked })}
                  />
                  <span>Consent confirmed</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-stone-300 text-sm">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold">
                  Save Testimonial
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={addStory} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <h3 className="font-display text-xl font-bold text-[#4A0E36]">Add Impact Story</h3>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={sForm.title}
                  onChange={(e) => setSForm({ ...sForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Location</label>
                <input
                  type="text"
                  value={sForm.location}
                  onChange={(e) => setSForm({ ...sForm, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Summary *</label>
                <textarea
                  rows={3}
                  required
                  value={sForm.summary}
                  onChange={(e) => setSForm({ ...sForm, summary: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{sForm.photo_url ? 'Photo Selected' : 'Attach Photo'}</span>
                </button>
                <label className="inline-flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={sForm.permission_confirmed}
                    onChange={(e) => setSForm({ ...sForm, permission_confirmed: e.target.checked })}
                  />
                  <span>Consent confirmed</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-stone-300 text-sm">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold">
                  Save Story
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <MediaPickerModal
        open={pickerOpen}
        defaultFolder="Stories"
        onSelect={(url) => {
          if (tab === 'testimonials') setTForm((prev) => ({ ...prev, photo_url: url }));
          else setSForm((prev) => ({ ...prev, photo_url: url }));
        }}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
};
