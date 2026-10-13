/** Чашка кофе — иллюстрация для карточек-подсказок. */
export function CoffeeIllustration({ width = 150 }: { width?: number }) {
  return (
    <svg
      width={width}
      viewBox="0 0 200 170"
      role="img"
      aria-label="Чашка кофе"
      style={{ flex: 'none', height: 'auto' }}
    >
      <circle cx="100" cy="92" r="70" fill="#FFFFFF" fillOpacity="0.6" />
      <path
        d="M76 42c-5 6 5 9 0 15M100 36c-5 6 5 9 0 15M124 42c-5 6 5 9 0 15"
        fill="none"
        stroke="#8A56D6"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M58 70h84v30a34 34 0 0 1-34 34H92a34 34 0 0 1-34-34z"
        fill="#FFFFFF"
        stroke="#2E1A52"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M142 80h8a14 14 0 0 1 0 28h-10" fill="none" stroke="#2E1A52" strokeWidth="2.5" />
      <path d="M66 70c10 8 58 8 68 0" fill="#B8865A" />
      <rect x="46" y="138" width="108" height="9" rx="4.5" fill="#2E1A52" />
      <path d="M164 46l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#F08A4B" />
    </svg>
  );
}
