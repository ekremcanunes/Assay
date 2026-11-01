// Piyasa bileşenlerinin ortak biçimlendiricileri.
export const num = (v, d = 2) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v ?? 0)

export const pct = (v) => (v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—')

export const pctCls = (v) => (v == null ? 'text-muted-foreground' : v >= 0 ? 'text-up' : 'text-down')

// Adet hacmi — Yahoo lot sayısı döndürür, TL değil.
export const compact = (v) =>
  v == null ? '—' : new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)

// Değerin 52 haftalık banttaki konumu (%)
export const bandPos = (q) =>
  q.week52Low != null && q.week52High != null && q.week52High > q.week52Low
    ? ((q.price - q.week52Low) / (q.week52High - q.week52Low)) * 100
    : null
