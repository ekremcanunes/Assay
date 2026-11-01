import { createRoot } from 'react-dom/client'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource/ibm-plex-mono/400.css'
import './index.css'
import App from './App.jsx'
import { APP_NAME } from './lib/app'

document.title = APP_NAME

createRoot(document.getElementById('root')).render(<App />)
