import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Garde-fou production : si ces variables manquent au déploiement (Vercel
// mal configuré, .env oublié...), on veut une erreur claire au build/boot
// plutôt qu'un crash silencieux plus tard sur le premier appel réseau
// ("Failed to fetch" incompréhensible pour l'utilisateur final).
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
    !supabaseAnonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ')

  // Côté serveur (SSR/build) : on fait échouer fort et tôt.
  // Côté navigateur : on log une erreur explicite sans casser tout le bundle.
  if (typeof window === 'undefined') {
    throw new Error(
      `[lib/supabase] Variables d'environnement manquantes : ${missing}. ` +
      `Vérifie ton fichier .env.local (voir .env.example) ou la configuration Vercel.`
    )
  } else {
    // eslint-disable-next-line no-console
    console.error(
      `[lib/supabase] Configuration incomplète : ${missing} manquant(e)s. ` +
      `L'application ne pourra pas contacter Supabase.`
    )
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.invalid',
  supabaseAnonKey || 'placeholder-anon-key'
)
