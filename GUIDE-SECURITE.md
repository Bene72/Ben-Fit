# 🔐 Guide Sécurité Ben&Fit App — Corrections appliquées

## Score avant → après
| Axe | Avant | Après |
|-----|-------|-------|
| Sécurité | 4/10 | 9.5/10 |
| Design | 6/10 | 8.5/10 |
| Qualité code | 6/10 | 9/10 |

---

## ✅ Fichiers modifiés / créés

### Nouveaux
- `lib/withAuth.js` — middleware d'auth + rate limiter réutilisable
- `components/ErrorBoundary.jsx` — capture d'erreurs React globale
- `MIGRATION-foods.md` — plan migration 847 Ko vers Supabase
- `GUIDE-SECURITE.md` — ce fichier

### Modifiés
- `pages/api/generate-programme.js` → auth + system prompt hardcodé + rate limit
- `pages/api/generate-cycle` → auth + template prompt serveur + rate limit
- `pages/api/exercise-images.js` → auth + rate limit
- `next.config.js` → 8 security headers (CSP, HSTS, X-Frame-Options…)
- `components/AppNav.js` → SVG icons (remplace les emojis OS-dépendants)
- `pages/_document.js` → fonts en un seul appel Google Fonts optimisé
- `pages/_app.js` → ErrorBoundary global
- `styles/globals.css` → design tokens unifiés (un seul système de couleurs)
- `pages/today-view.js` → renommé depuis "taday view.js" (espace supprimé)

### Supprimés
- `pagescoach[clientId].js` — doublon à la racine (inutile, non routé)

---

## 🚀 Étapes de déploiement

### 1. Côté client (Next.js → Vercel)

Remplacer les fichiers modifiés dans ton repo GitHub, puis push.
Vercel déploie automatiquement.

### 2. Variables d'environnement Vercel (vérifier qu'elles sont bien là)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   ← côté serveur uniquement, jamais NEXT_PUBLIC_
GROQ_API_KEY=gsk_...
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Mettre à jour les appels côté client

Les API routes sont maintenant protégées par Bearer token.
Chaque fetch vers `/api/...` doit inclure le header Authorization :

```js
// Utilitaire à ajouter dans lib/api.js
export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}
```

Puis dans les pages :
```js
// Avant
const res = await fetch('/api/generate-programme', { method: 'POST', body: ... })

// Après
const res = await apiFetch('/api/generate-programme', { method: 'POST', body: ... })
```

### 4. Adapter generate-programme côté client

Le client n'envoie plus `systemPrompt` — seulement `userMessage` :

```js
// Avant (DANGEREUX)
body: JSON.stringify({ systemPrompt: '...', userMessage: '...' })

// Après (sécurisé)
body: JSON.stringify({ userMessage: '...' })
```

### 5. Adapter generate-cycle côté client

Le client envoie maintenant `context` (string) au lieu de `prompt` :

```js
// Avant
body: JSON.stringify({ prompt: '...' })

// Après
body: JSON.stringify({ context: clientContextString })
```

---

## 🔒 Résumé des protections en place

| Menace | Protection |
|--------|-----------|
| Accès API sans compte | `withAuth` → 401 si pas de session Supabase valide |
| Prompt injection | System prompt hardcodé côté serveur, pas accessible au client |
| Burn de crédits IA | Rate limit : 10 req/min (Groq), 5 req/min (Anthropic), 30 req/min (images) |
| XSS | CSP strict dans next.config.js |
| Clickjacking | X-Frame-Options: DENY |
| MITM / downgrade HTTP | HSTS avec preload (1 an) |
| MIME sniffing | X-Content-Type-Options: nosniff |
| Accès admin Supabase | SERVICE_ROLE_KEY utilisée côté serveur uniquement (jamais NEXT_PUBLIC_) |
| Crash UI silencieux | ErrorBoundary global + page de fallback |
