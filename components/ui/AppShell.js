// components/ui/AppShell.js
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/router';

/* ─── Tokens locaux alignés sur globals.css ─────────────────────────────── */
const T = {
  navy:      '#0D1B4E',
  navyDeep:  '#09123A',
  blue:      '#2C64E5',
  blueLight: 'rgba(44,100,229,0.18)',
  muted:     '#6B8ED6',
  bg:        '#F8FAFF',
  white:     '#FFFFFF',
  border:    'rgba(255,255,255,0.1)',
  textSm:    13,
  textXs:    11,
};

const SIDEBAR_WIDE   = 240;
const SIDEBAR_NARROW = 64;
const TOPBAR_H       = 56;

/* ─── NavItem ────────────────────────────────────────────────────────────── */
function NavItem({ href, icon, children, collapsed }) {
  const router  = useRouter();
  const isActive = router.pathname === href || router.pathname.startsWith(href + '/');

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        title={collapsed ? children : undefined}
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            10,
          padding:        collapsed ? '11px 0' : '10px 14px',
          margin:         '2px 8px',
          borderRadius:   10,
          cursor:         'pointer',
          fontSize:       T.textSm,
          fontWeight:     isActive ? 700 : 500,
          color:          isActive ? T.white : T.muted,
          background:     isActive ? T.blueLight : 'transparent',
          transition:     'background 0.15s, color 0.15s',
          justifyContent: collapsed ? 'center' : 'flex-start',
          whiteSpace:     'nowrap',
          overflow:       'hidden',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(107,142,214,0.12)'; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
        {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>}
      </div>
    </Link>
  );
}

/* ─── Sidebar ────────────────────────────────────────────────────────────── */
function Sidebar({ isCoach, user, collapsed, onToggle, mobileOpen, onMobileClose }) {
  const width = collapsed ? SIDEBAR_NARROW : SIDEBAR_WIDE;

  /* overlay mobile */
  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          style={{
            position:   'fixed', inset: 0, zIndex: 199,
            background: 'rgba(9,18,58,0.55)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <aside style={{
        position:        'fixed',
        top:             0,
        left:            0,
        height:          '100vh',
        width,
        background:      T.navy,
        display:         'flex',
        flexDirection:   'column',
        zIndex:          200,
        transition:      'width 0.22s cubic-bezier(.4,0,.2,1), transform 0.25s cubic-bezier(.4,0,.2,1)',
        overflowX:       'hidden',
        overflowY:       'auto',
        /* mobile : slide depuis la gauche */
        transform:       `translateX(${mobileOpen === false ? -SIDEBAR_WIDE : 0}px)`,
      }}>

        {/* ── Logo ── */}
        <div style={{
          padding:       collapsed ? '20px 0 18px' : '18px 14px 16px',
          borderBottom:  `1px solid ${T.border}`,
          display:       'flex',
          alignItems:    'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap:           8,
          minHeight:     64,
          flexShrink:    0,
        }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Logo SVG inline — remplace par <img src="/logo.svg"> si tu as un fichier */}
            <LogoMark />
            {!collapsed && (
              <span style={{
                color:      T.white,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 800,
                fontSize:   15,
                letterSpacing: '-0.3px',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
              }}>
                BEN&FIT<br />
                <span style={{ fontWeight: 400, fontSize: 10, color: T.muted }}>COACH</span>
              </span>
            )}
          </Link>

          {/* Bouton collapse (desktop) */}
          <button
            onClick={onToggle}
            style={{
              background:   'rgba(255,255,255,0.07)',
              border:       'none',
              borderRadius: 8,
              width:        28,
              height:       28,
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              cursor:       'pointer',
              color:        T.muted,
              flexShrink:   0,
              transition:   'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          >
            <ChevronIcon collapsed={collapsed} />
          </button>
        </div>

        {/* ── Navigation principale ── */}
        <nav style={{ flex: 1, paddingTop: 10 }}>
          <NavItem href="/apercu"    icon="📊" collapsed={collapsed}>Aperçu</NavItem>
          <NavItem href="/training"  icon="💪" collapsed={collapsed}>Programme</NavItem>
          <NavItem href="/nutrition" icon="🍽️" collapsed={collapsed}>Nutrition</NavItem>
          <NavItem href="/bilan"     icon="📈" collapsed={collapsed}>Bilan</NavItem>
          <NavItem href="/messages"  icon="💬" collapsed={collapsed}>Messages</NavItem>
          <NavItem href="/gestion"   icon="⚙️" collapsed={collapsed}>Gestion</NavItem>
        </nav>

        {/* ── Section coach ── */}
        {isCoach && (
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8, paddingBottom: 4 }}>
            {!collapsed && (
              <div style={{
                padding:         '4px 22px 6px',
                fontSize:        9,
                color:           T.muted,
                textTransform:   'uppercase',
                letterSpacing:   '1.2px',
                fontWeight:      700,
              }}>
                Espace Coach
              </div>
            )}
            <NavItem href="/dashboard"          icon="🗂️" collapsed={collapsed}>Dashboard</NavItem>
            <NavItem href="/eleves"             icon="👥" collapsed={collapsed}>Élèves</NavItem>
            <NavItem href="/saison"             icon="📅" collapsed={collapsed}>Saison / Cycles</NavItem>
            <NavItem href="/programmes/template" icon="📋" collapsed={collapsed}>Bibliothèque</NavItem>
          </div>
        )}

        {/* ── Profil & déconnexion ── */}
        <UserFooter user={user} collapsed={collapsed} />
      </aside>
    </>
  );
}

