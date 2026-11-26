/**
 * Flat-vector travel art: Pia, a plane, an aeroplane window and a set of
 * small travel icons, all in the site palette. No outlines, solid shapes.
 */
import type React from 'react';

export function PiaFlat({ className = '', wave = true, title = 'Pia, your guide' }: { className?: string; wave?: boolean; title?: string }) {
  return (
    <svg viewBox="0 0 200 300" className={className} role="img" aria-label={title}>
      <ellipse cx="100" cy="292" rx="52" ry="7" fill="#24123D" opacity=".12" />
      {/* legs + shoes */}
      <rect x="78" y="200" width="16" height="80" rx="6" fill="#3B2A86" />
      <rect x="104" y="200" width="16" height="80" rx="6" fill="#3B2A86" />
      <rect x="70" y="276" width="28" height="12" rx="6" fill="#24123D" />
      <rect x="102" y="276" width="28" height="12" rx="6" fill="#24123D" />
      {/* jacket */}
      <path d="M62 120 Q100 100 138 120 L146 214 H54Z" fill="#E8466F" />
      <path d="M100 118 V214" stroke="#B8325A" strokeWidth="3" />
      {/* map arm */}
      <path d="M138 128 Q160 160 150 186" stroke="#E8466F" strokeWidth="18" strokeLinecap="round" fill="none" />
      <g transform="translate(132 168) rotate(-8)">
        <rect width="52" height="38" rx="3" fill="#FFF4E6" />
        <rect x="17" width="2" height="38" fill="#E6D7C3" />
        <rect x="34" width="2" height="38" fill="#E6D7C3" />
        <path d="M6 28 q10 -14 20 -6 t20 -12" stroke="#7A63E0" strokeWidth="3" fill="none" strokeDasharray="4 3" />
        <circle cx="44" cy="10" r="4" fill="#E8466F" />
      </g>
      <circle cx="150" cy="186" r="9" fill="#B5754F" />
      {/* waving arm */}
      <g className={wave ? 'pia-wave-flat' : ''}>
        <path d="M64 128 Q38 110 40 76" stroke="#E8466F" strokeWidth="18" strokeLinecap="round" fill="none" />
        <circle cx="40" cy="70" r="10" fill="#B5754F" />
      </g>
      {/* scarf */}
      <path d="M72 112 Q100 128 128 112 L126 126 Q100 140 74 126Z" fill="#FFB703" />
      <path d="M112 126 L120 162 L108 160Z" fill="#FF9F1C" />
      {/* head */}
      <rect x="91" y="92" width="18" height="18" rx="6" fill="#A86B43" />
      <path d="M62 66 Q60 22 100 20 Q140 22 138 66 Q140 96 126 104 H74 Q60 96 62 66Z" fill="#24123D" />
      <ellipse cx="100" cy="70" rx="30" ry="34" fill="#B5754F" />
      <path d="M70 62 Q78 36 100 38 Q124 36 130 62 Q114 48 100 50 Q84 50 70 62Z" fill="#24123D" />
      {/* beret */}
      <path d="M64 46 Q80 14 120 18 Q148 24 140 44 Q108 32 64 46Z" fill="#7A63E0" />
      <circle cx="108" cy="16" r="5" fill="#7A63E0" />
      {/* face */}
      <circle cx="89" cy="72" r="3.6" fill="#24123D" />
      <circle cx="111" cy="72" r="3.6" fill="#24123D" />
      <circle cx="82" cy="84" r="5" fill="#E8466F" opacity=".3" />
      <circle cx="118" cy="84" r="5" fill="#E8466F" opacity=".3" />
      <path d="M92 86 Q100 94 108 86" stroke="#24123D" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function PlaneArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 120" className={className} aria-hidden>
      <path d="M30 70 Q20 60 34 56 L250 50 Q300 50 312 66 Q300 80 250 80 L40 82 Q24 82 30 70Z" fill="#FFFFFF" />
      <path d="M40 74 L300 70 Q292 80 250 80 L40 82Z" fill="#E6E0F2" />
      <path d="M34 56 L10 18 H32 L78 56Z" fill="#E8466F" />
      <path d="M120 66 L200 66 L150 112 H128Z" fill="#7A63E0" />
      <path d="M140 54 L190 54 L160 30 H146Z" fill="#9C8CE8" />
      {[90, 110, 130, 150, 170, 190, 210, 230].map((x) => (
        <rect key={x} x={x} y="58" width="9" height="7" rx="3" fill="#3B2A86" />
      ))}
      <path d="M270 56 Q296 56 304 64 L270 64Z" fill="#3B2A86" />
      <rect x="150" y="88" width="34" height="14" rx="7" fill="#FFB703" />
    </svg>
  );
}

