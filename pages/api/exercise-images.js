export default async function handler(req, res) {
  // Cache Vercel pour perf
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  
  try {
    const { createClient } = await import('@supabase/supabase-js')
    
    // Utiliser la service role key pour lire le bucket
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 
    if (!serviceKey && !anonKey) {
      return res.status(500).json({ error: 'Aucune clé Supabase configurée' })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceKey || anonKey
    )

    // Lire DIRECTEMENT le bucket storage.objects
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
      console.log(`[exercise-images] ${sorted.length} fichiers trouvés dans le bucket`)
      return res.status(200).json({ files: sorted, source: 'bucket' })
    }

    // Fallback sur la table exercise_image_library si bucket vide
    const {  dbData } = await supabase
      .from('exercise_image_library')
      .select('filename')
      .order('filename')

    if (dbData && dbData.length > 0) {
      const dbFiles = [...new Set(dbData.map(r => r.filename).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'fr'))
      return res.status(200).json({ files: dbFiles, source: 'db' })
    }

    console.warn('[exercise-images] Aucun fichier trouvé dans le bucket ni en BDD')
    return res.status(200).json({ files: [], warning: 'Aucune image trouvée. Vérifie SUPABASE_SERVICE_ROLE_KEY dans Vercel.' })
  } catch (e) {
    console.error('[exercise-images] Erreur:', e.message)
    return res.status(500).json({ error: e.message, files: [] })
  }
}