import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePortfolioSummary } from '@/hooks/usePortfolioSummary'
import { usePriceHistory } from '@/hooks/queries'
import { Page, PrimaryAction } from '@/components/Page'
import { PortfolioStrip } from '@/components/PortfolioStrip'
import { StoryHero } from '@/components/StoryHero'
import HoldingsList from '@/components/HoldingsList'
import { catOf } from '@/lib/assetColors'
import { typeOf, buyPath, CATEGORY_SERIES } from '@/lib/portfolioCategories'
import { Plus } from 'lucide-react'

const money = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v ?? 0)

// Kategori detayı (/assets/gold): kart buraya büyür, altında o kategorinin varlıkları
export default function AssetCategory() {
  const { category } = useParams()
  const type = typeOf(category)
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { holdings, isLoading, error, total, totalPct, categories } = usePortfolioSummary()
  const s = CATEGORY_SERIES[type] ?? CATEGORY_SERIES.Stock
  const { data: history } = usePriceHistory(type ? s.symbol : null, s.assetType, '1y')

  if (!type) return <Navigate to="/assets" replace />

  const summary = categories.find((c) => c.key === type)
  const name = t(`assets.${type.toLowerCase()}`)

  return (
    <Page
      eyebrow={t('assets.title')}
      title={name}
      actions={
        <PrimaryAction onClick={() => navigate(buyPath({ type }))}>
          <Plus className="h-3.5 w-3.5" />
          {t('assets.buy')}
        </PrimaryAction>
      }
      band={<PortfolioStrip total={total} totalPct={totalPct} categories={categories} />}
    >
      <StoryHero
        vt={`cat-${category}`}
        title={name}
        value={money(summary.value)}
        changePct={summary.changePct}
        values={(history?.candles ?? []).map((c) => c.close)}
        color={catOf(type).hex}
        backLabel={t('portfolio.back')}
        onBack={() => navigate('/assets', { viewTransition: true, state: { from: category } })}
      />
      <div className="rise">
        <HoldingsList holdings={holdings.filter((h) => h.assetType === type)} type={type} isLoading={isLoading} queryError={error} />
      </div>
    </Page>
  )
}
