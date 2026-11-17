/**
 * A passport ink stamp, drawn as SVG. The tilt and ink colour are derived
 * from the text, so the same country always gets the same stamp.
 */
const INKS = ['#D9480F', '#06785B', '#0B6FB0', '#6B3FD4']; // strong inks, always shown on a cream page

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function Stamp({
  code,
  name,
  date,
  size = 120,
  label = 'ARRIVED',
}: {
  code: string;
  name: string;
  date?: string;
  size?: number;
  label?: string;
}) {
  const h = hash(code + name);
  const tilt = (h % 19) - 9;
  const ink = INKS[h % INKS.length];
  const shortDate = date
    ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
    : '';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={`${name} stamp${shortDate ? `, ${shortDate}` : ''}`}
      className="stamp-ink"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <g fill="none" stroke={ink}>
        <circle cx="60" cy="60" r="55" strokeWidth="4" />
        <circle cx="60" cy="60" r="47" strokeWidth="1.5" strokeDasharray="2 4" />
        <path d="M22 80h76M26 44h68" strokeWidth="1.2" />
      </g>
      <g fill={ink} textAnchor="middle">
        <text x="60" y="38" fontSize="7.5" letterSpacing="1" fontFamily="'JetBrains Mono Variable', monospace">
          {name.toUpperCase().slice(0, 15)}
        </text>
        <text x="60" y="73" fontSize={code.length > 3 ? 22 : 28} fontFamily="'Bricolage Grotesque Variable', sans-serif" fontWeight="800">
          {code}
        </text>
        <text x="60" y="91" fontSize="7.5" letterSpacing="1" fontFamily="'JetBrains Mono Variable', monospace">
          {shortDate || label}
        </text>
        {shortDate && (
          <text x="60" y="102" fontSize="6" letterSpacing="2" fontFamily="'JetBrains Mono Variable', monospace">
            {label}
          </text>
        )}
      </g>
    </svg>
  );
}
