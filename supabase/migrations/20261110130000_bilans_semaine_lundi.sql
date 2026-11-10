-- ============================================================================
-- BEN&FIT — Bilans : aligner week_start sur le LUNDI
-- À appliquer JUSTE APRÈS le déploiement de la PR "fix/bugs" (voir docs).
--
-- ✅ NON DESTRUCTIVE : aucune ligne supprimée. L'ancienne valeur de chaque
--    week_start est d'abord copiée dans une nouvelle colonne
--    `week_start_avant_20261110`, ce qui permet un retour arrière exact.
--
-- Contexte : la vue coach calculait le début de semaine avec toISOString()
-- (UTC), ce qui en France donnait le DIMANCHE au lieu du lundi. La vue athlète,
-- elle, donnait le lundi. Résultat : un bilan créé côté coach et un bilan créé
-- côté athlète pour la même semaine ne se retrouvaient pas. Le code corrigé
-- utilise partout le lundi ; ce script recale les bilans existants datés d'un
-- dimanche sur le lundi suivant (= le lundi que le code voulait calculer).
-- ============================================================================

-- ── 0. APERÇU AVANT (lecture seule) ─────────────────────────────────────────
SELECT
  count(*)                                                        AS total_bilans,
  count(*) FILTER (WHERE extract(isodow FROM week_start::date) = 7) AS dates_dimanche_a_recaler,
  count(*) FILTER (WHERE extract(isodow FROM week_start::date) = 1) AS deja_lundi,
  count(*) FILTER (WHERE extract(isodow FROM week_start::date) NOT IN (1, 7)) AS autres_jours_non_touches
FROM public.bilans
WHERE week_start IS NOT NULL;


-- ── 1. Sauvegarde de l'ancienne valeur (une seule fois) ─────────────────────
ALTER TABLE public.bilans ADD COLUMN IF NOT EXISTS week_start_avant_20261110 text;

UPDATE public.bilans
SET week_start_avant_20261110 = week_start::text
WHERE week_start_avant_20261110 IS NULL
  AND week_start IS NOT NULL;


-- ── 2. Recalage dimanche → lundi suivant ────────────────────────────────────
-- Ne touche QUE les lignes dont la valeur actuelle est encore celle d'origine
-- (relancer le script ne décale donc jamais deux fois).
UPDATE public.bilans
SET week_start = (week_start::date + 1)
WHERE week_start IS NOT NULL
  AND extract(isodow FROM week_start::date) = 7
  AND week_start::text = week_start_avant_20261110;


-- ── 3. CONTRÔLE : semaines qui ont maintenant 2 bilans pour un même athlète ─
-- (typiquement : un créé par le coach un dimanche + un rempli par l'athlète).
-- Rien n'est fusionné automatiquement : regarde-les et garde celui qui est
-- rempli. Envoie-moi le résultat si tu veux que je t'aide à les fusionner.
SELECT client_id, week_start, count(*) AS nb_bilans, array_agg(id) AS ids
FROM public.bilans
GROUP BY client_id, week_start
HAVING count(*) > 1
ORDER BY week_start DESC;


-- ============================================================================
-- ROLLBACK exact (remet chaque valeur d'origine, ne supprime rien) :
--   UPDATE public.bilans
--   SET week_start = week_start_avant_20261110::date
--   WHERE week_start_avant_20261110 IS NOT NULL;
-- ============================================================================
