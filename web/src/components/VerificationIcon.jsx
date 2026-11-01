// Kod adımının ikonu. state: 'idle' (gönderiliyor) · 'open' (kod bekleniyor) · 'done' (doğrulandı → ✓ rozeti).
// Satır içi SVG: çizgiler currentColor = marka aksanı, tema değişince kendiliğinden doğru renk.
// Hareket yalnızca bütün ikona (süzülme) ve rozete (pop) uygulanır.
export default function VerificationIcon({ state = 'idle', size = 56 }) {
  return (
    <div className="relative inline-block text-primary" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={state === 'done' ? '' : 'mascot-bob'}
      >
        {/* telefon — sağ kenar balonun hizasında açık (dolguya gerek kalmaz, her zeminde temiz) */}
        <path d="M40 15v-4a5 5 0 0 0-5-5H17a5 5 0 0 0-5 5v42a5 5 0 0 0 5 5h18a5 5 0 0 0 5-5V40" />
        <path d="M22 11h8" />
        <path d="M12 46h28" />
        <path d="M17 41h3M23 41h3M29 41h3" />
        {/* mesaj balonu */}
        <path d="M30 18h22a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H40l-6 5v-5h-4a3 3 0 0 1-3-3V21a3 3 0 0 1 3-3z" />
        <path d="M35 27h.01M41 27h.01M47 27h.01" strokeWidth="3.4" />
      </svg>
      {state === 'done' && (
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" className="mascot-pop absolute -right-1 -top-1">
          <circle cx="10" cy="10" r="9" className="fill-foreground" />
          <path d="M6 10 l3 3 l5 -6" className="stroke-card" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
    </div>
  )
}
