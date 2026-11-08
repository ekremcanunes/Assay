import { Loader2, Star } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAddWatch, useRemoveWatch, useWatchlist } from '@/hooks/queries'
import { apiErrorMessage } from '@/lib/apiError'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

// Ortak ekle/çıkar mantığı. Kimlik (market, symbol); altın ve dövizde market ''.
// Sonuç bildirimle (toast) söylenir; istek sürerken düğme spinner gösterir.
function useWatchToggle(assetType, market, symbol) {
  const { t } = useLanguage()
  const { data: items = [] } = useWatchlist()
  const add = useAddWatch()
  const remove = useRemoveWatch()
  const item = items.find((w) => w.market === market && w.symbol === symbol)
  const name = assetType === 'Gold' ? t('assets.gold') : symbol
  const onError = (err) => toast.error(apiErrorMessage(err, t))
  return {
    on: !!item,
    busy: add.isPending || remove.isPending,
    label: item ? t('watch.watching') : t('watch.add'),
    toggle: () => (item
      ? remove.mutate(item.id, { onSuccess: () => toast.info(t('watch.removed').replace('{name}', name)), onError })
      : add.mutate({ assetType, market, symbol }, { onSuccess: () => toast.success(t('watch.added').replace('{name}', name)), onError })),
  }
}

// İstek sürerken yıldızın yerinde dönen halka
function StarIcon({ on, busy }) {
  if (busy) return <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
  return <Star className={cn('h-4 w-4', on && 'fill-current')} aria-hidden="true" />
}

// İzle / İzleniyor düğmesi (varlık sayfası, Alım paneli). iconOnly: yalnız yıldız (mobil alt çubuk).
export default function WatchButton({ assetType, market = '', symbol, iconOnly = false, className }) {
  const w = useWatchToggle(assetType, market, symbol)
  return (
    <button
      type="button"
      onClick={w.toggle}
      disabled={w.busy || !symbol}
      aria-pressed={w.on}
      aria-label={w.label}
      title={w.label}
      className={cn(
        'press inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[10px] border font-semibold disabled:opacity-60',
        iconOnly ? 'h-12 w-12' : 'h-9 px-3 text-ui',
        w.on ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:bg-secondary',
        className,
      )}
    >
      <StarIcon on={w.on} busy={w.busy} />
      {!iconOnly && w.label}
    </button>
  )
}

// Liste/tablo satırındaki yalın yıldız. Satırın kendi tıklamasını tetiklemez.
export function WatchStar({ assetType, market = '', symbol, className }) {
  const w = useWatchToggle(assetType, market, symbol)
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); w.toggle() }}
      disabled={w.busy}
      aria-pressed={w.on}
      aria-label={`${symbol} · ${w.label}`}
      title={w.label}
      className={cn(
        'press grid shrink-0 place-items-center rounded-lg disabled:opacity-60',
        w.on ? 'text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        className,
      )}
    >
      <StarIcon on={w.on} busy={w.busy} />
    </button>
  )
}
