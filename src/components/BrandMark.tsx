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
    <path
      d="M36 57C36 57 9 40.5 9 21.5C9 12.8 15.8 6.5 24 6.5C29.2 6.5 33.6 9 36 13C38.4 9 42.8 6.5 48 6.5C56.2 6.5 63 12.8 63 21.5C63 40.5 36 57 36 57Z"
      stroke={light ? '#F5D0FE' : '#52154E'}
      strokeWidth="5.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 16C21 9.5 29.5 11.5 35 19.5C40.5 27.5 49.5 29 57 22"
      stroke="#0099A8"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <path
      d="M13 26.5C20 34.5 30.5 36 39 28.5C46 22 54.5 15.5 57.5 14"
      stroke="#F57C00"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <path
      d="M22 40.5C28 46.5 36.5 48 45.5 39.5"
      stroke="#F5B700"
      strokeWidth="5"
      strokeLinecap="round"
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

  const imgHeight = size === 'sm' ? 'h-9' : size === 'lg' ? 'h-16' : 'h-12 sm:h-14';
  const subClass = variant === 'light' ? 'text-white/85' : 'text-[#0099A8]';
  const isDefaultName = !orgName || orgName === 'BraidsofHope';

  if (validLogo) {
    return (
      <div className="inline-flex items-center gap-3 shrink-0">
        <img
          src={validLogo}
          alt={orgName || 'BraidsofHope'}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`${imgHeight} w-auto object-contain rounded-md bg-white/95 px-1`}
        />
        {showTagline && tagline && size !== 'sm' && (
          <span
            className={`hidden xl:inline-block font-display italic text-xs font-medium max-w-[210px] leading-snug ${
              variant === 'light' ? 'text-white/90' : 'text-stone-600'
            }`}
          >
            {tagline}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2.5 shrink-0">
      <WovenHeartSvg
        light={variant === 'light'}
        className={size === 'sm' ? 'w-8 h-8 shrink-0' : size === 'lg' ? 'w-12 h-11 shrink-0' : 'w-11 h-10 shrink-0'}
      />
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
                <span className="text-[#52154E]">Braids</span>
                <span className="text-[#0099A8] font-normal">of</span>
                <span className="text-[#F57C00]">Hope</span>
              </>
            )
          ) : (
            <span className={variant === 'light' ? 'text-white' : 'text-[#52154E]'}>{orgName}</span>
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
  bottomColor = '#FFFFFF',
}) => (
  <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className={className} aria-hidden="true">
    <path
      d="M0,26 C280,74 580,6 920,44 C1160,70 1330,24 1440,12 L1440,90 L0,90 Z"
      fill="#52154E"
      opacity="0.16"
    />
    <path
      d="M0,42 C340,10 690,74 1060,36 C1250,18 1370,38 1440,44 L1440,90 L0,90 Z"
      fill="#0099A8"
      opacity="0.22"
    />
    <path
      d="M0,56 C410,28 820,82 1220,42 C1340,32 1402,46 1440,54 L1440,90 L0,90 Z"
      fill="#F57C00"
      opacity="0.24"
    />
    <path d="M0,72 C480,58 960,80 1440,66 L1440,90 L0,90 Z" fill={bottomColor} />
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
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#52154E]/8 via-[#0099A8]/8 to-[#F57C00]/8 text-[#52154E]/60 ${className}`}
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
