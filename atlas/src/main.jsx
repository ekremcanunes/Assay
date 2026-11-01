import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './styles.css'
import Home from './pages/Home'
import Flow from './pages/Flow'
import NotFound from './pages/NotFound'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/flow/:id', element: <Flow /> },
  { path: '/terms', element: <Home /> },
  { path: '*', element: <NotFound /> },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
