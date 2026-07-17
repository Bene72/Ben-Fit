import Avatar from './Avatar'
import KpiCard from './KpiCard'
import Badge from './Badge'
import ProgressBar from './ProgressBar'
import PostItPanel from './PostItPanel'
import TrackerPanel from './TrackerPanel'
import { OFFERS, S, font, bebas, complianceColor, daysAgo } from '../../lib/coachDashboard/shared'

const COACH_MEASURE_FIELDS = [
  { key: 'weight', label: 'Poids', unit: 'kg', icon: '⚖️', color: S.red, required: true },
  { key: 'waist', label: 'Tour de taille', unit: 'cm', icon: '📏', color: S.blue },
  { key: 'hips', label: 'Tour de hanches', unit: 'cm', icon: '📏', color: S.green },
  { key: 'glutes', label: 'Tour de fesses', unit: 'cm', icon: '📏', color: S.purple },
  { key: 'chest', label: 'Tour de poitrine', unit: 'cm', icon: '📏', color: S.gold },
  { key: 'arm', label: 'Tour de bras', unit: 'cm', icon: '💪', color: S.green },
  { key: 'thigh', label: 'Tour de cuisse', unit: 'cm', icon: '📏', color: S.red },
  { key: 'calf', label: 'Tour de mollet', unit: 'cm', icon: '📏', color: S.blue },
]

const COACH_NUTRI_FIELDS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', icon: '🔥', color: S.red },
  { key: 'protein', label: 'Protéines', unit: 'g', icon: '🥩', color: S.green },
  { key: 'carbs', label: 'Glucides', unit: 'g', icon: '🌾', color: S.gold },
  { key: 'fat', label: 'Lipides', unit: 'g', icon: '🥑', color: S.blue },
]

