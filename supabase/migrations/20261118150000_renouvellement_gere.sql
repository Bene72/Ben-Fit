-- ============================================================================
-- BEN&FIT — « ✓ Géré » sur les cartes « Renouvellements à préparer »
-- À coller dans Supabase > SQL Editor > New query > Run (idempotent).
--
-- ✅ NON DESTRUCTIVE : on ajoute une colonne, rien n'est supprimé.
-- renewal_handled_for = la date de fin d'engagement que le coach a déjà
-- traitée. La carte disparaît tant que la fin d'engagement ne change pas ;
-- si tu saisis une nouvelle date de fin (renouvellement), la carte
-- reviendra automatiquement 14 jours avant cette nouvelle date.
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS renewal_handled_for date;

-- Vérification : doit renvoyer une ligne
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name = 'renewal_handled_for';
