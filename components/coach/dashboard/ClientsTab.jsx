// components/coach/dashboard/ClientsTab.jsx
// Extrait de pages/coach.js (découpage audit 09/09/2026, point 4) — contenu
// de l'onglet "Clients" : sous-onglets actifs/archivés, recherche/tri,
// liste de cartes clients, et la colonne de droite (activité, calendrier,
// tâches de cycle). Aucune logique modifiée, copié tel quel.
import Avatar from '../Avatar'
import Badge from '../Badge'
import ActivityFeed from '../ActivityFeed'
import CalendarPanel from '../CalendarPanel'
import CycleTasksPanel from '../CycleTasksPanel'
import { S, font, bebas, OFFERS, daysAgo } from '../../../lib/coachDashboard/offersAndCompliance'

export default function ClientsTab({
  isMobile,
  clients,
  archivedClients,
  clientSubTab,
  onChangeSubTab,
  clientSearch,
  onChangeSearch,
  clientSort,
  onChangeSort,
  displayedClients,
  onSelectClient,
  onCreateClient,
  activity,
  activityLoading,
  onSelectActivity,
  sessions,
  coachId,
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 300px',
        gap: 16,
      }}
    >
      <div>
        {/* CoachHome (risque de décrochage / paiements à venir) retiré en V2 :
            "paiements à venir" dépendait de client.nextPayment, jamais alimenté
            dans l'app — et "à risque" faisait doublon avec le tri "Récent" des
            sous-onglets ci-dessous. */}
        {/* Sous-onglets Actifs / Anciens clients */}
        <div
          style={{
            display: 'flex',
            gap: 2,
            marginBottom: 16,
            borderBottom: `2px solid ${S.border}`,
          }}
        >
          {[
            {
              id: 'actifs',
              label: `Actifs (${clients.filter((c) => !c.archived).length})`,
              color: S.navy,
            },
            {
              id: 'archives',
              label: `Anciens clients (${archivedClients.length})`,
              color: S.purple,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChangeSubTab(tab.id)}
              style={{
                padding: '8px 18px',
                border: 'none',
                background: 'transparent',
                fontFamily: font,
                fontSize: 13,
                fontWeight: clientSubTab === tab.id ? 700 : 500,
                cursor: 'pointer',
                color: clientSubTab === tab.id ? tab.color : S.muted,
                borderBottom: `2px solid ${clientSubTab === tab.id ? tab.color : 'transparent'}`,
                marginBottom: -2,
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bandeau info archives */}
        {clientSubTab === 'archives' && archivedClients.length > 0 && (
          <div
            style={{
              background: '#F3F0FC',
              border: `1px solid #C4B8E8`,
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 14,
              fontSize: 12,
              color: S.purple,
            }}
          >
            📦 Ces clients sont archivés. Leurs données sont conservées. Clique sur un client pour
            le réactiver.
          </div>
        )}

        {/* Barre de recherche + tri */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            value={clientSearch}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="Rechercher un élève…"
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: 10,
              border: `1px solid ${S.border}`,
              fontFamily: font,
              fontSize: 13,
              outline: 'none',
              background: S.card,
            }}
          />
          <select
            value={clientSort}
            onChange={(e) => onChangeSort(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 10,
              border: `1px solid ${S.border}`,
              fontFamily: font,
              fontSize: 12.5,
              color: S.navy,
              background: S.card,
              cursor: 'pointer',
            }}
          >
            <option value="recent">Trier : activité récente</option>
            <option value="name">Trier : nom (A→Z)</option>
            <option value="balance">Trier : solde</option>
          </select>
        </div>

        {/* Accès rapide : menu déroulant pour sauter directement à un client */}
        <div style={{ marginBottom: 14 }}>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) onSelectClient(e.target.value)
            }}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: `1px solid ${S.border}`,
              fontFamily: font,
              fontSize: 13,
              color: S.navy,
              background: S.card,
              cursor: 'pointer',
            }}
          >
            <option value="">↳ Aller directement à un élève…</option>
            {displayedClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.archived ? ' (archivé)' : ''}
              </option>
            ))}
          </select>
        </div>

        {displayedClients.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'white',
              borderRadius: 20,
              border: `2px dashed ${S.border}`,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {clientSubTab === 'archives' ? '📦' : '🏋️'}
            </div>
            <div style={{ fontFamily: bebas, fontSize: 20, color: S.navy, marginBottom: 8 }}>
              {clientSubTab === 'archives' ? 'AUCUN ANCIEN CLIENT' : 'AUCUN ÉLÈVE'}
            </div>
            <div style={{ fontSize: 13, color: S.muted, marginBottom: 16 }}>
              {clientSubTab === 'archives'
                ? 'Les clients archivés apparaîtront ici.'
                : 'Crée ton premier élève pour commencer.'}
            </div>
            {clientSubTab === 'actifs' && (
              <button
                onClick={onCreateClient}
                style={{
                  padding: '10px 22px',
                  background: S.navy,
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: font,
                }}
              >
                + Nouvel élève
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {displayedClients.map((c) => {
              const offer = OFFERS[c.offer] || OFFERS['tutto_bene']
              const archived = c.archived
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectClient(c.id)}
                  style={{
                    background: archived ? '#F7F6FB' : S.card,
                    border: `1px solid ${archived ? '#D8D2EE' : S.border}`,
                    borderRadius: 14,
                    padding: '14px 18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    transition: 'box-shadow 0.15s, transform 0.15s',
                    opacity: archived ? 0.85 : 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(13,27,78,0.1)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <Avatar initials={c.avatar} size={42} color={offer.color} grayscale={archived} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 4,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 14,
                          color: archived ? S.muted : S.navy,
                        }}
                      >
                        {c.name}
                      </div>
                      <Badge text={offer.name} color={archived ? S.gray : offer.color} />
                      {archived ? (
                        <Badge text="Archivé" color={S.purple} bg="#EDE9F8" />
                      ) : (
                        c.status !== 'actif' && <Badge text="inactif" color={S.red} />
                      )}
                      {c.messages > 0 && <Badge text={`${c.messages} msg`} color={S.blue} />}
                      {c.notes && c.notes.length > 0 && (
                        <span title={`${c.notes.length} annotation(s)`} style={{ fontSize: 12 }}>
                          📌
                        </span>
                      )}
                    </div>
                    {archived && c.archivedAt ? (
                      <div style={{ fontSize: 11, color: S.purple }}>
                        Archivé le{' '}
                        {new Date(c.archivedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: S.muted }}>{c.program}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontFamily: bebas,
                        fontSize: 18,
                        color: c.balance < 0 ? S.red : archived ? S.muted : S.navy,
                      }}
                    >
                      {c.balance === 0 ? (archived ? '—' : '✓') : `${c.balance} €`}
                    </div>
                    <div style={{ fontSize: 10, color: S.muted }}>{daysAgo(c.lastBilan)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ActivityFeed items={activity} loading={activityLoading} onSelect={onSelectActivity} />
        <CalendarPanel sessions={sessions} coachId={coachId} clients={clients} />
        <CycleTasksPanel coachId={coachId} clients={clients} />
      </div>
    </div>
  )
}
