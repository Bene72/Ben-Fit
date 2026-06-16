import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { useBreakpoint } from '../hooks/useBreakpoint'

// ── Navigation items ─────────────────────────────────────────
const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',  icon: '👁' },
  { href: '/training',   label: 'Training',   icon: '🏋️' },
  { href: '/nutrition',  label: 'Nutrition',  icon: '🥗' },
  { href: '/bilan',      label: 'Bilan',      icon: '📋' },
  { href: '/community',  label: 'Communauté', icon: '💬' },
]

// ── Popup rappel bilan ───────────────────────────────────────
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

function useBilanReminder() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const today = new Date()
    const day = today.getDay() // 5=Vendredi, 6=Samedi
    if (day !== 5 && day !== 6) return
    const weekKey = `bilan_popup_${today.getFullYear()}_W${getWeekNumber(today)}`
    if (!localStorage.getItem(weekKey)) {
      const timer = setTimeout(() => {
        setShow(true)
        localStorage.setItem(weekKey, '1')
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [])
  return [show, () => setShow(false)]
}

function BilanReminderPopup({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(13,27,42,0.6)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 'var(--r-lg, 28px)', padding: '38px 30px 28px',
        maxWidth: '360px', width: '100%', textAlign: 'center',
        boxShadow: 'var(--shadow-hero, 0 28px 70px rgba(13,27,42,0.28))',
        animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        border: '1px solid var(--gold-light, #D4AF37)',
      }}>
        <style>{`@keyframes popIn { from { transform:scale(0.82); opacity:0 } to { transform:scale(1); opacity:1 } }`}</style>

        {/* Petit badge "Semaine X terminée" plutôt qu'une grosse icône système */}
        <div style={{
          display: 'inline-block', padding: '5px 14px', borderRadius: 999,
          background: 'var(--gold-soft, #FDF6E3)', color: 'var(--gold, #B8860B)',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase',
          marginBottom: 18,
        }}>
          Semaine terminée
        </div>

        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '24px', color: '#0D1B2A', marginBottom: '10px', letterSpacing: '1px', lineHeight: 1.2 }}>
          Ton coach attend ton bilan
        </div>
        <div style={{ fontSize: '14px', color: '#A09880', lineHeight: 1.7, marginBottom: '28px' }}>
          2 minutes suffisent pour qu'il ajuste ta semaine prochaine — sommeil, moral, nutrition, assiduité.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => { onClose(); window.location.href = '/bilan' }} style={{
            width: '100%', padding: '14px', borderRadius: 'var(--r-sm, 12px)', border: 'none',
            background: '#0D1B2A',
            color: 'white', fontWeight: '700', fontSize: '14px',
            cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
            boxShadow: '0 6px 18px rgba(13,27,42,0.25)',
          }}>
            Faire mon bilan
          </button>
          <button onClick={onClose} style={{
            width: '100%', padding: '12px', borderRadius: 'var(--r-sm, 12px)',
            border: '1.5px solid #EDE9E0', background: 'transparent',
            color: '#A09880', fontWeight: '600', fontSize: '13px',
            cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
          }}>
            Plus tard
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ──────────────────────────────────────
export default function AppNav({ profile }) {
  const router = useRouter()
  const isMobile = useBreakpoint(980)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [showBilanPopup, closeBilanPopup] = useBilanReminder()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null))
  }, [])

  const pathname = useMemo(() => router.pathname || '', [router.pathname])
  const go = (href) => { router.push(href); setSidebarOpen(false) }
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  // ── MOBILE ─────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {showBilanPopup && <BilanReminderPopup onClose={closeBilanPopup} />}

        {pathname !== '/messages' && (
          <>
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 320,
              height: '56px', background: '#0D1B2A',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 12px', boxShadow: '0 2px 10px rgba(0,0,0,0.14)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <img src="/logo-small.png" alt="Ben&Fit" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                <div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '18px', color: 'white', letterSpacing: '1.5px', lineHeight: 1 }}>BEN&FIT</div>
                  <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.45)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>Only Benefit · since 2021</div>
                </div>
              </div>
              <button onClick={handleLogout} style={{
                padding: '7px 10px', borderRadius: '999px',
                border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)',
                color: 'white', fontSize: '11px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
              }}>Déconnexion</button>
            </div>
            <div style={{ height: '56px' }} />
          </>
        )}

        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
          background: '#0D1B2A', borderTop: '1px solid rgba(255,255,255,0.10)',
          display: 'flex', alignItems: 'stretch', height: '64px',
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
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: active ? 'white' : 'rgba(255,255,255,0.5)',
                fontFamily: "'DM Sans',sans-serif",
                borderTop: active ? '2px solid #B8860B' : '2px solid transparent',
                position: 'relative',
              }}>
                <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</span>
                <span style={{ fontSize: '9px', fontWeight: active ? '700' : '400', letterSpacing: '0.3px' }}>
                  {item.label}
                </span>
                {item.href === '/community' && !active && (
                  <span style={{
                    position: 'absolute', top: '6px', right: '10%',
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: '#B8860B', border: '1.5px solid #0D1B2A',
                  }} />
                )}
              </button>
            )
          })}
        </nav>
        <div style={{ height: '64px' }} />
      </>
    )
  }

  // ── DESKTOP sidebar ─────────────────────────────────────────
  return (
    <>
      {showBilanPopup && <BilanReminderPopup onClose={closeBilanPopup} />}

      <button onClick={() => setSidebarOpen(o => !o)} style={{
        position: 'fixed', top: '16px', left: sidebarOpen ? '218px' : '12px',
        zIndex: 220, width: '32px', height: '32px', background: '#0D1B2A',
        border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
        color: 'white', fontSize: '16px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'left 0.25s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        {sidebarOpen ? '←' : '☰'}
      </button>

      <aside style={{
        width: sidebarOpen ? '260px' : '0px', background: '#0D1B2A',
        position: 'fixed', top: 0, bottom: 0, left: 0,
        display: 'flex', flexDirection: 'column',
        zIndex: 210, overflow: 'hidden', transition: 'width 0.25s ease',
      }}>
        <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo-small.png" alt="Ben&Fit" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '20px', color: 'white', letterSpacing: '2px', lineHeight: 1 }}>BEN&FIT</div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.42)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '2px' }}>Only Benefit · since 2021</div>
          </div>
        </div>

        <div style={{ flex: 1, padding: '14px 12px', overflowY: 'auto' }}>
          <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)', padding: '8px 12px' }}>Navigation</div>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href
            return (
              <button key={item.href} onClick={() => go(item.href)} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '11px 12px', borderRadius: '10px', cursor: 'pointer',
                background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
                border: 'none', width: '100%', textAlign: 'left',
                fontFamily: "'DM Sans',sans-serif", marginBottom: '4px', transition: 'all 0.2s',
              }}>
                <div style={{ width: '22px', textAlign: 'center', fontSize: '14px' }}>{item.icon}</div>
                <div style={{ fontSize: '13px', color: 'white', fontWeight: active ? '700' : '500' }}>{item.label}</div>
                {item.href === '/community' && (
                  <span style={{ marginLeft: 'auto', background: '#B8860B', color: 'white', fontSize: '9px', fontWeight: '800', padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>NEW</span>
                )}
              </button>
            )
          })}

        </div>

        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', color: 'white' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px' }}>Connecté</div>
            <div style={{ fontSize: '13px', fontWeight: '600' }}>{user?.email || 'Utilisateur'}</div>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '9px', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.14)', borderRadius: '8px',
            color: '#D7E2FF', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
          }}>Déconnexion</button>
        </div>
      </aside>
    </>
  )
}
