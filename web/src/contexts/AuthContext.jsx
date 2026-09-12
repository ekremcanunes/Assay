import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

// Kratos iki farklı şekil döndürür:
//   whoami           → oturumun kendisi           { id, identity: {...} }
//   login/register   → oturum sarmalı içinde      { session: { id, identity: {...} } }
// Tek şekle indiriyoruz, yoksa girişten hemen sonra identity okunamıyor.
const unwrapSession = (data) => (data?.identity ? data : data?.session ?? null)

export function AuthProvider({ children }) {
  const [session, setSessionRaw] = useState(null)
  const [loading, setLoading] = useState(true)

  const setSession = (data) => setSessionRaw(unwrapSession(data))

  useEffect(() => {
    fetch('http://localhost:4433/sessions/whoami', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => setSessionRaw(unwrapSession(data)))
      .catch(() => setSessionRaw(null))
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    const res = await fetch('http://localhost:4433/self-service/logout/browser', { credentials: 'include' })
    const { logout_url } = await res.json()
    window.location.href = logout_url
  }

  return (
    <AuthContext.Provider value={{ session, loading, logout, setSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
