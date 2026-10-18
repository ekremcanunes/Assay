import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePortfolioSummary } from '@/hooks/usePortfolioSummary'
import { Page, PrimaryAction } from '@/components/Page'
import { PortfolioStrip } from '@/components/PortfolioStrip'
import { CategoryCard } from '@/components/CategoryCard'
import { CardRail } from '@/components/CardRail'
import { Skeleton } from '@/components/ui/skeleton'
import { slugOf } from '@/lib/portfolioCategories'
import { Plus } from 'lucide-react'

// Portföy: üstte toplam şeridi, altında kategori kartları. Karta dokununca
// kart /assets/<kategori> detayına büyür (View Transitions).
export default function Assets() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { isLoading, total, totalPct, categories } = usePortfolioSummary()

  // Eski ?tab=Gold linkleri → /assets/gold
  const legacy = slugOf(params.get('tab'))
  if (legacy) return <Navigate to={`/assets/${legacy}`} replace />

  return (
    <Page
      eyebrow={t('nav.sectionGeneral')}
      title={t('assets.title')}
      actions={
        <PrimaryAction onClick={() => navigate('/assets/buy')}>
          <Plus className="h-3.5 w-3.5" />
          {t('assets.buy')}
        </PrimaryAction>
      }
      band={<PortfolioStrip total={total} totalPct={totalPct} categories={categories} />}
    >
      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : (
        <CardRail
          prevLabel={t('portfolio.prev')}
          nextLabel={t('portfolio.next')}
          items={categories.map((c) => ({
            key: slugOf(c.key),
            label: t(`assets.${c.key.toLowerCase()}`),
            node: (
              <CategoryCard
                summary={c}
                className="h-[min(400px,calc(100dvh-290px))] min-h-[300px] w-full md:h-[340px]"
                onOpen={() => navigate(`/assets/${slugOf(c.key)}`, { viewTransition: true })}
              />
            ),
          }))}
        />
      )}
    </Page>
  )
}
