// components/coach/EngagementDates.jsx
// Engagement de l'athlète dans l'en-tête de la fiche : frise (une case par
// semaine), dates de début et de fin modifiables, et « Prolonger » (+1 mois
// ou +12 semaines à partir de la fin actuelle) — pour les athlètes au mois
// comme pour les engagements de 12 semaines. Remplace « Renouvelé » (11/11/2026).
import { confirmDialog } from '../../lib/dialogs'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { engagementStatus } from '../../lib/insights'
import { addDaysISO, toLocalISODate } from '../../lib/dateUtils'

const fmt = (d) =>
  d
    ? new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : ''

/** Même jour du mois suivant, moins un jour (ex : 1er nov. → 30 nov. ; fin 30 nov. → 30 déc.). */
export function addOneMonth(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(Date.UTC(y, m, d))
  // mois suivant plus court (31 jan. → 28 fév.) : on reste dans le mois suivant
  if (next.getUTCMonth() !== m % 12) next.setUTCDate(0)
  return next.toISOString().slice(0, 10)
}

const inputStyle = {
  background: 'var(--bg-card-2)',
  color: 'var(--chalk)',
  border: '1px solid var(--border-hi)',
  borderRadius: 8,
  padding: '5px 8px',
  fontFamily: 'inherit',
  fontSize: 12.5,
  width: '100%',
}

export default function EngagementDates({ client, onUpdate, editRequest, btn }) {
  const start = client.engagement_start ? String(client.engagement_start).slice(0, 10) : ''
  const end = client.engagement_end ? String(client.engagement_end).slice(0, 10) : ''
  const status = engagementStatus(start, toLocalISODate(), end || null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ start, end: end || status?.endDate || '' })
  const [extendOpen, setExtendOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const hasEndColumn = 'engagement_end' in client

  // Ouverture depuis le menu ⋯ de l'en-tête
  const [lastRequest, setLastRequest] = useState(editRequest)
  if (editRequest !== lastRequest) {
    setLastRequest(editRequest)
    setForm({ start, end: end || status?.endDate || '' })
    setEditing(true)
  }

  const save = async (values) => {
    if (values.start && values.end && values.end < values.start) {
      setError('La date de fin doit être après la date de début.')
      return
    }
    setSaving(true)
    setError('')
    const payload = { engagement_start: values.start || null }
    if (hasEndColumn) payload.engagement_end = values.end || null
    const { data, error: err } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', client.id)
      .select()
      .single()
    setSaving(false)
    if (err) {
      setError(
        err.message.includes('engagement_end')
          ? 'Lance d’abord le script SQL « engagement_fin » dans Supabase.'
          : err.message
      )
      return
    }
    setEditing(false)
    setExtendOpen(false)
    onUpdate?.({ ...client, ...data })
  }

  const extend = async (kind) => {
    const base = status?.endDate || toLocalISODate()
    const newEnd = kind === 'month' ? addOneMonth(base) : addDaysISO(base, 84)
    const label = kind === 'month' ? '1 mois' : '12 semaines'
    if (
      await confirmDialog(`Prolonger de ${label} : fin le ${fmt(newEnd)} ?`, {
        confirmLabel: 'Prolonger',
      })
    )
      save({ start: start || toLocalISODate(), end: newEnd })
  }

  const weeks = status?.length || 12
  const cellColor = (i) => {
    if (!status) return 'var(--border-hi)'
    if (status.ended) return 'var(--gold)'
    if (i + 1 < status.week) return 'var(--accent)'
    if (i + 1 === status.week) return status.renewal ? 'var(--info, #4a9eff)' : 'var(--accent)'
    return 'var(--border-hi)'
  }

  return (
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
        <span>Engagement{status ? ` · ${weeks} sem.` : ''}</span>
        <b style={{ color: 'var(--chalk)' }}>
          {!status
            ? '—'
            : status.ended
              ? 'Terminé'
              : status.week === 0
                ? 'À venir'
                : `S${status.week} / ${weeks}`}
        </b>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(weeks, 26)}, 1fr)`,
          gap: 3,
        }}
        aria-label={status ? `Semaine ${status.week} sur ${weeks}` : 'Engagement non renseigné'}
      >
        {Array.from({ length: Math.min(weeks, 26) }, (_, i) => (
          <i key={i} style={{ height: 8, borderRadius: 3, background: cellColor(i) }} />
        ))}
      </div>

      {editing ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: 6,
            marginTop: 8,
            alignItems: 'end',
          }}
        >
          <label style={{ fontSize: 11, color: 'var(--chalk-dim)' }}>
            Début
            <input
              type="date"
              value={form.start}
              onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <label style={{ fontSize: 11, color: 'var(--chalk-dim)' }}>
            Fin
            <input
              type="date"
              value={form.end}
              disabled={!hasEndColumn}
              onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <button style={btn(true)} disabled={saving} onClick={() => save(form)}>
            {saving ? '…' : 'OK'}
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            fontSize: 12,
            marginTop: 6,
            color: 'var(--chalk-dim)',
          }}
        >
          <button
            onClick={() => {
              setForm({ start, end: end || status?.endDate || '' })
              setEditing(true)
            }}
            title="Modifier les dates"
            style={{
              background: 'none',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              color: 'inherit',
              fontFamily: 'inherit',
              fontSize: 12,
              textAlign: 'left',
            }}
          >
            {status ? `${fmt(start)} → ${fmt(status.endDate)}` : 'Définir les dates'} ✎
          </button>
          {status?.renewal && (
            <span
              style={{
                color: status.ended ? 'var(--gold)' : 'var(--info, #4a9eff)',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {status.ended ? 'Terminé' : `Fin dans ${status.daysLeft} j`}
            </span>
          )}
        </div>
      )}
      {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{error}</div>}

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          style={{ ...btn(false), marginTop: 10 }}
          onClick={() => setExtendOpen((v) => !v)}
          disabled={saving}
          aria-expanded={extendOpen}
        >
          ⏩ Prolonger
        </button>
        {extendOpen && (
          <div
            role="menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: 20,
              background: 'var(--bg-card-2)',
              border: '1px solid var(--border-hi)',
              borderRadius: 12,
              padding: 6,
              minWidth: 170,
              boxShadow: '0 12px 30px rgba(0,0,0,.35)',
            }}
          >
            {[
              { id: 'month', label: '+1 mois' },
              { id: '12w', label: '+12 semaines' },
            ].map((o) => (
              <button
                key={o.id}
                role="menuitem"
                onClick={() => extend(o.id)}
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
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
