import { useLanguage } from '@/contexts/LanguageContext'
import { useMarketOverview, useSystemStatus } from '@/hooks/queries'
import { sessionOf, formatAsOf } from '@/lib/marketSession'
import { cn } from '@/lib/utils'

function Item({ label, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{children}</span>
    </span>
  )
}

const Dot = ({ ok }) => <i className={cn('h-1.5 w-1.5 shrink-0 rounded-full', ok ? 'bg-up' : 'bg-down')} aria-hidden="true" />

// Panelin en üstündeki ince şerit (md+). Hepsi gerçek veri:
// sol — BIST seansı (Yahoo seans sınırları + anlık saat) ve fiyatların gerçek zamanı;
// sağ — /api/system/status (ortam, bölge, DB ping) + tarayıcının ölçtüğü API gidiş-dönüşü.
export function StatusBar({ now }) {
  const { t } = useLanguage()
  const { data: market } = useMarketOverview()
  const { data: sys, isError } = useSystemStatus()

  const bist100 = market?.indices?.find((i) => i.symbol === 'XU100.IS')
  const { open, asOf } = sessionOf(bist100, now)

  return (
    <div className="tabular hidden h-9 items-center gap-5 border-b border-border px-8 text-micro md:flex">
      {open != null && (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-foreground">
          <Dot ok={open} />
          {open ? t('status.bistOpen') : t('status.bistClosed')}
        </span>
      )}
      {asOf && (
        <span className="whitespace-nowrap text-muted-foreground">
          {t('status.pricesAsOf').replace('{time}', formatAsOf(asOf, now))} · {t('market.delayNote')}
        </span>
      )}

      <div className="ml-auto flex items-center gap-4 overflow-hidden">
        {sys && (
          <>
            <Item label={t('status.env')}>{sys.environment}</Item>
            {sys.region && <Item label={t('status.region')}>{sys.region}</Item>}
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Dot ok={sys.databaseOk} />
              <span className="text-muted-foreground">{sys.databaseProvider}</span>
              <span className="font-semibold text-foreground">{sys.databaseOk ? `${sys.databaseMs} ms` : t('status.dbDown')}</span>
            </span>
            <Item label="API">{sys.apiMs} ms</Item>
            <Item label={t('status.version')}>{sys.version}</Item>
          </>
        )}
        {isError && (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Dot ok={false} />
            <span className="font-semibold text-foreground">API</span>
            <span className="text-muted-foreground">{t('status.dbDown')}</span>
          </span>
        )}
      </div>
    </div>
  )
}
