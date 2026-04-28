export default async function handler(req, res) {
  // Lire directement les objets dans le bucket — toujours à jour sans table intermédiaire
  try {
    const { createClient } = await import('@supabase/supabase-js')

    // La service role key contourne le RLS et peut lister le bucket
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!serviceKey && !anonKey) {
      return res.status(500).json({ error: 'Aucune clé Supabase configurée' })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceKey || anonKey
    )

    // Lire directement storage.objects — source de vérité absolue
    // On pagine pour récupérer tous les fichiers (100 par défaut)
    let allFiles = []
    let offset = 0
    const pageSize = 200

    while (true) {
      const { data, error } = await supabase.storage
        .from('exercise-images')
        .list('', {
          limit: pageSize,
          offset,
          sortBy: { column: 'name', order: 'asc' }
        })

      if (error) throw error
      if (!data || data.length === 0) break

      // Filtrer les dossiers et fichiers sans nom
      const files = data
        .filter(f => f.name && !f.id?.endsWith('/'))
        .map(f => f.name)

      allFiles = [...allFiles, ...files]

      if (data.length < pageSize) break
      offset += pageSize
    }

    if (allFiles.length > 0) {
      const sorted = allFiles.sort((a, b) => a.localeCompare(b, 'fr'))
      return res.status(200).json({ files: sorted })
    }

    // Si le listing bucket échoue (ex: anon key sans accès), fallback sur exercise_image_library
    const { data: dbData } = await supabase
      .from('exercise_image_library')
      .select('filename')
      .order('filename')

    if (dbData && dbData.length > 0) {
      const dbFiles = [...new Set(dbData.map(r => r.filename).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'fr'))
      return res.status(200).json({ files: dbFiles, source: 'db' })
    }

    // Dernier recours : liste statique (ne devrait jamais arriver si SUPABASE_SERVICE_ROLE_KEY est en place)
    console.warn('[exercise-images] Aucun fichier trouvé dans le bucket ni en BDD')
    return res.status(200).json({ files: [], warning: 'Aucune image trouvée. Vérifiez SUPABASE_SERVICE_ROLE_KEY dans Vercel.' })

  } catch (e) {
    console.error('[exercise-images] Erreur:', e.message)
    return res.status(500).json({ error: e.message, files: [] })
  }
}
