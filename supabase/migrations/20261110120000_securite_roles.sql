-- ============================================================================
-- BEN&FIT — Migration sécurité : empêcher l'auto-promotion en coach
-- À coller dans Supabase > SQL Editor > Run (idempotent : peut être relancée).
--
-- ✅ NON DESTRUCTIVE : aucune table, colonne, ligne ou policy n'est supprimée.
--    On AJOUTE uniquement des fonctions et des triggers de contrôle.
-- ✅ Le coach garde son accès complet à tous les athlètes (policies inchangées).
--
-- Problème corrigé :
--   1. La policy `profiles_update` autorise chaque utilisateur à modifier SA
--      ligne sans restriction de colonne → un athlète pouvait lancer, depuis
--      la console du navigateur :
--        supabase.from('profiles').update({ role: 'coach' }).eq('id', sonId)
--      et obtenir l'accès coach à TOUTES les données (les policies coach
--      vérifient seulement role = 'coach').
--   2. Le trigger `handle_new_user` lit le rôle dans les métadonnées
--      d'inscription → un `signUp({ options: { data: { role: 'coach' } } })`
--      avec la clé anon (publique) créait directement un compte coach.
--
-- Rollback (si besoin, sans aucune perte de données) : voir tout en bas.
-- ============================================================================

-- ── 0. DIAGNOSTIC AVANT (à lire dans les résultats) ─────────────────────────
-- Liste de tous les comptes coach existants. Normalement : toi seul.
-- S'il y a un compte inattendu ici, NE LE SUPPRIME PAS : repasse-le en
-- 'client' (voir requête commentée en bas) et préviens-moi.
SELECT id, email, full_name, role, created_at
FROM public.profiles
WHERE role IS DISTINCT FROM 'client'
ORDER BY created_at;


-- ── 1. Helpers ──────────────────────────────────────────────────────────────

-- Appel "de confiance" : clé service_role (routes /api côté serveur) ou
-- exécution directe en SQL (SQL Editor, fonctions SECURITY DEFINER).
-- Un utilisateur connecté via le navigateur a auth.role() = 'authenticated'.
CREATE OR REPLACE FUNCTION public.benfit_is_privileged()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(auth.role(), '') = 'service_role'
      OR coalesce(auth.role(), '') NOT IN ('authenticated', 'anon')
$$;

-- L'utilisateur courant est-il coach ? SECURITY DEFINER pour lire profiles
-- sans repasser par la RLS (évite toute récursion de policy).
CREATE OR REPLACE FUNCTION public.benfit_is_coach()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coach'
  )
$$;

REVOKE ALL ON FUNCTION public.benfit_is_coach() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.benfit_is_coach() TO authenticated, service_role;


-- ── 2. Protection des colonnes sensibles de profiles ────────────────────────
-- Comparaison via to_jsonb() : fonctionne même si une colonne listée
-- n'existe pas dans ta base (valeur NULL des deux côtés → pas de blocage).
CREATE OR REPLACE FUNCTION public.benfit_protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_j jsonb := to_jsonb(OLD);
  new_j jsonb := to_jsonb(NEW);
  col   text;
  -- Colonnes que seul le coach peut modifier sur la fiche d'un athlète
  coach_only_cols text[] := ARRAY[
    'archived', 'archived_at', 'offer', 'coach_note', 'coach_notes',
    'session_target', 'current_cycle_name'
  ];
BEGIN
  IF public.benfit_is_privileged() THEN
    RETURN NEW;
  END IF;

  -- Personne (même le coach depuis le navigateur) ne change un rôle ou un
  -- rattachement coach : ça passe uniquement par les routes serveur.
  IF (new_j -> 'role') IS DISTINCT FROM (old_j -> 'role')
     OR (new_j -> 'coach_id') IS DISTINCT FROM (old_j -> 'coach_id') THEN
    RAISE EXCEPTION 'Modification du rôle ou du coach non autorisée'
      USING ERRCODE = '42501';
  END IF;

  -- Un athlète qui modifie sa propre fiche ne touche pas aux champs coach.
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

DROP TRIGGER IF EXISTS benfit_protect_profile_columns ON public.profiles;
CREATE TRIGGER benfit_protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.benfit_protect_profile_columns();

-- Un INSERT direct depuis le navigateur ne peut pas créer de coach.
CREATE OR REPLACE FUNCTION public.benfit_protect_profile_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT public.benfit_is_privileged()
     AND NEW.role IS DISTINCT FROM 'client' THEN
    RAISE EXCEPTION 'Création de profil non-client non autorisée'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS benfit_protect_profile_insert ON public.profiles;
CREATE TRIGGER benfit_protect_profile_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.benfit_protect_profile_insert();


-- ── 3. Le rôle n'est plus jamais lu depuis les métadonnées d'inscription ────
-- On ne remplace PAS ta fonction handle_new_user (sa version en prod peut
-- différer de celle du repo) : on retire simplement la clé "role" des
-- métadonnées AVANT qu'elle ne s'exécute. Résultat : COALESCE(..., 'client').
-- Aucun code de l'app n'utilise user_metadata.role (vérifié).
CREATE OR REPLACE FUNCTION public.benfit_strip_role_metadata()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.raw_user_meta_data ? 'role' THEN
    NEW.raw_user_meta_data := NEW.raw_user_meta_data - 'role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS benfit_strip_role_metadata ON auth.users;
CREATE TRIGGER benfit_strip_role_metadata
  BEFORE INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.benfit_strip_role_metadata();


-- ── 4. VÉRIFICATION APRÈS ───────────────────────────────────────────────────
SELECT tgname AS trigger_installe, tgrelid::regclass AS sur_table
FROM pg_trigger
WHERE tgname LIKE 'benfit_%'
ORDER BY tgname;
-- Attendu : 3 lignes (2 sur public.profiles, 1 sur auth.users).


-- ============================================================================
-- (Optionnel) Repasser un compte coach inattendu en client — SANS rien supprimer :
--   UPDATE public.profiles SET role = 'client' WHERE id = '<uuid>';
--
-- ROLLBACK complet (retire uniquement les contrôles, aucune donnée touchée) :
--   DROP TRIGGER IF EXISTS benfit_protect_profile_columns ON public.profiles;
--   DROP TRIGGER IF EXISTS benfit_protect_profile_insert  ON public.profiles;
--   DROP TRIGGER IF EXISTS benfit_strip_role_metadata     ON auth.users;
-- ============================================================================