export default function ClientDetail({
  client,
  onBack,
  onEditOffer,
  onNavigate,
  onArchive,
  onUnarchive,
  onNotesUpdate,
  measures = [],
  nutritionLogs = [],
  historyLoading = false,
}) {
  const offer = OFFERS[client.offer] || OFFERS['tutto_bene']
  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={onBack}
          style={{
            border: 'none',
            background: 'transparent',
            color: S.muted,
            cursor: 'pointer',
            fontSize: 20,
            padding: 0,
            display: 'flex',
          }}
        >
          ←
        </button>
        <Avatar
          initials={client.avatar}
          size={48}
          color={offer.color}
          grayscale={client.archived}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: bebas,
              fontSize: 22,
              color: client.archived ? S.muted : S.navy,
              letterSpacing: 1,
            }}
          >
            {client.name.toUpperCase()}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge text={offer.name} color={client.archived ? S.gray : offer.color} />
            {client.archived ? (
              <Badge text="Archivé" color={S.purple} bg="#EDE9F8" />
            ) : (
              <Badge text={client.status} color={client.status === 'actif' ? S.green : S.red} />
            )}
            {client.archivedAt && (
              <span style={{ fontSize: 11, color: S.muted }}>
                le{' '}
                {new Date(client.archivedAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            )}
            {client.messages > 0 && <Badge text={`${client.messages} msg`} color={S.blue} />}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {client.archived ? (
            <button
              onClick={() => onUnarchive(client.id)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: 9,
                background: S.green,
                color: 'white',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: font,
              }}
            >
              ♻️ Réactiver
            </button>
          ) : (
            <>
              <button
                onClick={() => onArchive(client)}
                style={{
                  padding: '8px 16px',
                  border: `1px solid #C4B8E8`,
                  borderRadius: 9,
                  background: '#F3F0FC',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  color: S.purple,
                  fontFamily: font,
                }}
              >
                📦 Archiver
              </button>
              <button
                onClick={onEditOffer}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${S.border}`,
                  borderRadius: 9,
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  color: S.navy,
                  fontFamily: font,
                }}
              >
                ✏️ Modifier l'offre
              </button>
              <button
                onClick={() => onNavigate(client.id)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 9,
                  background: S.navy,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: font,
                }}
              >
                Voir profil complet →
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}
      >
        <KpiCard
          icon="⚖️"
          label="Poids actuel"
          value={client.weight ? `${client.weight} kg` : '—'}
          sub={client.weightGoal ? `Objectif : ${client.weightGoal} kg` : 'Non renseigné'}
          accent={S.navy}
        />
        <KpiCard
          icon="📊"
          label="Compliance"
          value={`${client.compliance}%`}
          sub="7 derniers jours"
          accent={complianceColor(client.compliance)}
        />
        <KpiCard
          icon="📋"
          label="Dernier bilan"
          value={daysAgo(client.lastBilan)}
          sub={client.lastBilan || 'Jamais'}
          accent={S.navy}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* Financier */}
        <div
          style={{
            background: S.card,
            border: `1px solid ${S.border}`,
            borderRadius: 14,
            padding: '18px 20px',
          }}
        >
          <div
            style={{
              fontFamily: bebas,
              fontSize: 14,
              color: S.navy,
              letterSpacing: 2,
              marginBottom: 14,
            }}
          >
            FINANCIER
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 10,
              marginBottom: 14,
            }}
          >
            {[
              ['Tarif', `${offer.price} €/m`],
              ['Solde', `${client.balance} €`],
              [
                'Prochain',
                client.nextPayment
                  ? new Date(client.nextPayment).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                    })
                  : '—',
              ],
            ].map(([lbl, val]) => (
              <div
                key={lbl}
                style={{
                  textAlign: 'center',
                  background: '#F8FAFF',
                  borderRadius: 10,
                  padding: '10px 6px',
                }}
              >
                <div
                  style={{
                    fontFamily: bebas,
                    fontSize: 20,
                    color: client.balance < 0 && lbl === 'Solde' ? S.red : S.navy,
                  }}
                >
                  {val}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: S.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                  }}
                >
                  {lbl}
                </div>
              </div>
            ))}
          </div>
          {client.balance < 0 && (
            <div
              style={{
                padding: '8px 12px',
                background: '#FEF2F2',
                borderRadius: 8,
                border: '1px solid #F3C4C4',
                fontSize: 12,
                color: S.red,
                fontWeight: 600,
              }}
            >
              ⚠️ Retard de paiement : {Math.abs(client.balance)} €
            </div>
          )}
        </div>
        {/* Programme */}
        <div
          style={{
            background: S.card,
            border: `1px solid ${S.border}`,
            borderRadius: 14,
            padding: '18px 20px',
          }}
        >
          <div
            style={{
              fontFamily: bebas,
              fontSize: 14,
              color: S.navy,
              letterSpacing: 2,
              marginBottom: 14,
            }}
          >
            PROGRAMME ACTIF
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, color: S.navy, marginBottom: 8 }}>
            {client.program}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
                fontSize: 12,
              }}
            >
              <span style={{ color: S.muted }}>Compliance semaine</span>
              <span style={{ fontWeight: 700, color: complianceColor(client.compliance) }}>
                {client.compliance}%
              </span>
            </div>
            <ProgressBar
              value={client.compliance}
              color={complianceColor(client.compliance)}
              height={7}
            />
          </div>
          {client.since && (
            <div style={{ fontSize: 12, color: S.muted }}>
              Depuis le{' '}
              {new Date(client.since).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          )}
          {client.objective && (
            <div style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>🎯 {client.objective}</div>
          )}
        </div>
        {/* Offre */}
        <div
          style={{
            background: `${offer.color}0E`,
            border: `1.5px solid ${offer.color}44`,
            borderRadius: 14,
            padding: '18px 20px',
            gridColumn: '1/-1',
          }}
        >
          <div
            style={{
              fontFamily: bebas,
              fontSize: 14,
              color: S.navy,
              letterSpacing: 2,
              marginBottom: 14,
            }}
          >
            OFFRE SOUSCRITE
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>{offer.badge}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: S.navy }}>{offer.name}</div>
              <div style={{ fontFamily: bebas, fontSize: 20, color: offer.color }}>
                {offer.price} €
                <span style={{ fontSize: 12, fontWeight: 400, color: S.muted }}>/mois</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 20px' }}>
            {offer.features.map((f) => (
              <div
                key={f}
                style={{
                  fontSize: 12,
                  color: S.navy,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ color: offer.color, fontWeight: 800 }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Suivi poids / mensurations & diète */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 12 }}>
        {historyLoading ? (
          <div style={{ textAlign: 'center', color: S.muted, padding: '20px 0', fontSize: 13 }}>
            Chargement de l'historique…
          </div>
        ) : (
          <>
            <TrackerPanel
              title="Suivi poids & mensurations"
              icon="⚖️"
              subtitle="Historique des valeurs entrées par le client, avec date, et courbe d'évolution."
              entries={measures}
              fields={COACH_MEASURE_FIELDS}
              defaultField="weight"
              emptyLabel="Aucune mesure enregistrée par ce client pour le moment."
            />
            <TrackerPanel
              title="Suivi diète"
              icon="🥗"
              subtitle="Historique des macros renseignées par le client, avec date, et courbe d'évolution."
              entries={nutritionLogs}
              fields={COACH_NUTRI_FIELDS}
              defaultField="calories"
              emptyLabel="Aucune valeur de diète enregistrée par ce client pour le moment."
            />
          </>
        )}
      </div>

      {/* Post-it */}
      <PostItPanel
        clientId={client.id}
        notes={client.notes}
        onUpdate={(updated) => onNotesUpdate(client.id, updated)}
      />
    </div>
  )
}
