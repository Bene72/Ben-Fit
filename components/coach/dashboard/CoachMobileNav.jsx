// components/coach/dashboard/CoachMobileNav.jsx
// Extrait de pages/coach.js (découpage audit 09/09/2026, point 4).
import { Icon } from '../../ui/Icon'
import { S, font } from '../../../lib/coachDashboard/offersAndCompliance'

const NAV_ITEMS = [
  { id: 'clients', icon: 'coach' },
  { id: 'offres', icon: 'archive' },
  { id: 'calendar', icon: 'calendar' },
]

export default function CoachMobileNav({ activeTab, onSelectTab }) {
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
            background: activeTab === item.id ? S.navy : S.card,
            color: activeTab === item.id ? S.blue : S.muted,
            fontFamily: font,
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Icon name={item.icon} size={16} color={activeTab === item.id ? S.blue : S.muted} />
        </button>
      ))}
    </div>
  )
}
