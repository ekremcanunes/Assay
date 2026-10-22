// Portföy kategori özeti — saf hesap (DOM yok).
// K/Z %: her varlığın TL maliyeti değer ve yüzdeden geri türetilir,
// kategori yüzdesi = (Σdeğer − Σmaliyet) / Σmaliyet. Yüzdesi olmayan varlık
// yüzdeye katılmaz ama değere katılır.
export function summarizeCategories(holdings, keys) {
  const total = holdings.reduce((s, h) => s + (h.valueInTry ?? 0), 0)
  return keys.map((key) => {
    const items = holdings.filter((h) => h.assetType === key)
    const value = items.reduce((s, h) => s + (h.valueInTry ?? 0), 0)
    let v = 0
    let cost = 0
    for (const h of items) {
      const p = h.unrealizedProfitLossPercent
      if (p == null || h.valueInTry == null || p <= -100) continue
      v += h.valueInTry
      cost += h.valueInTry / (1 + p / 100)
    }
    return {
      key,
      value,
      changePct: cost > 0 ? ((v - cost) / cost) * 100 : null,
      share: total > 0 ? value / total : 0,
      count: items.length,
    }
  })
}

// Kategori ↔ URL parçası (/assets/gold)
export const CATEGORY_TYPES = ['Stock', 'Currency', 'Gold']
const SLUGS = { Stock: 'stock', Currency: 'currency', Gold: 'gold' }
export const slugOf = (type) => SLUGS[type] ?? null
export const typeOf = (slug) => CATEGORY_TYPES.find((t) => SLUGS[t] === slug) ?? null

// Al sayfasına ön seçimle git: tür (+ sembol/market/ad). URL'de durur ki yenilemede kaybolmasın.
export function buyPath({ type, symbol, market, name } = {}) {
  const p = new URLSearchParams()
  if (type) p.set('type', type)
  if (symbol) p.set('symbol', symbol)
  if (market) p.set('market', market)
  if (name) p.set('name', name)
  const q = p.toString()
  return q ? `/assets/buy?${q}` : '/assets/buy'
}

// Kart grafiği: kategorinin temsilci serisi (portföy değeri DEĞİL — kartta etiketle yazılır)
export const CATEGORY_SERIES = {
  // BIST 100 endeksi: Yahoo yazımı (XU100.IS) backend'de üretilir
  Stock: { symbol: 'XU100', market: 'BIST', assetType: 'Stock' },
  Currency: { symbol: 'USD', market: '', assetType: 'Currency' },
  Gold: { symbol: 'XAU', market: '', assetType: 'Gold' },
}
