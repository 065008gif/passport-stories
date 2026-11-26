/**
 * Pia the Explorer: the site's guide. A curious young traveller with a beret,
 * a scarf and a hand-drawn map. Original artwork, drawn in SVG so she is tiny
 * (no image download) and sharp at any size.
 *
 * <Pia />           just Pia
 * <PiaSays>…</PiaSays>  Pia with a speech bubble
 */

export function Pia({ size = 120, className = '', wave = false }: { size?: number; className?: string; wave?: boolean }) {
  return (
    <svg viewBox="68 30 200 280" width={size} height={(size * 280) / 200} className={className} role="img" aria-label="Pia, the Passport Stories guide">
      <ellipse cx="150" cy="305" rx="72" ry="8" fill="#24123D" opacity=".12" />
      {/* jacket */}
      <path d="M92 300 Q94 212 150 206 Q206 212 208 300Z" fill="#FF4F7B" />
      <path d="M150 210 L150 300" stroke="#24123D" strokeWidth="3" />
      {/* scarf */}
      <path d="M115 205 Q150 225 185 205 L182 222 Q150 238 118 222Z" fill="#FFB703" />
      <path d="M168 222 l10 40 l-14 -4z" fill="#FFB703" />
      {/* backpack strap */}
      <path d="M108 225 Q104 260 112 298" stroke="#6C4CF5" strokeWidth="9" fill="none" />
      {/* neck, hair, face */}
      <rect x="138" y="185" width="24" height="24" rx="8" fill="#B5754F" />
      <path d="M88 120 Q85 55 150 50 Q215 55 212 120 Q214 160 196 175 L104 175 Q86 160 88 120Z" fill="#24123D" />
      <ellipse cx="150" cy="130" rx="52" ry="58" fill="#C98758" />
      <path d="M98 115 Q110 70 150 72 Q195 70 204 118 Q180 92 150 96 Q122 96 98 115Z" fill="#24123D" />
      {/* beret with a star pin */}
      <path d="M92 86 Q120 38 180 44 Q222 52 210 82 Q160 64 92 86Z" fill="#6C4CF5" />
      <circle cx="160" cy="42" r="6" fill="#6C4CF5" />
      <circle cx="194" cy="74" r="9" fill="#FFB703" />
      <path d="M194 68 l1.8 3.9 4.2.5-3.1 2.9.8 4.2-3.7-2.1-3.7 2.1.8-4.2-3.1-2.9 4.2-.5z" fill="#24123D" />
      {/* eyes, cheeks, smile */}
      <ellipse cx="130" cy="132" rx="7" ry="9" fill="#24123D" />
      <ellipse cx="170" cy="132" rx="7" ry="9" fill="#24123D" />
      <circle cx="132" cy="129" r="2.5" fill="#fff" />
      <circle cx="172" cy="129" r="2.5" fill="#fff" />
      <circle cx="118" cy="152" r="8" fill="#FF4F7B" opacity=".35" />
      <circle cx="182" cy="152" r="8" fill="#FF4F7B" opacity=".35" />
      <path d="M136 158 Q150 172 164 158" stroke="#24123D" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* the map in her hand */}
      <g transform="translate(196 228) rotate(10)">
        <rect width="62" height="46" rx="4" fill="#FFF1E6" stroke="#24123D" strokeWidth="3" />
        <path d="M20 0v46M41 0v46" stroke="#24123D" strokeWidth="2" />
        <path d="M8 30 q10-14 22-6 t22-10" stroke="#FF4F7B" strokeWidth="3" fill="none" strokeDasharray="4 3" />
        <circle cx="50" cy="13" r="4" fill="#06A77D" />
      </g>
      <circle cx="200" cy="250" r="11" fill="#C98758" />
      {/* the other hand, waving */}
      {wave ? (
        <g className="pia-wave">
          <path d="M100 232 Q78 210 84 178" stroke="#FF4F7B" strokeWidth="18" fill="none" strokeLinecap="round" />
          <circle cx="85" cy="170" r="11" fill="#C98758" />
        </g>
      ) : null}
    </svg>
  );
}

export function PiaSays({ children, size = 84, className = '', wave = true }: { children: React.ReactNode; size?: number; className?: string; wave?: boolean }) {
  return (
    <div className={`flex items-end gap-2 ${className}`}>
      <Pia size={size} wave={wave} className="shrink-0" />
      <div className="pia-bubble relative mb-6 max-w-[17rem] rounded-2xl rounded-bl-sm border-2 border-ink bg-white px-3.5 py-2 text-sm font-semibold leading-snug text-ink shadow-[0_4px_0_#24123D]">{children}</div>
    </div>
  );
}
