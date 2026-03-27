import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const CLIENT_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/training', label: 'Training', icon: '🏋️' },
  { href: '/nutrition', label: 'Nutrition', icon: '🥗' },
  { href: '/bilan', label: 'Bilan', icon: '📋' },
  { href: '/messages', label: 'Messages', icon: '💬' },
]

const COACH_ITEMS = [
  { href: '/coach', label: 'Coach', icon: '🎯' },
  { href: '/messages', label: 'Messages', icon: '💬' },
]

function isActive(pathname, href) {
  if (href === '/coach') return pathname === '/coach' || pathname.startsWith('/coach/')
  return pathname === href
}

export default function AppNav({ profile }) {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 980)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [router.pathname])

  const items = useMemo(() => {
    return profile?.role === 'coach' ? COACH_ITEMS : CLIENT_ITEMS
  }, [profile])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (isMobile) {
    return (
      <>
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 60,
            height: 72,
            background: '#ffffff',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
          }}
        >
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="ui-button ui-button--secondary"
            style={{ minHeight: 44 }}
          >
            Menu
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: '#0d1b4e',
                color: 'white',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
                fontSize: 12,
                letterSpacing: '-0.04em',
              }}
            >
              BF
            </div>
            <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.03em', color: '#0f172a' }}>
              Ben & Fit
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="ui-button ui-button--secondary"
            style={{ minHeight: 44 }}
          >
            Quitter
          </button>
        </div>

        {menuOpen ? (
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 80,
              background: 'rgba(15,23,42,0.35)',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: 'min(86vw, 320px)',
                background: '#0d1b4e',
                color: 'white',
                padding: 18,
                borderRight: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: '#1d4ed8',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                    fontSize: 13,
                    letterSpacing: '-0.04em',
                  }}
                >
                  BF
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.04em' }}>Ben & Fit</div>
                  <div style={{ opacity: 0.72, fontSize: 12 }}>
                    {profile?.role === 'coach' ? 'Mode coach' : 'Espace client'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map((item) => {
                  const active = isActive(router.pathname, item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        minHeight: 48,
                        padding: '0 14px',
                        borderRadius: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        textDecoration: 'none',
                        color: active ? '#0d1b4e' : 'white',
                        background: active ? 'white' : 'rgba(255,255,255,0.08)',
                        fontWeight: 800,
                      }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>

              <div style={{ marginTop: 'auto' }}>
                <button
                  type="button"
                  onClick={signOut}
                  style={{
                    width: '100%',
                    minHeight: 48,
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'white',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div
          style={{
            position: 'fixed',
            left: 10,
            right: 10,
            bottom: 10,
            zIndex: 60,
            background: '#0d1b4e',
            borderRadius: 20,
            padding: 8,
            boxShadow: '0 12px 24px rgba(15,23,42,0.2)',
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(items.length, 5)}, minmax(0, 1fr))`,
            gap: 8,
          }}
        >
          {items.slice(0, 5).map((item) => {
            const active = isActive(router.pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  minHeight: 58,
                  borderRadius: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  textDecoration: 'none',
                  color: active ? '#0d1b4e' : 'white',
                  background: active ? 'white' : 'transparent',
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                <span style={{ fontSize: 17 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 250,
        background: '#0d1b4e',
        color: 'white',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        zIndex: 50,
      }}
    >
      <div
        style={{
          padding: 14,
          borderRadius: 18,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: '#1d4ed8',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 900,
            fontSize: 13,
            letterSpacing: '-0.04em',
          }}
        >
          BF
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.04em' }}>Ben & Fit</div>
          <div style={{ opacity: 0.7, fontSize: 11, letterSpacing: '0.04em' }}>
            {profile?.role === 'coach' ? 'COACH DASHBOARD' : 'CLIENT DASHBOARD'}
          </div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => {
          const active = isActive(router.pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                minHeight: 48,
                padding: '0 14px',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textDecoration: 'none',
                color: active ? '#0d1b4e' : 'white',
                background: active ? 'white' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? 'white' : 'rgba(255,255,255,0.05)'}`,
                fontWeight: 800,
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 4 }}>
            {profile?.full_name || profile?.first_name || 'Compte connecté'}
          </div>
          <div style={{ opacity: 0.72, fontSize: 12 }}>
            {profile?.role === 'coach' ? 'Mode coach' : 'Espace client'}
          </div>
        </div>

        <button
          type="button"
          onClick={signOut}
          style={{
            width: '100%',
            minHeight: 46,
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            color: 'white',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
