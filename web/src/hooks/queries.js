import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assetApi, dashboardApi, transactionApi, marketApi, systemApi, watchlistApi } from '@/services/api'

export const queryKeys = {
  holdings: ['holdings'],
  watchlist: ['watchlist'],
  dashboard: ['dashboard'],
  transactions: ['transactions'],
  marketOverview: ['market-overview'],
}

// Sunucu, cevaptaki verinin Redis'teki kalan ömrünü X-Cache-Expires-In header'ında gönderir.
// React Query veriyi tam o süre taze sayar: Redis kaydı dolmadan boşa istek atılmaz, dolunca
// ilk ihtiyaçta yenilenir. Süreler yalnızca backend'de (CacheTtl) tutulur, burada sayı yoktur.
// Header yoksa (ör. fiyat alınamadı) tazelik bilinmez → veri bayat sayılır.
const EXPIRES_HEADER = 'x-cache-expires-in'

function serverCached(request) {
  return {
    queryFn: () =>
      request().then((r) => {
        const seconds = Number(r.headers[EXPIRES_HEADER])
        return { data: r.data, expiresAt: Number.isFinite(seconds) ? Date.now() + seconds * 1000 : null }
      }),
    staleTime: (query) => {
      const expiresAt = query.state.data?.expiresAt
      return expiresAt ? Math.max(0, expiresAt - Date.now()) : 0
    },
    select: (result) => result.data,
  }
}

// Piyasa panosu — BIST 30 + endeks + döviz/altın
export function useMarketOverview() {
  return useQuery({
    queryKey: queryKeys.marketOverview,
    ...serverCached(() => marketApi.overview()),
  })
}

// Bir endeksin hisseleri (Piyasa'daki BIST 100 segmenti). BIST 30 piyasa özetiyle gelir;
// bu sorgu yalnız segment seçilince çalışır, sayfayı açan herkes 100 hisse yüklemez.
export function useIndexStocks(indexCode, enabled) {
  return useQuery({
    queryKey: ['index-stocks', indexCode],
    ...serverCached(() => marketApi.indexStocks(indexCode)),
    enabled,
  })
}

// Tüm BIST evreninde sembol arama — yalnızca seçili endeksin (BIST 30 / BIST 100) filtresi boş kalınca kullanılır.
// q null ise sorgu hiç çalışmaz.
export function useSymbolSearch(q) {
  return useQuery({
    queryKey: ['symbol-search', q],
    ...serverCached(() => marketApi.search(q)),
    enabled: !!q && q.length >= 2,
  })
}

// İzleme listesi: kalemler + güncel fiyat. Tazeliği fiyatların cache ömrü belirler (serverCached).
// options: yalnız okuyan yerler (satırlardaki yıldız) { refetchOnMount: false } verir. Neden: tablo
// sayfalanınca her sayfada yeni yıldızlar mount olur; liste boşken önbellek başlığı gelmez, veri hep
// bayat sayılır ve her sayfa değişimi /api/watchlist isteği atardı. Liste ekle/çıkar sonrası zaten
// invalidate edilir; İzlediklerim ekranı kendi sorgusuyla tazeler.
export function useWatchlist(options = {}) {
  return useQuery({
    queryKey: queryKeys.watchlist,
    ...serverCached(() => watchlistApi.getAll()),
    ...options,
  })
}

export function useAddWatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => watchlistApi.add(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.watchlist }),
  })
}

export function useRemoveWatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => watchlistApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.watchlist }),
  })
}

// Varlık sayfası: tek varlığın fiyatı + gün/52H istatistikleri. Bulunamazsa (404) tekrar denenmez.
export function useQuote(market, symbol) {
  return useQuery({
    queryKey: ['quote', market, symbol],
    ...serverCached(() => marketApi.quote(market, symbol)),
    enabled: !!symbol,
    retry: false,
  })
}

// Varlık sayfası: ad, borsa, para birimi (enstrüman kataloğundan).
export function useInstrument(market, symbol) {
  return useQuery({
    queryKey: ['instrument', market, symbol],
    ...serverCached(() => marketApi.instrument(market, symbol)),
    enabled: !!market && !!symbol,
    retry: false,
  })
}

// Kimlik (market, symbol): market query key'de de yer alır, yoksa LINK · BIST ve LINK · US aynı cache'i paylaşırdı.
// market hisse için BIST/US, altın ve dövizde ''.

// Grafik serisi
export function usePriceHistory(market, symbol, assetType, range) {
  return useQuery({
    queryKey: ['price-history', market, symbol, assetType, range],
    ...serverCached(() => marketApi.history(market, symbol, assetType, range)),
    enabled: !!symbol,
  })
}

// Tarihe göre fiyat — geçmiş günün kapanışı kalıcı, "bugün" anlık fiyat; tazeliği sunucu söyler.
// Üçlü eksikse sorgu hiç çalışmaz.
export function usePriceOnDate(market, symbol, assetType, date) {
  return useQuery({
    queryKey: ['price-on-date', market, symbol, assetType, date],
    ...serverCached(() => marketApi.priceOn(market, symbol, assetType, date)),
    enabled: !!symbol && !!assetType && !!date,
    retry: false,
  })
}

// Tüm portföy — tek kaynak; tab'lar bunu client-side filtreler
export function useHoldings() {
  return useQuery({
    queryKey: queryKeys.holdings,
    ...serverCached(() => assetApi.getAll()),
  })
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    ...serverCached(() => dashboardApi.get()),
  })
}

// Durum şeridi — önbelleğe bağlı değil, her istek gerçek ölçüm (DB ping sunucuda, API gidiş-dönüş burada).
// Dakikada bir yenilenir; şerit görünür kaldıkça süreler güncel kalır.
export function useSystemStatus() {
  return useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const t0 = performance.now()
      const res = await systemApi.status()
      return { ...res.data, apiMs: Math.round(performance.now() - t0) }
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: false,
  })
}

// Bir varlığın alım-satım (lot) geçmişi — drawer'da gösterilir.
// (symbol, market) ile filtrelenir: varlık tamamen satılıp silinse bile geçmişi bulunur, iki LINK karışmaz.
export function useAssetTransactions(market, symbol) {
  return useQuery({
    queryKey: [...queryKeys.transactions, market, symbol],
    queryFn: () => transactionApi.getAll({ symbol, market }).then((r) => r.data.items ?? []),
    enabled: !!symbol,
  })
}

// Genel Bakış'taki son işlemler — en yeni `limit` kayıt (sunucu tarihe göre yeniden eskiye sıralar).
// Anahtar ['transactions', ...] ile başlar: al-sat sonrası invalidate bunu da tazeler.
export function useRecentTransactions(limit = 5) {
  return useQuery({
    queryKey: [...queryKeys.transactions, 'recent', limit],
    queryFn: () => transactionApi.getAll({ pageSize: limit }).then((r) => r.data.items ?? []),
  })
}

// Al-sat sonrası holdings + dashboard + lot geçmişi otomatik tazelensin
function useAssetMutation(mutationFn) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.holdings })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard })
      qc.invalidateQueries({ queryKey: queryKeys.transactions })
    },
  })
}

export const useBuyAsset = () => useAssetMutation((data) => assetApi.buy(data))
export const useSellAsset = () => useAssetMutation(({ id, data }) => assetApi.sell(id, data))
export const useUpdateAsset = () => useAssetMutation(({ id, data }) => assetApi.update(id, data))
export const useDeleteAsset = () => useAssetMutation((id) => assetApi.delete(id))
