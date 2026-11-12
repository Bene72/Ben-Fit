-- ============================================================================
-- BEN&FIT — Durcissement des règles d'accès (audit des règles réelles, 12/11/2026)
-- À coller dans Supabase > SQL Editor > New query > Run (idempotent).
--
-- ✅ NON DESTRUCTIVE : aucune table, colonne ni ligne supprimée.
-- ✅ Le coach garde l'accès complet aux données de SES athlètes.
-- Prérequis : 20261110120000_securite_roles.sql et 20261111090000_retention.sql.
--
-- Ce que l'audit a montré :
--   1. messages — la règle « Receiver can mark as read » laisse le destinataire
--      modifier TOUTE la ligne : un athlète pouvait réécrire le texte d'un
--      message reçu de son coach (et inversement).
--   2. goals — la règle ajoutée le 11/11 (benfit_goals_coach_all) donnait
--      accès aux objectifs de TOUS les athlètes à n'importe quel compte coach.
--      Les règles existantes (goals_coach_manage…) limitent déjà chaque coach
--      à ses propres athlètes : elle est retirée.
--   3. goals — un athlète pouvait créer ou supprimer ses objectifs. Seul le
--      coach les crée / supprime ; l'athlète met à jour sa valeur actuelle.
-- ============================================================================

-- ── 1. Messages : seul le champ « lu » est modifiable ───────────────────────
CREATE OR REPLACE FUNCTION public.benfit_protect_message_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.benfit_is_privileged() THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'read') IS DISTINCT FROM (to_jsonb(OLD) - 'read') THEN
    RAISE EXCEPTION 'Un message envoyé ne peut pas être modifié'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS benfit_protect_message_columns ON public.messages;
CREATE TRIGGER benfit_protect_message_columns
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.benfit_protect_message_columns();


-- ── 2. Objectifs : chaque coach limité à ses propres athlètes ───────────────
DROP POLICY IF EXISTS benfit_goals_coach_all ON public.goals;

-- Filet de sécurité : si aucune autre règle « coach » n'existe sur goals
-- (base différente de celle auditée), on en crée une limitée à ses athlètes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'goals'
      AND policyname IN ('goals_coach_manage', 'goals_coach_all', 'benfit_goals_coach_own')
  ) THEN
    CREATE POLICY benfit_goals_coach_own ON public.goals FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = goals.client_id AND p.coach_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = goals.client_id AND p.coach_id = auth.uid()));
  END IF;
END $$;


-- ── 3. Objectifs : création / suppression réservées au coach ────────────────
CREATE OR REPLACE FUNCTION public.benfit_goals_coach_only_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.benfit_is_privileged() OR public.benfit_is_coach() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'Seul le coach peut créer ou supprimer un objectif'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS benfit_goals_coach_only_write ON public.goals;
CREATE TRIGGER benfit_goals_coach_only_write
  BEFORE INSERT OR DELETE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.benfit_goals_coach_only_write();


-- ── 4. VÉRIFICATION ─────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM pg_trigger WHERE tgname IN ('benfit_protect_message_columns', 'benfit_goals_coach_only_write')) AS protections_installees,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='goals' AND policyname='benfit_goals_coach_all') AS ancienne_regle_trop_large,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='goals' AND cmd IN ('ALL','SELECT')) AS regles_lecture_objectifs;
-- Attendu : protections_installees = 2, ancienne_regle_trop_large = 0, regles_lecture_objectifs ≥ 2

-- ============================================================================
-- ROLLBACK (aucune donnée touchée) :
--   DROP TRIGGER IF EXISTS benfit_protect_message_columns ON public.messages;
--   DROP TRIGGER IF EXISTS benfit_goals_coach_only_write ON public.goals;
-- ============================================================================
