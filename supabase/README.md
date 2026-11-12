# Base de données Supabase

## `migrations/`

Scripts SQL à appliquer **dans l'ordre du nom de fichier** (date en préfixe),
via Supabase → SQL Editor. Chaque script est idempotent (peut être relancé
sans risque) et ne supprime aucune donnée.

| Fichier                                   | Rôle                                                                           | Appliqué ?                               |
| ----------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------- |
| `20261110120000_securite_roles.sql`       | Empêche l'auto-promotion en coach                                              | ☐ (voir `docs/SECURITE-2026-11-10.md`)   |
| `20261110130000_bilans_semaine_lundi.sql` | Recale les bilans datés d'un dimanche sur le lundi                             | ☐ (voir `docs/BUGS-DATES-2026-11-10.md`) |
| `20261111090000_retention.sql`            | Engagement, objectifs, notifications push                                      | ☐ (voir `docs/RETENTION-2026-11-11.md`)  |
| `20261111120000_engagement_fin.sql`       | Date de fin d'engagement (pré-remplie début + 12 sem.)                         | ☐                                        |
| `20261112210000_durcissement_regles.sql`  | Messages non modifiables, objectifs limités aux athlètes du coach              | ☐                                        |
| `20261112220000_vues_securite.sql`        | Les vues `cycle_alerts` et `exercises_canonical` respectent les règles d'accès | ☐                                        |

Coche la case dans ce tableau quand c'est fait, pour garder une trace.

## `legacy/`

Anciens scripts, **conservés pour l'historique mais obsolètes** :
`supabase-schema.sql` ne contient pas 10 tables utilisées par l'app
(`bilans`, `cycles`, `coach_tasks`, `cycle_alerts`, `nutrition_logs`,
`nutrition_log_meals`, `workout_logs`, `workout_block_results`,
`calendar_notes`, `foods`) et ses policies diffèrent de la prod.
**Ne pas le rejouer sur la base de production.**

## À faire : versionner le vrai schéma

Aujourd'hui, la seule source de vérité du schéma est la base de prod. Pour
l'avoir dans le repo (indispensable pour reconstruire la base, auditer les
policies ou créer un environnement de test) :

```bash
npm install -g supabase          # ou: brew install supabase/tap/supabase
supabase login
supabase link --project-ref <ref-du-projet>   # visible dans l'URL du dashboard
supabase db pull                 # génère supabase/migrations/<date>_remote_schema.sql
```

`db pull` est en **lecture seule** sur la prod : il exporte la structure
(tables, policies, fonctions, triggers), pas les données.

Les Edge Functions (`delete-client`, …) se récupèrent de la même façon :

```bash
supabase functions download delete-client
```

## `audit/`

Exports des règles d'accès réelles de la base (lecture seule), pour garder une trace de ce qui est en production.
