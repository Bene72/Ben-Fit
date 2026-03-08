import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '⬛', href: '/dashboard' },
  { id: 'training', label: 'Entraînements', icon: '🏋️', href: '/training' },
  { id: 'nutrition', label: 'Nutrition', icon: '🥗', href: '/nutrition' },
  { id: 'objectifs', label: 'Objectifs', icon: '🎯', href: '/objectifs' },
  { id: 'messages', label: 'Messages', icon: '💬', href: '/messages', badge: 3 },
]

export default function Layout({ children, title = 'Dashboard', user }) {
  const router = useRouter()
  const active = router.pathname.replace('/', '') || 'dashboard'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const initials = user?.email?.substring(0, 2).toUpperCase() || 'CL'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F0E8', fontFamily: "'DM Sans', sans-serif" }}>
      {/* SIDEBAR */}
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: '240px',
        background: '#1A1A14', display: 'flex', flexDirection: 'column',
        padding: '32px 0', zIndex: 100
      }}>
        <div style={{ padding: '0 28px 32px', borderBottom: '1px solid #2E2E24' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#C8A85A' }}>Le Pavillon</div>
          <div style={{ fontSize: '11px', color: '#7A7A6A', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>Ben & Fitness</div>
        </div>

        <nav style={{ flex: 1, padding: '24px 16px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#444438', padding: '0 12px', marginBottom: '8px' }}>
            Espace client
          </div>
          {NAV.map(item => {
            const isActive = router.pathname === item.href
            return (
              <button key={item.id} onClick={() => router.push(item.href)} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                color: isActive ? '#F5F0E8' : '#8A8A7A',
                fontSize: '14px', fontWeight: '500',
                background: isActive ? '#4A5240' : 'transparent',
                border: 'none', width: '100%', textAlign: 'left',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.2s', marginBottom: '2px'
              }}>
                <span style={{ fontSize: '16px', width: '20px' }}>{item.icon}</span>
                {item.label}
                {item.badge && (
                  <span style={{
                    marginLeft: 'auto', background: '#C45C3A', color: 'white',
                    borderRadius: '10px', fontSize: '10px', fontWeight: '700',
                    padding: '1px 6px'
                  }}>{item.badge}</span>
                )}
              </button>
            )
          })}
        </nav>

        <div style={{ padding: '20px 28px', borderTop: '1px solid #2E2E24' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #C8A85A, #C45C3A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Playfair Display', serif", fontSize: '14px', color: 'white', fontWeight: '700'
            }}>{initials}</div>
            <div>
              <div style={{ fontSize: '13px', color: '#F5F0E8', fontWeight: '500' }}>
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Client'}
              </div>
              <div style={{ fontSize: '11px', color: '#7A7A6A' }}>Espace personnel</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '7px', background: 'transparent',
            border: '1px solid #2E2E24', borderRadius: '8px',
            color: '#7A7A6A', fontSize: '12px', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s'
          }}>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ marginLeft: '240px', flex: 1 }}>
        {/* TOPBAR */}
        <div style={{
          padding: '20px 40px', borderBottom: '1px solid #E0D9CC',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#F5F0E8', position: 'sticky', top: 0, zIndex: 50
        }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', fontWeight: '700' }}>
            {title}
          </div>
        </div>

        <div style={{ padding: '36px 40px' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
