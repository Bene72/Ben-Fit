// components/coach/ClientHeader.jsx
// En-tête de la fiche client : avatar, nom, offre, cycle en cours, email, et
// l'engagement (frise, dates de début / fin, « Prolonger » : voir
// EngagementDates), et accès direct aux messages.
import { useState } from 'react'
import { OFFERS } from '../../lib/coachDashboard/offersAndCompliance'
import EngagementDates from './EngagementDates'

const pill = (bg, color) => ({
  fontSize: 11.5,
  fontWeight: 700,
  padding: '3px 9px',
  borderRadius: 7,
  background: bg,
  color,
  whiteSpace: 'nowrap',
})

const btn = (primary) => ({
  border: primary ? 0 : '1px solid var(--border-hi)',
  background: primary ? 'var(--accent)' : 'transparent',
  color: primary ? '#16110d' : 'var(--chalk)',
  fontWeight: 700,
  fontSize: 12.5,
  padding: '8px 13px',
  borderRadius: 10,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  fontFamily: 'inherit',
})

export default function ClientHeader({
  client,
  isMobile,
  onBack,
  onMessage,
  onUpdate,
  onEditOffer,
  onArchive,
  onUnarchive,
}) {
  const [datesRequest, setDatesRequest] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const hasEngagementColumn = 'engagement_start' in client
  const offer = OFFERS[client.offer]
  const initials =
    (client.full_name || client.email || '?')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'

  return (
    <div style={{ marginBottom: 18 }}>
      <button
        onClick={onBack}
        style={{
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--chalk-dim)',
          fontSize: 13,
          fontFamily: 'inherit',
          padding: 0,
          marginBottom: 12,
        }}
      >
        ← Mes élèves
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'auto 1fr' : 'auto 1fr minmax(240px, 300px)',
          gap: isMobile ? 14 : 20,
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1f1a18, var(--bg-card) 60%)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          padding: isMobile ? 16 : '20px 22px',
        }}
      >
        <div
          aria-hidden
          style={{
            width: isMobile ? 52 : 64,
            height: isMobile ? 52 : 64,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent-brd)',
            color: 'var(--accent)',
            fontFamily: 'var(--font-display, "Bebas Neue")',
            fontSize: isMobile ? 22 : 26,
            letterSpacing: 1,
          }}
        >
          {initials}
        </div>

        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display, "Bebas Neue")',
              fontSize: isMobile ? 30 : 38,
              letterSpacing: 1,
              lineHeight: 1,
              margin: 0,
              color: 'var(--chalk)',
              fontWeight: 400,
            }}
          >
            {client.full_name || 'Client'}
          </h1>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 8,
              alignItems: 'center',
            }}
          >
            <button
              onClick={onEditOffer}
              title="Modifier l'offre"
              style={{
                ...pill('var(--gold-dim)', 'var(--gold)'),
                border: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {offer ? `${offer.name} · ${offer.price} €/mois` : 'Choisir une offre'} ✎
            </button>
            {Number(client.balance) < 0 && (
              <span style={pill('var(--danger-dim)', 'var(--danger)')}>
                Retard de paiement : {Math.abs(Number(client.balance))} €
              </span>
            )}
            {client.current_cycle_name && (
              <span style={pill('var(--accent-dim)', 'var(--accent)')}>
                {client.current_cycle_name}
              </span>
            )}
            {client.archived && (
              <span style={pill('var(--bg-card-2)', 'var(--chalk-dim)')}>Archivé</span>
            )}
            <span style={{ fontSize: 12.5, color: 'var(--chalk-dim)' }}>{client.email}</span>
          </div>
        </div>

        <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
          {hasEngagementColumn && (
            <EngagementDates
              client={client}
              onUpdate={onUpdate}
              editRequest={datesRequest}
              btn={btn}
            />
          )}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 12,
              justifyContent: isMobile ? 'flex-start' : 'flex-end',
            }}
          >
            <button style={btn(true)} onClick={onMessage}>
              💬 Message
            </button>
            <div style={{ position: 'relative' }}>
              <button
                style={{ ...btn(false), padding: '8px 11px' }}
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Plus d'actions"
                aria-expanded={menuOpen}
              >
                ⋯
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  onMouseLeave={() => setMenuOpen(false)}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 6px)',
                    zIndex: 20,
                    background: 'var(--bg-card-2)',
                    border: '1px solid var(--border-hi)',
                    borderRadius: 12,
                    padding: 6,
                    minWidth: 190,
                    boxShadow: '0 12px 30px rgba(0,0,0,.35)',
                  }}
                >
                  {[
                    { label: "✏️ Modifier l'offre", action: onEditOffer },
                    {
                      label: '📅 Dates d’engagement',
                      action: () => setDatesRequest((n) => n + 1),
                      hide: !hasEngagementColumn,
                    },
                    client.archived
                      ? { label: '♻️ Réactiver le client', action: onUnarchive }
                      : { label: '📦 Archiver le client', action: onArchive },
                  ]
                    .filter((i) => !i.hide && i.action)
                    .map((item) => (
                      <button
                        key={item.label}
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false)
                          item.action()
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          background: 'none',
                          border: 0,
                          color: 'var(--chalk)',
                          padding: '9px 10px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: 13,
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
