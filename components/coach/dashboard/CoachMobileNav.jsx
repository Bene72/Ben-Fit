// components/coach/dashboard/CoachMobileNav.jsx
// Extrait de pages/coach.js (découpage audit 09/09/2026, point 4).
import { Icon } from '../../ui/Icon'
import { S, font } from '../../../lib/coachDashboard/offersAndCompliance'

const NAV_ITEMS = [
  { id: 'clients', icon: 'coach' },
  { id: 'offres', icon: 'archive' },
  { id: 'calendar', icon: 'calendar' },
]

export default function CoachMobileNav({ activeTab, onSelectTab, onSignOut }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        marginBottom: 16,
        overflowX: 'auto',
        paddingBottom: 4,
      }}
    >
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelectTab(item.id)}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            background: activeTab === item.id ? 'var(--accent)' : S.card,
            color: activeTab === item.id ? '#16110D' : S.muted,
            fontFamily: font,
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Icon name={item.icon} size={16} color={activeTab === item.id ? '#16110D' : S.muted} />
        </button>
      ))}
      {/* 18/11/2026 : sur mobile la sidebar (et son « Se déconnecter ») est
          masquée — bouton de déconnexion poussé à droite de la barre. */}
      {onSignOut && (
        <button
          onClick={() => {
            if (window.confirm('Se déconnecter ?')) onSignOut()
          }}
          aria-label="Se déconnecter"
          title="Se déconnecter"
          style={{
            marginLeft: 'auto',
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
            background: 'transparent',
            color: S.muted,
            fontFamily: font,
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="logout" size={15} color={S.muted} />
          Déconnexion
        </button>
      )}
    </div>
  )
}
