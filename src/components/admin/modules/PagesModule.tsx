import React, { useEffect, useState } from 'react';
import {
  Eye,
  History,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import { apiFetch, formatDateShort } from '../../../lib/api.ts';
import type { PageBlock, PageRecord } from '../../../types.ts';
import { SafeImage } from '../../BrandMark.tsx';
import { ConfirmModal } from '../AdminToast.tsx';
import { MediaPickerModal } from './MediaPickerModal.tsx';

export const PagesModule: React.FC<{
  onToast: (type: 'success' | 'error', text: string) => void;
  onPreviewSite: (path?: string) => void;
}> = ({ onToast, onPreviewSite }) => {
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [revisions, setRevisions] = useState<Array<{ id: number; title: string; note: string; created_at: string }>>([]);
  const [showRevisions, setShowRevisions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'hero' | { blockIdx: number } | null>(null);
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageForm, setNewPageForm] = useState({ title: '', slug: '', subtitle: '' });
  const [deleteTarget, setDeleteTarget] = useState<PageRecord | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ pages: PageRecord[] }>('/api/admin/pages');
      const normalized = res.pages.map((p) => ({
        ...p,
        blocks: p.draft_blocks || p.blocks || [],
      }));
      setPages(normalized);
      if (!selectedId && normalized.length > 0) setSelectedId(normalized[0].id);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to load pages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const active = pages.find((p) => p.id === selectedId) || null;

  const updateActive = (patch: Partial<PageRecord>) => {
    if (!active) return;
    setPages((prev) => prev.map((p) => (p.id === active.id ? { ...p, ...patch } : p)));
  };

  const loadRevisions = async (pageId: number) => {
    try {
      const res = await apiFetch<{ revisions: Array<{ id: number; title: string; note: string; created_at: string }> }>(
        `/api/admin/pages/${pageId}/revisions`
      );
      setRevisions(res.revisions);
      setShowRevisions(true);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to load revisions.');
    }
  };

  const savePage = async (mode: 'draft' | 'publish' | 'unpublish') => {
    if (!active) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/pages/${active.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          mode: mode === 'draft' ? 'draft' : 'publish',
          status: mode === 'unpublish' ? 'draft' : 'published',
          title: active.title,
          subtitle: active.subtitle,
          hero_image_url: active.hero_image_url,
          blocks: active.blocks,
          seo_title: active.seo_title,
          seo_description: active.seo_description,
        }),
      });
      onToast(
        'success',
        mode === 'draft'
          ? 'Page draft saved.'
          : mode === 'unpublish'
          ? 'Page unpublished.'
          : `"${active.title}" published.`
      );
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to save page.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ page: PageRecord }>('/api/admin/pages', {
        method: 'POST',
        body: JSON.stringify({
          ...newPageForm,
          blocks: [{ id: `b-${Date.now()}`, heading: newPageForm.title, body: 'Enter page content here.' }],
          status: 'draft',
        }),
      });
      setShowNewPage(false);
      setNewPageForm({ title: '', slug: '', subtitle: '' });
      onToast('success', 'New page created as draft.');
      await load();
      if (res.page?.id) setSelectedId(res.page.id);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Could not create page.');
    }
  };

  const handleRestoreRevision = async (revId: number) => {
    if (!active) return;
    try {
      await apiFetch(`/api/admin/pages/${active.id}/restore/${revId}`, { method: 'POST' });
      setShowRevisions(false);
      onToast('success', 'Page restored to selected revision.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to restore revision.');
    }
  };

  const handleDeletePage = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/admin/pages/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      setSelectedId(null);
      onToast('success', 'Custom page deleted.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to delete page.');
      setDeleteTarget(null);
    }
  };

  const addBlock = () => {
    if (!active) return;
    const next: PageBlock = { id: `b-${Date.now()}`, heading: 'New Content Section', body: '' };
    updateActive({ blocks: [...active.blocks, next] });
  };

  const updateBlock = (idx: number, patch: Partial<PageBlock>) => {
    if (!active) return;
    const next = [...active.blocks];
    next[idx] = { ...next[idx], ...patch };
    updateActive({ blocks: next });
  };

  const removeBlock = (idx: number) => {
    if (!active) return;
    const next = [...active.blocks];
    next.splice(idx, 1);
    updateActive({ blocks: next });
  };

  if (loading) {
    return <div className="bg-white border border-stone-200 rounded-xl p-8 text-sm text-stone-500">Loading pages...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">Website Pages Management</h1>
          <p className="text-sm text-stone-600 mt-1">
            Edit existing pages, manage SEO metadata, create new pages, and review version history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewPage(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0E7C7B] text-white text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Page</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Page List */}
        <div className="lg:col-span-4 bg-white border border-stone-200 rounded-xl overflow-hidden self-start">
          <div className="px-4 py-3 border-b border-stone-200 text-xs font-semibold text-stone-600">All Pages</div>
          <div className="divide-y divide-stone-100">
            {pages.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`p-3.5 flex items-center justify-between gap-2 cursor-pointer ${
                  selectedId === p.id ? 'bg-[#4A0E36]/5' : 'hover:bg-stone-50'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-stone-900 truncate">{p.title}</div>
                  <div className="text-[11px] text-stone-500 font-mono truncate">
                    /{p.slug === 'home' ? '' : p.slug} ·{' '}
                    <span className={p.status === 'published' ? 'text-[#0E7C7B]' : 'text-amber-700'}>
                      {p.status}
                    </span>
                  </div>
                </div>
                {!p.is_system_page && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(p);
                    }}
                    className="p-1.5 rounded text-red-600 hover:bg-red-50"
                    title="Delete Custom Page"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Active Page Editor */}
        <div className="lg:col-span-8 bg-white border border-stone-200 rounded-xl p-6 space-y-5">
          {!active ? (
            <div className="text-sm text-stone-500 py-10 text-center">Select a page to edit.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#4A0E36]">{active.title}</h2>
                  <div className="text-xs text-stone-500">
                    URL: /{active.slug === 'home' ? '' : active.slug} · Status: {active.status}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadRevisions(active.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium text-stone-700"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>History</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onPreviewSite(active.slug === 'home' ? '/' : `/${active.slug}`)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#0E7C7B] text-xs font-medium text-[#0E7C7B]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => savePage('draft')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Draft</span>
                  </button>
                  {active.status === 'published' && !active.is_system_page && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => savePage('unpublish')}
                      className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold text-amber-800"
                    >
                      Unpublish
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => savePage('publish')}
                    className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#4A0E36] text-white text-xs font-semibold"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Page Title</label>
                  <input
                    type="text"
                    value={active.title}
                    onChange={(e) => updateActive({ title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={active.subtitle || ''}
                    onChange={(e) => updateActive({ subtitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
              </div>

              {/* Hero Image */}
              <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-[#FAF5EE]/60 border border-stone-200">
                <div className="w-28 h-20 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                  <SafeImage src={active.hero_image_url} alt={active.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-[200px] space-y-2">
                  <div className="text-xs font-semibold text-stone-700">Page Header Image</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPickerTarget('hero')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Select / Upload Image</span>
                    </button>
                    {active.hero_image_url && (
                      <button
                        type="button"
                        onClick={() => updateActive({ hero_image_url: '' })}
                        className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs text-stone-600 bg-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Blocks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-stone-700">Page Content Sections</div>
                  <button
                    type="button"
                    onClick={addBlock}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0E7C7B] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Content Block</span>
                  </button>
                </div>

                {active.blocks.map((block, idx) => (
                  <div key={block.id} className="border border-stone-200 rounded-xl p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={block.heading}
                        onChange={(e) => updateBlock(idx, { heading: e.target.value })}
                        placeholder="Section heading"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-sm font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => removeBlock(idx)}
                        className="p-1.5 rounded text-red-600 hover:bg-red-50"
                        title="Remove Block"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={block.body}
                      onChange={(e) => updateBlock(idx, { body: e.target.value })}
                      placeholder="Paragraph text..."
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                      <input
                        type="text"
                        value={block.ctaLabel || ''}
                        onChange={(e) => updateBlock(idx, { ctaLabel: e.target.value })}
                        placeholder="Button label (optional)"
                        className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs"
                      />
                      <input
                        type="text"
                        value={block.ctaLink || ''}
                        onChange={(e) => updateBlock(idx, { ctaLink: e.target.value })}
                        placeholder="Button link (/donate)"
                        className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setPickerTarget({ blockIdx: idx })}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>{block.imageUrl ? 'Change Image' : 'Attach Image'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Page SEO */}
              <div className="pt-4 border-t border-stone-200 space-y-3">
                <div className="text-xs font-semibold text-stone-700">Page-Specific SEO Metadata</div>
                <div>
                  <label className="block text-xs text-stone-600 mb-1">SEO Meta Title</label>
                  <input
                    type="text"
                    value={active.seo_title || ''}
                    onChange={(e) => updateActive({ seo_title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-600 mb-1">SEO Meta Description</label>
                  <textarea
                    rows={2}
                    value={active.seo_description || ''}
                    onChange={(e) => updateActive({ seo_description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Page Modal */}
      {showNewPage && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleCreatePage} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-display text-xl font-bold text-[#4A0E36]">Create Custom Page</h3>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Page Title *</label>
              <input
                type="text"
                required
                value={newPageForm.title}
                onChange={(e) => setNewPageForm({ ...newPageForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">URL Slug (e.g. annual-report)</label>
              <input
                type="text"
                value={newPageForm.slug}
                onChange={(e) => setNewPageForm({ ...newPageForm, slug: e.target.value })}
                placeholder="auto-generated-from-title"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={newPageForm.subtitle}
                onChange={(e) => setNewPageForm({ ...newPageForm, subtitle: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewPage(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-sm"
              >
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold">
                Create Draft Page
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Revisions Modal */}
      {showRevisions && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-[#4A0E36]">Page Revision History</h3>
              <button type="button" onClick={() => setShowRevisions(false)} className="text-xs text-stone-500">
                Close
              </button>
            </div>
            {revisions.length === 0 ? (
              <p className="text-sm text-stone-500 py-6 text-center">No prior published revisions saved yet.</p>
            ) : (
              <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
                {revisions.map((rev) => (
                  <div key={rev.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-stone-800">{rev.title}</div>
                      <div className="text-xs text-stone-500">
                        {rev.note} · {formatDateShort(rev.created_at)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreRevision(rev.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <MediaPickerModal
        open={pickerTarget !== null}
        defaultFolder="General"
        onSelect={(url) => {
          if (pickerTarget === 'hero') updateActive({ hero_image_url: url });
          else if (pickerTarget && typeof pickerTarget === 'object') updateBlock(pickerTarget.blockIdx, { imageUrl: url });
        }}
        onClose={() => setPickerTarget(null)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Custom Page"
        message={`Permanently delete the page "${deleteTarget?.title}"?`}
        confirmLabel="Delete Page"
        destructive
        onConfirm={handleDeletePage}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
