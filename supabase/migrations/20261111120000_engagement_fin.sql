-- ============================================================================
-- BEN&FIT — Date de FIN d'engagement (saisie par le coach)
-- À coller dans Supabase > SQL Editor > New query > Run (idempotent).
--
-- ✅ NON DESTRUCTIVE : on ajoute une colonne, rien n'est supprimé.
-- Les engagements n'ont pas tous la même durée (12 semaines, au mois…) :
-- le coach saisit désormais le début ET la fin. Pré-remplissage : début + 12
-- semaines pour les athlètes qui ont déjà une date de début.
-- Prérequis : 20261111090000_retention.sql déjà appliquée.
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS engagement_end date;

UPDATE public.profiles
SET engagement_end = engagement_start + 83   -- 12 semaines, dernier jour inclus
WHERE engagement_end IS NULL
  AND engagement_start IS NOT NULL
  AND role = 'client';

-- engagement_end rejoint les champs que seul le coach peut modifier
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
    'session_target', 'current_cycle_name', 'engagement_start', 'engagement_end'
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

-- Vérification
SELECT
  count(*) FILTER (WHERE role = 'client') AS athletes,
  count(*) FILTER (WHERE role = 'client' AND engagement_end IS NOT NULL) AS avec_date_de_fin
FROM public.profiles;
-- Attendu : avec_date_de_fin = nombre d'athlètes ayant une date de début.
