import '../styles/globals.css'
// Thème pastel de l'espace athlète, scopé à `.athlete-theme` (posée par
// AppShell). Ne touche pas l'espace coach : voir styles/tokens.css.
import '../styles/tokens.css'
// Classes de composants (.ui-card, .ui-button, .ui-textarea…) utilisées par
// pages/bilan.js — mêmes tokens que tokens.css, aucune classe en commun
// avec l'espace coach (vérifié : coach n'utilise ni .card/.btn/.badge ni
// aucune classe .ui-*), donc importable globalement sans risque pour lui.
import '../styles/ui-foundation.css'
import ErrorBoundary from '../components/ErrorBoundary'

export default function App({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  )
}
