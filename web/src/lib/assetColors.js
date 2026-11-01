// Varlık türü → kategori rengi.
// Kategori rengi yalnızca AYIRT EDER; asla kâr/zarar anlamı taşımaz (bkz. DESIGN.md).
// color alanı recharts/SVG gibi Tailwind sınıfı alamayan yerler için — CSS değişkeni,
// tema (açık/koyu) değişince kendiliğinden güncellenir.
const categories = {
  Stock: { text: 'text-cat-stock', tint: 'bg-cat-stock/12', dot: 'bg-cat-stock', color: 'hsl(var(--cat-stock))' },
  Currency: { text: 'text-cat-fx', tint: 'bg-cat-fx/12', dot: 'bg-cat-fx', color: 'hsl(var(--cat-fx))' },
  Gold: { text: 'text-cat-gold', tint: 'bg-cat-gold/20', dot: 'bg-cat-gold', color: 'hsl(var(--cat-gold))' },
  Cash: { text: 'text-cat-cash', tint: 'bg-cat-cash/12', dot: 'bg-cat-cash', color: 'hsl(var(--cat-cash))' },
  Index: { text: 'text-cat-index', tint: 'bg-cat-index/12', dot: 'bg-cat-index', color: 'hsl(var(--cat-index))' },
  Other: { text: 'text-cat-other', tint: 'bg-cat-other/15', dot: 'bg-cat-other', color: 'hsl(var(--cat-other))' },
}

export const catOf = (assetType) => categories[assetType] ?? categories.Other
