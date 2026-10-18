// Piyasa nabzı — saf hesap. ±0.05 altı "değişmedi" sayılır (mevcut Market.jsx kuralı).
const FLAT = 0.05

export function moodOf(avg) {
  if (avg == null) return null
  if (avg > 1) return 'strongUp'
  if (avg > FLAT) return 'up'
  if (avg < -1) return 'strongDown'
  if (avg < -FLAT) return 'down'
  return 'flat'
}

export function pulse(stocks) {
  const rated = stocks.filter((s) => s.changePercent != null)
  const up = rated.filter((s) => s.changePercent > FLAT).length
  const down = rated.filter((s) => s.changePercent < -FLAT).length
  const avg = rated.length ? rated.reduce((a, s) => a + s.changePercent, 0) / rated.length : null
  const byChange = [...rated].sort((a, b) => b.changePercent - a.changePercent)
  return {
    mood: moodOf(avg),
    up,
    down,
    flat: rated.length - up - down,
    total: rated.length,
    top: byChange[0] ?? null,
    bottom: byChange.length > 1 ? byChange[byChange.length - 1] : null,
  }
}
