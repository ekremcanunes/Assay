import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import Market from './pages/Market'
import MarketDetail from './pages/MarketDetail'
import Assets from './pages/Assets'
import AddAsset from './pages/AddAsset'
import AssetCategory from './pages/AssetCategory'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'


function RootGate() {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-mono text-micro text-muted-foreground">
        Loading...
      </div>
    )
  }
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
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootGate />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/overview" element={<Overview />} />
              <Route path="/market" element={<Market />} />
              <Route path="/market/:panel" element={<MarketDetail />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/assets/buy" element={<AddAsset />} />
              <Route path="/assets/:category" element={<AssetCategory />} />
              {/* Eski route'lar yönlendirmesi */}
              <Route path="/gold-fx" element={<Navigate to="/market/gold-fx" replace />} />
              {/* Analiz yeniden tasarlanana kadar menüde yok (bkz. mobil faz 1 spec §3.1) */}
              <Route path="/analytics" element={<Navigate to="/overview" replace />} />
              <Route path="/portfolios" element={<Navigate to="/assets" replace />} />
              <Route path="/portfolios/:id" element={<Navigate to="/assets" replace />} />
              <Route path="/transactions" element={<Navigate to="/assets" replace />} />
            </Route>
          </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  )
}
