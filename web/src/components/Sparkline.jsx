// Kapanış serisi → küçük çizgi. Renk seride yön belirtir (kâr/zarar semantiği).
export function Sparkline({ data = [], className = 'h-7 w-16' }) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / span) * 26}`)
    .join(' ')

  const up = data[data.length - 1] >= data[0]

  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={className} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        strokeWidth="1.75"
        vectorEffect="non-scaling-stroke"
        className={up ? 'stroke-up' : 'stroke-down'}
      />
    </svg>
  )
}

// Bir değerin alt–üst bandındaki konumu (gün aralığı, 52 hafta aralığı)
export function RangeBar({ low, high, value, className = 'w-24' }) {
  if (low == null || high == null || value == null || high <= low) return null
  const pos = Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100))
  return (
    <div className={`relative h-1.5 rounded-full bg-border ${className}`}>
      <span
        className="absolute top-1/2 h-3 w-[2.5px] -translate-y-1/2 rounded-sm bg-foreground"
        style={{ left: `calc(${pos}% - 1.25px)` }}
      />
    </div>
  )
}
