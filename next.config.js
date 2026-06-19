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
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // Optimisations images Next.js
  images: {
    domains: [
      // Remplace par ton projet Supabase réel
      'your-project.supabase.co',
    ],
  },

  // Permet les appels API internes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
