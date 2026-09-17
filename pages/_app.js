import '../styles/globals.css'
// Thème pastel de l'espace athlète, scopé à `.athlete-theme` (posée par
// AppShell). Ne touche pas l'espace coach : voir styles/tokens.css.
import '../styles/tokens.css'
import ErrorBoundary from '../components/ErrorBoundary'

export default function App({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  )
}
