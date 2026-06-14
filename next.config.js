/** @type {import('next').NextConfig} */

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
  // CSP : adapté à Next.js + Supabase + Google Fonts + Groq/Anthropic
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts : self + Next.js inline (nonce non dispo en static, unsafe-inline requis)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Styles : self + Google Fonts + inline (Tailwind / styled-jsx)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Images : self + Supabase Storage
      "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
      // Connexions : Supabase + Groq + Anthropic
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.groq.com https://api.anthropic.com",
      // Bloque les iframes
      "frame-ancestors 'none'",
      // Bloque les objets Flash/PDF plugins
      "object-src 'none'",
      // Base URI limitée
      "base-uri 'self'",
      // Form actions
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  async headers() {
    return [
      {
        // Appliqué à toutes les routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  // Optimisations images Next.js
  images: {
    domains: [
      // Remplace par ton projet Supabase réel
      'your-project.supabase.co',
    ],
  },
}

module.exports = nextConfig
