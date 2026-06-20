/**
 * /api/exercise-images
 * Liste les images d'exercices depuis le Storage Supabase
 * Route publique — les fichiers sont déjà publics dans le bucket
 */
import { checkRateLimit } from '../../lib/withAuth'

async function handler(req, res) {
  if (checkRateLimit(req, res, { maxRequests: 30, windowMs: 60_000 })) return

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  try {
    const { createClient } = await import('@supabase/supabase-js')

    if (SERVICE_KEY) {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY)
      const { data: storageData } = await admin
        .storage.from('exercise-images')
        .list('', { limit: 500, sortBy: { column: 'name', order: 'asc' } })

      if (storageData?.length > 0) {
        const files = storageData
          .map(f => f.name)
          .filter(n => n && /\.(jpg|jpeg|png|gif|webp)$/i.test(n))
          .sort((a, b) => a.localeCompare(b, 'fr'))
        return res.status(200).json({ files, source: 'storage' })
      }
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY || ANON_KEY)

    const { data: libData } = await supabase
      .from('exercise_image_library')
      .select('filename')
      .order('filename')

    if (libData?.length > 0) {
      const files = [...new Set(libData.map(r => r.filename).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'fr'))
      return res.status(200).json({ files, source: 'library' })
    }

  } catch (e) {
    console.error('exercise-images error:', e.message)
  }

  res.status(200).json({ files: [], source: 'empty' })
}

export default handler
