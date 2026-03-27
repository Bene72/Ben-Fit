import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const CLIENT_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/training', label: 'Training', icon: '🏋️' },
  { href: '/nutrition', label: 'Nutrition', icon: '🥗' },
  { href: '/bilan', label: 'Bilan', icon: '📋' },
  { href: '/messages', label: 'Messages', icon: '💬' },
]

const COACH_ITEMS = [
  { href: '/coach', label: 'Coach', icon: '🎯' },
  { href: '/messages', label: 'Messages', icon: '💬' },
]

function isActive(route, href) {
  if (href === '/coach') return route === '/coach' || route.startsWith('/coach/')
  return route === href
}

export default function AppNav({ profile }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [router.pathname])

  const items = useMemo(() => {
    if (profile?.role === 'coach') return COACH_ITEMS
    return CLIENT_ITEMS
  }, [profile])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      <style jsx>{`
        .app-shell {
          display: flex;
          min-height: 100vh;
          background: var(--bg);
        }
        .sidebar {
          width: 250px;
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          background: white;
          position: sticky;
          top: 0;
          height: 100vh;
          padding: 18px 14px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .brand {
          font-weight: 900;
          font-size: 20px;
          letter-spacing: -0.03em;
          color: var(--text);
          padding: 10px 12px;
        }
        .nav-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 46px;
          padding: 0 12px;
          border-radius: 14px;
          text-decoration: none;
          color: var(--text-soft);
          border: 1px solid transparent;
          font-weight: 700;
          transition: 160ms ease;
        }
        .nav-link:hover {
          background: var(--surface-muted);
          color: var(--text);
        }
        .nav-link.active {
          background: #f8fbff;
          color: var(--accent);
          border-color: var(--accent);
          box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.06);
        }
        .grow {
          flex: 1;
        }
        .meta {
          padding: 12px;
          border-radius: 16px;
          background: var(--surface-muted);
          border: 1px solid var(--border);
        }
        .meta-name {
          font-weight: 800;
          color: var(--text);
          margin-bottom: 4px;
        }
        .meta-sub {
          color: var(--text-soft);
          font-size: 13px;
          line-height: 1.45;
        }
        .content-wrap {
          min-width: 0;
          flex: 1;
          padding-bottom: 92px;
        }
        .mobile-topbar {
          display: none;
        }
        .mobile-bottom {
          display: none;
        }
        .ghost {
          appearance: none;
          border: 1px solid var(--border);
          background: white;
          border-radius: 12px;
          min-height: 42px;
          padding: 0 14px;
          font-weight: 700;
          cursor: pointer;
        }
        .danger {
          appearance: none;
          border: none;
          background: var(--danger);
          color: white;
          border-radius: 12px;
          min-height: 42px;
          padding: 0 14px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
        }

        @media (max-width: 980px) {
          .sidebar {
            display: none;
          }
          .mobile-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 14px;
            border-bottom: 1px solid var(--border);
            background: rgba(255,255,255,0.92);
            backdrop-filter: blur(12px);
            position: sticky;
            top: 0;
            z-index: 40;
          }
          .mobile-title {
            font-weight: 900;
            font-size: 18px;
            letter-spacing: -0.03em;
          }
          .mobile-panel {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.34);
            z-index: 70;
            display: ${'${menuOpen ? "block" : "none"}'};
          }
          .mobile-panel-inner {
            position: absolute;
            inset: 0 auto 0 0;
            width: min(86vw, 320px);
            background: white;
            border-right: 1px solid var(--border);
            padding: 18px 14px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .mobile-bottom {
            display: grid;
            grid-template-columns: repeat(${ '${items.length > 4 ? 5 : 4}' }, minmax(0, 1fr));
            gap: 8px;
            position: fixed;
            left: 10px;
            right: 10px;
            bottom: 10px;
            z-index: 50;
            padding: 8px;
            border: 1px solid var(--border);
            background: rgba(255,255,255,0.96);
            backdrop-filter: blur(10px);
            border-radius: 18px;
            box-shadow: var(--shadow-md);
          }
          .mobile-link {
            text-decoration: none;
            color: var(--text-soft);
            font-size: 11px;
            font-weight: 800;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            min-height: 54px;
            border-radius: 12px;
          }
          .mobile-link.active {
            background: #f8fbff;
            color: var(--accent);
          }
        }
      `}</style>

      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">Ben & Fit</div>

          <nav className="nav-list">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive(router.pathname, item.href) ? 'active' : ''}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="grow" />

          <div className="meta">
            <div className="meta-name">
              {profile?.full_name || profile?.first_name || 'Compte connecté'}
            </div>
            <div className="meta-sub">
              {profile?.role === 'coach' ? 'Mode coach' : 'Espace client'}
            </div>
          </div>

          <button type="button" className="danger" onClick={signOut}>
            Déconnexion
          </button>
        </aside>

        <div className="content-wrap">
          <div className="mobile-topbar">
            <button type="button" className="ghost" onClick={() => setMenuOpen(true)}>
              Menu
            </button>
            <div className="mobile-title">Ben & Fit</div>
            <button type="button" className="ghost" onClick={signOut}>
              Quitter
            </button>
          </div>

          {menuOpen ? (
            <div className="mobile-panel" onClick={() => setMenuOpen(false)}>
              <div className="mobile-panel-inner" onClick={(e) => e.stopPropagation()}>
                <div className="brand" style={{ padding: 0 }}>Ben & Fit</div>
                <nav className="nav-list">
                  {items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-link ${isActive(router.pathname, item.href) ? 'active' : ''}`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          ) : null}

          <div className="mobile-bottom">
            {items.slice(0, 5).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-link ${isActive(router.pathname, item.href) ? 'active' : ''}`}
              >
                <span style={{ fontSize: 17 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
