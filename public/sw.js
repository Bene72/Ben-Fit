// Service Worker — Ben&Fit PWA
const CACHE_NAME = 'benfit-v1'
const STATIC_ASSETS = ['/', '/dashboard', '/training', '/nutrition', '/messages', '/bilan']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  // Ne pas intercepter les requêtes Supabase
  if (event.request.url.includes('supabase.co')) return

  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  )
})
