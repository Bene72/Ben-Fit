export default async function handler(req, res) {
  // On utilise les variables déjà présentes (NEXT_PUBLIC_...)
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  try {
    const { createClient } = await import('@supabase/supabase-js')
    
    // On crée le client avec la clé ANON (publique), pas besoin de SERVICE KEY
    const supabase = createClient(SUPABASE_URL, ANON_KEY)

    // On liste les fichiers directement dans le storage
    // Cela fonctionne car tu as activé "Public bucket" à l'étape 1
    const { data, error } = await supabase
      .storage
      .from('exercise-images')
      .list('', {
        limit: 1000, // On récupère jusqu'à 1000 images
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) {
      // Si erreur, c'est souvent que le bucket n'est pas public
      console.error("Erreur Storage:", error)
      return res.status(200).json({ 
        files: [], 
        warning: "Erreur de lecture du bucket. Vérifiez que 'exercise-images' est bien PUBLIC dans Supabase." 
      })
    }

    if (data && data.length > 0) {
      // On filtre pour ne garder que les images (jpg, png, webp...)
      const files = data
        .map(f => f.name)
        .filter(n => n && /\.(jpg|jpeg|png|gif|webp)$/i.test(n))
        .sort((a, b) => a.localeCompare(b, 'fr')) // Tri alphabétique
      
      return res.status(200).json({ 
        files, 
        source: 'storage-public', // Indique que ça vient du storage direct
        count: files.length 
      })
    }

    // Si le dossier est vide
    return res.status(200).json({ files: [], source: 'empty' })

  } catch (e) {
    console.error('API Error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}