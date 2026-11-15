import { createContext, useContext } from 'react'

// Tema tercihi: 'light' | 'dark' | 'system'. Sistem varsayılan. Değeri ThemeProvider.jsx koyar.
// dark: çözülmüş sonuç — token'ı JS'te okuyan yerler (grafik) bunu bağımlılık yapar.
// Provider ayrı dosyada: bileşen ve hook aynı dosyada olunca Fast Refresh çalışmıyor.
export const ThemeContext = createContext(null)

export const useTheme = () => useContext(ThemeContext)
