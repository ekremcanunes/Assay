import { useHoldings } from '@/hooks/queries'
import { summarizeCategories, CATEGORY_TYPES } from '@/lib/portfolioCategories'

// Portföy şeridi + kartlar için tek kaynak (iki sayfa da kullanır)
export function usePortfolioSummary() {
  const { data: holdings = [], isLoading, error } = useHoldings()
  const categories = summarizeCategories(holdings, CATEGORY_TYPES)
  const total = categories.reduce((s, c) => s + c.value, 0)
  const totalPct = summarizeCategories(holdings.map((h) => ({ ...h, assetType: 'All' })), ['All'])[0].changePct
  return { holdings, isLoading, error, total, totalPct, categories }
}
