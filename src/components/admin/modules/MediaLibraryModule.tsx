import React, { useEffect, useState } from 'react';
import { Copy, Edit3, FolderOpen, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import { apiFetch, formatBytes, formatDateShort } from '../../../lib/api.ts';
import type { MediaFile } from '../../../types.ts';
import { SafeImage } from '../../BrandMark.tsx';
import { ConfirmModal } from '../AdminToast.tsx';

export const MediaLibraryModule: React.FC<{
  onToast: (type: 'success' | 'error', text: string) => void;
}> = ({ onToast }) => {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('All');
  const [uploadFolder, setUploadFolder] = useState('General');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [editingItem, setEditingItem] = useState<MediaFile | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (folder !== 'All') q.set('folder', folder);
      const res = await apiFetch<{ media: MediaFile[]; folders: string[] }>(`/api/admin/media?${q.toString()}`);
      setMedia(res.media);
      setFolders(res.folders);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to load media library.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [folder]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('folder', uploadFolder);
      for (const f of Array.from(files)) {
        fd.append('files', f);
      }
      const res = await apiFetch<{ uploaded: MediaFile[] }>('/api/admin/media/upload', {
        method: 'POST',
        body: fd,
      });
      onToast('success', `Uploaded ${res.uploaded.length} image(s) to ${uploadFolder}.`);
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleReplace = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      await apiFetch(`/api/admin/media/${id}/replace`, { method: 'POST', body: fd });
      onToast('success', 'Image replaced and all active website references updated.');
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to replace image.');
    }
  };

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await apiFetch(`/api/admin/media/${editingItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          original_name: editingItem.original_name,
          folder: editingItem.folder,
          alt_text: editingItem.alt_text,
          description: editingItem.description,
        }),
      });
      onToast('success', 'Media metadata updated.');
      setEditingItem(null);
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to update media.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/admin/media/${deleteTarget.id}`, { method: 'DELETE' });
      onToast('success', 'Media file deleted.');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to delete media file.');
      setDeleteTarget(null);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      onToast('success', 'Image URL copied to clipboard.');
    } catch {
      onToast('error', 'Could not copy URL.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">Media Library</h1>
          <p className="text-sm text-stone-600 mt-1">
            Upload, organize, replace, and manage PNG, JPG, JPEG, WEBP, and SVG assets across BraidsofHope.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={uploadFolder}
            onChange={(e) => setUploadFolder(e.target.value)}
            className="px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
            aria-label="Target upload folder"
          >
            {folders.map((f) => (
              <option key={f} value={f}>
                Folder: {f}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0E7C7B] text-white text-sm font-semibold cursor-pointer hover:opacity-95">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Uploading...' : 'Upload Images'}</span>
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/svg+xml,.ico"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search by filename, alt text, or description..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-stone-500" />
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
          >
            <option value="All">All Folders</option>
            {folders.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-4 py-2 rounded-lg bg-[#4A0E36] text-white text-xs font-semibold"
        >
          Search
        </button>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center text-sm text-stone-500">
          Loading media files...
        </div>
      ) : media.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center text-sm text-stone-500">
          No media files match this filter. Upload images using the button above.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {media.map((item) => (
            <div key={item.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden flex flex-col">
              <button
                type="button"
                onClick={() => setPreviewItem(item)}
                className="aspect-[4/3] bg-stone-100 overflow-hidden relative group"
              >
                <SafeImage
                  src={item.url}
                  alt={item.alt_text || item.original_name}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                />
              </button>
              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-stone-900 truncate" title={item.original_name}>
                    {item.original_name}
                  </div>
                  <div className="text-xs text-stone-500 tabular-nums">
                    {item.folder} · {formatBytes(item.file_size)}
                    {item.width > 0 && item.height > 0 ? ` · ${item.width}×${item.height}` : ''}
                  </div>
                  {item.alt_text && <div className="text-xs text-stone-600 line-clamp-2">{item.alt_text}</div>}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => copyUrl(item.url)}
                    title="Copy URL"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-medium text-stone-700"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...item })}
                    title="Rename & Edit Metadata"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-medium text-stone-700"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <label
                    title="Replace File"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-medium text-stone-700 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Replace</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml,.ico"
                      onChange={(e) => handleReplace(item.id, e)}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    title="Delete"
                    className="ml-auto p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveMeta}
            className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-[#4A0E36]">Edit Media Details</h3>
              <button type="button" onClick={() => setEditingItem(null)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Filename / Title</label>
              <input
                type="text"
                required
                value={editingItem.original_name}
                onChange={(e) => setEditingItem({ ...editingItem, original_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Folder / Category</label>
              <input
                type="text"
                value={editingItem.folder}
                onChange={(e) => setEditingItem({ ...editingItem, folder: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Alt Text (Accessibility)</label>
              <input
                type="text"
                value={editingItem.alt_text}
                onChange={(e) => setEditingItem({ ...editingItem, alt_text: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={editingItem.description}
                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-sm"
              >
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPreviewItem(null)}>
          <div
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
              <div className="font-semibold text-sm text-[#4A0E36] truncate">{previewItem.original_name}</div>
              <button type="button" onClick={() => setPreviewItem(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-stone-100 max-h-[65vh] flex items-center justify-center p-4">
              <SafeImage src={previewItem.url} alt={previewItem.alt_text} className="max-h-[58vh] object-contain" />
            </div>
            <div className="p-4 text-xs text-stone-600 flex flex-wrap items-center justify-between gap-2">
              <span>
                {previewItem.mime_type} · {formatBytes(previewItem.file_size)} · Uploaded{' '}
                {formatDateShort(previewItem.created_at)}
              </span>
              <span className="font-mono text-stone-500">{previewItem.url}</span>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Media File"
        message={`Are you sure you want to delete "${deleteTarget?.original_name}"? Files actively used on published pages or branding cannot be deleted until replaced.`}
        confirmLabel="Delete File"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
