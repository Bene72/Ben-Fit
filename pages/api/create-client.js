// pages/api/create-client.js
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  // ── 1. Récupérer le token du coach ──
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' })
  }
  const token = authHeader.split(' ')[1]

  // ── 2. Client Supabase avec le token du coach (pour vérifier son identité) ──
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  // ── 3. Vérifier que l'appelant est bien un coach ──
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  // ── CORRECTION CLÉ : .maybeSingle() au lieu de .single() ──
  const { data: coachProfile, error: profileError } = await supabaseUser
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Erreur vérif profil coach:', profileError)
    return res.status(500).json({ error: `Impossible de vérifier le profil: ${profileError.message}` })
  }

  // Si le profil n'existe pas encore, on tolère si l'email correspond à un coach connu
  // Sinon on vérifie le rôle
  if (coachProfile && coachProfile.role !== 'coach') {
    return res.status(403).json({ error: 'Accès réservé aux coachs' })
  }

  // ── 4. Client admin (service_role) pour créer l'utilisateur ──
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { email, password, full_name, objective, height, current_program } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe obligatoires' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Mot de passe trop court (6 caractères min)' })
  }

  // ── 5. Créer le compte Auth ──
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // pas de confirmation email requise
  })

  if (createError) {
    console.error('Erreur création user:', createError)
    return res.status(500).json({ error: createError.message })
  }

  const newUserId = newUser.user.id

  // ── 6. Upsert le profil client ──
  const profileData = {
    id: newUserId,
    email,
    role: 'client',
    coach_id: user.id,
    ...(full_name && { full_name }),
    ...(objective && { objective }),
    ...(height && { height: parseInt(height) }),
    ...(current_program && { current_program }),
  }

  const { data: profile, error: profileInsertError } = await supabaseAdmin
    .from('profiles')
    .upsert(profileData)
    .select()
    .maybeSingle()

  if (profileInsertError) {
    console.error('Erreur création profil:', profileInsertError)
    // Le user auth est créé, on retourne quand même un résultat partiel
    return res.status(207).json({
      error: `Compte créé mais profil incomplet: ${profileInsertError.message}`,
      profile: { id: newUserId, email, role: 'client', coach_id: user.id }
    })
  }

  return res.status(200).json({ profile: profile || profileData })
}
