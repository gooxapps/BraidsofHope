import React, { useEffect, useState } from 'react';
import { Check, Search, Upload, X } from 'lucide-react';
import { apiFetch } from '../../../lib/api.ts';
import type { MediaFile } from '../../../types.ts';
import { SafeImage } from '../../BrandMark.tsx';

interface MediaPickerModalProps {
  open: boolean;
  defaultFolder?: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  open,
  defaultFolder = 'General',
  onSelect,
  onClose,
}) => {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('All');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

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
      setError(err instanceof Error ? err.message : 'Unable to load media library.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open, folder]);

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('folder', defaultFolder);
      for (const f of Array.from(files)) {
        fd.append('files', f);
      }
      const res = await apiFetch<{ uploaded: MediaFile[] }>('/api/admin/media/upload', {
        method: 'POST',
        body: fd,
      });
      await load();
      if (res.uploaded[0]) {
        onSelect(res.uploaded[0].url);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between gap-4">
          <h3 className="font-display text-xl font-bold text-[#4A0E36]">Select or Upload Media</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-[#FAF5EE]/60">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load()}
                placeholder="Search uploaded images..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-stone-300 text-sm bg-white"
              />
            </div>
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-stone-300 text-sm bg-white"
            >
              <option value="All">All Folders</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={load}
              className="px-3 py-1.5 rounded-lg bg-stone-200 text-stone-800 text-xs font-semibold"
            >
              Filter
            </button>
          </div>

          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold cursor-pointer hover:opacity-95 shrink-0">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Uploading...' : 'Upload New Image'}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,.ico"
              multiple
              onChange={handleQuickUpload}
              className="hidden"
            />
          </label>
        </div>

        {error && <div className="px-6 py-2 bg-red-50 text-red-700 text-xs">{error}</div>}

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-12 text-sm text-stone-500">Loading media library...</div>
          ) : media.length === 0 ? (
            <div className="text-center py-12 text-sm text-stone-500">
              No images found. Upload an image above to get started.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {media.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item.url);
                    onClose();
                  }}
                  className="group text-left border border-stone-200 rounded-xl overflow-hidden hover:border-[#4A0E36] transition-colors bg-white"
                >
                  <div className="aspect-[4/3] bg-stone-100 overflow-hidden relative">
                    <SafeImage src={item.url} alt={item.alt_text || item.original_name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-[#4A0E36]/0 group-hover:bg-[#4A0E36]/20 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 bg-white text-[#4A0E36] text-xs font-semibold px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Select
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="text-xs font-medium text-stone-800 truncate">{item.original_name}</div>
                    <div className="text-[11px] text-stone-500 truncate">{item.folder}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
