import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMarketOverview } from '@/hooks/queries'
import { Skeleton } from '@/components/ui/skeleton'
import { Page } from '@/components/Page'
import { StoryHero } from '@/components/StoryHero'
import StockPanel from '@/components/market/StockPanel'
import GoldFxPanel from '@/components/market/GoldFxPanel'
import { catOf } from '@/lib/assetColors'

const num0 = (v) => (v == null ? '—' : new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(v))
const PANELS = ['stocks', 'gold-fx']

// Piyasa detayı (/market/stocks, /market/gold-fx): kart buraya büyür, altında panel içeriği
export default function MarketDetail() {
  const { panel } = useParams()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { data, isLoading } = useMarketOverview()

  if (!PANELS.includes(panel)) return <Navigate to="/market" replace />

  const stocks = panel === 'stocks'
  const bist100 = data?.indices?.find((i) => i.symbol === 'XU100.IS')
  const bist30 = data?.indices?.find((i) => i.symbol === 'XU030.IS')
  const gold = data?.strip?.find((q) => q.symbol === 'XAU')
  const q = stocks ? bist100 : gold
  const title = stocks ? t('market.tileStocks') : t('market.tileGoldFx')

  return (
    <Page eyebrow={t('nav.market')} title={title} meta={stocks ? t('market.delayNote') : t('goldfx.sourceNote')}>
      <StoryHero
        vt={`mkt-${panel}`}
        title={title}
        value={q ? (stocks ? num0(q.price) : `₺${num0(q.price)}`) : '—'}
        changePct={q?.changePercent ?? null}
        values={q?.spark ?? []}
        color={catOf(stocks ? 'Stock' : 'Gold').hex}
        backLabel={t('market.back')}
        onBack={() => navigate('/market', { viewTransition: true, state: { from: panel } })}
      />
      <div className="rise">
        {isLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : stocks ? (
          <StockPanel stocks={data?.stocks ?? []} bist30={bist30} />
        ) : (
          <GoldFxPanel strip={data?.strip ?? []} />
        )}
      </div>
    </Page>
  )
}
