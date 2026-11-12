-- ============================================================================
-- BEN&FIT — Les vues respectent les règles d'accès (audit du 12/11/2026)
-- À coller dans Supabase > SQL Editor > New query > Run (idempotent).
--
-- ✅ NON DESTRUCTIVE : aucune donnée ni vue supprimée, seule une option change.
--
-- Problème : une vue Postgres s'exécute par défaut avec les droits de son
-- créateur et IGNORE les règles d'accès (RLS) des tables qu'elle lit.
--   - cycle_alerts        → exposait à tout compte (et à la clé publique
--                           « anon ») le nom complet et le cycle de tous les
--                           athlètes de tous les coachs
--   - exercises_canonical → exposait tous les exercices de tous les programmes
-- Avec security_invoker, la vue applique les règles de la personne connectée :
-- le coach voit ses athlètes, l'athlète voit ses propres lignes.
--
-- exercise_alias_lookup (dictionnaire de noms d'exercices, aucune donnée
-- personnelle) est laissée telle quelle pour que exercises_canonical continue
-- de résoudre les noms.
-- ============================================================================

ALTER VIEW IF EXISTS public.cycle_alerts        SET (security_invoker = true);
ALTER VIEW IF EXISTS public.exercises_canonical SET (security_invoker = true);

-- La clé publique (visiteur non connecté) n'a aucune raison de lire ces vues.
DO $$
BEGIN
  IF to_regclass('public.cycle_alerts') IS NOT NULL THEN
    REVOKE ALL ON public.cycle_alerts FROM anon;
  END IF;
  IF to_regclass('public.exercises_canonical') IS NOT NULL THEN
    REVOKE ALL ON public.exercises_canonical FROM anon;
  END IF;
END $$;

-- Vérification : les deux premières vues doivent afficher security_invoker=true
SELECT c.relname AS vue,
       coalesce(array_to_string(c.reloptions, ', '), '(aucune option)') AS options
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v'
ORDER BY 1;

-- ============================================================================
-- ROLLBACK :
--   ALTER VIEW public.cycle_alerts        RESET (security_invoker);
--   ALTER VIEW public.exercises_canonical RESET (security_invoker);
-- ============================================================================
