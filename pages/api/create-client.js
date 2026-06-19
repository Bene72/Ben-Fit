// pages/api/create-client.js
// Route serveur uniquement — utilise la service_role key, jamais exposée au front.
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  try {
    // ── 1. Vérifie que l'appelant est bien un coach authentifié ──────────
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Non authentifié' })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !caller) {
      console.error('Erreur auth.getUser:', authErr)
      return res.status(401).json({ error: 'Session invalide' })
    }

    const { data: callerProfile, error: profileLookupErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle()

    if (profileLookupErr) {
      console.error('Erreur lookup profil coach:', profileLookupErr, 'caller.id:', caller.id)
      return res.status(500).json({ error: `Impossible de vérifier le rôle coach: ${profileLookupErr.message}` })
    }

    // 🔍 LOG DEBUG — à retirer après fix
    console.log("DEBUG profil coach:", JSON.stringify(callerProfile), "| caller.id:", caller.id, "| caller.email:", caller.email)

    if (callerProfile?.role !== 'coach') {
      console.error('Rôle insuffisant:', callerProfile?.role, 'pour user', caller.id, caller.email)
      return res.status(403).json({ error: `Réservé aux coachs`, debug: { role: callerProfile?.role ?? 'PROFIL INTROUVABLE', userId: caller.id } })
    }

    // ── 2. Validation des champs ──────────────────────────────────────────
    const { email, password, full_name, objective, height, current_program } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '6 caractères minimum pour le mot de passe' })
    }

    // ── 3. Création du compte Auth ────────────────────────────────────────
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // pas besoin de confirmation email pour un compte créé par le coach
    })
    if (createErr) {
      return res.status(400).json({ error: createErr.message })
    }

    // ── 4. Création / mise à jour du profil ──────────────────────────────
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email,
        full_name: full_name || '',
        role: 'client',
        coach_id: caller.id,
        objective: objective || null,
        height: height ? +height : null,
        current_program: current_program || null,
      })
      .select()
      .maybeSingle()

    if (profileErr) {
      // Rollback : si le profil échoue, on supprime le compte auth créé
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return res.status(400).json({ error: profileErr.message })
    }

    return res.status(200).json({ success: true, profile })
  } catch (err) {
    console.error('Erreur create-client:', err)
    return res.status(500).json({ error: err.message || 'Erreur serveur' })
  }
}
