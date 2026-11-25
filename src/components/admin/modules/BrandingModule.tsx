import React, { useEffect, useState } from 'react';
import { Eye, Image as ImageIcon, RotateCcw, Save, Send } from 'lucide-react';
import { apiFetch } from '../../../lib/api.ts';
import type { BrandingSettings } from '../../../types.ts';
import { BrandLogo, SafeImage } from '../../BrandMark.tsx';
import { MediaPickerModal } from './MediaPickerModal.tsx';

const FONT_OPTIONS = [
  'Playfair Display',
  'Plus Jakarta Sans',
  'Outfit',
  'DM Sans',
  'Fraunces',
  'Cormorant Garamond',
  'Lora',
  'Public Sans',
];

export const BrandingModule: React.FC<{
  onToast: (type: 'success' | 'error', text: string) => void;
  onPreviewSite: () => void;
}> = ({ onToast, onPreviewSite }) => {
  const [form, setForm] = useState<Partial<BrandingSettings>>({});
  const [hasDraft, setHasDraft] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerField, setPickerField] = useState<keyof BrandingSettings | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ branding: BrandingSettings; draft: Partial<BrandingSettings> | null }>(
        '/api/admin/branding'
      );
      setForm(res.draft ? { ...res.branding, ...res.draft } : res.branding);
      setHasDraft(Boolean(res.draft));
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Unable to load branding.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveBranding = async (mode: 'draft' | 'publish') => {
    setSaving(true);
    try {
      await apiFetch('/api/admin/branding', {
        method: 'PUT',
        body: JSON.stringify({ mode, data: form }),
      });
      setHasDraft(mode === 'draft');
      onToast('success', mode === 'draft' ? 'Branding draft saved for preview.' : 'Branding published to live website.');
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Failed to save branding.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="bg-white border border-stone-200 rounded-xl p-8 text-sm text-stone-500">Loading branding...</div>;
  }

  const logoSlots: Array<{ field: keyof BrandingSettings; label: string; hint: string }> = [
    { field: 'logo_main_url', label: 'Primary Header Logo', hint: 'Displayed in top navigation bar' },
    { field: 'logo_footer_url', label: 'Footer Logo', hint: 'Displayed in dark plum footer' },
    { field: 'logo_alt_url', label: 'Alternative Logo', hint: 'Secondary horizontal or stacked mark' },
    { field: 'logo_light_url', label: 'Light Logo Version', hint: 'For dark plum/teal backgrounds' },
    { field: 'logo_dark_url', label: 'Dark Logo Version', hint: 'For light cream/white backgrounds' },
    { field: 'logo_transparent_url', label: 'Transparent Logo Version', hint: 'PNG/SVG with transparent canvas' },
    { field: 'favicon_url', label: 'Browser Favicon', hint: '32x32 or 64x64 PNG/ICO/SVG' },
    { field: 'decorative_banner_url', label: 'Brand Graphic / Decorative Banner', hint: 'Optional decorative texture or wave' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#4A0E36]">Branding & Logo Management</h1>
          <p className="text-sm text-stone-600 mt-1">
            Configure organization identity, logos, colours, and fonts. Preview changes before publishing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {hasDraft && <span className="text-xs font-semibold text-[#0E7C7B]">Draft changes pending</span>}
          <button
            type="button"
            disabled={saving}
            onClick={() => saveBranding('draft')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone-300 bg-white text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>
          <button
            type="button"
            onClick={onPreviewSite}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#0E7C7B] text-sm font-medium text-[#0E7C7B] bg-white hover:bg-[#0E7C7B]/5"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Site</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => saveBranding('publish')}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#4A0E36] text-white text-sm font-semibold hover:opacity-95"
          >
            <Send className="w-4 h-4" />
            <span>Publish Branding</span>
          </button>
        </div>
      </div>

      {/* Live Preview Strip */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
        <div className="text-xs font-semibold text-stone-500">Live Identity Preview</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className="rounded-xl p-5 border border-stone-200 flex items-center justify-between"
            style={{ backgroundColor: form.background_color || '#FAF5EE' }}
          >
            <BrandLogo
              logoUrl={form.logo_main_url}
              orgName={form.org_name || 'BraidsofHope'}
              tagline={form.tagline}
              showTagline
            />
            <span
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: form.accent_color || '#F38B1C' }}
            >
              Donate Now
            </span>
          </div>
          <div
            className="rounded-xl p-5 flex items-center justify-between"
            style={{ backgroundColor: form.footer_bg_color || '#3B0A2B', color: form.footer_text_color || '#FAF5EE' }}
          >
            <BrandLogo
              logoUrl={form.logo_footer_url || form.logo_light_url || form.logo_main_url}
              orgName={form.org_name || 'BraidsofHope'}
              tagline={form.tagline}
              variant="light"
              showTagline
            />
            <span className="text-xs opacity-80">Footer Preview</span>
          </div>
        </div>
      </div>

      {/* Organization Identity & Fonts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-[#4A0E36]">Organization Identity</h2>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Organization Name</label>
            <input
              type="text"
              value={form.org_name || ''}
              onChange={(e) => setForm({ ...form, org_name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Website Tagline</label>
            <input
              type="text"
              value={form.tagline || ''}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Brand Description</label>
            <textarea
              rows={3}
              value={form.brand_description || ''}
              onChange={(e) => setForm({ ...form, brand_description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Heading Font</label>
              <select
                value={form.heading_font || 'Playfair Display'}
                onChange={(e) => setForm({ ...form, heading_font: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Body Font</label>
              <select
                value={form.body_font || 'Plus Jakarta Sans'}
                onChange={(e) => setForm({ ...form, body_font: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Brand Colour Palette */}
        <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#4A0E36]">Brand Colours</h2>
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  primary_color: '#4A0E36',
                  secondary_color: '#0E7C7B',
                  accent_color: '#F38B1C',
                  background_color: '#FAF5EE',
                  footer_bg_color: '#3B0A2B',
                  footer_text_color: '#FAF5EE',
                })
              }
              className="inline-flex items-center gap-1 text-xs text-[#0E7C7B] hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset BraidsofHope Defaults</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(
              [
                ['primary_color', 'Primary Brand Colour (Plum)'],
                ['secondary_color', 'Secondary Colour (Teal)'],
                ['accent_color', 'Accent CTA Colour (Orange)'],
                ['background_color', 'Canvas Background (Warm Cream)'],
                ['footer_bg_color', 'Footer Background'],
                ['footer_text_color', 'Footer Text Colour'],
              ] as Array<[keyof BrandingSettings, string]>
            ).map(([field, label]) => (
              <div key={field} className="space-y-1">
                <label className="block text-xs font-medium text-stone-700">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={String(form[field] || '#4A0E36')}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="w-10 h-9 rounded border border-stone-300 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={String(form[field] || '')}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logo & Brand Graphics Slots */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-[#4A0E36]">Logos, Favicon & Brand Graphics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {logoSlots.map((slot) => {
            const val = String(form[slot.field] || '');
            return (
              <div key={slot.field} className="border border-stone-200 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-stone-800">{slot.label}</div>
                  <div className="text-[11px] text-stone-500">{slot.hint}</div>
                </div>
                <div className="h-24 rounded-lg bg-[#FAF5EE] border border-stone-200 flex items-center justify-center overflow-hidden p-2">
                  {val ? (
                    <SafeImage src={val} alt={slot.label} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[11px] text-stone-400">Using woven SVG fallback</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPickerField(slot.field)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold hover:opacity-95"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{val ? 'Replace' : 'Upload / Pick'}</span>
                  </button>
                  {val && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, [slot.field]: '' })}
                      className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs text-stone-600 hover:bg-stone-50"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <MediaPickerModal
        open={pickerField !== null}
        defaultFolder="Logos & Branding"
        onSelect={(url) => {
          if (pickerField) setForm((prev) => ({ ...prev, [pickerField]: url }));
        }}
        onClose={() => setPickerField(null)}
      />
    </div>
  );
};
