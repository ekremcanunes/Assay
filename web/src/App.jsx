import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import PageLoader from './components/PageLoader'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import Market from './pages/Market'
import AssetDetail from './pages/AssetDetail'
import Watchlist from './pages/Watchlist'
import Account from './pages/Account'
import Toaster from './components/Toaster'
import Assets from './pages/Assets'
import AddAsset from './pages/AddAsset'
import AssetCategory from './pages/AssetCategory'
import Landing from './pages/Landing'
import LandingTech from './pages/LandingTech'
import AuthError from './pages/AuthError'
import Login from './pages/Login'
import Register from './pages/Register'
import Recovery from './pages/Recovery'
import Settings from './pages/Settings'


function RootGate() {
  const { session, loading } = useAuth()
  if (loading) return <PageLoader />
  return session ? <Navigate to="/overview" replace /> : <Landing />
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // 1 dk taze — geri gelince anında, arkada sessiz yenileme
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootGate />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/landing/tech/:slug" element={<LandingTech />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/recovery" element={<Recovery />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/error" element={<AuthError />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/overview" element={<Overview />} />
              <Route path="/market" element={<Market />} />
              {/* Borsa ve Altın & Döviz artık tek sayfada */}
              <Route path="/market/:panel" element={<Navigate to="/market" replace />} />
              <Route path="/market/:market/:symbol" element={<AssetDetail />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/account" element={<Account />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/assets/buy" element={<AddAsset />} />
              <Route path="/assets/:category" element={<AssetCategory />} />
              {/* Eski route'lar yönlendirmesi */}
              <Route path="/gold-fx" element={<Navigate to="/market" replace />} />
              {/* Analiz yeniden tasarlanana kadar menüde yok (bkz. mobil faz 1 spec §3.1) */}
              <Route path="/analytics" element={<Navigate to="/overview" replace />} />
              <Route path="/portfolios" element={<Navigate to="/assets" replace />} />
              <Route path="/portfolios/:id" element={<Navigate to="/assets" replace />} />
              <Route path="/transactions" element={<Navigate to="/assets" replace />} />
            </Route>
          </Routes>
          </BrowserRouter>
          <Toaster />
        </AuthProvider>
      </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
