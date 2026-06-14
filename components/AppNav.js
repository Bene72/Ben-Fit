import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

// ── SVG Icons — cohérents, colorables, pas d'emoji OS-dépendant ────────────
const Icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  training: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v16M18 4v16M2 9h4M18 9h4M2 15h4M18 15h4M6 9h12M6 15h12"/>
    </svg>
  ),
  nutrition: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a9 9 0 0 1 9 9c0 3.5-2 7-5 8.5V21H8v-1.5C5 18 3 14.5 3 11a9 9 0 0 1 9-9z"/>
      <path d="M12 7v5l3 3"/>
    </svg>
  ),
  bilan: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path d="M9 12h6M9 16h4"/>
    </svg>
  ),
  community: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3"/>
      <circle cx="17" cy="9" r="2.5"/>
      <path d="M2 21v-2a5 5 0 0 1 10 0v2"/>
      <path d="M17 21v-1.5a4.5 4.5 0 0 0-2.5-4"/>
    </svg>
  ),
}

// ── Navigation items ─────────────────────────────────────────
const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',  iconKey: 'dashboard' },
  { href: '/training',   label: 'Training',   iconKey: 'training' },
  { href: '/nutrition',  label: 'Nutrition',  iconKey: 'nutrition' },
  { href: '/bilan',      label: 'Bilan',      iconKey: 'bilan' },
  { href: '/community',  label: 'Communauté', iconKey: 'community' },
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
    const day = today.getDay()
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
      background: 'rgba(13,27,78,0.6)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: 'white', borderRadius: '22px', padding: '36px 28px 28px',
        maxWidth: '340px', width: '100%', textAlign: 'center',
        boxShadow: '0 28px 70px rgba(13,27,78,0.28)',
        animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <style>{`@keyframes popIn { from { transform:scale(0.82); opacity:0 } to { transform:scale(1); opacity:1 } }`}</style>
        <div style={{ fontSize: '54px', marginBottom: '14px' }}>📋</div>
        <div style={{ fontWeight: '900', fontSize: '20px', color: '#0D1B4E', marginBottom: '10px', lineHeight: 1.2 }}>
          C'est le moment de ton bilan !
        </div>
        <div style={{ fontSize: '14px', color: '#6B7A99', lineHeight: 1.7, marginBottom: '26px' }}>
          Prends 2 minutes pour noter ta semaine — sommeil, moral, nutrition, assiduité. Ton coach compte sur toi ! 💪
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => { onClose(); window.location.href = '/bilan' }} style={{
            width: '100%', padding: '14px', borderRadius: '11px', border: 'none',
            background: 'linear-gradient(135deg, #0D1B4E, #2C64E5)',
            color: 'white', fontWeight: '800', fontSize: '14px',
            cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
            boxShadow: '0 4px 16px rgba(44,100,229,0.35)',
          }}>
            ✏️ Faire mon bilan maintenant
          </button>
          <button onClick={onClose} style={{
            width: '100%', padding: '12px', borderRadius: '11px',
            border: '1.5px solid #C5D0F0', background: 'transparent',
            color: '#6B7A99', fontWeight: '600', fontSize: '13px',
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
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [showBilanPopup, closeBilanPopup] = useBilanReminder()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 980)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  const pathname = useMemo(() => router.pathname, [router.pathname])

  const go = (href) => {
    if (isMobile) setSidebarOpen(false)
    router.push(href)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // ── MOBILE bottom nav ────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {showBilanPopup && <BilanReminderPopup onClose={closeBilanPopup} />}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
          background: '#0D1B4E', borderTop: '1px solid rgba(255,255,255,0.10)',
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
                background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: active ? 'white' : 'rgba(255,255,255,0.45)',
                fontFamily: "'DM Sans',sans-serif",
                borderTop: active ? '2px solid #2C64E5' : '2px solid transparent',
                position: 'relative',
                transition: 'color 0.15s, background 0.15s',
              }}>
                {Icons[item.iconKey]}
                <span style={{ fontSize: '9px', fontWeight: active ? '700' : '400', letterSpacing: '0.3px' }}>
                  {item.label}
                </span>
                {item.href === '/community' && !active && (
                  <span style={{
                    position: 'absolute', top: '6px', right: '10%',
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: '#2C64E5', border: '1.5px solid #0D1B4E',
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
        zIndex: 220, width: '32px', height: '32px', background: '#0D1B4E',
        border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
        color: 'white', fontSize: '16px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'left 0.25s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        {sidebarOpen ? '←' : '☰'}
      </button>

      <aside style={{
        width: sidebarOpen ? '260px' : '0px', background: '#0D1B4E',
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
                fontFamily: "'DM Sans',sans-serif", marginBottom: '4px',
                color: active ? 'white' : 'rgba(255,255,255,0.6)',
                transition: 'all 0.2s',
              }}>
                <div style={{ width: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {Icons[item.iconKey]}
                </div>
                <div style={{ fontSize: '13px', fontWeight: active ? '700' : '500' }}>{item.label}</div>
                {item.href === '/community' && (
                  <span style={{ marginLeft: 'auto', background: '#2C64E5', color: 'white', fontSize: '9px', fontWeight: '800', padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>NEW</span>
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
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
            color: 'rgba(255,255,255,0.55)', fontSize: '12px', cursor: 'pointer',
            fontFamily: "'DM Sans',sans-serif", transition: 'all 0.2s',
          }}>
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  )
}
