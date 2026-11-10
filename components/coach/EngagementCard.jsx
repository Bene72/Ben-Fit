// components/coach/EngagementCard.jsx
// Date de début de l'engagement de 12 semaines (saisie par le coach) +
// semaine en cours. Sert aux rappels de renouvellement (S10-S11).
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { btn, inp, lbl } from '../../lib/coachShared'
import { engagementStatus } from '../../lib/insights'
import { toLocalISODate } from '../../lib/dateUtils'

const fmtDate = (d) =>
  d
    ? new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

export default function EngagementCard({ client, onUpdate }) {
  const current = client?.engagement_start ? String(client.engagement_start).slice(0, 10) : ''
  const [value, setValue] = useState(current)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const status = engagementStatus(current)

  // Colonne absente = migration "rétention" pas encore appliquée
  if (client && !('engagement_start' in client)) return null

  const save = async (date) => {
    setSaving(true)
    setMsg('')
    const { data, error } = await supabase
      .from('profiles')
      .update({ engagement_start: date || null })
      .eq('id', client.id)
      .select()
      .single()
    setSaving(false)
    if (error) {
      setMsg('Erreur : ' + error.message)
      return
    }
    setValue(date)
    setMsg('Enregistré ✓')
    onUpdate?.({ ...client, ...data })
  }

  const todayStr = toLocalISODate()

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 12,
        padding: 20,
        border: '1px solid var(--border)',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--chalk)', marginBottom: 4 }}>
            📅 Engagement 12 semaines
          </div>
          <div style={{ fontSize: 13, color: 'var(--chalk-dim)' }}>
            {!status
              ? 'Date de début non renseignée'
              : status.ended
                ? `Terminé le ${fmtDate(status.endDate)} — pense au renouvellement`
                : `Semaine ${status.week}/${status.length} · fin le ${fmtDate(status.endDate)}`}
            {status?.renewal && !status.ended && (
              <b style={{ color: 'var(--gold)' }}> · renouvellement à préparer</b>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={lbl}>Début</label>
            <input
              type="date"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{ ...inp, width: 160 }}
            />
          </div>
          <button
            onClick={() => save(value)}
            disabled={saving || value === current}
            style={btn(
              value === current ? 'var(--border)' : 'var(--accent)',
              'var(--bg-card)',
              null
            )}
          >
            {saving ? '…' : 'Enregistrer'}
          </button>
          <button
            onClick={() => save(todayStr)}
            disabled={saving}
            title="Le client renouvelle : nouvel engagement à partir d'aujourd'hui"
            style={btn('transparent', 'var(--chalk)', 'var(--border)')}
          >
            🔁 Renouvelé aujourd'hui
          </button>
        </div>
      </div>
      {msg && <div style={{ fontSize: 12, color: 'var(--chalk-dim)', marginTop: 8 }}>{msg}</div>}
    </div>
  )
}
