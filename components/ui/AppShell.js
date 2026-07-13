// components/ui/AppShell.js
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/router';

const SIDEBAR_WIDE   = 250;
const SIDEBAR_NARROW = 68;
const TOPBAR_H       = 60;

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
          gap:            12,
          padding:        collapsed ? '12px 0' : '11px 16px',
          margin:         '4px 12px',
          borderRadius:   'var(--r-sm, 10px)',
          cursor:         'pointer',
          fontSize:       13,
          fontWeight:     isActive ? 600 : 500,
          color:          isActive ? '#FFFFFF' : 'var(--text-faint)',
          background:     isActive ? 'var(--navy-light)' : 'transparent',
          transition:     'all 0.2s ease-in-out',
          justifyContent: collapsed ? 'center' : 'flex-start',
          whiteSpace:     'nowrap',
          overflow:       'hidden',
        }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#FFFFFF'; } }}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; } }}
      >
        <span style={{ fontSize: 18, flexShrink: 0, filter: isActive ? 'none' : 'grayscale(30%)' }}>{icon}</span>
        {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>}
      </div>
    </Link>
  );
}

/* ─── Sidebar ────────────────────────────────────────────────────────────── */
function Sidebar({ isCoach, user, collapsed, onToggle, mobileOpen, onMobileClose }) {
  const width = collapsed ? SIDEBAR_NARROW : SIDEBAR_WIDE;

  return (
    <>
      {/* Overlay mobile flouté et fluide */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          style={{
            position:   'fixed', inset: 0, zIndex: 199,
            background: 'rgba(13, 27, 78, 0.3)',
            backdropFilter: 'blur(4px)',
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      <aside style={{
        position:        'fixed',
        top:             0,
        left:            0,
        height:          '100vh',
        width,
        background:      'var(--navy)',
        display:         'flex',
        flexDirection:   'column',
        zIndex:          200,
        transition:      'width 0.25s cubic-bezier(.4,0,.2,1), transform 0.25s cubic-bezier(.4,0,.2,1)',
        overflowX:       'hidden',
        overflowY:       'auto',
        transform:       `translateX(${mobileOpen === false ? -SIDEBAR_WIDE : 0}px)`,
        boxShadow:       '10px 0 30px rgba(13,27,78,0.05)',
      }}>

        {/* ── Logo ── */}
        <div style={{
          padding:       collapsed ? '20px 0' : '18px 20px',
          borderBottom:  '1px solid rgba(255,255,255,0.06)',
          display:       'flex',
          alignItems:    'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap:           8,
          minHeight:     68,
          flexShrink:    0,
        }}>
          <Link href="/coach" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoMark size={collapsed ? 28 : 32} />
            {!collapsed && (
              <span style={{
                color:      '#FFFFFF',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 800,
                fontSize:   15,
                letterSpacing: '0.5px',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
              }}>
                BEN&FIT<br />
                <span style={{ fontWeight: 500, fontSize: 9, color: 'var(--accent)', letterSpacing: '1px' }}>COACH</span>
              </span>
            )}
          </Link>

          <button
            onClick={onToggle}
            style={{
              background:   'rgba(255,255,255,0.05)',
              border:       'none',
              borderRadius: 8,
              width:        28,
              height:       28,
              display:      collapsed ? 'none' : 'flex',
              alignItems:   'center',
              justifyContent: 'center',
              cursor:       'pointer',
              color:        'var(--text-faint)',
              flexShrink:   0,
              transition:   'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            <ChevronIcon collapsed={collapsed} />
          </button>
        </div>

        {/* ── Navigation principale ── */}
        <nav style={{ flex: 1, paddingTop: 16 }}>
          {isCoach ? (
            <>
              <div style={{ padding: '4px 24px 8px', fontSize: 9, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>
                Gestion Coach
              </div>
              <NavItem href="/coach" icon="👥" collapsed={collapsed}>Élèves</NavItem>
              <NavItem href="/coach/activite" icon="📋" collapsed={collapsed}>Activité</NavItem>
            </>
          ) : (
            <>
              <NavItem href="/dashboard" icon="📊" collapsed={collapsed}>Aperçu</NavItem>
              <NavItem href="/training"  icon="💪" collapsed={collapsed}>Programme</NavItem>
              <NavItem href="/nutrition" icon="🍽️" collapsed={collapsed}>Nutrition</NavItem>
              <NavItem href="/bilan"     icon="📈" collapsed={collapsed}>Bilan</NavItem>
              <NavItem href="/messages"  icon="💬" collapsed={collapsed}>Messages</NavItem>
            </>
          )}
        </nav>

        {/* ── Profil & Déconnexion ── */}
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
      borderTop:   '1px solid rgba(255,255,255,0.06)',
      padding:     collapsed ? '16px 0' : '16px 20px',
      display:     'flex',
      alignItems:  'center',
      gap:         12,
      justifyContent: collapsed ? 'center' : 'flex-start',
      background:  'rgba(0,0,0,0.15)',
    }}>
      <div style={{
        width:        36,
        height:       36,
        borderRadius: '50%',
        background:   'linear-gradient(135deg, var(--accent) 0%, #10B981 100%)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        fontSize:     14,
        fontWeight:   700,
        color:        '#FFFFFF',
        flexShrink:   0,
        boxShadow:    '0 4px 10px rgba(0,0,0,0.2)',
      }}>
        {initials}
      </div>

      {!collapsed && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 13, color: '#FFFFFF', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email || '…'}
          </div>
          <button
            onClick={() => { supabase.auth.signOut(); router.push('/'); }}
            style={{
              background: 'none', border: 'none',
              color:      'var(--text-faint)', cursor: 'pointer',
              fontSize:   11, padding: 0,
              fontFamily: "'DM Sans', sans-serif",
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── BottomNav (Mobile Nav bar) ────────────────────────────────────────── */
const COACH_NAV = [
  { href: '/coach', icon: '👥', label: 'Élèves' },
  { href: '/coach/activite', icon: '📋', label: 'Activité' },
];
const CLIENT_NAV = [
  { href: '/dashboard', icon: '📊', label: 'Aperçu' },
  { href: '/training',  icon: '💪', label: 'Programme' },
  { href: '/nutrition', icon: '🍽️', label: 'Nutrition' },
  { href: '/bilan',     icon: '📈', label: 'Bilan' },
  { href: '/messages',  icon: '💬', label: 'Messages' },
];

function BottomNav({ isCoach }) {
  const router = useRouter();
  const items  = isCoach ? COACH_NAV : CLIENT_NAV;
  const showLabels = isCoach;

  return (
    <nav style={{
      position:       'fixed',
      bottom:         0,
      left:           0,
      right:          0,
      height:         showLabels ? 64 : 60,
      background:     'var(--card)',
      borderTop:      '1px solid var(--border)',
      display:        'flex',
      alignItems:     'stretch',
      zIndex:         190,
      paddingBottom:  'env(safe-area-inset-bottom, 0px)',
      boxShadow:      '0 -10px 30px rgba(13,27,78,0.03)',
    }}>
      {items.map(item => {
        const isActive = router.pathname === item.href || router.pathname.startsWith(item.href + '/');
        return (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none', flex: 1 }}>
            <div style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            2,
              height:         '100%',
              color:          isActive ? 'var(--navy)' : 'var(--text-faint)',
              transition:     'all 0.2s ease',
              position:       'relative',
            }}>
              {isActive && (
                <div style={{
                  position: 'absolute', top: 0, width: 24, height: 3, 
                  background: 'var(--navy)', borderRadius: '0 0 4px 4px'
                }} />
              )}
              <span style={{ fontSize: showLabels ? 18 : 22, lineHeight: 1, transform: isActive ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s' }}>{item.icon}</span>
              {showLabels && (
                <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, letterSpacing: '0.2px' }}>
                  {item.label}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

/* ─── Top bar mobile (Glassmorphism moderne) ────────────────────────────── */
function TopBar({ onOpen, title }) {
  return (
    <header style={{
      position:    'fixed',
      top:         0, left: 0, right: 0,
      height:      TOPBAR_H,
      background:  'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display:     'flex',
      alignItems:  'center',
      padding:     '0 16px',
      gap:         12,
      zIndex:      150,
      borderBottom: '1px solid var(--border)',
    }}>
      <button
        onClick={onOpen}
        style={{
          background:   'var(--surface)',
          border:       'none',
          borderRadius: 8,
          width:        36,
          height:       36,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          cursor:       'pointer',
          color:        'var(--navy)',
          flexShrink:   0,
        }}
      >
        <HamburgerIcon />
      </button>

      <Link href="/coach" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
        <LogoMark size={28} />
        <span style={{ color: 'var(--navy)', stroke: 'var(--navy)', fontWeight: 800, fontSize: 14, letterSpacing: '0.2px' }}>
          BEN&FIT
        </span>
      </Link>

      <div style={{ flex: 1 }} />

      {title && (
        <span style={{ color: 'var(--text-soft)', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '35vw' }}>
          {title}
        </span>
      )}
    </header>
  );
}

/* ─── AppShell principal ─────────────────────────────────────────────────── */
export default function AppShell({
  children, title, subtitle, actions, userName, cycleName, coachName, coachAvailable,
}) {
  const [user,        setUser]        = useState(null);
  const [profile,     setProfile]     = useState(null);
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [isMobile,    setIsMobile]    = useState(false);

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
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setProfile(profile);
      }
    }
    loadUser();
  }, []);

  const isCoach    = profile?.role === 'coach';
  const sidebarW   = collapsed ? SIDEBAR_NARROW : SIDEBAR_WIDE;

  return (
    <div style={{
      display:    'flex',
      minHeight:  '100dvh',
      background: 'var(--bg)',
      color:      'var(--text)',
      fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
    }}>

      {isMobile && (
        <TopBar onOpen={() => setMobileOpen(true)} title={title} />
      )}

      {!isMobile ? (
        <Sidebar
          isCoach={isCoach} user={user} collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)} mobileOpen={null} onMobileClose={() => {}}
        />
      ) : (
        <Sidebar
          isCoach={isCoach} user={user} collapsed={false} onToggle={() => {}}
          mobileOpen={mobileOpen === true} onMobileClose={() => setMobileOpen(false)}
        />
      )}

      {isMobile && <BottomNav isCoach={isCoach} />}

      <main style={{
        marginLeft:  isMobile ? 0 : sidebarW,
        flex:        1,
        minWidth:    0,
        minHeight:   '100dvh',
        padding:     isMobile
          ? `${TOPBAR_H + 20}px 16px ${60 + 30}px`
          : '32px 40px 40px',
        transition:  'margin-left 0.25s cubic-bezier(.4,0,.2,1)',
        boxSizing:   'border-box',
      }}>

        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'flex-start',
          marginBottom:   28,
          gap:            16,
          flexWrap:       'wrap',
        }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              margin:     0,
              color:      'var(--navy)',
              fontSize:   isMobile ? 22 : 28,
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.6px',
            }}>
              {title}
              {userName && (
                <span style={{ fontWeight: 400, color: 'var(--text-soft)', fontSize: isMobile ? 16 : 18, marginLeft: 8 }}>
                  · {userName}
                </span>
              )}
            </h1>
            {subtitle && (
              <p style={{ margin: '6px 0 0', color: 'var(--text-soft)', fontSize: 13, fontWeight: 400 }}>{subtitle}</p>
            )}
            {cycleName && (
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--accent)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', background: 'var(--accent-soft)', padding: '3px 8px', borderRadius: 6 }}>
                🏆 {cycleName}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {coachAvailable && coachName && (
              <div style={{
                fontSize:     11,
                color:        'var(--success)',
                background:   'var(--success-bg)',
                padding:      '6px 12px',
                borderRadius: 20,
                fontWeight:   600,
                whiteSpace:   'nowrap',
                boxShadow:    'var(--shadow-sm)',
              }}>
                🟢 {coachName} disponible
              </div>
            )}
            {actions}
          </div>
        </div>

        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
          {children}
        </div>
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
      style={{ objectFit: 'contain', display: 'block', flexShrink: 0, transition: 'all 0.2s' }}
    />
  );
}

function ChevronIcon({ collapsed }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ transition: 'transform 0.25s', transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
