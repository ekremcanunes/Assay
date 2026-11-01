import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { LayoutDashboard, CandlestickChart, Wallet, LogOut, Globe, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/app'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { AssayMark } from '@/components/AssayMark'
import { ThemeSwitch } from '@/components/ThemeSwitch'
import { StatusBar } from '@/components/StatusBar'

// Canlı sistem tarih/saati (sidebar alt bilgisi)
function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

const sectionCls = 'px-2.5 pb-1.5 pt-4 label text-muted-foreground'

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-ui',
          isActive
            ? 'nav-active font-semibold text-primary'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  )
}

// Mobil alt çubuk sekmesi — dokunma hedefi 64px, aktifte kobalt + altta nokta
function TabItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'relative flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 px-0.5',
          isActive ? 'text-primary' : 'text-muted-foreground'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="h-[22px] w-[22px] shrink-0" />
          <span className={cn('w-full truncate text-center text-micro', isActive && 'font-semibold')}>{label}</span>
          {isActive && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />}
        </>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const { logout, session } = useAuth()
  const { t, lang, switchLang } = useLanguage()
  const now = useClock()
  const [menuOpen, setMenuOpen] = useState(false)
  const mainRef = useRef(null)
  const { pathname } = useLocation()
  const navType = useNavigationType()

  // Yeni sayfaya geçince en üstten başla (mobilde belge, masaüstünde main kayar).
  // Geri/ileri (POP) dokunulmaz: tarayıcı eski konumu kendisi geri getirir.
  useEffect(() => {
    if (navType === 'POP') return
    window.scrollTo(0, 0)
    mainRef.current?.scrollTo(0, 0)
  }, [pathname, navType])

  const email = session?.identity?.traits?.email ?? ''
  const initials = (email.slice(0, 2) || '··').toUpperCase()

  const generalNav = [
    { to: '/overview', label: t('nav.overview'), short: t('nav.overviewShort'), icon: LayoutDashboard },
    { to: '/assets', label: t('nav.assets'), short: t('nav.assetsShort'), icon: Wallet },
  ]
  const marketNav = [
    { to: '/market', label: t('nav.market'), short: t('nav.marketShort'), icon: CandlestickChart },
  ]

  const clock = `${now.toLocaleDateString('tr-TR')} · ${now.toLocaleTimeString('tr-TR')}`

  const langButton = (
    <button
      onClick={() => switchLang(lang === 'tr' ? 'en' : 'tr')}
      className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-ui text-muted-foreground hover:bg-secondary hover:text-foreground"
    >
      <Globe className="h-4 w-4 shrink-0" />
      {lang === 'tr' ? 'English' : 'Türkçe'}
    </button>
  )

  const userCard = (
    <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-border bg-card px-2.5 py-2">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-micro font-bold text-foreground">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-ui leading-tight text-foreground">{email.split('@')[0] || '—'}</div>
        <div className="truncate text-micro text-muted-foreground">{email}</div>
      </div>
      <button
        onClick={logout}
        title={t('nav.logout')}
        aria-label={t('nav.logout')}
        className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <div className="min-h-dvh text-foreground md:flex md:h-dvh">
      {/* Masaüstü kenar çubuğu — mobilde alt çubuk + menü sayfası devralır */}
      <aside className="hidden w-[224px] shrink-0 flex-col gap-0.5 border-r border-border bg-card px-3 py-3 md:flex">
        {/* Marka rozeti */}
        <div className="mb-1 flex items-center gap-2.5 px-1.5 pb-3 pt-1">
          <AssayMark className="h-[26px] w-[26px] shrink-0" />
          {/* Yalnızca marka — kullanıcı bilgisi alttaki kartta */}
          <div className="truncate text-body font-bold leading-tight tracking-tight text-foreground">{APP_NAME}</div>
        </div>

        <nav className="mt-2 flex flex-col gap-0.5">
          <div className={sectionCls}>{t('nav.sectionGeneral')}</div>
          {generalNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}

          <div className={sectionCls}>{t('nav.sectionMarket')}</div>
          {marketNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* Alt blok: saat + ayarlar + kullanıcı kartı */}
        <div className="mt-auto flex flex-col gap-0.5">
          <div className="tabular px-2.5 pb-1 text-micro leading-relaxed text-muted-foreground">{clock}</div>
          <ThemeSwitch className="mx-0.5 my-1" />
          {langButton}
          {userCard}
        </div>
      </aside>

      {/* Bone içerik tuvali — padding'i Page bileşeni yönetir (başlık kenara yapışsın diye) */}
      {/* Mobilde kaydırmayı belge yapar (adres çubuğu gizlenebilsin); md+ eski düzen.
          Alt çubuğun altında içerik kalmasın diye çubuk yüksekliği + iPhone ana ekran çizgisi kadar boşluk */}
      <main ref={mainRef} className="min-w-0 pb-[calc(64px+env(safe-area-inset-bottom))] text-foreground md:flex-1 md:overflow-auto md:pb-0">
        <StatusBar now={now} />
        <Outlet />
      </main>

      {/* Mobil alt navigasyon — ana 5 sayfa + ikincil öğeler için menü */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-card backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden">
        {[...generalNav, ...marketNav].map((item) => (
          <TabItem key={item.to} to={item.to} label={item.short} icon={item.icon} end={item.end} />
        ))}
        <button
          onClick={() => setMenuOpen(true)}
          aria-label={t('nav.menu')}
          className="flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-muted-foreground"
        >
          <Menu className="h-[22px] w-[22px] shrink-0" />
          <span className="w-full truncate text-center text-micro">{t('nav.menu')}</span>
        </button>
      </nav>

      {/* Mobil menü — dil, kullanıcı, çıkış (masaüstünde kenar çubuğunun alt bloğu) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-veil md:hidden" onClick={() => setMenuOpen(false)}>
          <div
            className="modal-in absolute inset-x-0 bottom-0 flex flex-col gap-0.5 rounded-t-sheet border-t border-border bg-popover p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-input" aria-hidden="true" />
            <div className="flex items-center justify-between px-2 pb-1">
              <div className="truncate text-ui font-semibold text-foreground">{APP_NAME}</div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label={t('nav.menuClose')}
                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="tabular px-2.5 pb-1 text-micro leading-relaxed text-muted-foreground">{clock}</div>
            <ThemeSwitch className="mx-0.5 my-1" />
            {langButton}
            {userCard}
          </div>
        </div>
      )}
    </div>
  )
}
