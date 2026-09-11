-- ============================================================
-- BEN&FIT — Fix Bug : exercices invisibles pour les clients
-- Colle ce script dans Supabase > SQL Editor > Run
-- ============================================================
-- DIAGNOSTIC : 2 causes
-- 1. Colonnes manquantes sur workouts et exercises
-- 2. RLS manquante : le coach ne peut pas INSERT/UPDATE/DELETE les exercises
-- ============================================================

-- ── 1. COLONNES MANQUANTES sur workouts ─────────────────────

ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS is_archived       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cycle_name        TEXT,
  ADD COLUMN IF NOT EXISTS archived_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_cycle_name TEXT;

-- Index utile pour le filtre is_archived
CREATE INDEX IF NOT EXISTS idx_workouts_client_archived
  ON workouts (client_id, is_archived);

-- ── 2. COLONNES MANQUANTES sur exercises ────────────────────

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS group_type  TEXT DEFAULT 'Normal',
  ADD COLUMN IF NOT EXISTS group_id    TEXT,
  ADD COLUMN IF NOT EXISTS image_url   TEXT;

-- ── 3. RLS MANQUANTE : coach peut INSERT/UPDATE/DELETE exercises ──

-- Le coach peut insérer des exercices dans n'importe quel workout
CREATE POLICY IF NOT EXISTS "exercises_all_coach"
  ON exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

-- Le client peut INSERT ses propres logs d'exercice (si besoin futur)
-- (la policy SELECT existante couvre déjà la lecture pour le client)

-- ── 4. RLS MANQUANTE : workouts INSERT/UPDATE/DELETE pour coach ──
-- (workouts_all_coach existe pour ALL mais vérifie qu'elle couvre bien INSERT)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workouts'
    AND policyname = 'workouts_all_coach'
  ) THEN
    CREATE POLICY "workouts_all_coach"
      ON workouts FOR ALL
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
      );
  END IF;
END $$;

-- ── 5. VÉRIFICATION ─────────────────────────────────────────
-- Après avoir exécuté ce script, vérifie que :
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'workouts' ORDER BY column_name;
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'exercises' ORDER BY column_name;
--
-- SELECT policyname, cmd FROM pg_policies
-- WHERE tablename IN ('workouts','exercises') ORDER BY tablename, policyname;

SELECT 'Fix appliqué avec succès ✅' AS status;
