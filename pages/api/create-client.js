// pages/api/create-client.js
// Route serveur uniquement — utilise la service_role key, jamais exposée au front.
import { createClient } from '@supabase/supabase-js'
import { withAuth, checkRateLimit } from '../../lib/withAuth'
import { validate, isEmail, isNonEmptyString, isOptionalString, isNumberInRange } from '../../lib/validate'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  if (checkRateLimit(req, res, { maxRequests: 15, windowMs: 60_000 })) return

  try {
    // ── 1. Validation des champs (withAuth + requireCoach a déjà vérifié l'auth) ─
    const { valid, errors, data } = validate(req.body, {
      email:            isEmail,
      password:         isNonEmptyString(72),     // 72 = limite bcrypt standard
      full_name:        isOptionalString(120),
      objective:        isOptionalString(500),
      height:           v => v ? isNumberInRange(50, 280)(v) : { ok: true, value: null },
      current_program:  isOptionalString(120),
    })

    if (!valid) {
      return res.status(400).json({ error: errors.join(' ; ') })
    }

    if (data.password.length < 6) {
      return res.status(400).json({ error: '6 caractères minimum pour le mot de passe' })
    }

    const { email, password, full_name, objective, height, current_program } = data

    // ── 2. Création du compte Auth ────────────────────────────────────────
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createErr) {
      return res.status(400).json({ error: createErr.message })
    }

    // ── 3. Création / mise à jour du profil ──────────────────────────────
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email,
        full_name: full_name || '',
        role: 'client',
        coach_id: req.user.id,
        objective: objective || null,
        height: height || null,
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

// withAuth gère désormais l'authentification ET la vérification du rôle coach
// (avant ce patch, c'était fait manuellement dans le handler)
export default withAuth(handler, { requireCoach: true })
