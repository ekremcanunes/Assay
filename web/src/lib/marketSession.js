// BIST seans durumu — saf hesap. Backend BIST 100 satırında Yahoo'nun son/şimdiki seans
// sınırlarını (sessionStart/End) ve son işlem zamanını (asOf) verir. Açık/kapalı hükmü burada,
// anlık saatle verilir: overview 5 dk önbellekte kalır, hüküm orada verilseydi bayat olabilirdi.
// Yahoo hafta sonu son işlem gününün aralığını döndürür → "şu an aralıkta mı" doğru sonuç verir.
export function sessionOf(index, now = new Date()) {
  if (!index?.sessionStart || !index?.sessionEnd) return { open: null, asOf: index?.asOf ? new Date(index.asOf) : null }
  const t = now.getTime()
  return {
    open: t >= new Date(index.sessionStart).getTime() && t < new Date(index.sessionEnd).getTime(),
    asOf: index.asOf ? new Date(index.asOf) : null,
  }
}

// "18:10" (bugünse) veya "30.10 18:10" — İstanbul saatiyle
export function formatAsOf(date, now = new Date()) {
  if (!date) return null
  const opts = { timeZone: 'Europe/Istanbul' }
  const time = date.toLocaleTimeString('tr-TR', { ...opts, hour: '2-digit', minute: '2-digit' })
  const day = (d) => d.toLocaleDateString('tr-TR', opts)
  return day(date) === day(now) ? time : `${date.toLocaleDateString('tr-TR', { ...opts, day: '2-digit', month: '2-digit' })} ${time}`
}
