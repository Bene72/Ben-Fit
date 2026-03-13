import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

const NAV = [
  { id: 'dashboard', label: 'Vue d\'ensemble', icon: '◉', href: '/dashboard' },
  { id: 'training', label: 'Programme', icon: '⚡', href: '/training' },
  { id: 'nutrition', label: 'Nutrition', icon: '🥗', href: '/nutrition' },
  { id: 'bilan', label: 'Bilan', icon: '📋', href: '/bilan' },
  { id: 'messages', label: 'Messages', icon: '💬', href: '/messages' },
]

export default function Layout({ children, title = 'Dashboard', user, profileName }) {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const initials = (profileName || user?.email || 'CL').substring(0, 2).toUpperCase()

  return (
    <>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#EEF0F5', fontFamily: "'DM Sans',sans-serif" }}>

        {/* SIDEBAR */}
        <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '220px', background: '#0D1B4E', display: 'flex', flexDirection: 'column', zIndex: 100 }}>

          {/* Logo */}
          <div onClick={() => router.push('/dashboard')} style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <img src="/logo-small.png" alt="Ben&Fit" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
            <div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '20px', color: 'white', letterSpacing: '2px', lineHeight: 1 }}>BEN&FIT</div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '2px' }}>Only Benefit</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
            <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', padding: '0 10px', marginBottom: '10px' }}>Menu</div>
            {NAV.map(item => {
              const isActive = router.pathname === item.href
              return (
                <button key={item.id} onClick={() => router.push(item.href)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', cursor: 'pointer', color: isActive ? 'white' : 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: isActive ? '600' : '400', background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent', border: isActive ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent', width: '100%', textAlign: 'left', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s', marginBottom: '2px' }}>
                  <span style={{ fontSize: '15px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* User */}
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: '14px', color: 'white', letterSpacing: '1px', flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '12px', color: 'white', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profileName || user?.email?.split('@')[0]}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>Membre</div>
              </div>
            </div>
            <button onClick={handleLogout} style={{ width: '100%', padding: '7px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '7px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.2s', letterSpacing: '0.5px' }}>
              Déconnexion
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ marginLeft: '220px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* TOPBAR */}
          <div style={{ padding: '16px 36px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '26px', letterSpacing: '2px', color: '#0D1B4E' }}>{title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/logo-small.png" alt="" style={{ width: '28px', height: '28px', objectFit: 'contain', opacity: 0.6 }} />
              <span style={{ fontSize: '11px', color: '#AAA', letterSpacing: '1px', textTransform: 'uppercase' }}>Ben&Fit</span>
            </div>
          </div>

          <div style={{ padding: '32px 36px', flex: 1 }}>
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
