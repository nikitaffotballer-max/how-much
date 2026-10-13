/** Чек и стопка монет — иллюстрация для блока итогов месяца. */
export function ReceiptCoinsIllustration({ width = 300 }: { width?: number }) {
  const coin = (y: number) => (
    <g key={y}>
      <path d={`M174 ${y}v6a22 8 0 0 0 44 0v-6`} fill="#E3A92B" stroke="#7A5A0C" strokeWidth="2" />
      <ellipse cx="196" cy={y} rx="22" ry="8" fill="#F6C94F" stroke="#7A5A0C" strokeWidth="2" />
    </g>
  );

  return (
    <svg
      width={width}
      viewBox="0 0 240 170"
      role="img"
      aria-label="Чек и стопка монет"
      style={{ flex: 'none', maxWidth: '100%', height: 'auto' }}
    >
      <circle cx="132" cy="88" r="72" fill="#FFFFFF" fillOpacity="0.55" />
      <path d="M30 156c0-24 11-40 31-44-2 20-13 36-31 44z" fill="#3FAE7C" />
      <path d="M30 156c-4-17-17-26-30-26 2 14 13 23 30 26z" fill="#7DD3A8" />
      <g transform="rotate(-8 124 86)">
        <path
          d="M86 22h76a8 8 0 0 1 8 8v110l-9.2-5-9.2 5-9.2-5-9.2 5-9.2-5-9.2 5-9.2-5-9.2 5-9.2-5-9.2 5V30a8 8 0 0 1 8-8z"
          fill="#FFFFFF"
          stroke="#16382A"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <rect x="92" y="38" width="44" height="8" rx="4" fill="#16382A" />
        <rect x="92" y="58" width="64" height="6" rx="3" fill="#C0C9C1" />
        <rect x="92" y="72" width="52" height="6" rx="3" fill="#C0C9C1" />
        <rect x="92" y="86" width="58" height="6" rx="3" fill="#C0C9C1" />
        <rect x="92" y="108" width="30" height="8" rx="4" fill="#006C4C" />
        <rect x="132" y="108" width="24" height="8" rx="4" fill="#006C4C" />
      </g>
      {[142, 132, 122].map(coin)}
      <text
        x="196"
        y="126"
        textAnchor="middle"
        fontFamily="Onest, sans-serif"
        fontSize="11"
        fontWeight="700"
        fill="#7A5A0C"
      >
        ₽
      </text>
      <path d="M210 30l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#F08A4B" />
      <path d="M46 40l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#8A56D6" />
    </svg>
  );
}
