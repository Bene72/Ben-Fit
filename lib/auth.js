// lib/auth.js
import { supabase } from './supabase'

// Déconnexion + redirection vers l'accueil, centralisée pour ne pas dupliquer
// cette logique entre AppShell.js (athlètes) et coach.js (cockpit coach, qui
// a sa propre sidebar custom et ne passe pas par AppShell).
export async function signOutAndRedirect(router) {
  await supabase.auth.signOut()
  router.push('/')
}
