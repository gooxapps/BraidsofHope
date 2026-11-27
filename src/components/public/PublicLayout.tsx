import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  Facebook,
  FileText,
  Heart,
  Home,
  Info,
  Instagram,
  Linkedin,
  Mail,
  Menu,
  MessageCircle,
  ShieldCheck,
  Users,
  X,
  Youtube,
} from 'lucide-react';
import { apiFetch, isSafeUrl } from '../../lib/api.ts';
import type { PublicBootstrapData } from '../../types.ts';
import { BrandLogo } from '../BrandMark.tsx';

interface PublicLayoutProps {
  data: PublicBootstrapData;
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

function isLightHex(hex?: string): boolean {
  if (!hex || !hex.startsWith('#')) return true;
  const clean = hex.slice(1);
  if (clean.length !== 6 && clean.length !== 3) return true;
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  data,
  currentPath,
  onNavigate,
  children,
}) => {
  const { branding, siteSettings, navigation, footer, isPreview } = data;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [cookieDismissed, setCookieDismissed] = useState(false);

  const [nlEmail, setNlEmail] = useState('');
  const [nlConsent, setNlConsent] = useState(true);
  const [nlStatus, setNlStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [nlMessage, setNlMessage] = useState('');

  useEffect(() => {
    const activePage = data.pages.find(
      (p) => (p.slug === 'home' && currentPath === '/') || `/${p.slug}` === currentPath
    );
    const title = activePage?.seo_title || siteSettings?.default_seo_title || siteSettings?.site_title || branding?.org_name;
    if (title) document.title = title;

    const desc =
      activePage?.seo_description || siteSettings?.default_seo_description || siteSettings?.site_description;
    if (desc) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', desc);
    }

    const fav = branding?.favicon_url || '/assets/aistudio/image_654ecb55.png';
    if (fav && isSafeUrl(fav)) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = fav;
    }

    const root = document.documentElement;
    if (branding?.primary_color) root.style.setProperty('--brand-plum', branding.primary_color);
    if (branding?.secondary_color) root.style.setProperty('--brand-teal', branding.secondary_color);
    if (branding?.accent_color) root.style.setProperty('--brand-orange', branding.accent_color);
    if (branding?.background_color) root.style.setProperty('--brand-cream', branding.background_color);
    if (branding?.heading_font) root.style.setProperty('--font-display', `'${branding.heading_font}', Georgia, serif`);
    if (branding?.body_font) root.style.setProperty('--font-body', `'${branding.body_font}', system-ui, sans-serif`);
  }, [branding, siteSettings, data.pages, currentPath]);

  const topLevelNav = navigation.filter((n) => !n.parent_id);
  const childrenByParent = new Map<number, typeof navigation>();
  for (const item of navigation) {
    if (item.parent_id) {
      const list = childrenByParent.get(item.parent_id) || [];
      list.push(item);
      childrenByParent.set(item.parent_id, list);
    }
  }

  const handleLinkClick = (e: React.MouseEvent, href: string, newTab?: boolean) => {
    if (newTab || href.startsWith('http://') || href.startsWith('https://')) {
      return;
    }
    e.preventDefault();
    setMobileMenuOpen(false);
    setOpenDropdownId(null);
    onNavigate(href);
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNlStatus('submitting');
    setNlMessage('');
    try {
      const res = await apiFetch<{ message: string }>('/api/public/newsletter', {
        method: 'POST',
        body: JSON.stringify({
          email: nlEmail,
          consent_confirmed: nlConsent,
          source: 'website_footer',
        }),
      });
      setNlStatus('success');
      setNlMessage(res.message);
      setNlEmail('');
    } catch (err) {
      setNlStatus('error');
      setNlMessage(err instanceof Error ? err.message : 'Subscription failed.');
    }
  };

  const socialEntries = [
    { key: 'facebook', label: 'Facebook', url: footer?.social_links?.facebook, icon: Facebook },
    { key: 'instagram', label: 'Instagram', url: footer?.social_links?.instagram, icon: Instagram },
    { key: 'youtube', label: 'YouTube', url: footer?.social_links?.youtube, icon: Youtube },
    { key: 'linkedin', label: 'LinkedIn', url: footer?.social_links?.linkedin, icon: Linkedin },
  ].filter((s) => s.url && isSafeUrl(s.url));

  const tiktokUrl = footer?.social_links?.tiktok && isSafeUrl(footer.social_links.tiktok) ? footer.social_links.tiktok : '';
  const whatsappClean = (siteSettings?.whatsapp_number || '').replace(/[^\d+]/g, '');

  const getQuickLinkIcon = (href: string) => {
    if (href === '/') return Home;
    if (href.includes('about')) return Info;
    if (href.includes('work')) return Heart;
    if (href.includes('involved')) return Users;
    if (href.includes('events')) return Calendar;
    if (href.includes('contact')) return Mail;
    return FileText;
  };

  const footerBg = footer?.bg_color || branding?.footer_bg_color || '#FAFAFC';
  const lightFooter = isLightHex(footerBg);
  const primaryColor = branding?.primary_color || '#52154E';
  const secondaryColor = branding?.secondary_color || '#0099A8';
  const accentColor = branding?.accent_color || '#F57C00';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: branding?.background_color || '#FFFFFF',
        fontFamily: branding?.body_font ? `'${branding.body_font}', system-ui, sans-serif` : undefined,
      }}
    >
      {isPreview && (
        <div className="bg-[#0099A8] text-white text-xs py-2 px-4 flex items-center justify-between">
          <span>Draft Preview Mode — Showing unpublished edits visible only to signed-in administrators.</span>
          <button
            type="button"
            onClick={() => onNavigate('/admin')}
            className="underline font-semibold whitespace-nowrap shrink-0 ml-4"
          >
            Return to Admin Dashboard
          </button>
        </div>
      )}

      {/* Bright Light Top Utility Strip */}
      <div className="bg-[#F8FAFC] border-b border-stone-200/80 text-stone-700 text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Heart className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor, fill: accentColor }} />
            <span className="font-medium text-stone-800">
              {siteSettings?.announcement_bar_enabled && siteSettings.announcement_bar_text
                ? siteSettings.announcement_bar_text
                : 'Together, we can make a difference'}
            </span>
            <span className="text-stone-300" aria-hidden="true">|</span>
            <span className="text-stone-600">Nigeria · Canada</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            {socialEntries.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={`top-${s.key}`}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="text-stone-600 hover:text-[#52154E] transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              );
            })}
            {socialEntries.length > 0 && <span className="text-stone-300" aria-hidden="true">|</span>}
            <span className="font-medium" style={{ color: secondaryColor }}>
              Hope · Compassion · Community
            </span>
          </div>
        </div>
      </div>

      {/* Crisp White Main Header */}
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6">
          <a
            href="/"
            onClick={(e) => handleLinkClick(e, '/')}
            className="shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#52154E]"
          >
            <BrandLogo
              logoUrl={branding?.logo_main_url || '/assets/aistudio/image_654ecb55.png'}
              orgName={branding?.org_name || 'BraidsofHope'}
              tagline={branding?.tagline}
              showTagline
              size="md"
            />
          </a>

          <nav className="hidden lg:flex items-center gap-6" aria-label="Primary Navigation">
            {topLevelNav.map((item) => {
              const subItems = childrenByParent.get(item.id) || [];
              const isActive = currentPath === item.href || (item.href === '/' && currentPath === '');
              if (subItems.length > 0) {
                return (
                  <div
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => setOpenDropdownId(item.id)}
                    onMouseLeave={() => setOpenDropdownId(null)}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        if (openDropdownId === item.id) {
                          handleLinkClick(e, item.href, item.open_in_new_tab);
                        } else {
                          setOpenDropdownId(item.id);
                        }
                      }}
                      className={`inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap shrink-0 py-1.5 transition-colors ${
                        isActive ? 'text-[#52154E] font-semibold border-b-2 border-[#F57C00]' : 'text-stone-700 hover:text-[#52154E]'
                      }`}
                    >
                      <span>{item.label}</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                    </button>
                    {openDropdownId === item.id && (
                      <div className="absolute left-0 top-full pt-1 w-48 z-50">
                        <div className="bg-white border border-stone-200 rounded-lg shadow-lg py-1.5">
                          <a
                            href={item.href}
                            onClick={(e) => handleLinkClick(e, item.href, item.open_in_new_tab)}
                            className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-[#52154E]"
                          >
                            {item.label} Overview
                          </a>
                          {subItems.map((sub) => (
                            <a
                              key={sub.id}
                              href={sub.href}
                              target={sub.open_in_new_tab ? '_blank' : undefined}
                              rel={sub.open_in_new_tab ? 'noopener noreferrer' : undefined}
                              onClick={(e) => handleLinkClick(e, sub.href, sub.open_in_new_tab)}
                              className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-[#52154E]"
                            >
                              {sub.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target={item.open_in_new_tab ? '_blank' : undefined}
                  rel={item.open_in_new_tab ? 'noopener noreferrer' : undefined}
                  onClick={(e) => handleLinkClick(e, item.href, item.open_in_new_tab)}
                  className={`text-sm font-medium whitespace-nowrap shrink-0 py-1.5 transition-colors ${
                    isActive
                      ? 'text-[#F57C00] font-semibold border-b-2 border-[#F57C00]'
                      : 'text-stone-700 hover:text-[#52154E]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/donate"
              onClick={(e) => handleLinkClick(e, '/donate')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] whitespace-nowrap shrink-0"
              style={{
                background: `linear-gradient(135deg, ${accentColor} 0%, #FB923C 100%)`,
              }}
            >
              <Heart className="w-4 h-4 fill-current" />
              <span>Donate Now</span>
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 rounded-lg text-stone-700 hover:bg-stone-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-stone-200 bg-white px-4 py-4 space-y-2">
            {navigation.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.href, item.open_in_new_tab)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium ${
                  currentPath === item.href
                    ? 'bg-[#52154E]/8 text-[#52154E] font-semibold'
                    : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Bright Light Footer (adapts gracefully if admin customizes dark bg) */}
      <footer
        className={`relative overflow-hidden ${lightFooter ? 'border-t border-stone-200' : ''}`}
        style={{
          backgroundColor: footerBg,
          color: lightFooter ? '#374151' : footer?.text_color || '#FAF5EE',
        }}
      >
        {/* Subtle bottom-left woven ribbon accent */}
        <svg
          viewBox="0 0 420 120"
          className={`pointer-events-none absolute left-0 bottom-0 w-72 sm:w-96 h-24 ${
            lightFooter ? 'opacity-20' : 'opacity-85'
          }`}
          aria-hidden="true"
        >
          <path d="M0,15 C110,65 230,30 380,120 L0,120 Z" fill="#0099A8" />
          <path d="M0,45 C140,75 240,55 340,120 L0,120 Z" fill="#F57C00" />
          <path d="M0,78 C95,90 190,82 280,120 L0,120 Z" fill="#52154E" />
        </svg>

        <div
          className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-0 lg:divide-x ${
            lightFooter ? 'lg:divide-stone-200' : 'lg:divide-white/15'
          }`}
        >
          {/* Col 1: Logo & Contact */}
          <div className="lg:col-span-3 lg:pr-6 flex flex-col justify-center space-y-3">
            <BrandLogo
              logoUrl={branding?.logo_footer_url || branding?.logo_main_url || '/assets/aistudio/image_654ecb55.png'}
              orgName={branding?.org_name || 'BraidsofHope'}
              tagline={branding?.tagline}
              variant={lightFooter ? 'default' : 'light'}
              showTagline={false}
              size="md"
            />
            <p className={`text-xs italic font-display ${lightFooter ? 'text-stone-600' : 'text-white/80'}`}>
              {branding?.tagline || 'Weaving a tapestry of hope for today and tomorrow.'}
            </p>
            <div className={`text-xs space-y-1 pt-1 ${lightFooter ? 'text-stone-600' : 'opacity-80'}`}>
              <div>{siteSettings?.contact_email || 'braidsofhope@outlook.com'}</div>
              {siteSettings?.edmonton_contact && <div>{siteSettings.edmonton_contact}</div>}
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="lg:col-span-2 lg:px-6">
            <h3
              className="text-sm font-bold tracking-wide mb-3.5"
              style={{ color: lightFooter ? primaryColor : '#F5B700' }}
            >
              Quick Links
            </h3>
            <ul className="space-y-2 text-xs">
              {(footer?.quick_links || []).slice(0, 6).map((link, idx) => {
                const Icon = getQuickLinkIcon(link.href);
                return (
                  <li key={`${link.href}-${idx}`}>
                    <a
                      href={link.href}
                      onClick={(e) => handleLinkClick(e, link.href)}
                      className={`inline-flex items-center gap-2 transition-colors hover:underline ${
                        lightFooter ? 'text-stone-700 hover:text-[#52154E]' : 'opacity-90 hover:opacity-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 opacity-75 shrink-0" style={lightFooter ? { color: secondaryColor } : undefined} />
                      <span>{link.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Col 3: Our Mission */}
          <div className="lg:col-span-3 lg:px-6 flex flex-col justify-between gap-4">
            <div>
              <h3
                className="text-sm font-bold tracking-wide mb-3"
                style={{ color: lightFooter ? primaryColor : '#F5B700' }}
              >
                Our Mission
              </h3>
              <p className={`text-xs leading-relaxed ${lightFooter ? 'text-stone-600' : 'opacity-90'}`}>
                {footer?.mission_blurb ||
                  'To bring hope to underprivileged children and families by providing food support, essential items, and compassionate care.'}
              </p>
            </div>
            <div>
              <a
                href="/about-us"
                onClick={(e) => handleLinkClick(e, '/about-us')}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                  lightFooter
                    ? 'border-[#52154E]/30 text-[#52154E] hover:bg-[#52154E]/5'
                    : 'border-[#F5B700]/70 text-white hover:bg-white/10'
                }`}
              >
                <span>Learn More</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Col 4: Stay Connected + Newsletter */}
          <div className="lg:col-span-2 lg:px-6 space-y-3">
            {footer?.show_newsletter !== false && (
              <div>
                <h3
                  className="text-sm font-bold tracking-wide mb-2"
                  style={{ color: lightFooter ? primaryColor : '#F5B700' }}
                >
                  {footer?.newsletter_heading || 'Stay Connected'}
                </h3>
                <p className={`text-xs mb-3 leading-relaxed ${lightFooter ? 'text-stone-600' : 'opacity-85'}`}>
                  {footer?.newsletter_subtext || 'Subscribe to our newsletter for programme updates and community stories.'}
                </p>
                <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                  <div className="flex gap-1.5">
                    <input
                      type="email"
                      required
                      value={nlEmail}
                      onChange={(e) => setNlEmail(e.target.value)}
                      placeholder="Your email address"
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md bg-white border border-stone-300 text-stone-900 text-xs placeholder:text-stone-400 focus:outline-none focus:border-[#0099A8]"
                    />
                    <button
                      type="submit"
                      disabled={nlStatus === 'submitting'}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold text-white shrink-0"
                      style={{ backgroundColor: accentColor }}
                    >
                      {nlStatus === 'submitting' ? '...' : 'Subscribe'}
                    </button>
                  </div>
                  <label className={`flex items-start gap-1.5 text-[10px] leading-tight cursor-pointer ${lightFooter ? 'text-stone-500' : 'opacity-75'}`}>
                    <input
                      type="checkbox"
                      required
                      checked={nlConsent}
                      onChange={(e) => setNlConsent(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>CASL consent: receive BraidsofHope updates.</span>
                  </label>
                  {nlMessage && (
                    <p
                      className={`text-[11px] ${
                        nlStatus === 'error'
                          ? lightFooter
                            ? 'text-red-600'
                            : 'text-amber-300'
                          : lightFooter
                            ? 'text-emerald-700'
                            : 'text-emerald-300'
                      }`}
                    >
                      {nlMessage}
                    </p>
                  )}
                </form>
              </div>
            )}

            {(socialEntries.length > 0 || tiktokUrl) && (
              <div className="flex items-center gap-2.5 pt-1">
                {socialEntries.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.key}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className={`w-7 h-7 rounded-full flex items-center justify-center hover:scale-105 transition-transform ${
                        lightFooter ? 'bg-white border border-stone-200 text-[#52154E] shadow-xs' : 'bg-white text-[#3B0A2B]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </a>
                  );
                })}
                {tiktokUrl && (
                  <a
                    href={tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className={`px-2 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      lightFooter ? 'bg-white border border-stone-200 text-[#52154E]' : 'bg-white text-[#3B0A2B]'
                    }`}
                  >
                    TikTok
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Col 5: Donate CTA block */}
          <div className="lg:col-span-2 lg:pl-6 flex flex-col items-center justify-center text-center space-y-2">
            <a
              href="/donate"
              onClick={(e) => handleLinkClick(e, '/donate')}
              className="group flex flex-col items-center space-y-1.5"
            >
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform ${
                  lightFooter
                    ? 'bg-[#FFF7ED] border border-[#F57C00]/40 text-[#F57C00]'
                    : 'bg-[#F38B1C]/20 border border-[#F5B700]/50 text-[#F5B700]'
                }`}
              >
                <Heart className="w-5 h-5 fill-current" />
              </div>
              <div className={`font-display text-xl font-bold ${lightFooter ? 'text-[#52154E]' : 'text-white'}`}>
                Donate
              </div>
              <div className={`text-xs leading-snug max-w-[140px] ${lightFooter ? 'text-stone-600' : 'opacity-85'}`}>
                Be the reason for hope today.
              </div>
            </a>
          </div>
        </div>

        {/* Bottom Copyright Strip with clearance for floating WhatsApp button */}
        <div
          className={`relative z-10 border-t ${
            lightFooter ? 'border-stone-200 bg-white text-stone-600' : 'border-white/10 bg-black/20 opacity-85'
          }`}
        >
          <div
            className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs ${
              whatsappClean ? 'pb-16 sm:pb-3.5 sm:pr-20' : 'pb-3.5'
            }`}
          >
            <span>{footer?.copyright_text || '© 2026 BraidsofHope. All rights reserved.'}</span>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
              <a href="/privacy-policy" onClick={(e) => handleLinkClick(e, '/privacy-policy')} className="hover:underline">
                Privacy Policy
              </a>
              <a href="/terms-conditions" onClick={(e) => handleLinkClick(e, '/terms-conditions')} className="hover:underline">
                Terms
              </a>
              <a
                href="/admin"
                onClick={(e) => handleLinkClick(e, '/admin')}
                className="inline-flex items-center gap-1 hover:underline font-medium"
              >
                <ShieldCheck className="w-3.5 h-3.5 opacity-85 shrink-0" />
                <span>Admin Portal</span>
              </a>
              <span className="opacity-40 hidden sm:inline" aria-hidden="true">|</span>
              <span>Developed by Emmanuel Kenny (StaySafelite)</span>
            </div>
          </div>
        </div>
      </footer>

      {whatsappClean && (
        <a
          href={`https://wa.me/${whatsappClean.replace(/^\+/, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contact BraidsofHope on WhatsApp"
          className="fixed bottom-3.5 right-4 z-40 w-11 h-11 rounded-full bg-[#16A34A] text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MessageCircle className="w-5 h-5" />
        </a>
      )}

      {siteSettings?.cookie_notice_enabled && siteSettings.cookie_notice_text && !cookieDismissed && (
        <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-30 bg-white border border-stone-200 rounded-xl shadow-lg p-4 flex items-start gap-3">
          <p className="text-xs text-stone-600 leading-relaxed flex-1">{siteSettings.cookie_notice_text}</p>
          <button
            type="button"
            onClick={() => setCookieDismissed(true)}
            className="px-3 py-1.5 rounded-lg bg-[#52154E] text-white text-xs font-semibold shrink-0"
          >
            Acknowledge
          </button>
        </div>
      )}
    </div>
  );
};
