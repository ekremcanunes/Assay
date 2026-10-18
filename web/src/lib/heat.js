import { toDateString } from './date.js'

// Ay içi göreli 5 kademe: o ayın en ucuzu 0, en pahalısı 4.
export function heatTier(value, monthValues) {
  if (value == null || monthValues.length === 0) return null
  const lo = Math.min(...monthValues)
  const hi = Math.max(...monthValues)
  if (hi === lo) return 2
  return Math.min(4, Math.floor(((value - lo) / (hi - lo)) * 5))
}

// Takvim hücresine sığan fiyat (≤ 5 karakter, tr-TR). 10.000 altı tam yazılır
// ki günler arası fark okunsun (gram altın "6.398"); üstü bin/milyon kısaltılır.
export function shortPrice(v) {
  if (v == null) return ''
  const fmt = (n, d) => n.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d })
  if (v >= 1_000_000) return fmt(v / 1_000_000, 1) + 'M'
  if (v >= 100_000) return fmt(v / 1000, 0) + 'B'
  if (v >= 10_000) return fmt(v / 1000, 1) + 'B'
  if (v >= 100) return fmt(v, 0)
  if (v >= 10) return fmt(v, 1)
  return fmt(v, 2)
}

// Günlük mumlar → yerel gün anahtarı. Mum zamanı Unix saniye (borsa açılışı);
// yerel tarihe çevirmek BIST/NASDAQ/altın için doğru günü verir.
export function closesByDay(candles = []) {
  const map = new Map()
  for (const c of candles) map.set(toDateString(new Date(c.time * 1000)), c.close)
  return map
}

// Seçilen gün piyasa kapalıysa (hafta sonu/tatil) geriye doğru en yakın kapanış.
export function nearestClose(closes, dateStr, maxBack = 7) {
  const [y, m, d] = dateStr.split('-').map(Number)
  for (let i = 0; i <= maxBack; i++) {
    const ds = toDateString(new Date(y, m - 1, d - i))
    const v = closes.get(ds)
    if (v != null) return { date: ds, value: v }
  }
  return null
}

export function monthsBack(from, count) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
}
