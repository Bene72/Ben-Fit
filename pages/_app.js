import '../styles/globals.css'
// Thème pastel de l'espace athlète, scopé à `.athlete-theme` (posée par
// AppShell). Ne touche pas l'espace coach : voir styles/tokens.css.
import '../styles/tokens.css'
// Classes de composants (.ui-card, .ui-button, .ui-textarea…) utilisées par
// pages/bilan.js — mêmes tokens que tokens.css, aucune classe en commun
// avec l'espace coach (vérifié : coach n'utilise ni .card/.btn/.badge ni
// aucune classe .ui-*), donc importable globalement sans risque pour lui.
import '../styles/ui-foundation.css'
// Styles de la page /training (classes .tp-* uniquement)
import '../styles/training.css'
import { useEffect } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'
import { registerServiceWorker } from '../lib/push'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Service worker : notifications push (aucun cache de pages)
    registerServiceWorker()
    // Android/Chrome : on garde l'invitation d'installation pour l'afficher
    // au bon moment (bouton « Installer l'app » de AppPrompt).
    const onPrompt = (e) => {
      e.preventDefault()
      window.__benfitInstallPrompt = e
      window.dispatchEvent(new Event('benfit:installable'))
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  )
}
