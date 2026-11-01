// Bir değerin alt–üst bandındaki konumu (gün aralığı, 52 hafta aralığı)
export function RangeBar({ low, high, value, className = 'w-24' }) {
  if (low == null || high == null || value == null || high <= low) return null
  const pos = Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100))
  return (
    <div className={`relative h-1.5 rounded-full bg-secondary ${className}`}>
      <span
        className="absolute top-1/2 h-3 w-[2.5px] -translate-y-1/2 rounded-sm bg-primary"
        style={{ left: `calc(${pos}% - 1.25px)` }}
      />
    </div>
  )
}
