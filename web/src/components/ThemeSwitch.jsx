import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'

const THEMES = [['light', Sun], ['dark', Moon], ['system', Monitor]]

// Tema seçici: segment oluğu, aktif dilim beyaz yüzey. Tercih localStorage'da (ThemeContext).
// iconOnly: dar yerler (landing üst menüsü, giriş/kayıt) — etiket yalnız aria-label/title'da.
export function ThemeSwitch({ iconOnly = false, className }) {
  const { t } = useLanguage()
  const { theme, switchTheme } = useTheme()
  return (
    <div
      role="radiogroup"
      aria-label={t('theme.label')}
      className={cn('grid grid-cols-3 gap-0.5 rounded-[10px] bg-secondary p-1', iconOnly && 'inline-grid', className)}
    >
      {THEMES.map(([key, Icon]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={theme === key}
          aria-label={t(`theme.${key}`)}
          title={t(`theme.${key}`)}
          onClick={() => switchTheme(key)}
          className={cn(
            'flex h-8 items-center justify-center gap-1 rounded-lg border text-micro',
            iconOnly && 'w-8',
            theme === key
              ? 'border-border bg-card font-semibold text-foreground shadow-card'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          {!iconOnly && t(`theme.${key}`)}
        </button>
      ))}
    </div>
  )
}
