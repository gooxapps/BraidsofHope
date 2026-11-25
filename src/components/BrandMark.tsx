import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { isSafeUrl } from '../lib/api.ts';

interface BrandLogoProps {
  logoUrl?: string;
  orgName: string;
  tagline?: string;
  variant?: 'default' | 'light';
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const WovenHeartSvg: React.FC<{ className?: string; light?: boolean }> = ({
  className = 'w-11 h-10',
  light = false,
}) => (
  <svg viewBox="0 0 72 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    {/* Woven Heart matching BraidsofHope reference mark */}
    <path
      d="M36 57C36 57 9 40.5 9 21.5C9 12.8 15.8 6.5 24 6.5C29.2 6.5 33.6 9 36 13C38.4 9 42.8 6.5 48 6.5C56.2 6.5 63 12.8 63 21.5C63 40.5 36 57 36 57Z"
      stroke={light ? '#F5D0FE' : '#4A0E36'}
      strokeWidth="5.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 16C21 9.5 29.5 11.5 35 19.5C40.5 27.5 49.5 29 57 22"
      stroke="#0E7C7B"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <path
      d="M13 26.5C20 34.5 30.5 36 39 28.5C46 22 54.5 15.5 57.5 14"
      stroke="#F38B1C"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <path
      d="M22 40.5C28 46.5 36.5 48 45.5 39.5"
      stroke="#F5B700"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M26 11C31 15 35 22 39 30"
      stroke="#D9467A"
      strokeWidth="4"
      strokeLinecap="round"
      opacity="0.85"
    />
  </svg>
);

export const BrandLogo: React.FC<BrandLogoProps> = ({
  logoUrl,
  orgName,
  tagline,
  variant = 'default',
  showTagline = false,
  size = 'md',
}) => {
  const [imgError, setImgError] = useState(false);
  const validLogo = isSafeUrl(logoUrl) && !imgError ? logoUrl : '';

  const imgHeight = size === 'sm' ? 'h-8' : size === 'lg' ? 'h-12' : 'h-11';
  const subClass = variant === 'light' ? 'text-[#FAF5EE]/85' : 'text-[#4A0E36]';

  // Render "Braids" in Plum/Light and "of" + "Hope" in Teal/Amber accent matching reference
  const isDefaultName = !orgName || orgName === 'BraidsofHope';

  return (
    <div className="inline-flex items-center gap-2.5 shrink-0">
      {validLogo ? (
        <img
          src={validLogo}
          alt={orgName}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`${imgHeight} w-auto object-contain`}
        />
      ) : (
        <WovenHeartSvg
          light={variant === 'light'}
          className={size === 'sm' ? 'w-8 h-8 shrink-0' : size === 'lg' ? 'w-12 h-11 shrink-0' : 'w-11 h-10 shrink-0'}
        />
      )}
      <div className="flex flex-col">
        <span
          className={`font-display font-bold tracking-tight leading-none whitespace-nowrap ${
            size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-[26px]'
          }`}
        >
          {isDefaultName ? (
            variant === 'light' ? (
              <span className="text-white">
                Braids<span className="font-normal opacity-90">of</span>Hope
              </span>
            ) : (
              <>
                <span className="text-[#4A0E36]">Braids</span>
                <span className="text-[#6B2150] font-normal">of</span>
                <span className="text-[#0E7C7B]">Hope</span>
              </>
            )
          ) : (
            <span className={variant === 'light' ? 'text-white' : 'text-[#4A0E36]'}>{orgName}</span>
          )}
        </span>
        {showTagline && tagline && (
          <span className={`font-display italic text-[11px] font-medium mt-0.5 whitespace-nowrap ${subClass}`}>
            {tagline}
          </span>
        )}
      </div>
    </div>
  );
};

export const WovenRibbonDivider: React.FC<{ className?: string; bottomColor?: string }> = ({
  className = 'w-full h-16',
  bottomColor = '#FAF5EE',
}) => (
  <svg viewBox="0 0 1440 110" preserveAspectRatio="none" className={className} aria-hidden="true">
    <path
      d="M0,38 C280,98 580,8 920,58 C1160,92 1330,36 1440,18 L1440,110 L0,110 Z"
      fill="#7A1C54"
      opacity="0.92"
    />
    <path
      d="M0,58 C340,12 690,94 1060,46 C1250,22 1370,48 1440,56 L1440,110 L0,110 Z"
      fill="#0E7C7B"
      opacity="0.9"
    />
    <path
      d="M0,76 C410,36 820,102 1220,54 C1340,40 1402,58 1440,68 L1440,110 L0,110 Z"
      fill="#F38B1C"
      opacity="0.95"
    />
    <path
      d="M0,92 C460,68 940,104 1440,78 L1440,110 L0,110 Z"
      fill="#F5B700"
      opacity="0.65"
    />
    <path d="M0,98 C480,82 960,102 1440,90 L1440,110 L0,110 Z" fill={bottomColor} />
  </svg>
);

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({ src, alt, className = '', fallbackLabel }) => {
  const [failed, setFailed] = useState(false);

  if (!src || !isSafeUrl(src) || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#4A0E36]/10 via-[#0E7C7B]/10 to-[#F38B1C]/10 text-[#4A0E36]/60 ${className}`}
      >
        <ImageOff className="w-6 h-6 mb-1.5 opacity-60" />
        <span className="text-xs font-medium px-3 text-center">{fallbackLabel || alt || 'Image'}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
