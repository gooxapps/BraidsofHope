import React, { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Gift,
  Handshake,
  Heart,
  HeartHandshake,
  Lock,
  Mail,
  MapPin,
  Package,
  Phone,
  ShoppingBasket,
  Sprout,
  Users,
} from 'lucide-react';
import { apiFetch, formatCurrency, formatDateShort } from '../../lib/api.ts';
import type { PublicBootstrapData } from '../../types.ts';
import { SafeImage, WovenRibbonDivider } from '../BrandMark.tsx';

interface PublicSiteProps {
  data: PublicBootstrapData;
  currentPath: string;
  onNavigate: (path: string) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart,
  Users,
  Handshake,
  Sprout,
  ShoppingBasket,
  Package,
  HeartHandshake,
  Gift,
};

export const PublicSite: React.FC<PublicSiteProps> = ({ data, currentPath, onNavigate }) => {
  const path = currentPath === '' ? '/' : currentPath;

  const go = (e: React.MouseEvent, target: string) => {
    if (target.startsWith('http://') || target.startsWith('https://')) return;
    e.preventDefault();
    onNavigate(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (path === '/') return <HomeView data={data} onNavigate={onNavigate} go={go} />;
  if (path === '/about-us') return <AboutView data={data} go={go} />;
  if (path === '/our-work') return <OurWorkView data={data} go={go} />;
  if (path === '/get-involved') return <GetInvolvedView data={data} go={go} />;
  if (path === '/events-campaigns') return <EventsCampaignsView data={data} go={go} />;
  if (path === '/donate') return <DonateView data={data} go={go} />;
  if (path === '/contact-us') return <ContactView data={data} />;

  // Dynamic CMS Page matching slug (/privacy-policy, /terms-conditions, or any custom page)
  const slug = path.replace(/^\//, '');
  const customPage = data.pages.find((p) => p.slug === slug);
  if (customPage) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <div className="space-y-3 border-b border-stone-200 pb-8">
          <h1 className="font-display text-4xl font-bold text-[#4A0E36] text-balance">{customPage.title}</h1>
          {customPage.subtitle && <p className="text-lg text-stone-600">{customPage.subtitle}</p>}
        </div>
        {customPage.hero_image_url && (
          <SafeImage
            src={customPage.hero_image_url}
            alt={customPage.title}
            className="w-full h-72 object-cover rounded-2xl"
          />
        )}
        <div className="space-y-8">
          {customPage.blocks.map((block) => (
            <section key={block.id} className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-3">
              {block.heading && (
                <h2 className="font-display text-2xl font-semibold text-[#4A0E36]">{block.heading}</h2>
              )}
              {block.body && <p className="text-stone-700 leading-relaxed whitespace-pre-line">{block.body}</p>}
              {block.imageUrl && (
                <SafeImage
                  src={block.imageUrl}
                  alt={block.heading || customPage.title}
                  className="w-full max-h-80 object-cover rounded-xl mt-3"
                />
              )}
              {block.ctaLabel && block.ctaLink && (
                <div className="pt-2">
                  <a
                    href={block.ctaLink}
                    onClick={(e) => go(e, block.ctaLink!)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[#4A0E36] hover:opacity-90"
                  >
                    <span>{block.ctaLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
      <h1 className="font-display text-3xl font-bold text-[#4A0E36]">Page Not Found</h1>
      <p className="text-stone-600">The page you requested could not be found.</p>
      <button
        type="button"
        onClick={() => onNavigate('/')}
        className="px-5 py-2.5 rounded-full bg-[#4A0E36] text-white text-sm font-semibold"
      >
        Return Home
      </button>
    </div>
  );
};

// ---------------- HOME VIEW CUSTOM GRAPHICS ----------------
const ProgrammeEmblem: React.FC<{ slug: string; iconName: string }> = ({ slug, iconName }) => {
  if (slug === 'food-support' || iconName === 'ShoppingBasket') {
    return (
      <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" aria-hidden="true">
        {/* Fresh produce peeking out of donation box */}
        <circle cx="24" cy="20" r="6.5" fill="#E11D48" />
        <path d="M24 13.5 C25 11 28 11 29 13" stroke="#15803D" strokeWidth="2.2" strokeLinecap="round" />
        <ellipse cx="36" cy="18" rx="6" ry="7.5" fill="#16A34A" />
        <path d="M39 14 C44 12 48 16 45 22 L38 25 Z" fill="#F59E0B" />
        <rect x="13" y="25" width="38" height="26" rx="3" fill="#D97706" />
        <path d="M13 25 L32 32 L51 25 L46 18 L18 18 Z" fill="#F59E0B" opacity="0.9" />
        <path d="M13 25 L32 32 L32 51 L13 48 Z" fill="#B45309" opacity="0.35" />
        <path d="M25 38 C25 35.8 27 34.5 29 34.5 C30.4 34.5 31.5 35.3 32 36.4 C32.5 35.3 33.6 34.5 35 34.5 C37 34.5 39 35.8 39 38 C39 41.5 32 45.5 32 45.5 C32 45.5 25 41.5 25 38 Z" fill="#FEF3C7" />
      </svg>
    );
  }
  if (slug === 'essential-items' || iconName === 'Package') {
    return (
      <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" aria-hidden="true">
        <path
          d="M23 14 L13 20 L17 29 L21 27 L21 50 L43 50 L43 27 L47 29 L51 20 L41 14 C39 17 35.8 18.5 32 18.5 C28.2 18.5 25 17 23 14 Z"
          fill="#0E7C7B"
        />
        <path d="M23 14 C25.5 17.5 28.5 19 32 19 C35.5 19 38.5 17.5 41 14" stroke="#F38B1C" strokeWidth="2.5" />
        <rect x="26" y="25" width="12" height="25" rx="1.5" fill="#4A0E36" opacity="0.22" />
      </svg>
    );
  }
  if (slug === 'children-families' || iconName === 'Users') {
    return (
      <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" aria-hidden="true">
        <circle cx="21" cy="22" r="5.5" fill="#6B2150" />
        <path d="M12 46 C12 37.5 16 33 21 33 C26 33 30 37.5 30 46 Z" fill="#6B2150" />
        <circle cx="43" cy="22" r="5.5" fill="#6B2150" />
        <path d="M34 46 C34 37.5 38 33 43 33 C48 33 52 37.5 52 46 Z" fill="#6B2150" />
        <circle cx="32" cy="29" r="5" fill="#4A0E36" />
        <path d="M23 49 C23 41.5 27 37.5 32 37.5 C37 37.5 41 41.5 41 49 Z" fill="#4A0E36" />
      </svg>
    );
  }
  if (slug === 'community-care' || iconName === 'HeartHandshake') {
    return (
      <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" aria-hidden="true">
        <path
          d="M32 38 C32 38 20 30.5 20 22 C20 17.8 23.3 14.5 27.2 14.5 C29.5 14.5 31.3 15.8 32 17.6 C32.7 15.8 34.5 14.5 36.8 14.5 C40.7 14.5 44 17.8 44 22 C44 30.5 32 38 32 38 Z"
          fill="#0E7C7B"
        />
        <path d="M13 36 C16 44 22 49 30 50 L28 43 L20 34 Z" fill="#F38B1C" />
        <path d="M51 36 C48 44 42 49 34 50 L36 43 L44 34 Z" fill="#F38B1C" />
      </svg>
    );
  }
  const Icon = ICON_MAP[iconName] || HeartHandshake;
  return <Icon className="w-8 h-8 text-[#4A0E36]" />;
};

const RaisedHandsGraphic: React.FC<{ color?: string }> = ({ color = '#0099A8' }) => (
  <svg viewBox="0 0 110 110" className="w-20 h-20 shrink-0" fill="none" aria-hidden="true">
    <circle cx="55" cy="55" r="46" stroke={color} strokeOpacity="0.22" strokeWidth="1.5" />
    <circle cx="55" cy="55" r="38" stroke={color} strokeOpacity="0.14" strokeWidth="1.5" />
    <path
      d="M42 74 L42 46 C42 44 45 44 45 46 L45 55 L46 34 C46 32 49 32 49 34 L49 54 L51 31 C51 29 54 29 54 31 L54 54 L56 35 C56 33 59 33 59 35 L59 58 C61 55 64 56 63 59 L60 72"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M52 82 L52 57 C52 55 55 55 55 57 L55 64 L57 44 C57 42 60 42 60 44 L60 63 L62 41 C62 39 65 39 65 41 L65 63 L67 46 C67 44 70 44 70 46 L70 67 C73 64 76 66 74 69 L69 83"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="#FFFFFF"
      fillOpacity="0.7"
    />
    <path
      d="M27 72 L27 52 C27 50.5 29.5 50.5 29.5 52 L29.5 58 L31 44 C31 42.5 33.5 42.5 33.5 44 L33.5 58 L35 46 C35 44.5 37.5 44.5 37.5 46 L37.5 64"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const HandshakeGraphic: React.FC<{ color?: string }> = ({ color = '#F57C00' }) => (
  <svg viewBox="0 0 110 110" className="w-20 h-20 shrink-0" fill="none" aria-hidden="true">
    <circle cx="55" cy="55" r="46" stroke={color} strokeOpacity="0.22" strokeWidth="1.5" />
    <path
      d="M18 47 L33 34 L48 43 L62 34 L77 45 L91 37"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20 53 L36 69 C38 71 42 71 44 69 L48 65 M29 58 L41 72 C43 74 46 74 48 72 L52 68 M37 64 L46 75 C48 77 51 77 53 75 L57 70"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M47 43 L38 51 C36 53 38 57 42 56 L51 50 L68 65 C71 67 75 64 73 61 L59 48 M65 67 L74 62 C77 60 79 56 77 54 L63 40 M76 58 L89 48"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PASTEL_WORK_STYLES = [
  'bg-gradient-to-b from-[#FFF9F2] to-[#FFEDD5] border-[#FED7AA]',
  'bg-gradient-to-b from-[#F2FCFD] to-[#D9F4F7] border-[#A5E8EF]',
  'bg-gradient-to-b from-[#FDF5FB] to-[#F5E1EF] border-[#E7C6DD]',
  'bg-gradient-to-b from-[#FEFCE8] to-[#FEF3C7] border-[#FDE68A]',
];

function isLightBackgroundHex(hex?: string): boolean {
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
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

// ---------------- HOME VIEW ----------------
const HomeView: React.FC<{
  data: PublicBootstrapData;
  onNavigate: (p: string) => void;
  go: (e: React.MouseEvent, target: string) => void;
}> = ({ data, go }) => {
  const { homepageSections, programmes, testimonials, impactStories, campaigns, donationsUnlocked, branding } = data;
  const extraFeaturedCampaigns = campaigns.filter((c) => c.is_featured && !c.is_christmas_programme);
  const christmasCampaign = campaigns.find((c) => c.is_christmas_programme) || campaigns[0];
  const primaryColor = branding?.primary_color || '#52154E';
  const secondaryColor = branding?.secondary_color || '#0099A8';
  const accentColor = branding?.accent_color || '#F57C00';
  const pageBg = branding?.background_color || '#FFFFFF';

  const renderHeroTitle = (title: string) => {
    const words = title.trim().split(/\s+/);
    if (words.length <= 1) return title;
    const lastWord = words[words.length - 1];
    const lead = words.slice(0, -1).join(' ');
    return (
      <>
        {lead}{' '}
        <span className="italic font-bold" style={{ color: accentColor }}>
          {lastWord}
        </span>
      </>
    );
  };

  return (
    <div>
      {homepageSections.map((sec) => {
        if (sec.section_type === 'hero') {
          const cfg = sec.config as { quoteText?: string };
          const heroBg = sec.bg_color || '#FFFFFF';
          const lightHero = isLightBackgroundHex(heroBg);

          if (lightHero) {
            return (
              <section
                key={sec.id}
                className="relative overflow-hidden border-b border-stone-100"
                style={{ backgroundColor: heroBg }}
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
                  <div className="lg:col-span-6 space-y-4">
                    <h1
                      className="font-display text-4xl sm:text-5xl lg:text-[52px] font-bold leading-[1.08] tracking-tight text-balance"
                      style={{ color: primaryColor }}
                    >
                      {renderHeroTitle(sec.title)}
                    </h1>
                    {sec.subtitle && (
                      <p className="font-display italic text-xl sm:text-2xl font-medium" style={{ color: secondaryColor }}>
                        {sec.subtitle}
                      </p>
                    )}
                    {sec.body_text && (
                      <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-lg pt-1">
                        {sec.body_text}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3.5 pt-3">
                      {sec.cta_label && (
                        <a
                          href={sec.cta_link || '/donate'}
                          onClick={(e) => go(e, sec.cta_link || '/donate')}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white shadow-md hover:brightness-105 transition-all"
                          style={{
                            background: `linear-gradient(135deg, ${accentColor} 0%, #FB923C 100%)`,
                          }}
                        >
                          <Heart className="w-4 h-4 fill-current" />
                          <span>{sec.cta_label}</span>
                          <ArrowRight className="w-4 h-4" />
                        </a>
                      )}
                      {sec.secondary_cta_label && (
                        <a
                          href={sec.secondary_cta_link || '/get-involved'}
                          onClick={(e) => go(e, sec.secondary_cta_link || '/get-involved')}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold border-2 bg-white hover:bg-stone-50 transition-colors"
                          style={{ borderColor: `${primaryColor}35`, color: primaryColor }}
                        >
                          <span>{sec.secondary_cta_label}</span>
                          <ArrowRight className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-6 relative">
                    <div className="relative rounded-3xl overflow-hidden shadow-xl border border-stone-200/80 aspect-[16/10] bg-white">
                      <SafeImage
                        src={sec.image_url}
                        alt={sec.title}
                        className="w-full h-full object-cover object-center"
                        fallbackLabel="BraidsofHope Community"
                      />
                      {cfg?.quoteText && (
                        <div className="hidden sm:block absolute right-4 bottom-4 max-w-[270px] rounded-2xl bg-white/92 backdrop-blur-sm border border-white/80 shadow-md px-4 py-2.5 text-right">
                          <p className="font-display italic text-xs sm:text-sm leading-snug" style={{ color: primaryColor }}>
                            {cfg.quoteText}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none">
                  <WovenRibbonDivider className="w-full h-12 sm:h-16 block" bottomColor={pageBg} />
                </div>
              </section>
            );
          }

          return (
            <section
              key={sec.id}
              className="relative overflow-hidden text-white"
              style={{ backgroundColor: heroBg }}
            >
              <div className="absolute inset-y-0 right-0 w-full lg:w-[70%] pointer-events-none">
                <SafeImage
                  src={sec.image_url}
                  alt={sec.title}
                  className="w-full h-full object-cover object-center"
                  fallbackLabel="BraidsofHope Community"
                />
                <div
                  className="absolute inset-0 hidden lg:block"
                  style={{
                    background: `linear-gradient(90deg, ${heroBg} 0%, ${heroBg} 12%, rgba(82,21,78,0.85) 34%, rgba(82,21,78,0.28) 58%, rgba(82,21,78,0.06) 85%, rgba(82,21,78,0.16) 100%)`,
                  }}
                />
              </div>

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 lg:pt-16 lg:pb-28 relative z-10">
                <div className="max-w-xl space-y-4">
                  <h1 className="font-display text-4xl sm:text-5xl lg:text-[54px] font-bold leading-[1.08] tracking-tight text-balance">
                    {renderHeroTitle(sec.title)}
                  </h1>
                  {sec.subtitle && (
                    <p className="font-display italic text-xl sm:text-2xl text-white/95 font-medium">
                      {sec.subtitle}
                    </p>
                  )}
                  {sec.body_text && (
                    <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-md pt-0.5">
                      {sec.body_text}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3.5 pt-3">
                    {sec.cta_label && (
                      <a
                        href={sec.cta_link || '/donate'}
                        onClick={(e) => go(e, sec.cta_link || '/donate')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white shadow-lg hover:brightness-105 transition-all"
                        style={{
                          background: `linear-gradient(135deg, ${accentColor} 0%, #FB923C 100%)`,
                        }}
                      >
                        <Heart className="w-4 h-4 fill-current" />
                        <span>{sec.cta_label}</span>
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    )}
                    {sec.secondary_cta_label && (
                      <a
                        href={sec.secondary_cta_link || '/get-involved'}
                        onClick={(e) => go(e, sec.secondary_cta_link || '/get-involved')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white border border-white/60 hover:bg-white/10 transition-colors"
                      >
                        <span>{sec.secondary_cta_label}</span>
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none">
                <WovenRibbonDivider className="w-full h-14 sm:h-20 block" bottomColor={pageBg} />
              </div>
            </section>
          );
        }

        if (sec.section_type === 'values') {
          const items = (sec.config?.items as Array<{ title: string; subtitle: string; icon?: string }>) || [];
          return (
            <section key={sec.id} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-10 relative z-20 mb-8">
              <div className="bg-white border border-stone-200/90 rounded-2xl shadow-[0_12px_30px_-10px_rgba(15,23,42,0.08)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-stone-200">
                {items.map((item, idx) => {
                  const Icon = ICON_MAP[item.icon || 'Heart'] || Heart;
                  const iconColor = idx === 0 ? accentColor : secondaryColor;
                  return (
                    <div key={idx} className="px-5 py-4 sm:py-5 flex items-center justify-center sm:justify-start gap-3.5">
                      <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ color: iconColor }}>
                        <Icon className="w-8 h-8 stroke-[1.9]" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-display font-bold text-lg leading-tight" style={{ color: primaryColor }}>
                          {item.title}
                        </div>
                        <div className="text-xs text-stone-600 mt-0.5">{item.subtitle}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }

        if (sec.section_type === 'story_and_work') {
          const workHeading = String(sec.config?.workHeading || 'Our Work');
          const workSub = String(sec.config?.workSubheading || 'Making a difference where it matters most.');
          return (
            <section
              key={sec.id}
              className="py-8 sm:py-10"
              style={{ backgroundColor: sec.bg_color || pageBg }}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0 items-center lg:divide-x lg:divide-stone-200">
                {/* Left: Our Story */}
                <div className="lg:col-span-6 lg:pr-8 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                  <div className="sm:col-span-6 relative">
                    <div className="relative rounded-2xl overflow-hidden shadow-md border border-stone-100 aspect-[4/3] bg-stone-100">
                      <SafeImage src={sec.image_url} alt={sec.title} className="w-full h-full object-cover" />
                      <svg
                        viewBox="0 0 60 200"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute right-0 inset-y-0 h-full w-8"
                        aria-hidden="true"
                      >
                        <path d="M52,0 C18,55 18,145 52,200 L60,200 L60,0 Z" fill="#0099A8" opacity="0.92" />
                        <path d="M56,0 C24,55 24,145 56,200 L60,200 L60,0 Z" fill="#F57C00" opacity="0.95" />
                      </svg>
                    </div>
                  </div>
                  <div className="sm:col-span-6 space-y-3.5">
                    <h2 className="font-display text-3xl sm:text-[36px] font-bold leading-tight" style={{ color: primaryColor }}>
                      {sec.title}
                    </h2>
                    <p className="text-stone-600 leading-relaxed text-sm">{sec.body_text}</p>
                    {sec.cta_label && (
                      <div className="pt-1">
                        <a
                          href={sec.cta_link || '/about-us'}
                          onClick={(e) => go(e, sec.cta_link || '/about-us')}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <span>{sec.cta_label}</span>
                          <ArrowRight className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Our Work Programmes (4 bright pastel vertical cards) */}
                <div className="lg:col-span-6 lg:pl-8 space-y-4">
                  <div>
                    <h2 className="font-display text-3xl sm:text-[36px] font-bold leading-tight" style={{ color: secondaryColor }}>
                      {workHeading}
                    </h2>
                    <p className="text-sm text-stone-600 mt-0.5">{workSub}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {programmes.slice(0, 4).map((prog, idx) => (
                      <a
                        key={prog.id}
                        href="/our-work"
                        onClick={(e) => go(e, '/our-work')}
                        className={`border rounded-2xl px-3 py-5 flex flex-col items-center justify-center text-center gap-3 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all ${
                          PASTEL_WORK_STYLES[idx % PASTEL_WORK_STYLES.length]
                        }`}
                      >
                        <ProgrammeEmblem slug={prog.slug} iconName={prog.icon_name} />
                        <span className="text-xs sm:text-[13px] font-semibold text-stone-800 leading-snug">
                          {prog.title}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        }

        if (sec.section_type === 'mission_vision') {
          const welcomeMsg = String(sec.config?.welcomeMessage || sec.body_text || '');
          const mission = String(sec.config?.missionStatement || '');
          const vision = String(sec.config?.visionStatement || '');
          return (
            <section key={sec.id} className="py-12" style={{ backgroundColor: sec.bg_color || '#FFFFFF' }}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-stone-200 aspect-[4/3]">
                  <SafeImage src={sec.image_url} alt={sec.title} className="w-full h-full object-cover" />
                </div>
                <div className="lg:col-span-7 space-y-5">
                  <h2 className="font-display text-3xl font-bold" style={{ color: primaryColor }}>{sec.title}</h2>
                  {welcomeMsg && <p className="text-stone-600 leading-relaxed">{welcomeMsg}</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {mission && (
                      <div className="p-5 rounded-xl bg-[#F8FAFC] border border-stone-200 space-y-1.5">
                        <div className="text-xs font-semibold tracking-wide" style={{ color: secondaryColor }}>Our Mission</div>
                        <p className="text-sm text-stone-700 leading-relaxed">{mission}</p>
                      </div>
                    )}
                    {vision && (
                      <div className="p-5 rounded-xl bg-[#F8FAFC] border border-stone-200 space-y-1.5">
                        <div className="text-xs font-semibold tracking-wide" style={{ color: primaryColor }}>Our Vision</div>
                        <p className="text-sm text-stone-700 leading-relaxed">{vision}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        }

        if (sec.section_type === 'initiatives') {
          const cards =
            (sec.config?.cards as Array<{
              title: string;
              description: string;
              ctaLabel: string;
              ctaLink: string;
              color: string;
            }>) || [];
          return (
            <section key={sec.id} className="pt-4 pb-12" style={{ backgroundColor: sec.bg_color || pageBg }}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {cards.map((card, i) => {
                    // Card 0: Bright soft-plum card with framed Christmas photo + CTA
                    if (i === 0) {
                      const poster = christmasCampaign?.poster_url || sec.image_url;
                      return (
                        <div
                          key={i}
                          className="rounded-2xl bg-[#FDF7FB] border border-[#EAD5E3] shadow-xs hover:shadow-md transition-shadow min-h-[205px] p-5 flex items-center gap-4"
                        >
                          {poster && (
                            <div className="w-28 sm:w-32 h-36 rounded-xl overflow-hidden border border-[#EAD5E3] shrink-0 bg-white">
                              <SafeImage
                                src={poster}
                                alt={card.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="space-y-2.5 flex-1">
                            <h3 className="font-display text-xl font-bold leading-tight" style={{ color: primaryColor }}>
                              {card.title}
                            </h3>
                            <p className="text-xs sm:text-[13px] text-stone-600 leading-relaxed line-clamp-3">
                              {card.description}
                            </p>
                            <div className="pt-1">
                              <a
                                href={card.ctaLink || '/events-campaigns'}
                                onClick={(e) => go(e, card.ctaLink || '/events-campaigns')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white shadow-xs hover:opacity-95 transition-opacity"
                                style={{ backgroundColor: primaryColor }}
                              >
                                <span>{card.ctaLabel || 'View Programme'}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Card 1: Bright soft-aqua card with teal RaisedHandsGraphic
                    if (i === 1) {
                      return (
                        <div
                          key={i}
                          className="rounded-2xl bg-[#F0FDFA] border border-[#B2EBF2] shadow-xs hover:shadow-md transition-shadow min-h-[205px] p-6 flex items-center gap-4"
                        >
                          <RaisedHandsGraphic color={secondaryColor} />
                          <div className="space-y-2.5 flex-1">
                            <h3 className="font-display text-xl font-bold leading-tight" style={{ color: secondaryColor }}>
                              {card.title}
                            </h3>
                            <p className="text-xs sm:text-[13px] text-stone-600 leading-relaxed">{card.description}</p>
                            <div className="pt-1">
                              <a
                                href={card.ctaLink || '/get-involved'}
                                onClick={(e) => go(e, card.ctaLink || '/get-involved')}
                                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-white text-xs font-semibold shadow-xs hover:opacity-95 transition-opacity"
                                style={{ backgroundColor: secondaryColor }}
                              >
                                <span>{card.ctaLabel || 'Join Us'}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Card 2+: Bright warm-ivory card with orange HandshakeGraphic
                    return (
                      <div
                        key={i}
                        className="rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] shadow-xs hover:shadow-md transition-shadow min-h-[205px] p-6 flex items-center gap-4"
                      >
                        <HandshakeGraphic color={accentColor} />
                        <div className="space-y-2.5 flex-1">
                          <h3 className="font-display text-xl font-bold leading-tight" style={{ color: primaryColor }}>
                            {card.title}
                          </h3>
                          <p className="text-xs sm:text-[13px] text-stone-600 leading-relaxed">{card.description}</p>
                          <div className="pt-1">
                            <a
                              href={card.ctaLink || '/donate'}
                              onClick={(e) => go(e, card.ctaLink || '/donate')}
                              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-white text-xs font-semibold shadow-xs hover:opacity-95 transition-opacity"
                              style={{ backgroundColor: accentColor }}
                            >
                              <span>{card.ctaLabel || 'Give Hope Today'}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        }

        // Custom optional sections created by admins
        return (
          <section key={sec.id} className="py-12" style={{ backgroundColor: sec.bg_color || '#FAF5EE' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white border border-stone-200 rounded-2xl p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className={`${sec.image_url ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
                  <h2 className="font-display text-3xl font-bold text-[#4A0E36]">{sec.title}</h2>
                  {sec.subtitle && <p className="text-base text-[#0E7C7B] font-medium">{sec.subtitle}</p>}
                  {sec.body_text && <p className="text-stone-700 leading-relaxed whitespace-pre-line">{sec.body_text}</p>}
                  {sec.cta_label && sec.cta_link && (
                    <a
                      href={sec.cta_link}
                      onClick={(e) => go(e, sec.cta_link)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[#F38B1C]"
                    >
                      <span>{sec.cta_label}</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {sec.image_url && (
                  <div className="lg:col-span-5 rounded-xl overflow-hidden aspect-[4/3]">
                    <SafeImage src={sec.image_url} alt={sec.title} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })}

      {/* Additional Non-Christmas Featured Campaigns (when admins create & feature extra campaigns) */}
      {extraFeaturedCampaigns.length > 0 && (
        <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-3xl font-bold text-[#4A0E36]">Featured Initiatives & Campaigns</h2>
              <p className="text-sm text-stone-600 mt-1">Current and upcoming seasonal charitable drives.</p>
            </div>
            <a
              href="/events-campaigns"
              onClick={(e) => go(e, '/events-campaigns')}
              className="text-sm font-semibold text-[#0E7C7B] hover:underline inline-flex items-center gap-1"
            >
              <span>View All Campaigns</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {extraFeaturedCampaigns.map((camp) => (
              <div key={camp.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden flex flex-col">
                <div className="aspect-[16/10] overflow-hidden">
                  <SafeImage src={camp.poster_url} alt={camp.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="text-xs text-stone-500 flex items-center gap-2">
                      <span className="capitalize font-medium text-[#0E7C7B]">{camp.status}</span>
                      {camp.start_date && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{formatDateShort(camp.start_date)}</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-display text-xl font-bold text-[#4A0E36]">{camp.title}</h3>
                    <p className="text-sm text-stone-600 leading-relaxed">{camp.summary}</p>
                  </div>
                  {donationsUnlocked && camp.fundraising_target_cents > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-stone-100">
                      <div className="flex justify-between text-xs font-medium tabular-nums">
                        <span className="text-[#0E7C7B]">
                          {formatCurrency(camp.verified_raised_cents || 0, camp.currency)} verified
                        </span>
                        <span className="text-stone-500">
                          Goal: {formatCurrency(camp.fundraising_target_cents, camp.currency)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className="h-full bg-[#0E7C7B]"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(((camp.verified_raised_cents || 0) / camp.fundraising_target_cents) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Published Testimonials / Impact Stories (only rendered when real records exist) */}
      {(testimonials.some((t) => t.is_featured) || impactStories.some((s) => s.is_featured)) && (
        <section className="py-12 bg-white border-t border-stone-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <h2 className="font-display text-3xl font-bold text-[#4A0E36]">Community Voices & Stories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials
                .filter((t) => t.is_featured)
                .map((t) => (
                  <div key={`t-${t.id}`} className="bg-[#FAF5EE] border border-stone-200 rounded-2xl p-6 space-y-4">
                    <p className="text-sm text-stone-700 italic leading-relaxed">"{t.quote}"</p>
                    <div className="flex items-center gap-3 pt-2">
                      {t.photo_url && (
                        <SafeImage src={t.photo_url} alt={t.author_name} className="w-10 h-10 rounded-full object-cover" />
                      )}
                      <div>
                        <div className="text-sm font-semibold text-[#4A0E36]">{t.author_name}</div>
                        {t.role_or_context && <div className="text-xs text-stone-500">{t.role_or_context}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              {impactStories
                .filter((s) => s.is_featured)
                .map((s) => (
                  <div key={`s-${s.id}`} className="bg-[#FAF5EE] border border-stone-200 rounded-2xl overflow-hidden">
                    {s.photo_url && <SafeImage src={s.photo_url} alt={s.title} className="w-full h-44 object-cover" />}
                    <div className="p-6 space-y-2">
                      <h3 className="font-display text-lg font-bold text-[#4A0E36]">{s.title}</h3>
                      <p className="text-sm text-stone-700 leading-relaxed">{s.summary}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

// ---------------- ABOUT US VIEW ----------------
const AboutView: React.FC<{ data: PublicBootstrapData; go: (e: React.MouseEvent, target: string) => void }> = ({
  data,
  go,
}) => {
  const page = data.pages.find((p) => p.slug === 'about-us');
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-4">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#4A0E36]">
            {page?.title || 'About BraidsofHope'}
          </h1>
          <p className="text-lg text-stone-600 leading-relaxed">{page?.subtitle}</p>
          <a
            href="/get-involved"
            onClick={(e) => go(e, '/get-involved')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0E7C7B] text-white text-sm font-semibold"
          >
            <span>Get Involved With Us</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        {page?.hero_image_url && (
          <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-stone-200 aspect-[4/3]">
            <SafeImage src={page.hero_image_url} alt={page.title} className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(page?.blocks || []).map((block) => (
          <div key={block.id} className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-3">
            <h2 className="font-display text-2xl font-bold text-[#4A0E36]">{block.heading}</h2>
            <p className="text-stone-700 leading-relaxed whitespace-pre-line">{block.body}</p>
          </div>
        ))}
      </div>

      {data.teamMembers.length > 0 && (
        <section className="space-y-6 pt-4">
          <h2 className="font-display text-3xl font-bold text-[#4A0E36]">Our Team & Leadership</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.teamMembers.map((member) => (
              <div key={member.id} className="bg-white border border-stone-200 rounded-2xl p-6 space-y-3">
                {member.photo_url && (
                  <SafeImage
                    src={member.photo_url}
                    alt={member.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                )}
                <div>
                  <h3 className="font-display text-xl font-bold text-[#4A0E36]">{member.name}</h3>
                  <div className="text-xs font-medium text-[#0E7C7B]">
                    {member.role_title} · {member.category}
                  </div>
                </div>
                {member.bio && <p className="text-sm text-stone-600 leading-relaxed">{member.bio}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

// ---------------- OUR WORK VIEW ----------------
const OurWorkView: React.FC<{ data: PublicBootstrapData; go: (e: React.MouseEvent, target: string) => void }> = ({
  data,
  go,
}) => {
  const page = data.pages.find((p) => p.slug === 'our-work');
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="max-w-3xl space-y-3">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#4A0E36]">{page?.title || 'Our Work'}</h1>
        <p className="text-lg text-stone-600">{page?.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {data.programmes.map((prog) => {
          const Icon = ICON_MAP[prog.icon_name] || HeartHandshake;
          return (
            <div key={prog.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden flex flex-col">
              {prog.image_url && (
                <div className="aspect-[16/9] overflow-hidden">
                  <SafeImage src={prog.image_url} alt={prog.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FAF5EE] text-[#4A0E36] flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="font-display text-2xl font-bold text-[#4A0E36]">{prog.title}</h2>
                  </div>
                  <p className="text-stone-700 leading-relaxed">{prog.full_description || prog.short_description}</p>
                  {prog.supporting_info && (
                    <p className="text-xs text-stone-500 border-t border-stone-100 pt-3">{prog.supporting_info}</p>
                  )}
                </div>
                {prog.cta_label && (
                  <div>
                    <a
                      href={prog.cta_link || '/get-involved'}
                      onClick={(e) => go(e, prog.cta_link || '/get-involved')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0E7C7B] text-white text-sm font-semibold hover:opacity-95"
                    >
                      <span>{prog.cta_label}</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------- GET INVOLVED VIEW ----------------
const GetInvolvedView: React.FC<{ data: PublicBootstrapData; go: (e: React.MouseEvent, target: string) => void }> = ({
  data,
}) => {
  const [volForm, setVolForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    city_country: '',
    availability: '',
    skills_interests: '',
    opportunity_title: data.volunteerOpportunities[0]?.title || '',
    message: '',
  });
  const [volStatus, setVolStatus] = useState<{ state: 'idle' | 'submitting' | 'ok' | 'err'; msg: string }>({
    state: 'idle',
    msg: '',
  });

  const [partForm, setPartForm] = useState({
    organization_name: '',
    contact_name: '',
    email: '',
    phone: '',
    partnership_type: 'Community Partner',
    message: '',
  });
  const [partStatus, setPartStatus] = useState<{ state: 'idle' | 'submitting' | 'ok' | 'err'; msg: string }>({
    state: 'idle',
    msg: '',
  });

  const submitVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    setVolStatus({ state: 'submitting', msg: '' });
    try {
      const res = await apiFetch<{ message: string }>('/api/public/volunteer', {
        method: 'POST',
        body: JSON.stringify(volForm),
      });
      setVolStatus({ state: 'ok', msg: res.message });
      setVolForm({
        full_name: '',
        email: '',
        phone: '',
        city_country: '',
        availability: '',
        skills_interests: '',
        opportunity_title: data.volunteerOpportunities[0]?.title || '',
        message: '',
      });
    } catch (err) {
      setVolStatus({ state: 'err', msg: err instanceof Error ? err.message : 'Submission failed.' });
    }
  };

  const submitPartnership = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartStatus({ state: 'submitting', msg: '' });
    try {
      const res = await apiFetch<{ message: string }>('/api/public/partnership', {
        method: 'POST',
        body: JSON.stringify(partForm),
      });
      setPartStatus({ state: 'ok', msg: res.message });
      setPartForm({
        organization_name: '',
        contact_name: '',
        email: '',
        phone: '',
        partnership_type: 'Community Partner',
        message: '',
      });
    } catch (err) {
      setPartStatus({ state: 'err', msg: err instanceof Error ? err.message : 'Submission failed.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="max-w-3xl space-y-3">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#4A0E36]">Get Involved</h1>
        <p className="text-lg text-stone-600">
          Join BraidsofHope as a volunteer or partner organization to strengthen community support for children and families.
        </p>
      </div>

      {/* Volunteer Opportunities */}
      {data.volunteerOpportunities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.volunteerOpportunities.map((opp) => (
            <div key={opp.id} className="bg-white border border-stone-200 rounded-2xl p-6 space-y-2">
              <div className="text-xs text-[#0E7C7B] font-medium">
                {opp.location} · {opp.commitment}
              </div>
              <h2 className="font-display text-xl font-bold text-[#4A0E36]">{opp.title}</h2>
              <p className="text-sm text-stone-600 leading-relaxed">{opp.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Two Real Submission Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Volunteer Application Form */}
        <form onSubmit={submitVolunteer} className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="font-display text-2xl font-bold text-[#4A0E36]">Volunteer Registration</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={volForm.full_name}
                onChange={(e) => setVolForm({ ...volForm, full_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={volForm.email}
                onChange={(e) => setVolForm({ ...volForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Phone</label>
              <input
                type="text"
                value={volForm.phone}
                onChange={(e) => setVolForm({ ...volForm, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">City & Country</label>
              <input
                type="text"
                value={volForm.city_country}
                onChange={(e) => setVolForm({ ...volForm, city_country: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Opportunity Interest</label>
              <input
                type="text"
                value={volForm.opportunity_title}
                onChange={(e) => setVolForm({ ...volForm, opportunity_title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Availability</label>
              <input
                type="text"
                placeholder="Weekends, evenings, event days..."
                value={volForm.availability}
                onChange={(e) => setVolForm({ ...volForm, availability: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Skills & Message</label>
            <textarea
              rows={3}
              value={volForm.message}
              onChange={(e) => setVolForm({ ...volForm, message: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
            />
          </div>
          {volStatus.msg && (
            <p className={`text-sm ${volStatus.state === 'err' ? 'text-red-600' : 'text-emerald-700'}`}>
              {volStatus.msg}
            </p>
          )}
          <button
            type="submit"
            disabled={volStatus.state === 'submitting'}
            className="px-6 py-2.5 rounded-full bg-[#0E7C7B] text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60"
          >
            {volStatus.state === 'submitting' ? 'Submitting...' : 'Submit Volunteer Application'}
          </button>
        </form>

        {/* Partnership Enquiry Form */}
        <form onSubmit={submitPartnership} className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="font-display text-2xl font-bold text-[#4A0E36]">Partnership Enquiry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Organization Name *</label>
              <input
                type="text"
                required
                value={partForm.organization_name}
                onChange={(e) => setPartForm({ ...partForm, organization_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Contact Name *</label>
              <input
                type="text"
                required
                value={partForm.contact_name}
                onChange={(e) => setPartForm({ ...partForm, contact_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={partForm.email}
                onChange={(e) => setPartForm({ ...partForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Partnership Type</label>
              <select
                value={partForm.partnership_type}
                onChange={(e) => setPartForm({ ...partForm, partnership_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
              >
                <option>Community Partner</option>
                <option>Corporate / Food Sponsor</option>
                <option>School / Faith Group</option>
                <option>Grant / Foundation</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Partnership Proposal / Message</label>
            <textarea
              rows={4}
              value={partForm.message}
              onChange={(e) => setPartForm({ ...partForm, message: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
            />
          </div>
          {partStatus.msg && (
            <p className={`text-sm ${partStatus.state === 'err' ? 'text-red-600' : 'text-emerald-700'}`}>
              {partStatus.msg}
            </p>
          )}
          <button
            type="submit"
            disabled={partStatus.state === 'submitting'}
            className="px-6 py-2.5 rounded-full bg-[#4A0E36] text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60"
          >
            {partStatus.state === 'submitting' ? 'Submitting...' : 'Submit Partnership Enquiry'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ---------------- EVENTS & CAMPAIGNS VIEW ----------------
const EventsCampaignsView: React.FC<{ data: PublicBootstrapData; go: (e: React.MouseEvent, target: string) => void }> = ({
  data,
  go,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="max-w-3xl space-y-3">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#4A0E36]">Events & Campaigns</h1>
        <p className="text-lg text-stone-600">
          Community fundraising drives, seasonal outreach programmes, and upcoming events.
        </p>
      </div>

      {/* Campaigns */}
      <section className="space-y-6">
        <h2 className="font-display text-2xl font-bold text-[#4A0E36]">Fundraising Programmes & Campaigns</h2>
        {data.campaigns.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-stone-600 text-sm">
            No published campaigns at this time. Please check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.campaigns.map((c) => (
              <div key={c.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden flex flex-col">
                {c.poster_url && (
                  <div className="aspect-[16/9] overflow-hidden">
                    <SafeImage src={c.poster_url} alt={c.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-xs text-stone-500 flex items-center gap-2">
                      <span className="capitalize font-semibold text-[#0E7C7B]">{c.status}</span>
                      {c.is_christmas_programme && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Seasonal Programme</span>
                        </>
                      )}
                      {c.start_date && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{formatDateShort(c.start_date)}</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-display text-2xl font-bold text-[#4A0E36]">{c.title}</h3>
                    <p className="text-sm text-stone-700 leading-relaxed">{c.description || c.summary}</p>
                  </div>
                  {data.donationsUnlocked && c.fundraising_target_cents > 0 && (
                    <div className="pt-4 border-t border-stone-100 space-y-2">
                      <div className="flex justify-between text-xs font-semibold tabular-nums">
                        <span className="text-[#0E7C7B]">
                          Raised: {formatCurrency(c.verified_raised_cents || 0, c.currency)}
                        </span>
                        <span className="text-stone-600">
                          Target: {formatCurrency(c.fundraising_target_cents, c.currency)}
                        </span>
                      </div>
                      <a
                        href="/donate"
                        onClick={(e) => go(e, '/donate')}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#F38B1C] text-white text-xs font-semibold"
                      >
                        <span>Support Campaign</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Events */}
      <section className="space-y-6">
        <h2 className="font-display text-2xl font-bold text-[#4A0E36]">Upcoming Events</h2>
        {data.events.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-stone-600 text-sm">
            No upcoming public events are scheduled right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.events.map((ev) => (
              <div key={ev.id} className="bg-white border border-stone-200 rounded-2xl p-6 space-y-3">
                <div className="text-xs text-[#0E7C7B] font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{ev.event_date ? formatDateShort(ev.event_date) : 'Date TBA'}</span>
                </div>
                <h3 className="font-display text-xl font-bold text-[#4A0E36]">{ev.title}</h3>
                {ev.location && (
                  <div className="text-xs text-stone-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{ev.location}</span>
                  </div>
                )}
                <p className="text-sm text-stone-600 leading-relaxed">{ev.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// ---------------- DONATE VIEW ----------------
const DonateView: React.FC<{ data: PublicBootstrapData; go: (e: React.MouseEvent, target: string) => void }> = ({
  data,
  go,
}) => {
  const [form, setForm] = useState({
    campaign_id: data.campaigns[0]?.id ? String(data.campaigns[0].id) : '',
    donor_name: '',
    donor_email: '',
    amount_dollars: '50',
    payment_method: 'bank_transfer',
    transaction_ref: '',
  });
  const [status, setStatus] = useState<{ state: 'idle' | 'submitting' | 'ok' | 'err'; msg: string }>({
    state: 'idle',
    msg: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ state: 'submitting', msg: '' });
    try {
      const res = await apiFetch<{ message: string }>('/api/public/donations', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setStatus({ state: 'ok', msg: res.message });
    } catch (err) {
      setStatus({ state: 'err', msg: err instanceof Error ? err.message : 'Unable to submit donation.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
      <div className="space-y-3">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#4A0E36]">Support BraidsofHope</h1>
        <p className="text-lg text-stone-600">
          Every act of generosity helps sustain food support, essential items, and care for children and families.
        </p>
      </div>

      {!data.donationsUnlocked ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-8 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#FAF5EE] text-[#4A0E36] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-[#4A0E36]">
                Online Payment Processing Coming Soon
              </h2>
              <p className="text-stone-700 leading-relaxed text-sm sm:text-base">
                The advanced online donation portal is not yet enabled on this deployment. To support BraidsofHope
                programmes, food drives, or in-kind essential contributions, please reach out directly to our team.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="/contact-us"
              onClick={(e) => go(e, '/contact-us')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#4A0E36] text-white text-sm font-semibold"
            >
              <span>Contact Our Team</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/get-involved"
              onClick={(e) => go(e, '/get-involved')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-stone-300 text-stone-800 text-sm font-semibold hover:bg-stone-50"
            >
              <span>Volunteer or Partner</span>
            </a>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-5">
          <h2 className="font-display text-2xl font-bold text-[#4A0E36]">Make a Contribution</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Full Name</label>
              <input
                type="text"
                value={form.donor_name}
                onChange={(e) => setForm({ ...form, donor_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={form.donor_email}
                onChange={(e) => setForm({ ...form, donor_email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Amount ({data.siteSettings?.default_currency || 'CAD'}) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={form.amount_dollars}
                onChange={(e) => setForm({ ...form, amount_dollars: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Campaign Designation</label>
              <select
                value={form.campaign_id}
                onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
              >
                <option value="">General Charitable Fund</option>
                {data.campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Payment Method</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
              >
                <option value="bank_transfer">Manual Bank Transfer / E-Transfer</option>
                <option value="card">Card / Online Payment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Transfer Reference (if bank transfer)
              </label>
              <input
                type="text"
                value={form.transaction_ref}
                onChange={(e) => setForm({ ...form, transaction_ref: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
          </div>
          {status.msg && (
            <p className={`text-sm ${status.state === 'err' ? 'text-red-600' : 'text-emerald-700'}`}>{status.msg}</p>
          )}
          <button
            type="submit"
            disabled={status.state === 'submitting'}
            className="px-7 py-3 rounded-full bg-[#F38B1C] text-white text-sm font-semibold hover:opacity-95"
          >
            {status.state === 'submitting' ? 'Processing...' : 'Record Donation'}
          </button>
        </form>
      )}
    </div>
  );
};

// ---------------- CONTACT VIEW ----------------
const ContactView: React.FC<{ data: PublicBootstrapData }> = ({ data }) => {
  const { siteSettings } = data;
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    region: 'Canada',
    message: '',
  });
  const [status, setStatus] = useState<{ state: 'idle' | 'submitting' | 'ok' | 'err'; msg: string }>({
    state: 'idle',
    msg: '',
  });

  const submitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ state: 'submitting', msg: '' });
    try {
      const res = await apiFetch<{ message: string }>('/api/public/contact', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setStatus({ state: 'ok', msg: res.message });
      setForm({ name: '', email: '', phone: '', subject: '', region: 'Canada', message: '' });
    } catch (err) {
      setStatus({ state: 'err', msg: err instanceof Error ? err.message : 'Unable to send message.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-5 space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-bold text-[#4A0E36]">Contact Us</h1>
          <p className="text-stone-600">
            Reach our charitable coordination offices in Canada and Nigeria.
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 text-sm">
          {siteSettings?.contact_email && (
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-[#0E7C7B] mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-stone-800">Official Email</div>
                <div className="text-stone-600">{siteSettings.contact_email}</div>
              </div>
            </div>
          )}
          {siteSettings?.phone && (
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-[#0E7C7B] mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-stone-800">Phone</div>
                <div className="text-stone-600">{siteSettings.phone}</div>
              </div>
            </div>
          )}
          {siteSettings?.edmonton_contact && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#4A0E36] mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-stone-800">Edmonton, Canada</div>
                <div className="text-stone-600">{siteSettings.edmonton_contact}</div>
              </div>
            </div>
          )}
          {siteSettings?.nigeria_contact && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#F38B1C] mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-stone-800">Nigeria Outreach</div>
                <div className="text-stone-600">{siteSettings.nigeria_contact}</div>
              </div>
            </div>
          )}
          {siteSettings?.business_hours && (
            <div className="pt-2 border-t border-stone-100 text-xs text-stone-500">
              Hours: {siteSettings.business_hours}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-7">
        {siteSettings?.contact_form_enabled === false ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-8 text-stone-600 text-sm">
            Online contact form submissions are temporarily paused. Please reach us directly at{' '}
            {siteSettings.contact_email}.
          </div>
        ) : (
          <form onSubmit={submitContact} className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="font-display text-2xl font-bold text-[#4A0E36]">Send a Message</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Region</label>
                <select
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white"
                >
                  <option value="Canada">Canada (Edmonton / National)</option>
                  <option value="Nigeria">Nigeria Outreach</option>
                  <option value="International">International</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Message *</label>
              <textarea
                rows={4}
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm"
              />
            </div>
            {status.msg && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  status.state === 'err' ? 'text-red-600' : 'text-emerald-700'
                }`}
              >
                {status.state === 'ok' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{status.msg}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={status.state === 'submitting'}
              className="px-6 py-2.5 rounded-full bg-[#4A0E36] text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60"
            >
              {status.state === 'submitting' ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
