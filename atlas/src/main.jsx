import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './styles.css'
import Home from './pages/Home'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/flow/:id', element: <Home /> },
  { path: '/terms', element: <Home /> },
  { path: '*', element: <Home /> },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
