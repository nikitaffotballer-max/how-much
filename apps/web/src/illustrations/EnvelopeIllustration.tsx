/** Конверт, из которого вылетают чеки, — для онбординга и пустых состояний. */
export function EnvelopeIllustration({ width = 220 }: { width?: number }) {
  return (
    <svg
      width={width}
      viewBox="0 0 220 170"
      role="img"
      aria-label="Конверт с чеками"
      style={{ flex: 'none', maxWidth: '100%', height: 'auto' }}
    >
      <circle cx="110" cy="92" r="72" fill="#DCE6FF" />
      <g transform="rotate(-12 90 60)">
        <rect
          x="66"
          y="22"
          width="48"
          height="70"
          rx="6"
          fill="#FFFFFF"
          stroke="#16382A"
          strokeWidth="2.5"
        />
        <rect x="74" y="34" width="26" height="6" rx="3" fill="#2E6BD8" />
        <rect x="74" y="48" width="32" height="5" rx="2.5" fill="#C0C9C1" />
        <rect x="74" y="60" width="24" height="5" rx="2.5" fill="#C0C9C1" />
      </g>
      <g transform="rotate(10 130 60)">
        <rect
          x="108"
          y="18"
          width="48"
          height="70"
          rx="6"
          fill="#FFFFFF"
          stroke="#16382A"
          strokeWidth="2.5"
        />
        <rect x="116" y="30" width="26" height="6" rx="3" fill="#E0782F" />
        <rect x="116" y="44" width="32" height="5" rx="2.5" fill="#C0C9C1" />
        <rect x="116" y="56" width="20" height="5" rx="2.5" fill="#C0C9C1" />
      </g>
      <rect
        x="50"
        y="72"
        width="120"
        height="78"
        rx="10"
        fill="#006C4C"
        stroke="#16382A"
        strokeWidth="2.5"
      />
      <path
        d="M50 82l60 38 60-38v58a10 10 0 0 1-10 10H60a10 10 0 0 1-10-10z"
        fill="#3FAE7C"
        stroke="#16382A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M182 36l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#F08A4B" />
      <path d="M36 52l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#F6C94F" />
    </svg>
  );
}
