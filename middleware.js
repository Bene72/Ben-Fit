/**
 * middleware.js
 * Protection serveur des routes coach — s'exécute AVANT que la page ne soit
 * envoyée au navigateur, donc avant qu'aucune ligne de React ne tourne.
 *
 * CONTEXTE (voir CHANGELOG-ROUND3.md) : jusqu'ici, la protection des pages
 * /coach reposait uniquement sur une vérification côté client (useEffect +
 * redirection), ce qui laissait une fraction de seconde pendant laquelle le
 * contenu pouvait s'afficher avant que la redirection ne parte — et c'était
 * inégalement appliqué (2 pages n'avaient même aucune vérification du tout).
 * Ce middleware ferme structurellement cette classe de faille : un seul
 * fichier, exécuté par Next.js/Vercel côté serveur pour CHAQUE requête vers
 * une route protégée, avant tout rendu.
 *
 * Ça n'a été rendu possible que par le passage de lib/supabase.js à
 * @supabase/ssr (stockage de session en cookie plutôt qu'en localStorage) —
 * un middleware ne peut pas lire le localStorage, qui n'existe que dans le
 * navigateur.
 *
 * Les vérifications côté client déjà en place dans pages/coach.js,
 * pages/eleves.js, etc. restent en place : défense en profondeur, elles ne
 * coûtent rien et protègent aussi contre une éventuelle navigation
 * client-side (Next.js Link/router.push) qui ne redéclenche pas toujours le
 * middleware selon le mode de navigation.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const PROTECTED_PREFIXES = ['/coach', '/eleves', '/agent-bilan', '/agent-programme']

function isProtectedPath(pathname) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(request) {
  const { pathname } = request.nextUrl

  if (!isProtectedPath(pathname)) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Si la config manque en prod, on ne bloque pas tout le site : on laisse
  // passer (les pages elles-mêmes redemanderont une session côté client) —
  // mais on log fort, une config manquante ici ne doit jamais passer inaperçue.
  if (!supabaseUrl || !supabaseAnonKey) {
    // eslint-disable-next-line no-console
    console.error(
      '[middleware] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY manquantes — protection /coach désactivée'
    )
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // getUser() (pas getSession()) : revalide le token auprès du serveur Auth
  // Supabase à chaque requête, plutôt que de faire confiance à un cookie
  // qui pourrait avoir été trafiqué côté client.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'coach') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/coach', '/coach/:path*', '/eleves', '/agent-bilan', '/agent-programme'],
}
