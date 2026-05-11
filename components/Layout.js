import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import AppNav from './AppNav'

xport default function AppNav({ user, onLogout, mobileOpen, setMobileOpen, isMobile }) {
  // ... reste du code

  // ── MOBILE ─────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* PAS de header fixe qui bloque */}
        <nav style={{
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          zIndex: 300,
          background: '#0D1B4E', 
          borderTop: '1px solid rgba(255,255,255,0.10)',
          display: 'flex', 
          alignItems: 'stretch', 
          minHeight: '64px',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.22)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href
            return (
              <button key={item.href} onClick={() => go(item.href)} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '3px',
                border: 'none', cursor: 'pointer',
                background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: active ? 'white' : 'rgba(255,255,255,0.5)',
                fontFamily: "'DM Sans',sans-serif",
                borderTop: active ? '2px solid #2C64E5' : '2px solid transparent',
                position: 'relative',
              }}>
                <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</span>
                <span style={{ fontSize: '9px', fontWeight: active ? '700' : '400', letterSpacing: '0.3px' }}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>
      </>
    )
  }
    >
      <AppNav user={user} onLogout={logout} mobileOpen={navOpen} setMobileOpen={setNavOpen} />

      <main
        style={{
          marginLeft: navOpen ? '260px' : '0px',
          flex: 1,
          transition: 'margin-left 0.25s ease',
          minWidth: 0,
          overflowY: 'visible',  // ← PERMET AU CONTENU DE DÉBORDER
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
