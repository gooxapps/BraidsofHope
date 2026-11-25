import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Plus,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api.ts';
import type { HomepageSection } from '../../../types.ts';
import { SafeImage } from '../../BrandMark.tsx';
import { ConfirmModal } from '../AdminToast.tsx';
import { MediaPickerModal } from './MediaPickerModal.tsx';

export const HomepageModule: React.FC<{
  onToast: (type: 'success' | 'error', text: string) => void;
  onPreviewSite: () => void;
}> = ({ onToast, onPreviewSite }) => {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSection, setNewSection] = useState({
    title: '',
    subtitle: '',
    body_text: '',
    image_url: '',
    bg_color: '#FAF5EE',
    cta_label: '',
    cta_link: '',
  });
  const [deleteTarget, setDeleteTarget] = useState<HomepageSection | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ sections: HomepageSection[] }>('/api/admin/homepage');
      const normalized = res.sections.map((s) => (s.draft ? { ...s, ...s.draft } : s));
      setSections(normalized);
      if (!selectedId && normalized.length > 0) setSelectedId(normalized[0].id);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to load homepage sections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const active = sections.find((s) => s.id === selectedId) || null;

  const updateActive = (patch: Partial<HomepageSection>) => {
    if (!active) return;
    setSections((prev) => prev.map((s) => (s.id === active.id ? { ...s, ...patch } : s)));
  };

  const saveSection = async (mode: 'draft' | 'publish', target?: HomepageSection) => {
    const sec = target || active;
    if (!sec) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/homepage/${sec.id}`, {
        method: 'PUT',
        body: JSON.stringify({ mode, data: sec }),
      });
      onToast('success', mode === 'draft' ? 'Homepage draft saved.' : `"${sec.title}" published to homepage.`);
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to save homepage section.');
    } finally {
      setSaving(false);
    }
  };

  const moveSection = async (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const copy = [...sections];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    setSections(copy);
    try {
      await apiFetch('/api/admin/homepage/reorder', {
        method: 'PUT',
        body: JSON.stringify({ orderedIds: copy.map((s) => s.id) }),
      });
      onToast('success', 'Homepage section order updated.');
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to reorder sections.');
    }
  };

  const toggleVisibility = async (sec: HomepageSection) => {
    const updated = { ...sec, is_visible: !sec.is_visible };
    setSections((prev) => prev.map((s) => (s.id === sec.id ? updated : s)));
    await saveSection('publish', updated);
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ section: HomepageSection }>('/api/admin/homepage', {
        method: 'POST',
        body: JSON.stringify(newSection),
      });
      setShowAddModal(false);
      setNewSection({
        title: '',
        subtitle: '',
        body_text: '',
        image_url: '',
        bg_color: '#FAF5EE',
        cta_label: '',
        cta_link: '',
      });
      onToast('success', 'Custom homepage section added.');
      await load();
      if (res.section?.id) setSelectedId(res.section.id);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to add section.');
    }
  };

  const handleDeleteSection = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/admin/homepage/${deleteTarget.id}`, { method: 'DELETE' });
      onToast('success', 'Optional section removed.');
      setDeleteTarget(null);
      setSelectedId(null);
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to remove section.');
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return <div className="bg-white border border-stone-200 rounded-xl p-8 text-sm text-stone-500">Loading homepage editor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">Homepage Visual Editor</h1>
          <p className="text-sm text-stone-600 mt-1">
            Edit hero headlines, mission & vision, images, section order, visibility, and calls to action.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0E7C7B] text-white text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Add Section</span>
          </button>
          <button
            type="button"
            onClick={onPreviewSite}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#0E7C7B] text-sm font-medium text-[#0E7C7B] bg-white"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Homepage</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Reorderable Sections List */}
        <div className="lg:col-span-4 bg-white border border-stone-200 rounded-xl overflow-hidden self-start">
          <div className="px-4 py-3 border-b border-stone-200 text-xs font-semibold text-stone-600">
            Homepage Sections Order
          </div>
          <div className="divide-y divide-stone-100">
            {sections.map((sec, idx) => (
              <div
                key={sec.id}
                className={`p-3.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  selectedId === sec.id ? 'bg-[#4A0E36]/5' : 'hover:bg-stone-50'
                }`}
                onClick={() => setSelectedId(sec.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-stone-900 truncate">{sec.title}</div>
                  <div className="text-[11px] text-stone-500">
                    {sec.section_type} · {sec.is_visible ? 'Visible' : 'Hidden'}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveSection(idx, -1)}
                    className="p-1 rounded hover:bg-stone-200 disabled:opacity-30"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === sections.length - 1}
                    onClick={() => moveSection(idx, 1)}
                    className="p-1 rounded hover:bg-stone-200 disabled:opacity-30"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleVisibility(sec)}
                    className="p-1 rounded hover:bg-stone-200"
                    title={sec.is_visible ? 'Hide Section' : 'Show Section'}
                  >
                    {sec.is_visible ? (
                      <Eye className="w-3.5 h-3.5 text-[#0E7C7B]" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-stone-400" />
                    )}
                  </button>
                  {!sec.is_system && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(sec)}
                      className="p-1 rounded hover:bg-red-50 text-red-600"
                      title="Delete Section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active Section Editor */}
        <div className="lg:col-span-8 bg-white border border-stone-200 rounded-xl p-6 space-y-5">
          {!active ? (
            <div className="text-sm text-stone-500 py-10 text-center">Select a section to edit.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#4A0E36]">{active.title}</h2>
                  <div className="text-xs text-stone-500">Section Key: {active.section_key}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveSection('draft')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Draft</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveSection('publish')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4A0E36] text-white text-xs font-semibold hover:opacity-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish Section</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Section Headline / Title</label>
                  <input
                    type="text"
                    value={active.title}
                    onChange={(e) => updateActive({ title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Subtitle / Tagline</label>
                  <input
                    type="text"
                    value={active.subtitle || ''}
                    onChange={(e) => updateActive({ subtitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Body Content</label>
                <textarea
                  rows={4}
                  value={active.body_text || ''}
                  onChange={(e) => updateActive({ body_text: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>

              {/* Section Image + Background Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-stone-700">Section Image</label>
                  <div className="aspect-[16/9] rounded-xl border border-stone-200 overflow-hidden bg-stone-100">
                    <SafeImage src={active.image_url} alt={active.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Choose / Upload Image</span>
                    </button>
                    {active.image_url && (
                      <button
                        type="button"
                        onClick={() => updateActive({ image_url: '' })}
                        className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs text-stone-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Background Colour</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={active.bg_color || '#FAF5EE'}
                        onChange={(e) => updateActive({ bg_color: e.target.value })}
                        className="w-10 h-9 rounded border border-stone-300 p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        value={active.bg_color || ''}
                        onChange={(e) => updateActive({ bg_color: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Primary Button Text</label>
                      <input
                        type="text"
                        value={active.cta_label || ''}
                        onChange={(e) => updateActive({ cta_label: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Primary Button Link</label>
                      <input
                        type="text"
                        value={active.cta_link || ''}
                        onChange={(e) => updateActive({ cta_link: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Secondary Button</label>
                      <input
                        type="text"
                        value={active.secondary_cta_label || ''}
                        onChange={(e) => updateActive({ secondary_cta_label: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Secondary Link</label>
                      <input
                        type="text"
                        value={active.secondary_cta_link || ''}
                        onChange={(e) => updateActive({ secondary_cta_link: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Specialized Config Editors for Hero / Values / Mission & Vision */}
              {active.section_type === 'hero' && (
                <div className="pt-3 border-t border-stone-200">
                  <label className="block text-xs font-medium text-stone-700 mb-1">Hero Overlay Quote</label>
                  <input
                    type="text"
                    value={String(active.config?.quoteText || '')}
                    onChange={(e) =>
                      updateActive({ config: { ...active.config, quoteText: e.target.value } })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
              )}

              {active.section_type === 'mission_vision' && (
                <div className="pt-3 border-t border-stone-200 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Welcome Message</label>
                    <textarea
                      rows={2}
                      value={String(active.config?.welcomeMessage || '')}
                      onChange={(e) =>
                        updateActive({ config: { ...active.config, welcomeMessage: e.target.value } })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Mission Statement</label>
                      <textarea
                        rows={3}
                        value={String(active.config?.missionStatement || '')}
                        onChange={(e) =>
                          updateActive({ config: { ...active.config, missionStatement: e.target.value } })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Vision Statement</label>
                      <textarea
                        rows={3}
                        value={String(active.config?.visionStatement || '')}
                        onChange={(e) =>
                          updateActive({ config: { ...active.config, visionStatement: e.target.value } })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {active.section_type === 'values' && (
                <div className="pt-3 border-t border-stone-200 space-y-3">
                  <div className="text-xs font-semibold text-stone-700">Organization Values Strip</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {((active.config?.items as Array<{ title: string; subtitle: string; icon?: string }>) || []).map(
                      (item, i, arr) => (
                        <div key={i} className="p-3 rounded-lg border border-stone-200 space-y-2 bg-[#FAF5EE]/50">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const next = [...arr];
                              next[i] = { ...item, title: e.target.value };
                              updateActive({ config: { ...active.config, items: next } });
                            }}
                            placeholder="Value title"
                            className="w-full px-2.5 py-1.5 rounded border border-stone-300 text-xs font-semibold bg-white"
                          />
                          <input
                            type="text"
                            value={item.subtitle}
                            onChange={(e) => {
                              const next = [...arr];
                              next[i] = { ...item, subtitle: e.target.value };
                              updateActive({ config: { ...active.config, items: next } });
                            }}
                            placeholder="Short subtitle"
                            className="w-full px-2.5 py-1.5 rounded border border-stone-300 text-xs bg-white"
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Optional Section Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddSection}
            className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-display text-xl font-bold text-[#4A0E36]">Add Homepage Section</h3>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Section Title *</label>
              <input
                type="text"
                required
                value={newSection.title}
                onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={newSection.subtitle}
                onChange={(e) => setNewSection({ ...newSection, subtitle: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Body Text</label>
              <textarea
                rows={3}
                value={newSection.body_text}
                onChange={(e) => setNewSection({ ...newSection, body_text: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">CTA Button Label</label>
                <input
                  type="text"
                  value={newSection.cta_label}
                  onChange={(e) => setNewSection({ ...newSection, cta_label: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">CTA Link</label>
                <input
                  type="text"
                  value={newSection.cta_link}
                  onChange={(e) => setNewSection({ ...newSection, cta_link: e.target.value })}
                  placeholder="/get-involved"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-sm"
              >
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold">
                Add Section
              </button>
            </div>
          </form>
        </div>
      )}

      <MediaPickerModal
        open={pickerOpen}
        defaultFolder="Homepage Hero"
        onSelect={(url) => updateActive({ image_url: url })}
        onClose={() => setPickerOpen(false)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="Remove Optional Section"
        message={`Remove "${deleteTarget?.title}" from the homepage?`}
        confirmLabel="Remove Section"
        destructive
        onConfirm={handleDeleteSection}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
