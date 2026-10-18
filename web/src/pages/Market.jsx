import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMarketOverview } from '@/hooks/queries'
import { Skeleton } from '@/components/ui/skeleton'
import { Page } from '@/components/Page'
import { StoryCard } from '@/components/StoryCard'
import { CardRail } from '@/components/CardRail'
import { catOf } from '@/lib/assetColors'

const num0 = (v) => (v == null ? '—' : new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(v))

// Piyasa: Borsa ve Altın & Döviz kartları; dokununca /market/<panel> detayına büyür
export default function Market() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { data, isLoading } = useMarketOverview()
  const bist100 = data?.indices?.find((i) => i.symbol === 'XU100.IS')
  const gold = data?.strip?.find((q) => q.symbol === 'XAU')

  const cards = [
    { key: 'stocks', title: t('market.tileStocks'), sub: t('market.seriesStocks'), topLeft: 'BIST 100',
      value: num0(bist100?.price), changePct: bist100?.changePercent ?? null, values: bist100?.spark ?? [], color: catOf('Stock').hex },
    { key: 'gold-fx', title: t('market.tileGoldFx'), sub: t('market.seriesGoldFx'), topLeft: t('market.gramGold'),
      value: gold ? `₺${num0(gold.price)}` : '—', changePct: gold?.changePercent ?? null, values: gold?.spark ?? [], color: catOf('Gold').hex },
  ]

  return (
    <Page eyebrow={t('nav.sectionMarket')} title={t('nav.market')} meta={t('market.delayNote')}>
      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : (
        <CardRail
          prevLabel={t('market.prev')}
          nextLabel={t('market.next')}
          items={cards.map((c) => ({
            key: c.key,
            label: c.title,
            node: (
              <StoryCard
                vt={`mkt-${c.key}`}
                title={c.title}
                sub={c.sub}
                topLeft={c.topLeft}
                value={c.value}
                changePct={c.changePct}
                values={c.values}
                color={c.color}
                ariaLabel={t('market.open').replace('{name}', c.title)}
                className="h-[min(400px,calc(100dvh-240px))] min-h-[300px] w-full md:h-[340px]"
                onOpen={() => navigate(`/market/${c.key}`, { viewTransition: true })}
              />
            ),
          }))}
        />
      )}
    </Page>
  )
}
