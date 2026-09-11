// components/coach/dashboard/OffresTab.jsx
// Extrait de pages/coach.js (découpage audit 09/09/2026, point 4) — contenu
// de l'onglet "Offres" : cartes des offres + tableau de répartition des
// clients par offre. Aucune logique modifiée, copié tel quel.
import Avatar from '../Avatar'
import Badge from '../Badge'
import { S, bebas, OFFERS } from '../../../lib/coachDashboard/offersAndCompliance'

export default function OffresTab({ isMobile, clients, onSelectClient }) {
  return (
    <div>
      <div
        style={{
          fontFamily: bebas,
          fontSize: 18,
          color: S.navy,
          letterSpacing: 2,
          marginBottom: 20,
        }}
      >
        MES OFFRES
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {Object.values(OFFERS).map((offer) => {
          const count = clients.filter(
            (c) => !c.archived && c.offer === offer.id && c.status === 'actif'
          ).length
          return (
            <div
              key={offer.id}
              style={{
                background: S.card,
                border: `2px solid ${offer.color}44`,
                borderRadius: 18,
                padding: '24px 28px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{offer.badge}</div>
                  <div
                    style={{
                      fontFamily: bebas,
                      fontSize: 24,
                      color: S.navy,
                      letterSpacing: 2,
                    }}
                  >
                    {offer.name.toUpperCase()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontFamily: bebas,
                      fontSize: 32,
                      color: offer.color,
                      letterSpacing: 1,
                    }}
                  >
                    {offer.price} €
                  </div>
                  <div style={{ fontSize: 11, color: S.muted }}>par mois</div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                {offer.features.map((f) => (
                  <div
                    key={f}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 0',
                      borderBottom: `1px solid ${S.border}`,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: offer.color, fontWeight: 800 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: `${offer.color}10`,
                  borderRadius: 10,
                }}
              >
                <span style={{ fontSize: 12, color: S.muted }}>Clients actifs sur cette offre</span>
                <span style={{ fontFamily: bebas, fontSize: 22, color: offer.color }}>{count}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div
        style={{
          fontFamily: bebas,
          fontSize: 14,
          color: S.navy,
          letterSpacing: 2,
          marginBottom: 12,
        }}
      >
        RÉPARTITION
      </div>
      <div
        style={{
          background: S.card,
          border: `1px solid ${S.border}`,
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            background: '#F8FAFF',
            padding: '10px 18px',
            fontSize: 10,
            fontWeight: 700,
            color: S.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            borderBottom: `1px solid ${S.border}`,
          }}
        >
          <span>Client</span>
          <span>Offre</span>
          <span>Tarif</span>
          <span>Statut</span>
        </div>
        {clients
          .filter((c) => !c.archived)
          .map((c) => {
            const offer = OFFERS[c.offer] || OFFERS['tutto_bene']
            return (
              <div
                key={c.id}
                onClick={() => onSelectClient(c.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  padding: '12px 18px',
                  borderBottom: `1px solid ${S.border}`,
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFF')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar initials={c.avatar} size={28} color={offer.color} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                </div>
                <Badge text={offer.name} color={offer.color} />
                <div style={{ fontFamily: bebas, fontSize: 16, color: S.navy }}>
                  {offer.price} €
                </div>
                <Badge text={c.status} color={c.status === 'actif' ? S.green : S.red} />
              </div>
            )
          })}
      </div>
    </div>
  )
}
