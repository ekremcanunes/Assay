// Tarihler uygulama genelinde "YYYY-MM-DD" string'i olarak taşınır.
// Date nesnesine çevirirken yerel takvim günü korunur — böylece UTC kayması
// yüzünden "bir gün geri gitme" hatası oluşmaz.

export function toDateString(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromDateString(value) {
  if (!value) return undefined
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

export function todayString() {
  return toDateString(new Date())
}

/** Backend'e gönderilecek ISO tarih — gün UTC gece yarısı olarak sabitlenir. */
export function toApiDate(value) {
  return value ? `${value}T00:00:00.000Z` : null
}

/** Gün sonu — "bu tarihe kadar" filtrelerinin son günü dışlamaması için. */
export function toApiEndOfDay(value) {
  return value ? `${value}T23:59:59.999Z` : null
}

export function formatDisplayDate(value, lang = 'tr') {
  const date = fromDateString(value)
  if (!date) return ''
  return date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
