import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, CandlestickChart, Coins, Wallet, BarChart2, LogOut, Globe, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/app'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import assayMark from '@/assets/assay-mark.svg'

// Canlı sistem tarih/saati (sidebar alt bilgisi)
function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

const sectionCls = 'px-2 pb-1.5 pt-4 label text-shell-muted'

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'relative flex h-[33px] items-center gap-2.5 rounded-lg px-2.5 text-ui',
          isActive
            ? 'nav-active bg-shell-panel font-medium text-shell-fg'
            : 'text-shell-muted hover:bg-shell-panel hover:text-shell-fg'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-foil')} />
          {label}
        </>
      )}
    </NavLink>
  )
}

// Mobil alt çubuk sekmesi — dokunma hedefi 56px, etiket kısa sürüm
function TabItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 px-0.5',
          isActive ? 'text-shell-fg' : 'text-shell-muted'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-foil')} />
          <span className={cn('w-full truncate text-center text-micro', isActive && 'font-medium')}>{label}</span>
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

  const email = session?.identity?.traits?.email ?? ''
  const initials = (email.slice(0, 2) || '··').toUpperCase()

  const generalNav = [
    { to: '/', label: t('nav.overview'), short: t('nav.overviewShort'), icon: LayoutDashboard, end: true },
    { to: '/assets', label: t('nav.assets'), short: t('nav.assetsShort'), icon: Wallet },
    { to: '/analytics', label: t('nav.analytics'), short: t('nav.analyticsShort'), icon: BarChart2 },
  ]
  const marketNav = [
    { to: '/market', label: t('nav.market'), short: t('nav.marketShort'), icon: CandlestickChart },
    { to: '/gold-fx', label: t('nav.goldFx'), short: t('nav.goldFxShort'), icon: Coins },
  ]

  const clock = `${now.toLocaleDateString('tr-TR')} · ${now.toLocaleTimeString('tr-TR')}`

  const langButton = (
    <button
      onClick={() => switchLang(lang === 'tr' ? 'en' : 'tr')}
      className="flex h-[33px] items-center gap-2.5 rounded-lg px-2.5 text-ui text-shell-muted hover:bg-shell-panel hover:text-shell-fg"
    >
      <Globe className="h-4 w-4 shrink-0" />
      {lang === 'tr' ? 'English' : 'Türkçe'}
    </button>
  )

  const userCard = (
    <div className="mt-1 flex items-center gap-2.5 rounded-[9px] border border-shell-border bg-shell-panel px-2 py-2">
      <div className="grid h-[25px] w-[25px] shrink-0 place-items-center rounded-full bg-shell-border text-micro font-semibold text-shell-fg">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-ui leading-tight text-shell-fg">{email.split('@')[0] || '—'}</div>
        <div className="truncate text-micro text-shell-muted">{email}</div>
      </div>
      <button
        onClick={logout}
        title={t('nav.logout')}
        aria-label={t('nav.logout')}
        className="shrink-0 rounded-md p-1 text-shell-muted hover:text-shell-fg"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <div className="flex h-dvh bg-shell text-shell-fg">
      {/* Masaüstü kenar çubuğu — mobilde alt çubuk + menü sayfası devralır */}
      <aside className="hidden w-[212px] shrink-0 flex-col gap-0.5 px-2.5 py-2.5 md:flex">
        {/* Marka rozeti */}
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <img src={assayMark} alt="" className="h-[26px] w-[26px] shrink-0" />
          {/* Yalnızca marka — kullanıcı bilgisi alttaki kartta */}
          <div className="truncate text-ui font-semibold leading-tight text-shell-fg">{APP_NAME}</div>
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
          <div className="tabular px-2.5 pb-1 text-micro leading-relaxed text-shell-muted">{clock}</div>
          {langButton}
          {userCard}
        </div>
      </aside>

      {/* Bone içerik tuvali — padding'i Page bileşeni yönetir (başlık kenara yapışsın diye) */}
      {/* Mobilde tam genişlik; alt çubuğun altında içerik kalmasın diye pb-[56px] */}
      <main className="canvas-inset flex-1 overflow-auto border-shell-border bg-background pb-[56px] text-foreground md:my-2 md:mr-2 md:rounded-xl md:border md:pb-0">
        <Outlet />
      </main>

      {/* Mobil alt navigasyon — ana 5 sayfa + ikincil öğeler için menü */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-shell-border bg-shell md:hidden">
        {[...generalNav, ...marketNav].map((item) => (
          <TabItem key={item.to} to={item.to} label={item.short} icon={item.icon} end={item.end} />
        ))}
        <button
          onClick={() => setMenuOpen(true)}
          aria-label={t('nav.menu')}
          className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 px-0.5 text-shell-muted"
        >
          <Menu className="h-[18px] w-[18px] shrink-0" />
          <span className="w-full truncate text-center text-micro">{t('nav.menu')}</span>
        </button>
      </nav>

      {/* Mobil menü — dil, kullanıcı, çıkış (masaüstünde kenar çubuğunun alt bloğu) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/50 md:hidden" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 rounded-t-2xl border-t border-shell-border bg-shell p-3 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 pb-1">
              <div className="truncate text-ui font-semibold text-shell-fg">{APP_NAME}</div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label={t('nav.menuClose')}
                className="rounded-md p-2 text-shell-muted hover:text-shell-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="tabular px-2.5 pb-1 text-micro leading-relaxed text-shell-muted">{clock}</div>
            {langButton}
            {userCard}
          </div>
        </div>
      )}
    </div>
  )
}
