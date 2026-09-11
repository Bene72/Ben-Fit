import Link from 'next/link'
import { useRouter } from 'next/router'

export default function AppNav({ user, onLogout, mobileOpen, setMobileOpen, currentClientId }) {
  const router = useRouter()
  const isCoachRoute = router.pathname.startsWith('/coach')
  const clientId = currentClientId || router.query.clientId

  // Menu principal
  const mainMenu = [
    { label: '📊 Dashboard', href: '/coach', icon: '📊' },
    { label: '👥 Élèves', href: '/coach', icon: '👥' },
  ]

  // Menu client (si on est sur une page client)
  const clientMenu = clientId ? [
    { label: '📊 Aperçu', href: `/coach/${clientId}?tab=overview` },
    { label: '💪 Programme', href: `/coach/${clientId}?tab=programme` },
    { label: '🍽️ Nutrition', href: `/coach/${clientId}?tab=nutrition` },
    { label: '⚙️ Gestion', href: `/coach/${clientId}?tab=gestion` },
    { label: '💬 Messages', href: `/coach/${clientId}?tab=messages` },
    { label: '📈 Bilan', href: `/coach/${clientId}?tab=bilan` },
  ] : []

  return (
    <nav
      style={{
        width: '260px',
        height: '100vh',
        background: '#0D1B4E',
        color: 'white',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        overflowY: 'auto',
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        zIndex: 100,
        boxShadow: '2px 0 12px rgba(0,0,0,0.15)'
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontFamily: "'Bebas Neue',sans-serif",
          fontSize: '24px',
          letterSpacing: '3px',
          color: 'white',
          paddingBottom: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '20px'
        }}
      >
        BEN&FIT
        <span style={{ fontSize: '11px', display: 'block', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
          Coach
        </span>
      </div>

      {/* Info coach */}
      {user && (
        <div style={{
          padding: '12px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>
            {user.email}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
            Coach
          </div>
        </div>
      )}

      {/* Menu principal */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>
          Navigation
        </div>
        {mainMenu.map((item) => {
          const isActive = router.pathname === item.href && !clientId
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'block',
                padding: '10px 14px',
                borderRadius: '8px',
                color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
                background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive ? '600' : '400',
                marginBottom: '4px',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Menu client (si on est sur une page client) */}
      {clientId && clientMenu.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>
            Suivi client
          </div>
          {clientMenu.map((item) => {
            const isActive = router.asPath === item.href
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                  marginBottom: '2px',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      )}

      {/* Déconnexion */}
      <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={() => {
            onLogout()
            setMobileOpen(false)
          }}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: "'DM Sans',sans-serif",
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(196,92,58,0.2)'
            e.currentTarget.style.borderColor = 'rgba(196,92,58,0.3)'
            e.currentTarget.style.color = '#C45C3A'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
          }}
        >
          Se déconnecter
        </button>
      </div>

      {/* Bouton fermeture mobile */}
      <button
        onClick={() => setMobileOpen(false)}
        style={{
          display: 'none',
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '6px'
        }}
        className="mobile-close-btn"
      >
        ✕
      </button>

      <style jsx>{`
        @media (max-width: 980px) {
          .mobile-close-btn {
            display: block !important;
          }
        }
      `}</style>
    </nav>
  )
}