export function WindowArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 320" className={className} aria-hidden>
      <defs>
        <clipPath id="win-clip">
          <rect x="30" y="30" width="180" height="260" rx="90" />
        </clipPath>
        <linearGradient id="win-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6C4CF5" />
          <stop offset="1" stopColor="#B9A6F7" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="240" height="320" rx="120" fill="#FFD3B0" />
      <rect x="14" y="14" width="212" height="292" rx="106" fill="#FFE8D2" />
      <g clipPath="url(#win-clip)">
        <rect x="30" y="30" width="180" height="260" fill="url(#win-sky)" />
        <path d="M30 220 Q70 190 110 210 Q150 180 210 205 V290 H30Z" fill="#FFF4E6" />
        <path d="M30 250 Q90 225 140 245 Q180 230 210 240 V290 H30Z" fill="#FFFFFF" />
        <path d="M60 170 L210 120 L210 150 L90 190Z" fill="#E6DCCB" />
        <path d="M60 170 L90 190 L74 194Z" fill="#24123D" />
        <path d="M188 124 L204 92 L214 118Z" fill="#FF7A1A" />
      </g>
    </svg>
  );
}

const ICONS: Record<string, React.ReactElement> = {
  pin: (
    <>
      <path d="M32 6 C18 6 10 16 10 28 C10 44 32 60 32 60 C32 60 54 44 54 28 C54 16 46 6 32 6Z" fill="#E8466F" />
      <circle cx="32" cy="27" r="9" fill="#FFF4E6" />
    </>
  ),
  ticket: (
    <>
      <path d="M6 18 H58 V28 Q52 32 58 36 V46 H6 V36 Q12 32 6 28Z" fill="#FFB703" />
      <rect x="40" y="18" width="2" height="28" fill="#FF9F1C" />
      <rect x="12" y="25" width="22" height="4" rx="2" fill="#24123D" />
      <rect x="12" y="33" width="14" height="4" rx="2" fill="#24123D" opacity=".5" />
    </>
  ),
  passport: (
    <>
      <rect x="14" y="6" width="36" height="52" rx="5" fill="#7A63E0" />
      <circle cx="32" cy="28" r="9" fill="none" stroke="#FFB703" strokeWidth="3" />
      <rect x="22" y="44" width="20" height="3" rx="1.5" fill="#FFB703" />
    </>
  ),
  globe: (
    <>
      <circle cx="32" cy="32" r="24" fill="#6C4CF5" />
      <path d="M18 22 Q26 18 30 24 Q26 32 18 30Z M34 34 Q44 30 46 40 Q40 50 34 44Z M36 14 Q44 16 44 22 Q38 24 36 20Z" fill="#2FA58A" />
    </>
  ),
  suitcase: (
    <>
      <rect x="10" y="18" width="44" height="36" rx="6" fill="#FF7A1A" />
      <rect x="24" y="10" width="16" height="10" rx="3" fill="none" stroke="#24123D" strokeWidth="3" />
      <rect x="22" y="18" width="4" height="36" fill="#E85F00" />
      <rect x="38" y="18" width="4" height="36" fill="#E85F00" />
    </>
  ),
  camera: (
    <>
      <rect x="8" y="18" width="48" height="34" rx="6" fill="#24123D" />
      <rect x="20" y="12" width="16" height="8" rx="2" fill="#24123D" />
      <circle cx="32" cy="35" r="11" fill="#9C8CE8" />
      <circle cx="32" cy="35" r="5" fill="#3B2A86" />
      <circle cx="48" cy="24" r="2.5" fill="#FFB703" />
    </>
  ),
  compass: (
    <>
      <circle cx="32" cy="32" r="24" fill="#2FA58A" />
      <circle cx="32" cy="32" r="18" fill="#FFF4E6" />
      <path d="M32 16 L37 32 L32 48 L27 32Z" fill="#E8466F" />
      <path d="M32 32 L37 32 L32 48 L27 32Z" fill="#24123D" />
    </>
  ),
  balloon: (
    <>
      <path d="M32 4 C16 4 8 16 8 26 C8 38 24 46 26 50 H38 C40 46 56 38 56 26 C56 16 48 4 32 4Z" fill="#E8466F" />
      <path d="M32 4 C26 10 24 20 26 50 H38 C40 20 38 10 32 4Z" fill="#FFB703" />
      <rect x="25" y="52" width="14" height="10" rx="2" fill="#7A4E3A" />
    </>
  ),
  plane: (
    <path d="M58 30 L36 30 L22 8 H16 L24 30 H12 L6 22 H2 L6 34 L2 46 H6 L12 38 H24 L16 60 H22 L36 38 H58 Q62 34 58 30Z" fill="#7A63E0" />
  ),
};

export function TravelIcon({ name, size = 48, className = '' }: { name: keyof typeof ICONS | string; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      {ICONS[name] || null}
    </svg>
  );
}
