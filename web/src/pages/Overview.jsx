import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDashboard } from '@/hooks/queries'
import { Skeleton } from '@/components/ui/skeleton'
import { Page, GhostAction, PrimaryAction } from '@/components/Page'
import { Section, StatCard, InfoChip } from '@/components/Section'
import { catOf } from '@/lib/assetColors'
import { ArrowRight, Plus, Wallet, Banknote, Coins, Layers } from 'lucide-react'

const formatTry = (v) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v ?? 0)

// Dağılım halkası — dilimler stroke-dasharray ile, ekstra kütüphane yok.
// Her dilimin offset'i kendinden öncekilerin toplamına göre (12 yönünden başlar).
function Donut({ slices }) {
  const withOffset = slices.reduce(
    (acc, s) => {
      acc.list.push({ ...s, offset: acc.run })
      acc.run -= s.pct
      return acc
    },
    { list: [], run: 25 }
  ).list

  return (
    <svg viewBox="0 0 42 42" className="h-28 w-28 shrink-0" role="img" aria-hidden="true">
      <circle cx="21" cy="21" r="15.9" fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
      {withOffset.map((s) => (
        <circle
          key={s.key}
          cx="21"
          cy="21"
          r="15.9"
          fill="none"
          stroke={s.hex}
          strokeWidth="6"
          strokeDasharray={`${s.pct} ${100 - s.pct}`}
          strokeDashoffset={s.offset}
        />
      ))}
    </svg>
  )
}

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
          <GhostAction onClick={() => navigate('/assets')}>
            {t('overview.allAssets')}
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
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* KPI şeridi */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              accent="bg-foreground"
              tint="bg-foreground/10"
              iconClass="text-foreground"
              icon={Wallet}
              label={t('overview.netWorth')}
              value={formatTry(total)}
              chip={<InfoChip tint="bg-foreground/8" text="text-muted-foreground">{count} {t('overview.assetCount')}</InfoChip>}
            />
            {cats.map((c) => (
              <StatCard
                key={c.key}
                accent={c.dot}
                tint={c.tint}
                iconClass={c.text}
                icon={c.key === 'Stock' ? Layers : c.key === 'Cash' ? Banknote : Coins}
                label={c.label}
                value={formatTry(c.value)}
                chip={<InfoChip tint={c.tint} text={c.text}>%{c.pct.toFixed(0)}</InfoChip>}
              />
            ))}
          </div>

          {/* Dağılım */}
          <Section title={t('overview.allocation')} meta={`${count} ${t('overview.assetCount')}`}>
            <div className="flex flex-col items-center gap-6 p-5 sm:flex-row sm:items-center">
              <Donut slices={cats.filter((c) => c.pct > 0)} />
              <div className="w-full flex-1 space-y-2.5">
                {cats.map((c) => (
                  <div key={c.key} className="flex items-center gap-2.5 text-ui">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${c.dot}`} />
                    <span className="text-foreground">{c.label}</span>
                    <span className="tabular ml-auto text-muted-foreground">%{c.pct.toFixed(0)}</span>
                    <span className="tabular w-28 text-right font-semibold text-foreground">{formatTry(c.value)}</span>
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
