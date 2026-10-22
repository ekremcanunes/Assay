import { useLanguage } from '@/contexts/LanguageContext'
import { usePriceHistory } from '@/hooks/queries'
import { StoryCard } from '@/components/StoryCard'
import { catOf } from '@/lib/assetColors'
import { slugOf, CATEGORY_SERIES } from '@/lib/portfolioCategories'

const money = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v ?? 0)

// Portföy kategori kartı: StoryCard + kategorinin temsilci fiyat serisi
export function CategoryCard({ summary, onOpen, className }) {
  const { t } = useLanguage()
  const type = summary.key
  const s = CATEGORY_SERIES[type]
  const { data: history } = usePriceHistory(s.market, s.symbol, s.assetType, '1y')
  const name = t(`assets.${type.toLowerCase()}`)

  return (
    <StoryCard
      vt={`cat-${slugOf(type)}`}
      title={name}
      sub={t(`portfolio.series.${type}`)}
      topLeft={summary.count ? `${summary.count} ${t('overview.assetCount')}` : t('portfolio.empty')}
      value={money(summary.value)}
      changePct={summary.changePct}
      values={(history?.candles ?? []).map((c) => c.close)}
      color={catOf(type).hex}
      ariaLabel={t('portfolio.open').replace('{name}', name)}
      onOpen={onOpen}
      className={className}
    />
  )
}
