// components/athlete/AthleteHighlights.jsx
// Haut du tableau de bord athlète (sobre, volontairement) :
//   - objectifs fixés avec le coach + barre de progression, valeur actuelle
//     modifiable par l'athlète
//   - série de semaines complètes (affichée à partir de 2)
//   - bilan du dernier cycle de 5 semaines, partageable en image
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { loadAthleteInsights, loadGoals } from '../../lib/retentionData'
import { goalProgress } from '../../lib/goals'
import { fmt } from '../../lib/insights'
import { shareCycleImage } from '../../lib/shareCycle'

const card = {
  background: 'var(--surface)',
  borderRadius: 'var(--r-lg)',
  padding: 16,
  boxShadow: 'var(--shadow-sm)',
  marginBottom: 12,
  border: '1px solid var(--border-soft)',
}
const eyebrow = {
  fontSize: 10.5,
  fontWeight: 800,
  color: 'var(--text-soft)',
  textTransform: 'uppercase',
  letterSpacing: '.6px',
}
const fmtDay = (d) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

function GoalRow({ goal, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(goal.current_value ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const p = goalProgress(goal)

  const save = async () => {
    const v = Number(String(value).replace(',', '.'))
    if (!Number.isFinite(v)) {
      setError('Valeur invalide')
      return
    }
    setSaving(true)
    setError('')
    const { data, error: err } = await supabase
      .from('goals')
      .update({ current_value: v })
      .eq('id', goal.id)
      .select()
      .single()
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    onSaved(data)
    setEditing(false)
  }

  return (
    <div style={{ padding: '10px 0', borderTop: '1px solid var(--border-soft)' }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--navy)' }}>{goal.name}</div>
        {editing ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              inputMode="decimal"
              aria-label={`Nouvelle valeur pour ${goal.name}`}
              style={{
                width: 70,
                padding: '5px 8px',
                borderRadius: 8,
                border: '1px solid var(--border-strong)',
                fontSize: 13,
                textAlign: 'right',
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{goal.unit}</span>
            <button onClick={save} disabled={saving} style={smallBtn(true)}>
              {saving ? '…' : 'OK'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            title="Mettre à jour ma valeur"
            style={{
              background: 'none',
              border: 0,
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
              {fmt(goal.current_value ?? 0)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
              {' '}
              / {fmt(goal.target_value)} {goal.unit} ✎
            </span>
          </button>
        )}
      </div>
      <div
        style={{
          height: 6,
          background: 'var(--surface-strong)',
          borderRadius: 99,
          marginTop: 7,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${p.percent}%`,
            height: '100%',
            borderRadius: 99,
            background: p.done ? 'var(--success)' : 'var(--accent)',
            transition: 'width .4s ease',
          }}
        />
      </div>
      {error && <div style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 4 }}>{error}</div>}
    </div>
  )
}

const smallBtn = (primary) => ({
  border: primary ? 0 : '1px solid var(--border-strong)',
  background: primary ? 'var(--navy)' : 'transparent',
  color: primary ? '#fff' : 'var(--navy)',
  fontWeight: 700,
  fontSize: 12,
  padding: '6px 10px',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
})

export default function AthleteHighlights({ userId, firstName }) {
  const [goals, setGoals] = useState([])
  const [insights, setInsights] = useState({ streak: 0, cycleReport: null })
  const [shareMsg, setShareMsg] = useState('')

  useEffect(() => {
    if (!userId) return
    let active = true
    loadGoals(userId).then((g) => active && setGoals(g))
    loadAthleteInsights(userId).then((i) => active && setInsights(i))
    return () => {
      active = false
    }
  }, [userId])

  const { streak, cycleReport } = insights
  const report = cycleReport

  const share = async () => {
    setShareMsg('')
    try {
      const result = await shareCycleImage({ report, firstName })
      if (result === 'downloaded') setShareMsg('Image téléchargée ✓')
    } catch (e) {
      if (e?.name !== 'AbortError') setShareMsg("Le partage n'a pas fonctionné sur cet appareil.")
    }
  }

  return (
    <>
      {streak >= 2 && (
        <div
          style={{
            ...card,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            color: 'var(--navy)',
          }}
        >
          <span aria-hidden>🔥</span>
          <span>
            <b>{streak} semaines complètes</b> d'affilée
          </span>
        </div>
      )}

      {goals.length > 0 && (
        <div style={card}>
          <div style={{ ...eyebrow, marginBottom: 4 }}>Mes objectifs</div>
          {goals.map((g) => (
            <GoalRow
              key={g.id}
              goal={g}
              onSaved={(updated) =>
                setGoals((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
              }
            />
          ))}
        </div>
      )}

      {report && (
        <div style={card}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 10,
            }}
          >
            <span style={eyebrow}>
              Bilan de cycle{report.cycle.name ? ` · ${report.cycle.name}` : ''}
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>
              {fmtDay(String(report.cycle.start_date).slice(0, 10))} → {fmtDay(report.cycle.end)}
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <Stat
              value={report.adherence !== null ? `${report.adherence} %` : '—'}
              label="séances faites"
            />
            <Stat
              value={report.gains[0] ? `+${fmt(report.gains[0].delta)} kg` : '—'}
              label={report.gains[0]?.exercise || 'meilleure progression'}
            />
            <Stat
              value={
                report.weightChange !== null
                  ? `${report.weightChange > 0 ? '+' : ''}${fmt(report.weightChange)} kg`
                  : '—'
              }
              label="poids"
            />
          </div>
          {report.gains.length > 1 && (
            <div style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 10 }}>
              Aussi :{' '}
              {report.gains
                .slice(1)
                .map((g) => `+${fmt(g.delta)} kg ${g.exercise}`)
                .join(' · ')}
            </div>
          )}
          <button onClick={share} style={{ ...smallBtn(false), width: '100%', padding: 10 }}>
            Partager mon bilan
          </button>
          {shareMsg && (
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--text-soft)',
                marginTop: 6,
                textAlign: 'center',
              }}
            >
              {shareMsg}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function Stat({ value, label }) {
  return (
    <div
      style={{
        background: 'var(--surface-muted)',
        borderRadius: 12,
        padding: '10px 8px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          lineHeight: 1,
          color: 'var(--navy)',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10.5,
          color: 'var(--text-soft)',
          marginTop: 4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </div>
    </div>
  )
}
