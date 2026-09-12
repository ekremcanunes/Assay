import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assetApi, dashboardApi, transactionApi, marketApi } from '@/services/api'

export const queryKeys = {
  holdings: ['holdings'],
  dashboard: ['dashboard'],
  transactions: ['transactions'],
  marketOverview: ['market-overview'],
}

// Piyasa panosu — BIST 30 + endeks + döviz/altın (backend 10 dk cache'li)
export function useMarketOverview() {
  return useQuery({
    queryKey: queryKeys.marketOverview,
    queryFn: () => marketApi.overview().then((r) => r.data),
    staleTime: 5 * 60_000,
  })
}

// Tüm BIST evreninde sembol arama — yalnızca BIST 30 filtresi boş kalınca kullanılır.
// q null ise sorgu hiç çalışmaz.
export function useSymbolSearch(q) {
  return useQuery({
    queryKey: ['symbol-search', q],
    queryFn: () => marketApi.search(q).then((r) => r.data),
    enabled: !!q && q.length >= 2,
    staleTime: 60 * 60_000,
  })
}

// Grafik serisi — backend cache'li (gün içi 5 dk, günlük 1 saat)
export function usePriceHistory(symbol, assetType, range) {
  return useQuery({
    queryKey: ['price-history', symbol, assetType, range],
    queryFn: () => marketApi.history(symbol, assetType, range).then((r) => r.data),
    enabled: !!symbol,
    staleTime: 5 * 60_000,
  })
}

// Tarihe göre fiyat — backend cache'li (geçmiş gün 30 gün, bugün 5 dk).
// Üçlü eksikse sorgu hiç çalışmaz.
export function usePriceOnDate(symbol, assetType, date) {
  return useQuery({
    queryKey: ['price-on-date', symbol, assetType, date],
    queryFn: () => marketApi.priceOn(symbol, assetType, date).then((r) => r.data),
    enabled: !!symbol && !!assetType && !!date,
    staleTime: 60 * 60_000,
    retry: false,
  })
}

// Tüm portföy — tek kaynak; tab'lar bunu client-side filtreler
export function useHoldings() {
  return useQuery({
    queryKey: queryKeys.holdings,
    queryFn: () => assetApi.getAll().then((r) => r.data),
  })
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => dashboardApi.get().then((r) => r.data),
  })
}

// Bir varlığın alım-satım (lot) geçmişi — drawer'da gösterilir
export function useAssetTransactions(symbol) {
  return useQuery({
    queryKey: [...queryKeys.transactions, symbol],
    queryFn: () => transactionApi.getAll({ symbol }).then((r) => r.data.items ?? []),
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
