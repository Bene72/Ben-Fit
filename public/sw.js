// Ben&Fit — Service worker de désinstallation.
//
// Une ancienne version de l'app enregistrait un service worker qui mettait en
// cache les pages ('benfit-v1'). Plus aucun code ne l'enregistre, mais les
// navigateurs qui l'avaient installé le gardent et peuvent servir de vieilles
// pages hors-ligne. Ce fichier, récupéré automatiquement par ces navigateurs
// lors de leur vérification de mise à jour, vide le cache puis se désinstalle.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
      await self.registration.unregister()
    })()
  )
})
