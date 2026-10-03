import verificationIcon from '../assets/assay-verification.png'

// Kod adımının ikonu. state: 'idle' (gönderiliyor) · 'open' (kod bekleniyor) · 'done' (doğrulandı → ✓ rozeti).
// Görsel tek parça PNG; hareket yalnızca bütün ikona (süzülme) ve rozete (pop) uygulanır.
export default function VerificationIcon({ state = 'idle', size = 56 }) {
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <img src={verificationIcon} alt="" width={size} height={size} className={state === 'done' ? '' : 'mascot-bob'} />
      {state === 'done' && (
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" className="mascot-pop absolute -right-1 -top-1">
          <circle cx="10" cy="10" r="9" className="fill-foreground" />
          <path d="M6 10 l3 3 l5 -6" className="stroke-card" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
    </div>
  )
}
