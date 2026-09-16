# Point 3 de l'audit — Tests unitaires (09/09/2026)

## Contexte
`jest.config.js` et les scripts `npm test` / `npm run verify` existaient déjà, mais **aucun fichier de test n'était présent** dans le repo : `npm test` échouait avec "no tests found".

## Correctif appliqué en cours de route
En reprenant le zip le plus récent (avec les points 1 et 2 déjà faits), `pages/api/login-guard.js` appelait `isAllowedByKey()` alors que cette fonction **n'existait plus** dans `lib/rateLimit.js` — la route de login aurait planté à chaque tentative de connexion en production. `lib/rateLimit.js` a été restauré à la version qui expose `isAllowedByKey()` (fonction dédiée, S3 de l'audit sécurité) et le warning de configuration en production (S5). Aucun autre fichier n'a été touché.

## Fichiers ajoutés
- `lib/__tests__/validate.test.js` — 23 tests sur les validateurs (`isUUID`, `isEmail`, `isBoolean`, `isNonEmptyString`, `isOptionalString`, `isOneOf`, `isNumberInRange`, `validate`). Couvre notamment : normalisation d'email, troncature anti-DoS, rejet de payload malformé, absence de mass-assignment (les champs non déclarés dans le schéma sont ignorés).
- `lib/__tests__/rateLimit.test.js` — 14 tests couvrant le mode mémoire (fenêtre fixe, isolation par IP et par route, expiration de fenêtre), le mode distribué Upstash (autorisation/blocage, fail-open sur erreur HTTP ou réseau), et le warning de configuration en production.
- `lib/__tests__/withAuth.test.js` — 11 tests sur `withAuth()` (401 sans token, 401 sur token invalide, 403 si `requireCoach` et rôle non-coach, fail-closed si la lecture du profil échoue) et `checkRateLimit()` (429 si bloqué, garde-fou contre le bug "await manquant" déjà documenté dans le fichier).

**Total : 52 tests, tous passants.**

## Validation
```
npm test        → 3 suites, 52 tests, tous passants
npm run lint     → 0 erreur, 3 warnings préexistants sans rapport (voir ci-dessous)
npm run verify   → échoue à cause de --max-warnings=0 sur ces 3 warnings préexistants
```

## Ce qui reste hors périmètre de ce point 3
`npm run verify` échoue encore, mais pour une raison indépendante des tests ajoutés : le script lint utilise `--max-warnings=0`, et 3 warnings préexistants trainent dans le code (2× `<img>` à migrer vers `next/image` dans `components/ui/AppShell.js` et `pages/index.js`, 1× dépendance manquante dans un `useEffect` de `pages/messages.js`). Ce sont les points 4/5 de la liste de priorisation de l'audit initial (découpage des gros composants / nettoyage progressif), pas ce point 3 — je ne les ai pas touchés pour rester dans le périmètre demandé. Dites-moi si vous voulez que je les corrige pour que `npm run verify` passe intégralement.
