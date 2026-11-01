// Assay monogramı: metin renginde "A" + marka aksanında taban çizgisi.
// Satır içi SVG: currentColor sayesinde açık/koyu temada kendiliğinden doğru renk.
export function AssayMark({ className }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={`${className} shrink-0 text-foreground`}>
      <path d="M32 8 L13 50 M32 8 L51 50 M21.5 36 H42.5" fill="none" stroke="currentColor" strokeWidth="8" />
      <rect x="10" y="56.5" width="44" height="3" fill="hsl(var(--primary))" />
    </svg>
  )
}
