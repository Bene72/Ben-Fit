# 🚀 Guide de déploiement — Le Pavillon

## Ce que tu vas faire (en 1h environ)

1. Créer ton projet Supabase (base de données + auth)
2. Créer ton compte GitHub et uploader le code
3. Déployer sur Vercel (mise en ligne gratuite)
4. Créer ton compte coach + tes 30 clients

---

## ÉTAPE 1 — Supabase (base de données)

### 1.1 Créer un compte
1. Va sur **supabase.com** → "Start for free"
2. Inscris-toi avec GitHub ou email
3. Clique **"New project"**
4. Choisis un nom (ex: `le-pavillon`), un mot de passe fort, région `West EU`
5. Attends ~2 minutes le temps de la création

### 1.2 Configurer la base de données
1. Dans le menu gauche → **SQL Editor**
2. Clique **"New query"**
3. **Copie-colle tout le contenu** du fichier `supabase-schema.sql`
4. Clique **"Run"** (bouton vert)
5. Tu dois voir "Success" en bas ✅

### 1.3 Récupérer tes clés
1. Menu gauche → **Project Settings** → **API**
2. Note ces 2 valeurs :
   - `Project URL` → commence par `https://xxxxx.supabase.co`
   - `anon public` key → longue chaîne de caractères

---

## ÉTAPE 2 — GitHub (stockage du code)

### 2.1 Créer un compte GitHub
1. Va sur **github.com** → "Sign up" (gratuit)

### 2.2 Uploader le code
1. Clique **"New repository"** → nomme-le `le-pavillon`
2. Laisse en **Public** (nécessaire pour Vercel gratuit)
3. Clique **"uploading an existing file"**
4. Glisse-dépose **tous les fichiers** du dossier que tu as reçu
5. Clique **"Commit changes"**

---

## ÉTAPE 3 — Vercel (mise en ligne)

### 3.1 Créer un compte
1. Va sur **vercel.com** → "Sign Up" avec ton compte GitHub
2. Autorise Vercel à accéder à GitHub

### 3.2 Déployer
1. Clique **"Add New Project"**
2. Sélectionne le repo `le-pavillon`
3. Clique **"Import"**
4. ⚠️ **IMPORTANT** — avant de déployer, ajoute les variables d'environnement :
   - Clique **"Environment Variables"**
   - Ajoute : `NEXT_PUBLIC_SUPABASE_URL` = ta Project URL
   - Ajoute : `NEXT_PUBLIC_SUPABASE_ANON_KEY` = ta clé anon
5. Clique **"Deploy"**
6. Attends ~2 minutes ⏳
7. Vercel te donne une URL type `le-pavillon.vercel.app` 🎉

---

## ÉTAPE 4 — Créer ton compte coach

### 4.1 Créer le compte coach dans Supabase
1. Supabase → **Authentication** → **Users** → "Add user"
2. Entre ton email + mot de passe
3. Clique "Add user"

### 4.2 Passer en mode "coach"
1. Supabase → **Table Editor** → table `profiles`
2. Trouve ta ligne (ton email)
3. Change le champ `role` de `client` à `coach`
4. Sauvegarde

### 4.3 Accéder au dashboard coach
1. Va sur `ton-app.vercel.app`
2. Connecte-toi avec ton email/mdp
3. Tu seras redirigé vers `/coach` automatiquement ✅

---

## ÉTAPE 5 — Ajouter tes 30 clients

### Pour chaque client :
1. Supabase → **Authentication** → **Users** → "Add user"
2. Entre l'email du client + mot de passe temporaire (ex: `Pavillon2025!`)
3. Va dans **Table Editor** → `profiles`
4. Trouve la ligne du client
5. Remplis :
   - `full_name` → prénom nom
   - `role` → `client`
   - `coach_id` → ton propre UUID (visible dans ta ligne profiles)

### Envoyer l'accès au client :
> Objet : Ton espace coaching Le Pavillon est prêt 🎉
>
> Bonjour [Prénom],
>
> Ton espace de coaching personnel est maintenant accessible :
> 👉 https://le-pavillon.vercel.app
>
> Email : [leur email]
> Mot de passe temporaire : Pavillon2025!
>
> Je te conseille de changer ton mot de passe après ta première connexion.
>
> À bientôt,
> Benjamin

---

## ÉTAPE 6 — Configurer un client (exemple)

### Ajouter une séance :
1. Table Editor → `workouts` → Insert row :
   - `client_id` : UUID du client
   - `name` : "Push A"
   - `type` : "Push"
   - `day_of_week` : 1 (Lundi)
   - `duration_min` : 60

2. Table Editor → `exercises` → Insert rows :
   - `workout_id` : l'ID de la séance créée
   - `name` : "Développé couché"
   - `sets` : 4
   - `reps` : "8-10"
   - `target_weight` : "80"
   - `rest` : "2 min"

### Ajouter un plan nutritionnel :
1. Table Editor → `nutrition_plans` → Insert row :
   - `client_id` : UUID du client
   - `active` : true
   - `target_calories` : 2100
   - `target_protein` : 180
   - `target_carbs` : 250
   - `target_fat` : 60

---

## 💡 Conseils pratiques

**Domaine personnalisé (optionnel)**
- Achète `lepavillon.fr` sur OVH (~8€/an)
- Dans Vercel → Settings → Domains → ajoute ton domaine

**Mot de passe oublié**
- Supabase gère ça automatiquement via email
- Configuration dans Supabase → Authentication → Email Templates

**Sauvegardes**
- Supabase sauvegarde automatiquement chaque jour sur le plan gratuit

---

## Récapitulatif des URLs utiles

| Service | URL |
|---------|-----|
| Ton app | `https://le-pavillon.vercel.app` |
| Dashboard coach | `https://le-pavillon.vercel.app/coach` |
| Supabase | `https://supabase.com/dashboard` |
| Vercel | `https://vercel.com/dashboard` |

---

## En cas de problème

**"Invalid API key"** → Vérifie les variables d'environnement dans Vercel
**"Permission denied"** → Le script SQL n'a pas été exécuté correctement, relance-le
**Page blanche** → Ouvre la console du navigateur (F12) et note l'erreur

Questions ? Reviens ici et je t'aide 🙂
