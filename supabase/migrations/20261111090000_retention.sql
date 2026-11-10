-- ============================================================================
-- BEN&FIT — Migration "rétention" : engagement, objectifs, notifications
-- À coller dans Supabase > SQL Editor > New query > Run (idempotent).
--
-- ✅ NON DESTRUCTIVE : aucune table, colonne, ligne ou policy supprimée.
--    On AJOUTE des colonnes, des tables et des autorisations.
-- ✅ Le coach garde son accès complet à tous les athlètes.
-- Prérequis : 20261110120000_securite_roles.sql déjà appliquée.
-- ============================================================================

-- ── 1. Date de début d'engagement (saisie par le coach) ─────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS engagement_start date;

-- Pré-remplissage UNIQUEMENT pour les athlètes qui n'en ont pas encore :
-- date de création du compte (le coach corrige ensuite dans la fiche client).
UPDATE public.profiles
SET engagement_start = created_at::date
WHERE engagement_start IS NULL
  AND role = 'client'
  AND created_at IS NOT NULL;

-- engagement_start rejoint la liste des champs que seul le coach modifie
-- (même fonction que la migration sécurité, avec un champ en plus).
CREATE OR REPLACE FUNCTION public.benfit_protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_j jsonb := to_jsonb(OLD);
  new_j jsonb := to_jsonb(NEW);
  col   text;
  coach_only_cols text[] := ARRAY[
    'archived', 'archived_at', 'offer', 'coach_note', 'coach_notes',
    'session_target', 'current_cycle_name', 'engagement_start'
  ];
BEGIN
  IF public.benfit_is_privileged() THEN
    RETURN NEW;
  END IF;
  IF (new_j -> 'role') IS DISTINCT FROM (old_j -> 'role')
     OR (new_j -> 'coach_id') IS DISTINCT FROM (old_j -> 'coach_id') THEN
    RAISE EXCEPTION 'Modification du rôle ou du coach non autorisée'
      USING ERRCODE = '42501';
  END IF;
  IF NOT public.benfit_is_coach() THEN
    FOREACH col IN ARRAY coach_only_cols LOOP
      IF (new_j -> col) IS DISTINCT FROM (old_j -> col) THEN
        RAISE EXCEPTION 'Champ réservé au coach : %', col
          USING ERRCODE = '42501';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;


-- ── 2. Objectifs (Athlete Assessment) ───────────────────────────────────────
-- La table existait dans le schéma d'origine sans être utilisée par l'app :
-- on la crée si besoin et on complète les colonnes manquantes.
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS icon text DEFAULT '🎯';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS target_value numeric;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS current_value numeric DEFAULT 0;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS baseline_value numeric;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS unit text DEFAULT 'kg';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS lower_is_better boolean DEFAULT false;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS achieved_at timestamptz;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='goals' AND policyname='benfit_goals_coach_all') THEN
    CREATE POLICY benfit_goals_coach_all ON public.goals FOR ALL
      USING (public.benfit_is_coach()) WITH CHECK (public.benfit_is_coach());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='goals' AND policyname='benfit_goals_client_select') THEN
    CREATE POLICY benfit_goals_client_select ON public.goals FOR SELECT
      USING (client_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='goals' AND policyname='benfit_goals_client_update') THEN
    CREATE POLICY benfit_goals_client_update ON public.goals FOR UPDATE
      USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
  END IF;
END $$;

-- L'athlète ne peut mettre à jour QUE sa valeur actuelle (pas la cible, ni le nom).
CREATE OR REPLACE FUNCTION public.benfit_protect_goal_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  IF public.benfit_is_privileged() OR public.benfit_is_coach() THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'current_value' - 'updated_at' - 'achieved_at')
     IS DISTINCT FROM (to_jsonb(OLD) - 'current_value' - 'updated_at' - 'achieved_at') THEN
    RAISE EXCEPTION 'Seule la valeur actuelle de l''objectif est modifiable'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS benfit_protect_goal_columns ON public.goals;
CREATE TRIGGER benfit_protect_goal_columns
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.benfit_protect_goal_columns();


-- ── 3. Cycles : l'athlète peut LIRE ses propres cycles (bilan de cycle) ─────
DO $$
BEGIN
  IF to_regclass('public.cycles') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cycles' AND policyname='benfit_cycles_client_select') THEN
    CREATE POLICY benfit_cycles_client_select ON public.cycles FOR SELECT
      USING (client_id = auth.uid());
  END IF;
END $$;


-- ── 4. Notifications push : abonnements des téléphones ──────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='push_subscriptions' AND policyname='benfit_push_own') THEN
    CREATE POLICY benfit_push_own ON public.push_subscriptions FOR ALL
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Journal des notifications envoyées (évite d'envoyer 2 fois le même rappel).
-- Aucune policy : lisible/écrivable uniquement par le serveur (clé service).
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  ref text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  UNIQUE (user_id, kind, ref)
);
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;


-- ── 5. VÉRIFICATION ─────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM information_schema.columns
     WHERE table_schema='public' AND table_name='profiles' AND column_name='engagement_start') AS colonne_engagement,
  (SELECT count(*) FROM public.profiles WHERE role='client' AND engagement_start IS NOT NULL) AS athletes_avec_date,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND policyname LIKE 'benfit_%') AS autorisations_benfit,
  to_regclass('public.push_subscriptions') IS NOT NULL AS table_notifications_ok;
-- Attendu : colonne_engagement = 1, autorisations_benfit ≥ 4, table_notifications_ok = true

-- ============================================================================
-- ROLLBACK (ne supprime aucune donnée d'athlète) :
--   DROP TRIGGER IF EXISTS benfit_protect_goal_columns ON public.goals;
--   DROP POLICY IF EXISTS benfit_cycles_client_select ON public.cycles;
--   (les colonnes/tables ajoutées peuvent rester, elles ne gênent pas)
-- ============================================================================
