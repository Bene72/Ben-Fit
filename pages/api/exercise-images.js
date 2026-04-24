import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('storage.objects')
      .select('name')
      .eq('bucket_id', 'exercise-images')
      .order('name')

    // Si la query directe échoue, fallback via storage API
    if (error || !data) {
      const { data: storageData, error: storageError } = await supabaseAdmin
        .storage.from('exercise-images').list('', { limit: 500, sortBy: { column: 'name', order: 'asc' } })

      if (storageError) throw storageError

      const files = (storageData || [])
        .filter(f => f.name && !f.name.startsWith('.') && f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
        .map(f => f.name)
        .sort((a, b) => a.localeCompare(b, 'fr'))

      return res.status(200).json({ files })
    }

    const files = (data || [])
      .map(r => r.name)
      .filter(n => n && n.match(/\.(jpg|jpeg|png|gif|webp)$/i))
      .sort((a, b) => a.localeCompare(b, 'fr'))

    res.status(200).json({ files })
  } catch (e) {
    // Fallback : liste statique à jour
    const fallback = [
      'Barbell row.jpeg','biceps curl.jpeg','Cable fly.jpeg','Developpe couche.jpeg',
      'Developpe militaire.jpeg','farmer carry.jpeg','Fentes Bulgares.jpeg','fentes marchees.jpeg',
      'Fentes.jpeg','Hack Squat.jpeg','Hip Trust.jpeg','lat pulldown.jpeg','Lateral raise.jpeg',
      'leg curl.jpeg','Leg extension.jpeg','machine adducteur.jpeg','Pec Fly machine.jpeg',
      'pompes.jpeg','push ups.jpeg','Romanian Deadlift.jpeg','row.jpeg','run.jpeg',
      'Skull crusher.jpeg','sled pull.jpeg','sled push.jpeg','squat.jpeg',
      'Standing calf raise.jpeg','walking lunges.jpeg'
    ].sort((a, b) => a.localeCompare(b, 'fr'))
    res.status(200).json({ files: fallback })
  }
}
