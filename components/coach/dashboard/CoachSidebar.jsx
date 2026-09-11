// components/coach/dashboard/CoachSidebar.jsx
// Extrait de pages/coach.js (découpage audit 09/09/2026, point 4) — barre
// latérale du dashboard coach en version desktop. Aucune logique modifiée,
// copié tel quel, juste paramétré via props plutôt que de fermer sur les
// variables du composant parent.
import Avatar from '../Avatar'
import { Icon } from '../../ui/Icon'
import { S, font, bebas } from '../../../lib/coachDashboard/offersAndCompliance'

const NAV_ITEMS = [
  { id: 'clients', icon: 'coach', label: 'Clients' },
  { id: 'offres', icon: 'archive', label: 'Offres' },
  { id: 'calendar', icon: 'calendar', label: 'Calendrier' },
]

export default function CoachSidebar({ user, activeTab, onSelectTab, onCreateClient, onSignOut }) {
  return (
    <div
      style={{
        width: 220,
        background: `linear-gradient(180deg, ${S.navy}, ${S.navyDeep})`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <div
        style={{
          padding: '24px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <div style={{ fontFamily: bebas, fontSize: 26, color: S.blue, letterSpacing: 3 }}>
            BEN&FIT
          </div>
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: S.green,
              boxShadow: `0 0 0 3px ${S.green}30`,
            }}
          />
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          Cockpit Coach
        </div>
      </div>
      <nav style={{ padding: '16px 10px', flex: 1 }}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === item.id ? 'rgba(74,111,212,0.16)' : 'transparent',
              color: activeTab === item.id ? S.blue : 'rgba(255,255,255,0.6)',
              fontFamily: font,
              fontSize: 13,
              fontWeight: activeTab === item.id ? 700 : 500,
              marginBottom: 2,
              transition: 'all 0.15s',
            }}
          >
            {activeTab === item.id && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: -10,
                  top: '20%',
                  bottom: '20%',
                  width: 3,
                  borderRadius: 2,
                  background: S.blue,
                }}
              />
            )}
            <Icon
              name={item.icon}
              size={16}
              color={activeTab === item.id ? S.blue : 'rgba(255,255,255,0.6)'}
            />
            {item.label}
          </button>
        ))}
        {/* Bouton "Activité" retiré en V2 : /coach/activite est redondant avec
            la colonne "Activité récente" déjà affichée dans l'onglet Clients
            (voir ActivityFeed dans ClientsTab.jsx). */}
        <button
          onClick={onCreateClient}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 10,
            border: `1px solid ${S.blue}44`,
            cursor: 'pointer',
            background: `${S.blue}15`,
            color: S.blue,
            fontFamily: font,
            fontSize: 13,
            fontWeight: 700,
            marginTop: 12,
          }}
        >
          <Icon name="plus" size={15} color={S.blue} />
          Nouvel élève
        </button>
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            initials={
              user?.email?.[0]?.toUpperCase() + (user?.email?.[1]?.toUpperCase() || '') || 'CO'
            }
            size={34}
            color={S.blue}
          />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Coach</div>
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.45)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 120,
              }}
            >
              {user?.email}
            </div>
          </div>
        </div>
        <button
          onClick={onSignOut}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.55)',
            fontFamily: font,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Icon name="logout" size={13} color="rgba(255,255,255,0.55)" />
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
