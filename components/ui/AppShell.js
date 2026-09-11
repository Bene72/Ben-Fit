// components/ui/AppShell.js
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { watchBreakpoint } from '../../lib/breakpoints'
import { signOutAndRedirect } from '../../lib/auth'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { Icon } from './Icon'

/* ─── Tokens locaux alignés sur globals.css ───────────────────────────────
 * HARMONISATION : mêmes valeurs qu'avant (fallback), mais référencées via
 * les CSS custom properties var(--navy)/var(--accent)/var(--gold) posées
 * lors du redesign de pages/training.js, pour que l'AppShell (sidebar,
 * topbar, bottom nav, badges) suive le même système de tokens que le reste
 * de l'app plutôt que des hex isolés. */
const T = {
  navy: 'var(--navy, #0D1B4E)',
  navyDeep: 'var(--navy-mid, #12235E)', // --navy-deep n'existe pas dans tokens.css ; --navy-mid est le vrai token voisin
  blue: 'var(--accent, #3B82F6)',
  blueDeep: 'var(--accent-deep, #1E4FC4)', // pas de token --accent-deep en prod, à défaut on garde ce dégradé
  blueLight: 'rgba(44,100,229,0.18)',
  gold: 'var(--gold)', // défini dans styles/tokens.css
  muted: '#6B8ED6',
  bg: 'var(--bg, #F8FAFF)',
  white: '#FFFFFF',
  border: 'rgba(255,255,255,0.1)',
  textSm: 13,
  textXs: 11,
}

const SIDEBAR_WIDE = 240
const SIDEBAR_NARROW = 64
const TOPBAR_H = 56

/* ─── NavItem ────────────────────────────────────────────────────────────── */
/* ─── Détection d'état actif (pathname + éventuel ?tab=) ────────────────────
 * Partagée par NavItem (sidebar) et BottomNav (mobile/collapsed) pour que
 * les deux nav ne divergent jamais dans leur logique de surlignage. */
function isNavItemActive(router, href) {
  const [hrefPath, hrefQuery] = href.split('?')
  const wantedTab = hrefQuery ? new URLSearchParams(hrefQuery).get('tab') : null
  const currentTab = router.query?.tab || null
  if (router.pathname !== hrefPath) return router.pathname.startsWith(hrefPath + '/')
  return wantedTab ? wantedTab === currentTab : !currentTab
}

function NavItem({ href, icon, children, collapsed }) {
  const router = useRouter()
  const isActive = isNavItemActive(router, href)

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        title={collapsed ? children : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsed ? '11px 0' : '10px 14px',
          margin: '2px 8px',
          borderRadius: 10,
          cursor: 'pointer',
          fontSize: T.textSm,
          fontWeight: isActive ? 700 : 500,
          color: isActive ? T.white : T.muted,
          background: isActive ? T.blueLight : 'transparent',
          transition: 'background 0.15s, color 0.15s',
          justifyContent: collapsed ? 'center' : 'flex-start',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = 'rgba(107,142,214,0.12)'
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = 'transparent'
        }}
      >
        <span style={{ display: 'flex', flexShrink: 0 }}>
          <Icon name={icon} size={16} color={isActive ? T.white : T.muted} />
        </span>
        {!collapsed && (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>
        )}
      </div>
    </Link>
  )
}

