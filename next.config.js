/** @type {import('next').NextConfig} */

// ⚠️ Remplace par ton domaine Supabase réel, ex: 'abcdefghijk.supabase.co'
const SUPABASE_DOMAIN = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : 'your-project.supabase.co'

const securityHeaders = [
  // Empêche le clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Empêche le MIME sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Force HTTPS pour 1 an
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  // Contrôle les infos de referrer
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Désactive les APIs sensibles inutiles
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // Isolation cross-origin
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // Content-Security-Policy : bloque l'exécution de scripts/styles non autorisés
  // 'unsafe-inline' sur script-src est nécessaire pour les scripts inline générés par Next.js
  // (hydration data). Si tu utilises un nonce-based CSP plus strict plus tard, retire-le.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `img-src 'self' data: blob: https://${SUPABASE_DOMAIN}`,
      `connect-src 'self' https://${SUPABASE_DOMAIN} wss://${SUPABASE_DOMAIN} https://api.anthropic.com https://api.groq.com`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  // Optimisations images Next.js
  images: {
    domains: [SUPABASE_DOMAIN],
  },

  // Permet les appels API internes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig
