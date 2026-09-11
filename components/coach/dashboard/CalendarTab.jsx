// components/coach/dashboard/CalendarTab.jsx
// Extrait de pages/coach.js (découpage audit 09/09/2026, point 4) — contenu
// de l'onglet "Calendrier" : panneau calendrier + tâches de cycle + liste
// de tous les suivis du mois. Aucune logique modifiée, copié tel quel.
import Badge from '../Badge'
import CalendarPanel from '../CalendarPanel'
import CycleTasksPanel from '../CycleTasksPanel'
import { S, bebas } from '../../../lib/coachDashboard/offersAndCompliance'

export default function CalendarTab({ isMobile, sessions, coachId, clients }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '320px 1fr',
        gap: 16,
      }}
    >
      <CalendarPanel sessions={sessions} coachId={coachId} clients={clients} />
      <div>
        <CycleTasksPanel coachId={coachId} clients={clients} />
        <div
          style={{
            fontFamily: bebas,
            fontSize: 18,
            color: S.navy,
            letterSpacing: 2,
            marginBottom: 14,
          }}
        >
          TOUS LES SUIVIS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sessions.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'white',
                borderRadius: 14,
                border: `1px solid ${S.border}`,
                color: S.muted,
                fontSize: 13,
              }}
            >
              Aucune session enregistrée ce mois-ci.
            </div>
          ) : (
            sessions.map((s, i) => (
              <div
                key={i}
                style={{
                  background: S.card,
                  border: `1px solid ${S.border}`,
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 36,
                    borderRadius: 2,
                    background: s.color,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: S.navy }}>{s.client}</div>
                  <Badge text={s.type} color={s.color} />
                </div>
                <div style={{ fontSize: 12, color: S.muted }}>
                  {new Date(s.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
