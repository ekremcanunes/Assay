// Para kısaltma — dar kutularda "₺1,2 Mn". 100.000 altı tam yazılır.
export function compactMoney(value, currency = 'TRY') {
  if (value == null || Number.isNaN(value)) return '—'
  const locale = currency === 'TRY' ? 'tr-TR' : 'en-US'
  const abs = Math.abs(value)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: abs >= 100_000 ? 'compact' : 'standard',
    maximumFractionDigits: abs >= 100_000 ? 1 : 0,
  }).format(value)
}

export const formatPct = (v) =>
  v == null || Number.isNaN(v) ? '—' : `${v >= 0 ? '+' : '−'}%${Math.abs(v).toFixed(2).replace('.', ',')}`
