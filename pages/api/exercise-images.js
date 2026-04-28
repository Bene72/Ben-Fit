export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return res.status(500).json({ error: 'Clé service manquante' })

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey)

    let allFiles = []
    let offset = 0
    const pageSize = 200

    while (true) {
      const { data, error } = await supabase.storage.from('exercise-images').list('', { limit: pageSize, offset })
      if (error) throw error
      if (!data || data.length === 0) break

      const files = data.filter(f => f.name && !f.id?.endsWith('/')).map(f => f.name)
      allFiles = [...allFiles, ...files]
      if (data.length < pageSize) break
      offset += pageSize
    }

    if (allFiles.length > 0) {
      return res.status(200).json({ files: allFiles.sort((a, b) => a.localeCompare(b, 'fr')) })
    }

    const { data: dbData } = await supabase.from('exercise_image_library').select('filename').order('filename')
    if (dbData?.length) {
      const dbFiles = [...new Set(dbData.map(r => r.filename).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'))
      return res.status(200).json({ files: dbFiles, source: 'db' })
    }

    return res.status(200).json({ files: [] })
  } catch (e) {
    console.error('[exercise-images] Erreur:', e)
    return res.status(500).json({ error: e.message, files: [] })
  }
}