import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePortfolioSummary } from '@/hooks/usePortfolioSummary'
import { Page, PrimaryAction } from '@/components/Page'
import { CategoryCard } from '@/components/CategoryCard'
import HoldingsList from '@/components/HoldingsList'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPct } from '@/lib/format'
import { slugOf } from '@/lib/portfolioCategories'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

const money = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v ?? 0)

// Portföy: kategori kartları alt alta (md+ yan yana), altında aynı sayfada tüm varlıklar.
// Karta dokununca kart /assets/<kategori> detayına büyür (View Transitions).
export default function Assets() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { holdings, isLoading, error, total, totalPct, categories } = usePortfolioSummary()

  // Eski ?tab=Gold linkleri → /assets/gold
  const legacy = slugOf(params.get('tab'))
  if (legacy) return <Navigate to={`/assets/${legacy}`} replace />

  return (
    <Page
      eyebrow={t('nav.sectionGeneral')}
      title={t('assets.title')}
      meta={
        <span className="tabular">
          <span className="font-semibold text-foreground">{money(total)}</span>{' '}
          <span className={cn(totalPct == null ? 'text-muted-foreground' : totalPct >= 0 ? 'text-up' : 'text-down')}>{formatPct(totalPct)}</span>
        </span>
      }
      actions={
        <PrimaryAction onClick={() => navigate('/assets/buy')}>
          <Plus className="h-3.5 w-3.5" />
          {t('assets.buy')}
        </PrimaryAction>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <div className="mb-2 label text-muted-foreground">{t('overview.allocation')}</div>
            <div className="grid gap-3 md:grid-cols-3">
              {categories.map((c) => (
                <CategoryCard
                  key={c.key}
                  summary={c}
                  onOpen={() => navigate(`/assets/${slugOf(c.key)}`, { viewTransition: true })}
                />
              ))}
            </div>
          </section>
          <HoldingsList holdings={holdings} isLoading={isLoading} queryError={error} />
        </div>
      )}
    </Page>
  )
}
