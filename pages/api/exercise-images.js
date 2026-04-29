export default async function handler(req, res) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  try {
    const { createClient } = await import('@supabase/supabase-js')

    // 1. Essai avec service role key → peut lister storage.objects sans RLS
    if (SERVICE_KEY) {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY)
      const { data: storageData } = await admin
        .storage.from('exercise-images')
        .list('', { limit: 500, sortBy: { column: 'name', order: 'asc' } })

      if (storageData && storageData.length > 0) {
        const files = storageData
          .map(f => f.name)
          .filter(n => n && /\.(jpg|jpeg|png|gif|webp)$/i.test(n))
          .sort((a, b) => a.localeCompare(b, 'fr'))
        return res.status(200).json({ files, source: 'storage' })
      }
    }

    // 2. Fallback : lire storage.objects via SQL (fonctionne avec anon si RLS permissive)
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY || ANON_KEY)
    const { data: sqlData } = await supabase
      .rpc('list_exercise_images')
      .single()

    if (sqlData?.files?.length > 0) {
      return res.status(200).json({ files: sqlData.files, source: 'rpc' })
    }

    // 3. Fallback : lire exercise_image_library (table qu'on maintient manuellement)
    const { data: libData } = await supabase
      .from('exercise_image_library')
      .select('filename')
      .order('filename')

    if (libData && libData.length > 0) {
      const files = [...new Set(libData.map(r => r.filename).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'fr'))
      return res.status(200).json({ files, source: 'library' })
    }

  } catch (e) {
    console.error('exercise-images API error:', e.message)
  }

  // 4. Dernier recours : liste statique (ne devrait jamais être atteint si service key ok)
  res.status(200).json({
    files: [],
    source: 'empty',
    error: 'No service role key configured or storage empty'
  })
}
