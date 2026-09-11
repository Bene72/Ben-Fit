import { Html, Head, Main, NextScript } from 'next/document'

// ⚠️ REVERT D'URGENCE (09/09/2026) : la plomberie de lecture du nonce
// (getInitialProps + header x-nonce) a été retirée en même temps que le CSP
// par nonce dans middleware.js — voir ce fichier pour le détail de
// l'incident. _document.js redevient une simple fonction, comme avant.
export default function Document() {
  return (
    <Html lang="fr">
      <Head>
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0D1B4E" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ben&Fit" />

        {/* Icons iOS */}
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/logo.png" />

        {/* Fonts — chargement unique et optimisé (display=swap pour perf) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