/* ─── UserFooter ─────────────────────────────────────────────────────────── */
function UserFooter({ user, collapsed }) {
  const router = useRouter();
  const initials = user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div style={{
      borderTop:   `1px solid ${T.border}`,
      padding:     collapsed ? '12px 0' : '12px 14px',
      display:     'flex',
      alignItems:  'center',
      gap:         10,
      justifyContent: collapsed ? 'center' : 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width:        34,
        height:       34,
        borderRadius: '50%',
        background:   T.blue,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        fontSize:     13,
        fontWeight:   700,
        color:        T.white,
        flexShrink:   0,
      }}>
        {initials}
      </div>

      {!collapsed && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 12, color: T.white, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email || '…'}
          </div>
          <button
            onClick={() => { supabase.auth.signOut(); router.push('/'); }}
            style={{
              background: 'none', border: 'none',
              color:      T.muted, cursor: 'pointer',
              fontSize:   11, padding: 0,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── BottomNav — visible quand sidebar collapsed (desktop) ou mobile ───── */
const MAIN_NAV = [
  { href: '/apercu',    icon: '📊', label: 'Aperçu'     },
  { href: '/training',  icon: '💪', label: 'Programme'  },
  { href: '/nutrition', icon: '🍽️', label: 'Nutrition'  },
  { href: '/bilan',     icon: '📈', label: 'Bilan'      },
  { href: '/messages',  icon: '💬', label: 'Messages'   },
  { href: '/gestion',   icon: '⚙️', label: 'Gestion'    },
];

const COACH_NAV = [
  { href: '/dashboard',           icon: '🗂️', label: 'Dashboard'   },
  { href: '/eleves',              icon: '👥', label: 'Élèves'      },
  { href: '/saison',              icon: '📅', label: 'Saison'      },
  { href: '/programmes/template', icon: '📋', label: 'Biblio'      },
];

function BottomNav({ isCoach }) {
  const router  = useRouter();
  const items   = isCoach ? [...MAIN_NAV, ...COACH_NAV] : MAIN_NAV;

  return (
    <nav style={{
      position:       'fixed',
      bottom:         0,
      left:           0,
      right:          0,
      height:         62,
      background:     T.navy,
      borderTop:      `1px solid ${T.border}`,
      display:        'flex',
      alignItems:     'stretch',
      zIndex:         190,
      overflowX:      'auto',
      overflowY:      'hidden',
      scrollbarWidth: 'none',
    }}>
      {items.map(item => {
        const isActive = router.pathname === item.href || router.pathname.startsWith(item.href + '/');
        return (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none', flex: '1 0 56px', minWidth: 48 }}>
            <div style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            2,
              height:         '100%',
              padding:        '0 4px',
              color:          isActive ? T.white : T.muted,
              borderTop:      isActive ? `2px solid ${T.blue}` : '2px solid transparent',
              transition:     'color 0.15s, border-color 0.15s',
              background:     isActive ? 'rgba(44,100,229,0.12)' : 'transparent',
            }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, letterSpacing: '0.2px', whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

/* ─── Top bar mobile ─────────────────────────────────────────────────────── */
function TopBar({ onOpen, title }) {
  return (
    <header style={{
      position:    'fixed',
      top:         0,
      left:        0,
      right:       0,
      height:      TOPBAR_H,
      background:  T.navy,
      display:     'flex',
      alignItems:  'center',
      padding:     '0 16px',
      gap:         12,
      zIndex:      150,
      boxShadow:   '0 2px 12px rgba(13,27,78,0.18)',
    }}>
      <button
        onClick={onOpen}
        style={{
          background:   'rgba(255,255,255,0.08)',
          border:       'none',
          borderRadius: 8,
          width:        36,
          height:       36,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          cursor:       'pointer',
          color:        T.white,
          flexShrink:   0,
        }}
      >
        <HamburgerIcon />
      </button>

      <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
        <LogoMark size={28} />
        <span style={{ color: T.white, fontWeight: 800, fontSize: 14, letterSpacing: '-0.2px' }}>
          BEN&FIT
        </span>
      </Link>

      <div style={{ flex: 1 }} />

      {title && (
        <span style={{ color: T.muted, fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40vw' }}>
          {title}
        </span>
      )}
    </header>
  );
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
}) {
  const router = useRouter();
  const [user,        setUser]        = useState(null);
  const [profile,     setProfile]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [collapsed,   setCollapsed]   = useState(false);   // desktop sidebar
  const [mobileOpen,  setMobileOpen]  = useState(null);    // null = SSR safe
  const [isMobile,    setIsMobile]    = useState(false);

  /* Detect mobile */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from('profiles').select('role').eq('id', user.id).single();
        setProfile(profile);
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const isCoach    = profile?.role === 'coach';
  const sidebarW   = collapsed ? SIDEBAR_NARROW : SIDEBAR_WIDE;
  const showBottom = isMobile || collapsed;
  const BOTTOM_H   = 62;

  return (
    <div style={{
      display:    'flex',
      minHeight:  '100dvh',
      background: T.bg,
      fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
    }}>

      {/* ── Mobile top bar ── */}
      {isMobile && (
        <TopBar onOpen={() => setMobileOpen(true)} title={title} />
      )}

      {/* ── Sidebar ── */}
      {!isMobile ? (
        /* DESKTOP : sidebar fixe collapsible */
        <Sidebar
          isCoach={isCoach}
          user={user}
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          mobileOpen={null}
          onMobileClose={() => {}}
        />
      ) : (
        /* MOBILE : sidebar drawer */
        <Sidebar
          isCoach={isCoach}
          user={user}
          collapsed={false}
          onToggle={() => {}}
          mobileOpen={mobileOpen === true}
          onMobileClose={() => setMobileOpen(false)}
        />
      )}

      {/* ── Bottom nav (mobile OU sidebar collapsée) ── */}
      {showBottom && <BottomNav isCoach={isCoach} />}

      {/* ── Contenu principal ── */}
      <main style={{
        marginLeft:  isMobile ? 0 : sidebarW,
        flex:        1,
        minWidth:    0,
        minHeight:   '100dvh',
        padding:     isMobile
          ? `${TOPBAR_H + 16}px 14px ${62 + 16}px`
          : collapsed
            ? `24px 28px ${62 + 16}px`
            : '24px 28px 24px',
        transition:  'margin-left 0.22s cubic-bezier(.4,0,.2,1)',
        boxSizing:   'border-box',
      }}>

        {/* ── Page header ── */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'flex-start',
          marginBottom:   20,
          gap:            12,
          flexWrap:       'wrap',
        }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              margin:     0,
              color:      T.navy,
              fontSize:   isMobile ? 20 : 24,
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.4px',
            }}>
              {title}
              {userName && (
                <span style={{ fontWeight: 400, color: T.muted, fontSize: isMobile ? 15 : 17, marginLeft: 8 }}>
                  · {userName}
                </span>
              )}
            </h1>
            {subtitle && (
              <p style={{ margin: '4px 0 0', color: '#6B7A99', fontSize: 13 }}>{subtitle}</p>
            )}
            {cycleName && (
              <div style={{ marginTop: 4, fontSize: 12, color: T.blue, fontWeight: 700 }}>
                🏆 {cycleName}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {coachAvailable && coachName && (
              <div style={{
                fontSize:     11,
                color:        '#3A7A5A',
                background:   '#F0FBF4',
                padding:      '4px 10px',
                borderRadius: 20,
                border:       '1px solid #C9E9D5',
                fontWeight:   600,
                whiteSpace:   'nowrap',
              }}>
                🟢 {coachName} disponible
              </div>
            )}
            {actions}
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}

/* ─── Micro-composants SVG ───────────────────────────────────────────────── */

function LogoMark({ size = 32 }) {
  return (
    <img
      src="/logo-small.png"
      alt="Ben&Fit"
      width={size}
      height={size}
      style={{ objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />
  );
}

function ChevronIcon({ collapsed }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ transition: 'transform 0.22s', transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
