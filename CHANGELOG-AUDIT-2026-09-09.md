# Correctifs sécurité — 09/09/2026

Suite à l'audit du même jour, tous les points de sécurité identifiés (S1 à S5) ont été corrigés. Build (`npm run build`) et lint (`npx eslint`) validés sans erreur après modifications.

## S1 — Route API orpheline exposée sans contrôle de rôle
**Fichier :** `pages/api/generate-cycle.js`
`generate-cycle` n'était appelée par aucun composant frontend mais restait accessible à tout utilisateur authentifié (pas de `requireCoach`), qui aurait pu déclencher des appels Anthropic payants.
→ Verrouillée en `withAuth(handler, { requireCoach: true })`.
**À valider avec toi :** si cette route n'est en fait jamais destinée à être utilisée, il vaut mieux la supprimer complètement plutôt que de la garder même verrouillée (surface d'attaque = 0 fichier).

## S2 — `Authorization` reconstruit à la main à 5 endroits, sans vérifier la session
**Nouveau fichier :** `lib/api.js` — expose `apiFetch()` / `apiFetchJson()`, qui centralisent l'appel aux routes `/api/*` protégées et lèvent une `SessionExpiredError` lisible si la session est absente/expirée, au lieu de planter avec une `TypeError` générique.
**Fichiers modifiés :**
- `pages/coach.js` (`archiveClient`, `unarchiveClient`) → utilisent `apiFetch()`
- `components/coach/CreateClientModal.jsx` → utilise `apiFetch()`, import `supabase` retiré (devenu inutile)
- `lib/coachShared.js` (`callEdgeFunction`) → vérifie maintenant `session?.access_token` avant de l'utiliser
- `components/coach/GestionTab.jsx` → sa copie dupliquée de `callEdgeFunction` a été supprimée ; importe désormais celle de `lib/coachShared.js`

## S3 — Rate-limit par email basé sur une "fausse requête" fragile
**Fichier :** `lib/rateLimit.js`
`isAllowed()` n'acceptait qu'un objet `req` dont il extrayait l'IP ; le rate-limit par email (`login-guard.js`) détournait ce mécanisme avec `{ headers: { 'x-forwarded-for': 'email:...' } }`, un hack qui casserait silencieusement si `getClientIp()` évoluait.
→ Ajout de `isAllowedByKey(key, options)`, qui prend directement une clé de comptage arbitraire. `isAllowed()` (utilisé pour les limites par IP) est réécrit par-dessus cette même brique.
**Fichier modifié :** `pages/api/login-guard.js` → utilise `isAllowedByKey('login-email:'+email, ...)` directement, sans fausse requête.

## S4 — CSP avec `'unsafe-inline'` sur `script-src`
**Fichiers modifiés :** `middleware.js`, `next.config.js`, `pages/_document.js`
Le CSP était statique (`next.config.js`) et autorisait `'unsafe-inline'` sur `script-src`, ce qui neutralise une grande partie de la protection anti-XSS d'une CSP.
→ CSP déplacé dans `middleware.js`, désormais généré **par requête** avec un nonce aléatoire (`crypto.randomUUID()`), combiné à `'strict-dynamic'` (recette officielle Next.js). Le middleware tourne maintenant sur toutes les pages (hors `/api`, assets statiques) pour injecter ce nonce partout, tout en gardant strictement inchangée la logique de protection existante des routes `/coach` et `/agent-bilan`. `pages/_document.js` récupère le nonce (header `x-nonce`) et l'applique à `<NextScript>`.
`style-src` garde `'unsafe-inline'` : l'app utilise `styled-jsx` (`AppNav.js`, `pages/training.js`) et des centaines de `style={{...}}` React — risque XSS-via-CSS nettement plus faible, et un passage à un nonce sur les styles demanderait de reconfigurer `styled-jsx` partout sans pouvoir tout re-tester visuellement ici. À ré-évaluer si `styled-jsx` est abandonné un jour.
**Petit changement fonctionnel à noter :** `api.groq.com` a été retiré de `connect-src` (aucune référence à Groq trouvée ailleurs dans le code — si vous l'utilisez côté client quelque part que je n'ai pas vu, dites-le-moi et je le rajoute).

## S5 — Aucun avertissement si le rate limiting distribué (Upstash) est absent en prod
**Fichier :** `lib/rateLimit.js`
→ `console.warn` explicite au chargement du module si `NODE_ENV === 'production'` et qu'Upstash n'est pas configuré, pour que ça ne passe plus inaperçu dans les logs.

---

**Validation effectuée :** `npm install`, `npx eslint` sur tous les fichiers modifiés (aucune erreur), `npm run build` (build complet réussi, 15 pages générées, middleware 83 kB).

**Reste à faire de ton côté avant déploiement :**
1. Confirmer le sort de `generate-cycle` (garder verrouillée vs. supprimer, voir S1).
2. Tester le flux `/coach` (login, archive/désarchive client, création client, suppression client) en environnement réel — mes tests de validation ont porté sur le build/lint, pas sur un test fonctionnel avec un vrai Supabase.
3. Vérifier dans les DevTools (onglet Network → Headers de n'importe quelle page) que le `Content-Security-Policy` contient bien `'nonce-...'` et que la console ne remonte aucune erreur CSP bloquée — un onglet console propre confirme que le nonce fonctionne partout.
