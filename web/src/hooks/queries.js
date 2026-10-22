import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assetApi, dashboardApi, transactionApi, marketApi } from '@/services/api'

export const queryKeys = {
  holdings: ['holdings'],
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

// Tüm BIST evreninde sembol arama — yalnızca BIST 30 filtresi boş kalınca kullanılır.
// q null ise sorgu hiç çalışmaz.
export function useSymbolSearch(q) {
  return useQuery({
    queryKey: ['symbol-search', q],
    ...serverCached(() => marketApi.search(q)),
    enabled: !!q && q.length >= 2,
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

// Bir varlığın alım-satım (lot) geçmişi — drawer'da gösterilir.
// (symbol, market) ile filtrelenir: varlık tamamen satılıp silinse bile geçmişi bulunur, iki LINK karışmaz.
export function useAssetTransactions(market, symbol) {
  return useQuery({
    queryKey: [...queryKeys.transactions, market, symbol],
    queryFn: () => transactionApi.getAll({ symbol, market }).then((r) => r.data.items ?? []),
    enabled: !!symbol,
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
