export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  
  try {
    const { createClient } = await import('@supabase/supabase-js')
    
    // Utiliser l'anon key (suffisant pour bucket public)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

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

      const files = data
        .filter(f => f.name && !f.id?.endsWith('/'))
        .map(f => f.name)

      allFiles = [...allFiles, ...files]

      if (data.length < pageSize) break
      offset += pageSize
    }

    if (allFiles.length > 0) {
      const sorted = allFiles.sort((a, b) => a.localeCompare(b, 'fr'))
      return res.status(200).json({ files: sorted, source: 'bucket' })
    }

    return res.status(200).json({ files: [], warning: 'Aucune image trouvée' })
  } catch (e) {
    console.error('[exercise-images] Erreur:', e.message)
    return res.status(500).json({ error: e.message, files: [] })
  }
}