# Ben&Fit App

Application de coaching CrossFit & Hyrox — Next.js + Supabase + Vercel

## Stack

- **Frontend** : Next.js 15 (Pages Router), React 18, Tailwind CSS + CSS maison (`styles/`)
- **Backend** : Supabase (Auth, Postgres, Storage, Realtime, RLS, Edge Functions)
- **Deploy** : Vercel
- **Qualité** : ESLint, Prettier, Jest — vérifiés par la CI GitHub Actions à chaque push/PR

## Démarrer en local

```bash
cp .env.example .env.local   # puis remplir les valeurs
npm ci
npm run dev
```

Avant de pousser : `npm run verify` (lint + format + tests).

## Structure

```
pages/              Pages (athlète : dashboard, training, nutrition, bilan, mensurations, messages ;
                    coach : coach.js, coach/[clientId].js, coach/activite.js, agent-bilan.js)
pages/api/          Routes serveur (create-client, archive-client, login-guard)
components/
  ui/               Briques génériques (AppShell, SurfaceCard, Icon, StatusBadge…)
  coach/            Cockpit coach (onglets Programme, Nutrition, Bilan, Gestion, cycles…)
  training/ nutrition/ mensurations/   Écrans athlète
hooks/              useTrainingData, useCurrentUser
lib/
  supabase.js       Client navigateur (@supabase/ssr, session en cookie)
  withAuth.js       Auth + rôle coach pour les routes /api
  rateLimit.js      Rate limit (Upstash Redis si configuré, sinon mémoire)
  api.js            apiFetch() : appels /api avec le token de session
  validate.js       Validation des payloads API
  dateUtils.js      Dates (semaines, jours)
middleware.js       Protection serveur des routes /coach et /agent-bilan
supabase/           Migrations SQL (voir supabase/README.md)
docs/               Guides (déploiement, sécurité, correctifs du 10/11/2026)
```

## Variables d'environnement (Vercel)

Voir `.env.example`. Obligatoires : `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
Recommandées en prod : `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

## Base de données

Les scripts SQL sont dans `supabase/migrations/` — voir `supabase/README.md`
pour l'ordre d'application et pour versionner le vrai schéma de prod.

## Sécurité

- Routes `/api` protégées par `withAuth` (token Supabase + rôle coach) et rate limit
- Routes `/coach*` protégées côté serveur par `middleware.js`
- Rôles protégés en base par triggers (`supabase/migrations/20261110120000_securite_roles.sql`)
- RLS Supabase sur les tables ; en-têtes de sécurité (CSP, HSTS…) dans `next.config.js`
- Détail : `docs/SECURITE-2026-11-10.md`
