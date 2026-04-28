export default async function handler(req, res) {
  // Toujours retourner la liste statique en priorité
  // Le bucket RLS bloque le listing côté serveur sans service role key
  const staticFiles = [
    'Barbell row.jpeg','biceps curl.jpeg','Cable fly.jpeg','Developpe couche.jpeg',
    'Developpe militaire.jpeg','farmer carry.jpeg','Fentes Bulgares.jpeg','fentes marchees.jpeg',
    'Fentes.jpeg','Hack Squat.jpeg','Hip Trust.jpeg','lat pulldown.jpeg','Lateral raise.jpeg',
    'leg curl.jpeg','Leg extension.jpeg','machine adducteur.jpeg','Pec Fly machine.jpeg',
    'pompes.jpeg','push ups.jpeg','Romanian Deadlift.jpeg','row.jpeg','run.jpeg',
    'Skull crusher.jpeg','sled pull.jpeg','sled push.jpeg','squat.jpeg',
    'Standing calf raise.jpeg','walking lunges.jpeg'
  ].sort((a, b) => a.localeCompare(b, 'fr'))

  // Essayer d'enrichir depuis la BDD si possible
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data } = await supabase
      .from('exercise_image_library')
      .select('filename')
      .order('filename')

    if (data && data.length > 0) {
      const dbFiles = [...new Set(data.map(r => r.filename).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'fr'))
      return res.status(200).json({ files: dbFiles })
    }
  } catch (e) {
    // Fallback silencieux
  }

  res.status(200).json({ files: staticFiles })
}
