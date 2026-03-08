-- ============================================
-- LE PAVILLON — Schéma Supabase
-- Colle ce script dans Supabase > SQL Editor
-- ============================================

-- 1. PROFILES (clients + coach)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'client', -- 'client' ou 'coach'
  coach_id UUID REFERENCES profiles(id),
  current_program TEXT DEFAULT 'Phase 1',
  coach_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WORKOUTS (séances assignées par le coach)
CREATE TABLE workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT, -- 'Push', 'Pull', 'Legs', etc.
  day_of_week INT, -- 1=Lun, 7=Dim
  duration_min INT DEFAULT 60,
  duration_max INT DEFAULT 75,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EXERCISES (exercices dans chaque séance)
CREATE TABLE exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INT,
  reps TEXT, -- ex: '8-10' ou '12'
  target_weight TEXT, -- ex: '80' ou 'BW'
  rest TEXT, -- ex: '2 min'
  note TEXT,
  order_index INT DEFAULT 0
);

-- 4. WORKOUT SESSIONS (séances complétées)
CREATE TABLE workout_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES workouts(id),
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT TRUE,
  duration_min INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. NUTRITION PLANS
CREATE TABLE nutrition_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT TRUE,
  target_calories INT,
  target_protein INT,
  target_carbs INT,
  target_fat INT,
  current_protein INT DEFAULT 0,
  current_carbs INT DEFAULT 0,
  current_fat INT DEFAULT 0,
  coach_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MEALS (repas dans un plan)
CREATE TABLE meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nutrition_plan_id UUID REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  time_slot TEXT, -- ex: '07h00'
  day TEXT DEFAULT 'tous', -- 'lundi', 'tous', etc.
  calories INT,
  order_index INT DEFAULT 0
);

-- 7. FOOD ITEMS (aliments dans chaque repas)
CREATE TABLE food_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT DEFAULT 'g',
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0
);

-- 8. MEASURES (pesées & mensurations)
CREATE TABLE measures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight NUMERIC,
  waist_cm NUMERIC,
  chest_cm NUMERIC,
  hips_cm NUMERIC,
  body_fat_pct NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. GOALS (objectifs)
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🎯',
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'kg',
  color TEXT DEFAULT '#C8A85A',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. PERSONAL RECORDS (PRs)
CREATE TABLE personal_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  exercise TEXT NOT NULL,
  weight_kg NUMERIC,
  reps INT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. MESSAGES (chat coach-client)
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SÉCURITÉ — Row Level Security (RLS)
-- Chaque client ne voit QUE ses propres données
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles : chacun voit le sien + le coach voit ses clients
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  auth.uid() = id OR
  auth.uid() = coach_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach' AND id = profiles.coach_id)
);

CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  auth.uid() = id OR
  auth.uid() = coach_id
);

-- Workouts : client voit les siens, coach voit tout
CREATE POLICY "workouts_select" ON workouts FOR SELECT USING (
  auth.uid() = client_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

CREATE POLICY "workouts_all_coach" ON workouts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- Exercises : via workout
CREATE POLICY "exercises_select" ON exercises FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workouts w
    WHERE w.id = exercises.workout_id AND (
      w.client_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    )
  )
);

-- Workout sessions
CREATE POLICY "sessions_select" ON workout_sessions FOR SELECT USING (
  auth.uid() = client_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

CREATE POLICY "sessions_insert" ON workout_sessions FOR INSERT WITH CHECK (
  auth.uid() = client_id
);

-- Nutrition plans
CREATE POLICY "nutrition_plans_select" ON nutrition_plans FOR SELECT USING (
  auth.uid() = client_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- Meals
CREATE POLICY "meals_select" ON meals FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM nutrition_plans np
    WHERE np.id = meals.nutrition_plan_id AND (
      np.client_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    )
  )
);

-- Measures
CREATE POLICY "measures_select" ON measures FOR SELECT USING (
  auth.uid() = client_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

CREATE POLICY "measures_insert" ON measures FOR INSERT WITH CHECK (
  auth.uid() = client_id
);

-- Goals
CREATE POLICY "goals_select" ON goals FOR SELECT USING (
  auth.uid() = client_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- Personal Records
CREATE POLICY "prs_select" ON personal_records FOR SELECT USING (
  auth.uid() = client_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- Messages
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);

CREATE POLICY "messages_update" ON messages FOR UPDATE USING (
  auth.uid() = receiver_id
);

-- ============================================
-- TRIGGER : créer profil automatiquement
-- après inscription d'un utilisateur
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ============================================
-- REALTIME pour les messages
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
