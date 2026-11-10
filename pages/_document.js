import { Html, Head, Main, NextScript } from 'next/document'

// ⚠️ REVERT D'URGENCE (09/09/2026) : la plomberie de lecture du nonce
// (getInitialProps + header x-nonce) a été retirée en même temps que le CSP
// par nonce dans middleware.js — voir ce fichier pour le détail de
// l'incident. _document.js redevient une simple fonction, comme avant.
export default function Document() {
  return (
    <Html lang="fr">
      <Head>
        {/* Favicon (onglet navigateur) */}
        <link rel="icon" type="image/png" href="/logo-small.png" />
        <link rel="shortcut icon" type="image/png" href="/logo-small.png" />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0D1B4E" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ben&Fit" />

        {/* Icône iOS (écran d'accueil) — 180×180, image dédiée plus légère que logo.png */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

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
