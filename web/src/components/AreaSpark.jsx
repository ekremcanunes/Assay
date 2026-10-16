// Kenardan kenara alan grafiği (kart ve detay başlığının altında). Eksen yok: yön ve şekil için.
export function AreaSpark({ values = [], color, className }) {
  if (values.length < 2) return null
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 38 - ((v - lo) / (hi - lo || 1)) * 30])
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" className={className}>
      <path d={`${line} L100 40 L0 40 Z`} fill={color} opacity="0.16" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
