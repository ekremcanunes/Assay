import { useLayoutEffect, useState } from 'react'
import { ThemeContext } from './ThemeContext'

// İlk boyamadaki sınıfı index.html'deki betik koyar (flaş olmasın); burası sonrasını yönetir.
// Kayıtlı değer 'dark' değilse (boş ya da eski 'system') açık tema.
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'))
  const dark = theme === 'dark'

  // Layout effect: sınıf, çocukların normal effect'lerinden (grafik token okuması) önce değişsin
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const switchTheme = (next) => {
    setTheme(next)
    localStorage.setItem('theme', next)
  }

  return <ThemeContext.Provider value={{ theme, dark, switchTheme }}>{children}</ThemeContext.Provider>
}
