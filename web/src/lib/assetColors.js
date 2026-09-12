// Varlık türü → kategori rengi.
// Kategori rengi yalnızca AYIRT EDER; asla kâr/zarar anlamı taşımaz (bkz. DESIGN.md §2.1).
// hex alanı recharts gibi Tailwind sınıfı alamayan yerler için.
const categories = {
  Stock: { text: 'text-cat-stock', tint: 'bg-cat-stock/12', dot: 'bg-cat-stock', hex: '#2F5DA8' },
  Currency: { text: 'text-cat-fx', tint: 'bg-cat-fx/12', dot: 'bg-cat-fx', hex: '#17706B' },
  Gold: { text: 'text-cat-gold', tint: 'bg-cat-gold/20', dot: 'bg-cat-gold', hex: '#C69B58' },
  Cash: { text: 'text-cat-cash', tint: 'bg-cat-cash/12', dot: 'bg-cat-cash', hex: '#6B4E9B' },
  Index: { text: 'text-cat-index', tint: 'bg-cat-index/12', dot: 'bg-cat-index', hex: '#C25E3A' },
  Other: { text: 'text-cat-other', tint: 'bg-cat-other/15', dot: 'bg-cat-other', hex: '#8C897E' },
}

export const catOf = (assetType) => categories[assetType] ?? categories.Other
