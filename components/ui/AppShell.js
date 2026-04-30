import { useEffect, useState } from 'react'
import AppNav from '../AppNav'

export default function AppShell({ title, subtitle, actions, children }) {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 980)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  return (
    <div style={{ minHeight: '100vh', background: '#EEF2F7', fontFamily: "'DM Sans',sans-serif" }}>
      <AppNav />
      <div style={{ marginLeft: isMobile ? 0 : 260, transition: 'margin-left 0.25s ease' }}>
        <div style={{ 
          maxWidth: 1540, 
          margin: '0 auto', 
          padding: isMobile ? '12px 10px 16px' : '30px 28px 34px' 
        }}>
          {(title || subtitle || actions) ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row', 
              alignItems: isMobile ? 'stretch' : 'flex-start', 
              justifyContent: 'space-between', 
              gap: 12, 
              marginBottom: isMobile ? 10 : 18 
            }}>
              <div>
                {title ? (
                  <h1 style={{ 
                    margin: 0, 
                    color: '#0D1B4E', 
                    fontSize: isMobile ? 22 : 42, 
                    lineHeight: 1.05, 
                    fontWeight: 900, 
                    letterSpacing: '-0.02em' 
                  }}>
                    {title}
                  </h1>
                ) : null}
                {subtitle ? (
                  <p style={{ 
                    margin: isMobile ? '6px 0 0' : '10px 0 0', 
                    color: '#6B7A99', 
                    fontSize: isMobile ? 12 : 18, 
                    lineHeight: 1.55, 
                    maxWidth: 880 
                  }}>
                    {subtitle}
                  </p>
                ) : null}
              </div>
              {actions ? (
                <div style={{ alignSelf: isMobile ? 'stretch' : 'flex-start' }}>
                  {actions}
                </div>
              ) : null}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  )
}
