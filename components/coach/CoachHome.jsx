// components/coach/CoachHome.jsx
// Bloc d'accueil actionnable pour le coach : au lieu de n'afficher que des
// KPI passifs, on remonte ce qui demande une action aujourd'hui — clients
// qui décrochent (pas de bilan récent) et paiements qui arrivent à échéance.
// Ne fait aucun appel réseau : consomme les données déjà chargées par coach.js.
import { S, font, bebas, daysAgo } from '../../lib/coachDashboard/shared'
import Avatar from './Avatar'
import Badge from './Badge'

const RISK_THRESHOLD_DAYS = 10 // au-delà, on considère qu'un client "décroche"

function daysSince(dateStr) {
  if (!dateStr) return Infinity
  return Math.floor((new Date() - new Date(dateStr)) / 86400000)
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

export function computeAtRiskClients(clients) {
  return clients
    .filter((c) => !c.archived && c.status === 'actif')
    .map((c) => ({ ...c, inactiveDays: daysSince(c.lastBilan) }))
    .filter((c) => c.inactiveDays >= RISK_THRESHOLD_DAYS)
    .sort((a, b) => b.inactiveDays - a.inactiveDays)
}

export function computeUpcomingPayments(clients) {
  return clients
    .filter((c) => !c.archived && c.nextPayment)
    .map((c) => ({ ...c, daysLeft: daysUntil(c.nextPayment) }))
    .filter((c) => c.daysLeft !== null && c.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft)
}

function EmptyRow({ text }) {
  return (
    <div style={{ padding: '14px 4px', fontSize: 12.5, color: S.muted, fontStyle: 'italic' }}>
      {text}
    </div>
  )
}

function SectionCard({ title, icon, count, accent, children }) {
  return (
    <div
      style={{
        background: S.card,
        border: `1px solid ${S.border}`,
        borderRadius: 16,
        padding: '16px 18px',
        flex: 1,
        minWidth: 280,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div
          style={{
            fontFamily: bebas,
            fontSize: 15,
            letterSpacing: 1,
            color: S.navy,
            flex: 1,
          }}
        >
          {title}
        </div>
        {count > 0 && (
          <span
            style={{
              background: accent,
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 999,
              padding: '2px 8px',
              fontFamily: font,
            }}
          >
            {count}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
    </div>
  )
}

function ClientRow({ client, rightLabel, rightColor, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 6px',
        borderRadius: 10,
        cursor: 'pointer',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = S.bgSoft || '#F5F7FC')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Avatar initials={client.avatar} size={30} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: S.navy }}>
        {client.name}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: rightColor, flexShrink: 0 }}>
        {rightLabel}
      </span>
    </div>
  )
}

export default function CoachHome({ clients, onSelectClient }) {
  const atRisk = computeAtRiskClients(clients)
  const upcomingPayments = computeUpcomingPayments(clients)

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
      <SectionCard
        title="À RISQUE DE DÉCROCHAGE"
        icon="⚠️"
        count={atRisk.length}
        accent={S.red}
      >
        {atRisk.length === 0 ? (
          <EmptyRow text="Personne — tout le monde a un bilan récent. 👍" />
        ) : (
          atRisk.slice(0, 5).map((c) => (
            <ClientRow
              key={c.id}
              client={c}
              rightLabel={c.inactiveDays === Infinity ? 'Jamais' : `${daysAgo(c.lastBilan)}`}
              rightColor={S.red}
              onClick={() => onSelectClient(c.id)}
            />
          ))
        )}
      </SectionCard>

      <SectionCard
        title="PAIEMENTS À VENIR"
        icon="💳"
        count={upcomingPayments.length}
        accent={S.gold}
      >
        {upcomingPayments.length === 0 ? (
          <EmptyRow text="Aucune échéance dans les 7 prochains jours." />
        ) : (
          upcomingPayments.map((c) => (
            <ClientRow
              key={c.id}
              client={c}
              rightLabel={c.daysLeft <= 0 ? "Aujourd'hui" : `J-${c.daysLeft}`}
              rightColor={c.daysLeft <= 1 ? S.red : S.navy}
              onClick={() => onSelectClient(c.id)}
            />
          ))
        )}
      </SectionCard>
    </div>
  )
}
