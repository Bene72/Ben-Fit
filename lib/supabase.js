import { createBrowserClient } from '@supabase/ssr'

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
  ]
    .filter(Boolean)
    .join(', ')

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

/**
 * MIGRATION 11/07/2026 : createClient() → createBrowserClient() (@supabase/ssr).
 *
 * Avant, la session vivait dans le localStorage du navigateur — invisible
 * pour tout code serveur (middleware, SSR), ce qui rendait impossible une
 * protection des routes /coach avant l'affichage de la page (voir
 * CHANGELOG-ROUND3.md pour le détail de la faille que ça a permis).
 *
 * createBrowserClient stocke la session dans des cookies au lieu du
 * localStorage. Tous les appels existants (supabase.auth.getSession(),
 * supabase.from(...), etc.) continuent de fonctionner à l'identique dans
 * tout le reste du code — c'est un remplacement transparent à ce niveau.
 * Ce qui change : middleware.js peut maintenant lire ces cookies et bloquer
 * l'accès à /coach côté serveur, avant qu'aucune ligne de React ne s'exécute.
 *
 * ⚠️ Effet de bord attendu au déploiement : les sessions existantes stockées
 * en localStorage ne migrent pas automatiquement vers les cookies. Chaque
 * utilisateur (toi y compris) devra se reconnecter une fois après ce déploiement.
 */
export const supabase = createBrowserClient(
  supabaseUrl || 'https://placeholder.invalid',
  supabaseAnonKey || 'placeholder-anon-key'
)
