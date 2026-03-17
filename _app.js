import { useEffect } from 'react'

export default function App({ Component, pageProps }) {

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('✅ SW registered'))
        .catch(err => console.log('❌ SW error', err))
    }
  }, [])

  return <Component {...pageProps} />
}