/* ─── Sidebar ────────────────────────────────────────────────────────────── */
function Sidebar({ isCoach, user, collapsed, onToggle, mobileOpen, onMobileClose }) {
  const width = collapsed ? SIDEBAR_NARROW : SIDEBAR_WIDE

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 199,
            background: 'rgba(9,18,58,0.55)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width,
          background: `linear-gradient(180deg, ${T.navy}, ${T.navyDeep})`,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 200,
          transition:
            'width 0.22s cubic-bezier(.4,0,.2,1), transform 0.25s cubic-bezier(.4,0,.2,1)',
          overflowX: 'hidden',
          overflowY: 'auto',
          transform: `translateX(${mobileOpen === false ? -SIDEBAR_WIDE : 0}px)`,
        }}
      >
        {/* ── Logo ── */}
        <div
          style={{
            padding: collapsed ? '20px 0 18px' : '18px 14px 16px',
            borderBottom: `1px solid ${T.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            gap: 8,
            minHeight: 64,
            flexShrink: 0,
          }}
        >
          <Link
            href={isCoach ? '/coach' : '/dashboard'}
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <LogoMark />
            {!collapsed && (
              <span
                style={{
                  color: T.white,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: '-0.3px',
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap',
                }}
              >
                BEN&FIT
                <br />
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontWeight: 400,
                    fontSize: 10,
                    color: T.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: isCoach ? '#3AC17C' : T.gold,
                      boxShadow: `0 0 0 2px ${isCoach ? '#3AC17C' : T.gold}33`,
                    }}
                  />
                  {isCoach ? 'Coach' : 'Espace athlète'}
                </span>
              </span>
            )}
          </Link>

          {/* Bouton collapse (desktop) */}
          <button
            onClick={onToggle}
            aria-label={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: 'none',
              borderRadius: 8,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: T.muted,
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
          >
            <ChevronIcon collapsed={collapsed} />
          </button>
        </div>

        {/* ── Navigation principale ── */}
        <nav style={{ flex: 1, paddingTop: 10 }}>
          {isCoach ? (
            <>
              {/* 👨‍🏫 GESTION COACH - remonté en haut */}
              <div
                style={{
                  padding: '4px 22px 6px',
                  fontSize: 9,
                  color: T.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                Gestion Coach
              </div>
              {/* URLs vérifiées : seules les pages qui existent réellement sont listées.
                  /coach/saison, /coach/programmes/template et /gestion n'existent pas
                  dans ce dépôt (menaient à des 404) — retirées de la navigation.
                  V2 : Calendrier et Activité retirés de la sidebar — ce sont déjà des
                  vues internes de /coach (onglet Calendrier + colonne "Activité
                  récente" dans Accueil), donc un lien de nav séparé n'amenait nulle
                  part de nouveau. Offres reste ici car c'est la seule vue qui n'est
                  pas visible par défaut sur l'accueil. */}
              <NavItem href="/coach" icon="home" collapsed={collapsed}>
                Accueil
              </NavItem>
              <NavItem href="/coach?tab=offres" icon="archive" collapsed={collapsed}>
                Offres
              </NavItem>

              {/* Séparateur */}
              <div style={{ borderTop: `1px solid ${T.border}`, margin: '12px 16px 8px' }} />
            </>
          ) : (
            /* V2.1 : desktop → 4 liens directs (assez de place pour tout
               montrer sans passer par le menu ⋯, qui reste réservé à
               Messages + Mensurations sur desktop, et sert de raccourci
               complet sur mobile où la sidebar est masquée). */
            <>
              <NavItem href="/dashboard" icon="dashboard" collapsed={collapsed}>
                Aujourd&apos;hui
              </NavItem>
              <NavItem href="/training" icon="training" collapsed={collapsed}>
                Training
              </NavItem>
              <NavItem href="/nutrition" icon="nutrition" collapsed={collapsed}>
                Nutrition
              </NavItem>
              <NavItem href="/bilan" icon="bilan" collapsed={collapsed}>
                Bilan
              </NavItem>
            </>
          )}
        </nav>

        {/* ── Profil & déconnexion ── */}
        <UserFooter user={user} collapsed={collapsed} />
      </aside>
    </>
  )
}

/* ─── UserFooter ─────────────────────────────────────────────────────────── */
function UserFooter({ user, collapsed }) {
  const router = useRouter()
  const initials = user?.email?.[0]?.toUpperCase() || '?'

  return (
    <div
      style={{
        borderTop: `1px solid ${T.border}`,
        padding: collapsed ? '12px 0' : '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: T.blue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
          color: T.white,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>

      {!collapsed && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div
            style={{
              fontSize: 12,
              color: T.white,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.email || '…'}
          </div>
          <button
            onClick={() => signOutAndRedirect(router)}
            style={{
              background: 'none',
              border: 'none',
              color: T.muted,
              cursor: 'pointer',
              fontSize: 11,
              padding: 0,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── BottomNav — visible quand sidebar collapsed (desktop) ou mobile ───── */
// Nav coach V2 : Accueil + Offres seulement — Calendrier et Activité sont des
// vues internes de /coach (onglet + colonne "Activité récente"), un lien de
// nav séparé n'amenait nulle part de nouveau.
const COACH_NAV = [
  { href: '/coach', icon: 'home', label: 'Accueil' },
  { href: '/coach?tab=offres', icon: 'archive', label: 'Offres' },
]

// Nav client : juste les icônes, en bas — plus fluide sur mobile qu'un tiroir latéral
// V2 : 2 piliers seulement (le reste vit dans le menu ⋯ — voir ClientMoreMenu).
const CLIENT_NAV = [
  { href: '/dashboard', icon: 'dashboard', label: "Aujourd'hui" },
  { href: '/training', icon: 'training', label: 'Training' },
]

function BottomNav({ isCoach }) {
  const router = useRouter()
  const items = isCoach ? COACH_NAV : CLIENT_NAV
  // Client : icônes seules, pas de texte, plus proche de l'ancienne barre mobile
  const showLabels = isCoach

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: showLabels ? 62 : 58,
        background: T.navy,
        borderTop: `1px solid ${T.border}`,
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 190,
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {items.map((item) => {
        const isActive = isNavItemActive(router, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{ textDecoration: 'none', flex: '1 0 48px', minWidth: 48 }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                height: '100%',
                padding: '0 4px',
                color: isActive ? T.white : T.muted,
                borderTop: isActive ? `2px solid ${T.blue}` : '2px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
                background: isActive ? 'rgba(44,100,229,0.12)' : 'transparent',
              }}
            >
              <span style={{ fontSize: showLabels ? 18 : 22, lineHeight: 1, display: 'flex' }}>
                <Icon
                  name={item.icon}
                  size={showLabels ? 18 : 22}
                  color={isActive ? T.white : T.muted}
                />
              </span>
              {showLabels && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: '0.2px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </span>
              )}
            </div>
          </Link>
        )
      })}
    </nav>
  )
}

/* ─── Top bar mobile ─────────────────────────────────────────────────────── */
function TopBar({ onOpen, title }) {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: TOPBAR_H,
        background: T.navy,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        zIndex: 150,
        boxShadow: '0 2px 12px rgba(13,27,78,0.18)',
      }}
    >
      <button
        onClick={onOpen}
        aria-label="Ouvrir le menu"
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: 'none',
          borderRadius: 8,
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: T.white,
          flexShrink: 0,
        }}
      >
        <HamburgerIcon />
      </button>

      <Link
        href="/coach"
        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <LogoMark size={28} />
        <span style={{ color: T.white, fontWeight: 800, fontSize: 14, letterSpacing: '-0.2px' }}>
          BEN&FIT
        </span>
      </Link>

      <div style={{ flex: 1 }} />

      {title && (
        <span
          style={{
            color: T.muted,
            fontSize: 12,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '40vw',
          }}
        >
          {title}
        </span>
      )}
    </header>
  )
}

/* ─── ClientMoreMenu — menu "⋯" (Bilan / Messages / Nutrition) ─────────────
 * Regroupe les 3 sections secondaires côté client derrière un seul bouton,
 * affiché dans le header de chaque page client (à côté du titre), sur
 * mobile comme desktop — pour que Bilan/Nutrition/Messages restent
 * accessibles de partout sans occuper la nav principale. Le lien
 * "Mensurations & profil" est séparé visuellement : c'est l'ancien contenu
 * de /dashboard (mensurations, courbe de poids, recette du chef, édition du
 * profil), conservé tel quel sur sa propre route pour ne rien perdre. */
function ClientMoreMenu({ userId, isMobile }) {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    if (!userId) return
    let active = true
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('read', false)
      .then(({ count }) => {
        if (active) setUnread(count || 0)
      })
      .catch(() => {}) // silencieux : un badge manquant n'empêche jamais d'ouvrir Messages
    return () => {
      active = false
    }
  }, [userId])

  const items = [
    // "Aujourd'hui" ajouté ici volontairement en double de l'icône du bas :
    // accessible à la fois depuis la nav du bas ET ce menu ⋯ en même temps.
    { href: '/dashboard', icon: 'dashboard', label: "Aujourd'hui" },
    // Bilan/Nutrition ne sont utiles ici que sur mobile : sur desktop ils
    // ont désormais leur propre lien direct dans la sidebar (à gauche), les
    // remontrer ici serait le même doublon qu'on vient de nettoyer côté coach.
    ...(isMobile
      ? [
          { href: '/bilan', icon: 'bilan', label: 'Bilan' },
          { href: '/nutrition', icon: 'nutrition', label: 'Nutrition' },
        ]
      : []),
    { href: '/messages', icon: 'message', label: 'Messages', badge: unread },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Plus d'options"
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          border: `1px solid ${open ? T.blue : 'var(--border, #E4E9F2)'}`,
          background: open ? T.blueLight : T.white,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: T.navy,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <Icon name="more" size={17} color={T.navy} />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 15,
              height: 15,
              borderRadius: 8,
              background: '#E5484D',
              border: '2px solid white',
              fontSize: 9,
              fontWeight: 800,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 2px',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 42,
            right: 0,
            width: 210,
            zIndex: 300,
            background: T.white,
            border: '1px solid var(--border, #E4E9F2)',
            borderRadius: 16,
            boxShadow: '0 10px 28px rgba(13,27,78,0.14)',
            padding: 6,
          }}
        >
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              style={{ textDecoration: 'none' }}
              onClick={() => setOpen(false)}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  borderRadius: 11,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: T.navy,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--surface-muted, #F7F9FC)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Icon name={it.icon} size={16} color={T.navy} />
                <span style={{ flex: 1 }}>{it.label}</span>
                {!!it.badge && (
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: '#E5484D' }}>
                    {it.badge > 9 ? '9+' : it.badge}
                  </span>
                )}
              </div>
            </Link>
          ))}
          <div
            style={{
              borderTop: '1px solid var(--border-soft, rgba(13,27,78,0.06))',
              margin: '4px 4px 4px',
            }}
          />
          <Link
            href="/mensurations"
            style={{ textDecoration: 'none' }}
            onClick={() => setOpen(false)}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 11,
                fontSize: 12,
                fontWeight: 600,
                color: T.muted,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'var(--surface-muted, #F7F9FC)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Icon name="weight" size={15} color={T.muted} />
              <span>Mensurations &amp; profil</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}

/* ─── AppShell principal ─────────────────────────────────────────────────── */
export default function AppShell({
  children,
  title,
  subtitle,
  actions,
  userName,
  cycleName,
  coachName,
  coachAvailable,
  requiredRole, // 'coach' | 'client' — optionnel. Si fourni, redirige si le rôle ne correspond pas.
}) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => watchBreakpoint('mobile', setIsMobile), [])

  useEffect(() => {
    let isMounted = true
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!isMounted) return
      if (user) {
        setUser(user)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (!isMounted) return
        setProfile(profile)
      }
      setLoading(false)
    }
    loadUser()
    return () => {
      isMounted = false
    }
  }, [])

  // Garde-fou : si la page déclare le rôle qu'elle attend et que le profil
  // chargé ne correspond pas, on redirige plutôt que d'afficher (même
  // brièvement) la mauvaise interface. Ne s'active que si `requiredRole`
  // est passé par la page — comportement inchangé sinon.
  useEffect(() => {
    if (loading || !profile || !requiredRole) return
    if (profile.role !== requiredRole) {
      router.replace(profile.role === 'coach' ? '/coach' : '/dashboard')
    }
  }, [loading, profile, requiredRole, router])

  const isCoach = profile?.role === 'coach'
  const sidebarW = collapsed ? SIDEBAR_NARROW : SIDEBAR_WIDE
  const showBottom = isMobile || collapsed

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100dvh',
        background: T.bg,
        fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {isMobile && <TopBar onOpen={() => setMobileOpen(true)} title={title} />}

      {!isMobile ? (
        <Sidebar
          isCoach={isCoach}
          user={user}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          mobileOpen={null}
          onMobileClose={() => {}}
        />
      ) : (
        <Sidebar
          isCoach={isCoach}
          user={user}
          collapsed={false}
          onToggle={() => {}}
          mobileOpen={mobileOpen === true}
          onMobileClose={() => setMobileOpen(false)}
        />
      )}

      {showBottom && <BottomNav isCoach={isCoach} />}

      <main
        style={{
          marginLeft: isMobile ? 0 : sidebarW,
          flex: 1,
          minWidth: 0,
          minHeight: '100dvh',
          padding: isMobile
            ? `${TOPBAR_H + 16}px 14px ${62 + 16}px`
            : collapsed
              ? `24px 28px ${62 + 16}px`
              : '24px 28px 24px',
          transition: 'margin-left 0.22s cubic-bezier(.4,0,.2,1)',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 20,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                color: T.navy,
                fontSize: isMobile ? 20 : 24,
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: '-0.4px',
              }}
            >
              {title}
              {userName && (
                <span
                  style={{
                    fontWeight: 400,
                    color: T.muted,
                    fontSize: isMobile ? 15 : 17,
                    marginLeft: 8,
                  }}
                >
                  · {userName}
                </span>
              )}
            </h1>
            {subtitle && (
              <p style={{ margin: '4px 0 0', color: '#6B7A99', fontSize: 13 }}>{subtitle}</p>
            )}
            {cycleName && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 8,
                  padding: '5px 12px',
                  borderRadius: 100,
                  background: `linear-gradient(135deg, ${T.navy}, ${T.navyDeep})`,
                  boxShadow: '0 6px 16px rgba(13,27,78,0.18)',
                }}
              >
                <span style={{ fontSize: 12 }}>🏆</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: T.gold }}>{cycleName}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {coachAvailable && coachName && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--green, #3A7A5A)',
                  background: '#F0FBF4',
                  padding: '5px 12px',
                  borderRadius: 100,
                  border: '1px solid #C9E9D5',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                🟢 {coachName} disponible
              </div>
            )}
            {actions}
            {!isCoach && <ClientMoreMenu userId={user?.id} isMobile={isMobile} />}
          </div>
        </div>

        {children}
      </main>
    </div>
  )
}

/* ─── Micro-composants SVG ───────────────────────────────────────────────── */

function LogoMark({ size = 32 }) {
  return (
    <Image
      src="/logo-small.png"
      alt="Ben&Fit"
      width={size}
      height={size}
      style={{ objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />
  )
}

function ChevronIcon({ collapsed }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{
        transition: 'transform 0.22s',
        transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
      }}
    >
      <path
        d="M9 3L5 7l4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M2 4.5h14M2 9h14M2 13.5h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
