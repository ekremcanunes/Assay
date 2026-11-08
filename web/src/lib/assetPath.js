// Varlık sayfası adresi: /market/BIST/THYAO, /market/US/AAPL. Kimlik (market, symbol) — sembol tek başına yetmez.
export const assetPath = (market, symbol) => `/market/${encodeURIComponent(market)}/${encodeURIComponent(symbol)}`
