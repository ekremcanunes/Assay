import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/geist-mono'
import './index.css'
import App from './App.jsx'
import { APP_NAME } from './lib/app'

document.title = APP_NAME

createRoot(document.getElementById('root')).render(<App />)
