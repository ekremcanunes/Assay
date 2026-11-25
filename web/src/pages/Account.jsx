import { LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Page } from '@/components/Page'
import { ThemeSwitch } from '@/components/ThemeSwitch'
import { cn } from '@/lib/utils'

// Ayarlar (/account): hesap, görünüm, dil. Kenar çubuğunun eski alt bloğu buraya taşındı;
// e-posta burada kırpılmadan, satır kırılarak tamamen görünür.
const LANGS = [
  { id: 'tr', label: 'Türkçe' },
  { id: 'en', label: 'English' },
]

export default function Account() {
  const { logout, session } = useAuth()
  const { t, lang, switchLang } = useLanguage()
  const email = session?.identity?.traits?.email ?? ''
  const initials = (email.slice(0, 2) || '··').toUpperCase()

  return (
    <Page title={t('nav.settings')}>
      <div className="max-w-xl space-y-4">
        <section className="rounded-xl border border-border bg-card p-4 shadow-card md:p-5">
          <div className="label text-muted-foreground">{t('settings.account')}</div>
          <div className="mt-3 flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-secondary text-ui font-bold text-foreground">{initials}</span>
            <div className="min-w-0">
              <div className="text-body font-semibold text-foreground">{email.split('@')[0] || '—'}</div>
              <div className="break-all text-ui text-muted-foreground">{email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="press mt-4 inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-4 text-ui font-semibold text-foreground hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />
            {t('nav.logout')}
          </button>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-card md:p-5">
          <div className="label text-muted-foreground">{t('settings.appearance')}</div>
          <ThemeSwitch className="mt-3" />
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-card md:p-5">
          <div className="label text-muted-foreground">{t('settings.language')}</div>
          <div role="radiogroup" aria-label={t('settings.language')} className="mt-3 grid grid-cols-2 gap-1 rounded-[10px] bg-secondary p-1">
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={lang === l.id}
                onClick={() => switchLang(l.id)}
                className={cn('press h-10 rounded-lg border text-ui',
                  lang === l.id ? 'border-border bg-card font-bold text-foreground shadow-card' : 'border-transparent font-medium text-muted-foreground hover:text-foreground')}
              >
                {l.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </Page>
  )
}
