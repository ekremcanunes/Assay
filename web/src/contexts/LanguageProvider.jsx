import { useState } from 'react'
import { LanguageContext, translations } from './LanguageContext'

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'tr')

  const t = (key) => translations[lang]?.[key] || translations.en[key] || key

  const switchLang = (newLang) => {
    setLang(newLang)
    localStorage.setItem('lang', newLang)
  }

  return (
    <LanguageContext.Provider value={{ lang, t, switchLang }}>
      {children}
    </LanguageContext.Provider>
  )
}
