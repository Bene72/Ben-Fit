import { useMemo } from 'react'
import { useRouter } from 'next/router'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/training', label: 'Training', icon: '🏋️' },
  { href: '/nutrition', label: 'Nutrition', icon: '🥗' },
  { href: '/bilan', label: 'Bilan', icon: '📋' },
  { href: '/messages', label: 'Messages', icon: '💬' },
]

export default function AppNav({ user, onLogout, mobileOpen, setMobileOpen }) {
  const router = useRouter()

  const pathname = useMemo(() => router.pathname || '', [router.pathname])

  const go = (href) => {
    router.push(href)
    if (setMobileOpen) setMobileOpen(false)
  }

  const navBody = (
    <>
      <div
        style={{
          padding: '20px 20px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <img
          src="/logo-small.png"
          alt="Ben&Fit"
          style={{ width: '44px', height: '44px', objectFit: 'contain' }}
        />
        <div>
          <div
            style={{
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: '20px',
              color: 'white',
              letterSpacing: '2px',
              lineHeight: 1,
            }}
          >
            BEN&FIT
          </div>
          <div
            style={{
              fontSize: '9px',
              color: 'rgba(255,255,255,0.42)',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              marginTop: '2px',
            }}
          >
            Only Benefit · since 2021
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '14px 12px', overflowY: 'auto' }}>
        <div
          style={{
            fontSize: '10px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.34)',
            padding: '8px 12px',
          }}
        >
          Navigation
        </div>

        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => go(item.href)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '11px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                fontFamily: "'DM Sans',sans-serif",
                marginBottom: '4px',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ width: '22px', textAlign: 'center', fontSize: '14px' }}>{item.icon}</div>
              <div style={{ fontSize: '13px', color: 'white', fontWeight: active ? '700' : '500' }}>
                {item.label}
              </div>
            </button>
          )
        })}
      </div>

      <div
        style={{
          padding: '16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '10px',
            color: 'white',
          }}
        >
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px' }}>
            Connecté
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600' }}>
            {user?.email || 'Utilisateur'}
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '9px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: '8px',
            color: '#D7E2FF',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          Déconnexion
        </button>
      </div>
    </>
  )

  return (
    <>
      <button
        onClick={() => setMobileOpen && setMobileOpen((v) => !v)}
        style={{
          position: 'fixed',
          top: '16px',
          left: mobileOpen ? '218px' : '12px',
          zIndex: 220,
          width: '32px',
          height: '32px',
          background: '#0D1B4E',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '8px',
          color: 'white',
          fontSize: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'left 0.25s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        {mobileOpen ? '←' : '☰'}
      </button>

      <aside
        style={{
          width: mobileOpen ? '260px' : '0px',
          background: '#0D1B4E',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 210,
          overflow: 'hidden',
          transition: 'width 0.25s ease',
        }}
      >
        {navBody}
      </aside>
    </>
  )
}
