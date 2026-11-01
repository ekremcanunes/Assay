import { createContext, useContext, useLayoutEffect, useState } from 'react'

// Tema tercihi: 'light' | 'dark' | 'system'. Sistem varsayılan.
// İlk boyamadaki sınıfı index.html'deki betik koyar (flaş olmasın); burası sonrasını yönetir.
// dark: çözülmüş sonuç — token'ı JS'te okuyan yerler (grafik) bunu bağımlılık yapar.
const ThemeContext = createContext(null)
const media = window.matchMedia('(prefers-color-scheme: dark)')
const resolve = (theme) => theme === 'dark' || (theme === 'system' && media.matches)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system')
  const [dark, setDark] = useState(() => resolve(theme))

  // Layout effect: sınıf, çocukların normal effect'lerinden (grafik token okuması) önce değişsin
  useLayoutEffect(() => {
    const apply = () => {
      const d = resolve(theme)
      document.documentElement.classList.toggle('dark', d)
      setDark(d)
    }
    apply()
    if (theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  const switchTheme = (next) => {
    setTheme(next)
    localStorage.setItem('theme', next)
  }

  return <ThemeContext.Provider value={{ theme, dark, switchTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
