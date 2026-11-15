import { createContext, useContext } from 'react'

// Oturum bilgisi. Değeri AuthProvider.jsx koyar.
// Provider ayrı dosyada: bileşen ve hook aynı dosyada olunca Fast Refresh çalışmıyor.
export const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)
