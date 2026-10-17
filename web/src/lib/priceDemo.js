// Landing "Fiyat sor" canlandırması — gerçek istek atmaz; önbelleğin davranışını gösterir.
// Fiyatlar sabit örnek; süreler gerçek ölçümlerin mertebesinde (önbellek ~2 ms, dış kaynak ~200–280 ms).

export const DEMO_SYMBOLS = {
  THYAO: { price: '₺312,40', source: 'Yahoo' },
  GRAM: { price: '₺4.250,00', source: 'Yahoo' },
  USD: { price: '₺41,87', source: 'Frankfurter' },
}

export const DEMO_TTL_MIN = 5

// cached: bu sembol daha önce istendi mi. rand: 0..1 (test edilebilir olsun diye dışarıdan)
export function demoAnswer(symbol, cached, rand = Math.random()) {
  const s = DEMO_SYMBOLS[symbol]
  return cached
    ? { hit: true, source: 'önbellek', ms: Math.round((1.6 + rand) * 10) / 10, price: s.price }
    : { hit: false, source: s.source, ms: Math.round(190 + rand * 90), price: s.price }
}
