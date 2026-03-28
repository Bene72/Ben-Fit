import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import AppNav from './AppNav'

export default function Layout({ title, user, children }) {
  const router = useRouter()
  const [navOpen, setNavOpen] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 980) {
      setNavOpen(false)
    }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#EEF0F5',
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      <AppNav user={user} onLogout={logout} mobileOpen={navOpen} setMobileOpen={setNavOpen} />

      <main
        style={{
          marginLeft: navOpen ? '260px' : '0px',
          flex: 1,
          transition: 'margin-left 0.25s ease',
          minWidth: 0,
        }}
      >
        <div
          style={{
            padding: '16px 32px',
            borderBottom: '1px solid #C5D0F0',
            background: '#EEF2FF',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#0D1B4E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <img
              src="/logo-small.png"
              alt="Ben&Fit"
              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
            />
          </div>

          <div>
            <div
              style={{
                fontFamily: "'Bebas Neue',sans-serif",
                fontSize: '22px',
                letterSpacing: '2px',
                color: '#0D1B4E',
                lineHeight: 1,
              }}
            >
              {title || 'BEN&FIT'}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7A99', marginTop: '2px' }}>
              Ben&Fit · Only Benefit
            </div>
          </div>
        </div>

        <div style={{ padding: '28px 32px' }}>{children}</div>
      </main>
    </div>
  )
}
