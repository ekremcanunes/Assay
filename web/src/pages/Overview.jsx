import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDashboard } from '@/hooks/queries'
import { Skeleton } from '@/components/ui/skeleton'
import { Page, GhostAction, PrimaryAction } from '@/components/Page'
import { Section } from '@/components/Section'
import { catOf } from '@/lib/assetColors'
import { ArrowRight, Plus } from 'lucide-react'

const formatTry = (v) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v ?? 0)

export default function Overview() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { data: dashboard, isLoading } = useDashboard()

  const total = dashboard?.totalValueInTry ?? 0
  const stock = dashboard?.stockValueInTry ?? 0
  const cash = dashboard?.cashValueInTry ?? 0
  const gold = Math.max(0, total - stock - cash) // dashboard altını ayrı vermiyor → kalan
  const count = dashboard?.assetCount ?? 0
  const pct = (v) => (total > 0 ? (v / total) * 100 : 0)

  const cats = [
    { key: 'Stock', label: t('overview.investments'), value: stock },
    { key: 'Cash', label: t('overview.cash'), value: cash },
    { key: 'Gold', label: t('assets.gold'), value: gold },
  ].map((c) => ({ ...c, ...catOf(c.key), pct: pct(c.value) }))

  return (
    <Page
      eyebrow={t('nav.sectionGeneral')}
      title={t('overview.title')}
      actions={
        <>
          <GhostAction onClick={() => navigate('/assets')} aria-label={t('overview.allAssets')}>
            <span className="hidden sm:inline">{t('overview.allAssets')}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </GhostAction>
          <PrimaryAction onClick={() => navigate('/assets/buy')}>
            <Plus className="h-3.5 w-3.5" />
            {t('assets.buy')}
          </PrimaryAction>
        </>
      }
    >
      {isLoading ? (
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          {/* Ana KPI: net varlık */}
          <section className="rounded-xl border border-border bg-card p-4 shadow-card md:p-5">
            <div className="label text-muted-foreground">{t('overview.netWorth')}</div>
            <div className="tabular my-1 text-title font-bold text-foreground">{formatTry(total)}</div>
            <div className="mt-2 border-t border-border pt-2.5">
              <span className="inline-flex rounded-sm bg-secondary px-2 py-0.5 text-micro font-semibold text-muted-foreground">
                {count} {t('overview.assetCount')}
              </span>
            </div>
          </section>

          {/* Dağılım: segment çubuğu + kategori lejantı (renk yalnızca ayırt eder) */}
          <Section title={t('overview.allocation')} meta={`${count} ${t('overview.assetCount')}`}>
            <div className="px-4 pb-4">
              <div className="mb-4 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-secondary">
                {cats.filter((c) => c.pct > 0).map((c) => (
                  <div key={c.key} className={`h-full ${c.dot}`} style={{ width: `${c.pct}%` }} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {cats.map((c) => (
                  <div key={c.key} className="min-w-0 rounded-lg bg-secondary/60 p-2.5">
                    <div className="mb-0.5 flex items-center gap-1.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
                      <span className="truncate text-micro font-medium text-muted-foreground">{c.label}</span>
                    </div>
                    <div className="tabular truncate text-ui font-semibold text-foreground md:text-body">{formatTry(c.value)}</div>
                    <div className="tabular text-micro text-muted-foreground">%{c.pct.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </div>
      )}
    </Page>
  )
}
