# Ben&Fit App

Application de coaching CrossFit & Hyrox — Next.js + Supabase + Vercel

## Stack
- **Frontend** : Next.js (pages router), Tailwind CSS, DM Sans + Bebas Neue
- **Backend** : Supabase (Auth, Postgres, Storage, RLS)
- **IA** : Groq (génération de programmes), Anthropic Claude (cycles)
- **Deploy** : Vercel

## Structure

```
hooks/          useSupabaseAuth, useSupabaseData
components/
  ui/           Icon, SurfaceCard, StatusBadge, LoadingSpinner, ...
  coach/        Tabs coach (Overview, Bilan, Messages, Gestion...)
  nutrition/    NutritionTab, NutritionShared
lib/
  withAuth.js   Middleware auth + rate limiting API routes
  api.js        Helper apiFetch avec Bearer token auto
  constants.js  DAYS, WORKOUT_TYPES, avatarColor, ...
  services/     Couche data (coach.js, nutrition.js, workouts.js)
pages/api/      Routes IA sécurisées (auth + rate limit + prompt hardcodé)
styles/
  tokens.css         Design tokens CSS (:root)
  ui-foundation.css  Classes utilitaires (.btn, .card, .badge, ...)
  globals.css        Reset + fonts
```

## Variables d'environnement (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
ANTHROPIC_API_KEY=
```

## SQL à appliquer

`supabase-fix-exercises.sql` — à exécuter dans Supabase SQL Editor si pas encore fait.

## Sécurité

- API routes protégées par `withAuth` (token Supabase + rate limiting)
- System prompts hardcodés côté serveur (pas d'injection possible)
- Security headers via `next.config.js` (CSP, HSTS, X-Frame-Options...)
- RLS Supabase sur toutes les tables
