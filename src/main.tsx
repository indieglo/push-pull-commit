import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initThemeOnLoad } from './hooks/useTheme'

initThemeOnLoad()

// When a new service worker takes over (autoUpdate just activated fresh JS),
// reload once so the running tab isn't stuck on stale code against a newer IndexedDB schema.
if ('serviceWorker' in navigator) {
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
