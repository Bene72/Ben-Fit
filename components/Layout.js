import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import AppNav from './AppNav'

export default function Layout({ title, user, children }) {
  const router = useRouter()
  const [navOpen, setNavOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Détecter le mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 980)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Sur mobile, fermer la sidebar par défaut
  useEffect(() => {
    if (isMobile) {
      setNavOpen(false)
    }
  }, [isMobile])

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
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <AppNav 
        user={user} 
        onLogout={logout} 
        mobileOpen={navOpen} 
        setMobileOpen={setNavOpen} 
        isMobile={isMobile} 
      />

      <main
        style={{
          marginLeft: (!isMobile && navOpen) ? '260px' : '0px',
          flex: 1,
          transition: 'margin-left 0.25s ease',
          minWidth: 0,
          width: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Header sticky */}
        <div
          style={{
            padding: isMobile ? '12px 16px' : '16px 32px',
            borderBottom: '1px solid #C5D0F0',
            background: '#EEF2FF',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
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
                fontSize: isMobile ? '18px' : '22px',
                letterSpacing: '2px',
                color: '#0D1B4E',
                lineHeight: 1,
              }}
            >
              {title || 'BEN&FIT'}
            </div>
            <div style={{ fontSize: isMobile ? '10px' : '12px', color: '#6B7A99', marginTop: '2px' }}>
              Ben&Fit · Only Benefit
            </div>
          </div>
        </div>

        {/* Contenu principal - padding bottom important pour mobile (évite que la navbar cache le contenu) */}
        <div style={{ 
          padding: isMobile ? '16px 16px 80px 16px' : '28px 32px',
          overflowY: 'auto',
        }}>
          {children}
        </div>
      </main>
    </div>
  )
}
