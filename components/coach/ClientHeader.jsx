// components/coach/ClientHeader.jsx
// En-tête de la fiche client : avatar, nom, offre, cycle en cours, email, et
// l'engagement de 12 semaines sous forme de frise (une case par semaine),
// avec « Renouvelé » (nouvel engagement à partir d'aujourd'hui), modification
// de la date de début, et accès direct aux messages.
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { OFFERS } from '../../lib/coachDashboard/offersAndCompliance'
import { engagementStatus } from '../../lib/insights'
import { toLocalISODate } from '../../lib/dateUtils'

const fmt = (d, opts = { day: 'numeric', month: 'short' }) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', opts) : ''

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
  const [editingDate, setEditingDate] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const start = client.engagement_start ? String(client.engagement_start).slice(0, 10) : ''
  const [dateValue, setDateValue] = useState(start)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const hasEngagementColumn = 'engagement_start' in client
  const status = engagementStatus(start)
  const offer = OFFERS[client.offer]
  const initials =
    (client.full_name || client.email || '?')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'

  const saveStart = async (date) => {
    setSaving(true)
    setError('')
    const { data, error: err } = await supabase
      .from('profiles')
      .update({ engagement_start: date || null })
      .eq('id', client.id)
      .select()
      .single()
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setDateValue(date)
    setEditingDate(false)
    onUpdate?.({ ...client, ...data })
  }

  const renew = () => {
    if (
      window.confirm(
        `Nouvel engagement de 12 semaines pour ${client.full_name || 'ce client'} à partir d'aujourd'hui ?`
      )
    )
      saveStart(toLocalISODate())
  }

  const weeks = status?.length || 12
  const cellColor = (i) => {
    if (!status) return 'var(--border-hi)'
    if (i + 1 < status.week) return 'var(--accent)'
    if (i + 1 === status.week) return status.renewal ? 'var(--info, #4a9eff)' : 'var(--accent)'
    if (status.renewal && i + 1 <= weeks - 1 && i + 1 >= weeks - 2) return 'rgba(74,158,255,.35)'
    return 'var(--border-hi)'
  }

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
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'var(--chalk-dim)',
                  marginBottom: 6,
                }}
              >
                <span>Engagement 12 semaines</span>
                <b style={{ color: 'var(--chalk)' }}>
                  {!status ? '—' : status.ended ? 'Terminé' : `S${status.week} / ${weeks}`}
                </b>
              </div>
              <div
                style={{ display: 'grid', gridTemplateColumns: `repeat(${weeks}, 1fr)`, gap: 3 }}
                aria-label={
                  status ? `Semaine ${status.week} sur ${weeks}` : 'Engagement non renseigné'
                }
              >
                {Array.from({ length: weeks }, (_, i) => (
                  <i key={i} style={{ height: 8, borderRadius: 3, background: cellColor(i) }} />
                ))}
              </div>
              {editingDate ? (
                <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                  <input
                    type="date"
                    value={dateValue}
                    onChange={(e) => setDateValue(e.target.value)}
                    aria-label="Date de début d'engagement"
                    style={{
                      flex: 1,
                      background: 'var(--bg-card-2)',
                      color: 'var(--chalk)',
                      border: '1px solid var(--border-hi)',
                      borderRadius: 8,
                      padding: '5px 8px',
                      fontFamily: 'inherit',
                      fontSize: 12.5,
                    }}
                  />
                  <button style={btn(true)} disabled={saving} onClick={() => saveStart(dateValue)}>
                    {saving ? '…' : 'OK'}
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    marginTop: 6,
                    color: 'var(--chalk-dim)',
                  }}
                >
                  <button
                    onClick={() => setEditingDate(true)}
                    title="Modifier la date de début"
                    style={{
                      background: 'none',
                      border: 0,
                      padding: 0,
                      cursor: 'pointer',
                      color: 'inherit',
                      fontFamily: 'inherit',
                      fontSize: 12,
                    }}
                  >
                    {start ? `Début ${fmt(start)}` : 'Définir le début'} ✎
                  </button>
                  {status?.renewal && (
                    <span
                      style={{
                        color: status.ended ? 'var(--gold)' : 'var(--info, #4a9eff)',
                        fontWeight: 700,
                      }}
                    >
                      {status.ended
                        ? `Fini le ${fmt(status.endDate)}`
                        : 'Renouvellement à préparer'}
                    </span>
                  )}
                </div>
              )}
              {error && (
                <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{error}</div>
              )}
            </>
          )}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 12,
              justifyContent: isMobile ? 'flex-start' : 'flex-end',
            }}
          >
            {hasEngagementColumn && (
              <button style={btn(false)} onClick={renew} disabled={saving}>
                🔁 Renouvelé
              </button>
            )}
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
                      label: '📅 Date de début d’engagement',
                      action: () => setEditingDate(true),
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
