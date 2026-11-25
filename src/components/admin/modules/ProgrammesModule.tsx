import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Plus, Save, Trash2 } from 'lucide-react';
import { apiFetch } from '../../../lib/api.ts';
import type { Programme } from '../../../types.ts';
import { SafeImage } from '../../BrandMark.tsx';
import { ConfirmModal } from '../AdminToast.tsx';
import { MediaPickerModal } from './MediaPickerModal.tsx';

export const ProgrammesModule: React.FC<{
  onToast: (type: 'success' | 'error', text: string) => void;
}> = ({ onToast }) => {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({
    title: '',
    short_description: '',
    full_description: '',
    supporting_info: '',
    cta_label: 'Learn More',
    cta_link: '/get-involved',
  });
  const [deleteTarget, setDeleteTarget] = useState<Programme | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ programmes: Programme[] }>('/api/admin/programmes');
      setProgrammes(res.programmes);
      if (!selectedId && res.programmes.length > 0) setSelectedId(res.programmes[0].id);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to load programmes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const active = programmes.find((p) => p.id === selectedId) || null;
  const updateActive = (patch: Partial<Programme>) => {
    if (!active) return;
    setProgrammes((prev) => prev.map((p) => (p.id === active.id ? { ...p, ...patch } : p)));
  };

  const saveProgramme = async () => {
    if (!active) return;
    try {
      await apiFetch(`/api/admin/programmes/${active.id}`, {
        method: 'PUT',
        body: JSON.stringify(active),
      });
      onToast('success', `"${active.title}" programme updated.`);
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to save programme.');
    }
  };

  const createProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ programme: Programme }>('/api/admin/programmes', {
        method: 'POST',
        body: JSON.stringify(newForm),
      });
      setShowNew(false);
      setNewForm({
        title: '',
        short_description: '',
        full_description: '',
        supporting_info: '',
        cta_label: 'Learn More',
        cta_link: '/get-involved',
      });
      onToast('success', 'New charitable programme added.');
      await load();
      if (res.programme?.id) setSelectedId(res.programme.id);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to create programme.');
    }
  };

  const deleteProgramme = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/admin/programmes/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      setSelectedId(null);
      onToast('success', 'Programme deleted.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to delete programme.');
    }
  };

  if (loading) {
    return <div className="bg-white border border-stone-200 rounded-xl p-8 text-sm text-stone-500">Loading programmes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">Our Work Programmes</h1>
          <p className="text-sm text-stone-600 mt-1">
            Manage Food Support, Essential Items, Children & Families, Community Care, and future charitable initiatives.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0E7C7B] text-white text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Add Programme</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white border border-stone-200 rounded-xl overflow-hidden self-start divide-y divide-stone-100">
          {programmes.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`p-4 flex items-center justify-between gap-2 cursor-pointer ${
                selectedId === p.id ? 'bg-[#4A0E36]/5' : 'hover:bg-stone-50'
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-stone-900 truncate">{p.title}</div>
                <div className="text-xs text-stone-500">
                  Order #{p.sort_order} · {p.is_published ? 'Published' : 'Unpublished'}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(p);
                }}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="lg:col-span-8 bg-white border border-stone-200 rounded-xl p-6 space-y-4">
          {!active ? (
            <div className="text-sm text-stone-500 py-10 text-center">Select a programme to edit.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
                <h2 className="font-display text-xl font-bold text-[#4A0E36]">{active.title}</h2>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active.is_published}
                      onChange={(e) => updateActive({ is_published: e.target.checked })}
                    />
                    <span>Published</span>
                  </label>
                  <button
                    type="button"
                    onClick={saveProgramme}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4A0E36] text-white text-xs font-semibold"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Programme</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-700 mb-1">Programme Title</label>
                  <input
                    type="text"
                    value={active.title}
                    onChange={(e) => updateActive({ title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={active.sort_order}
                    onChange={(e) => updateActive({ sort_order: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Short Summary</label>
                <input
                  type="text"
                  value={active.short_description}
                  onChange={(e) => updateActive({ short_description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Full Programme Description</label>
                <textarea
                  rows={4}
                  value={active.full_description}
                  onChange={(e) => updateActive({ full_description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Supporting Information</label>
                <input
                  type="text"
                  value={active.supporting_info}
                  onChange={(e) => updateActive({ supporting_info: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-stone-700">Programme Image</label>
                  <div className="aspect-[16/9] rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                    <SafeImage src={active.image_url} alt={active.title} className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Select / Upload Image</span>
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">CTA Button Text</label>
                    <input
                      type="text"
                      value={active.cta_label}
                      onChange={(e) => updateActive({ cta_label: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">CTA Link</label>
                    <input
                      type="text"
                      value={active.cta_link}
                      onChange={(e) => updateActive({ cta_link: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={createProgramme} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-display text-xl font-bold text-[#4A0E36]">Add Support Programme</h3>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={newForm.title}
                onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Short Description</label>
              <input
                type="text"
                value={newForm.short_description}
                onChange={(e) => setNewForm({ ...newForm, short_description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Full Description</label>
              <textarea
                rows={3}
                value={newForm.full_description}
                onChange={(e) => setNewForm({ ...newForm, full_description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-sm"
              >
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold">
                Create Programme
              </button>
            </div>
          </form>
        </div>
      )}

      <MediaPickerModal
        open={pickerOpen}
        defaultFolder="Our Work"
        onSelect={(url) => updateActive({ image_url: url })}
        onClose={() => setPickerOpen(false)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Programme"
        message={`Delete programme "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        destructive
        onConfirm={deleteProgramme}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
