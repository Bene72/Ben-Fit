// components/coach/GoalsEditor.jsx
// Objectifs de l'athlète (Athlete Assessment) côté coach : création,
// mise à jour de la valeur, suppression. L'athlète voit ces objectifs en haut
// de son tableau de bord et peut mettre à jour sa valeur actuelle.
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { btn, inp, lbl } from '../../lib/coachShared'
import { loadGoals } from '../../lib/retentionData'
import { goalProgress } from '../../lib/goals'

const EMPTY = {
  name: '',
  baseline_value: '',
  current_value: '',
  target_value: '',
  unit: 'kg',
  lower_is_better: false,
}
const n = (v) =>
  v === '' || v === null || v === undefined ? null : Number(String(v).replace(',', '.'))

export default function GoalsEditor({ clientId }) {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    loadGoals(clientId).then((g) => {
      if (!active) return
      setGoals(g)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [clientId])

  const add = async () => {
    if (!form.name.trim() || n(form.target_value) === null) {
      setError('Nom et valeur cible obligatoires.')
      return
    }
    setError('')
    const baseline = n(form.baseline_value)
    const { data, error: err } = await supabase
      .from('goals')
      .insert({
        client_id: clientId,
        name: form.name.trim(),
        baseline_value: baseline,
        current_value: n(form.current_value) ?? baseline ?? 0,
        target_value: n(form.target_value),
        unit: form.unit.trim() || null,
        lower_is_better: form.lower_is_better,
        sort_order: goals.length,
      })
      .select()
      .single()
    if (err) {
      setError(err.message)
      return
    }
    setGoals((prev) => [...prev, data])
    setForm(EMPTY)
    setAdding(false)
  }

  const updateCurrent = async (goal, value) => {
    const v = n(value)
    if (v === null || v === Number(goal.current_value)) return
    const { data, error: err } = await supabase
      .from('goals')
      .update({ current_value: v })
      .eq('id', goal.id)
      .select()
      .single()
    if (err) {
      setError(err.message)
      return
    }
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? data : g)))
  }

  const remove = async (goal) => {
    if (!window.confirm(`Supprimer l'objectif « ${goal.name} » ?`)) return
    const { error: err } = await supabase.from('goals').delete().eq('id', goal.id)
    if (err) {
      setError(err.message)
      return
    }
    setGoals((prev) => prev.filter((g) => g.id !== goal.id))
  }

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 16,
        padding: 18,
        border: '1px solid var(--border)',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 12.5,
            color: 'var(--chalk-dim)',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
          }}
        >
          Objectifs · Athlete Assessment
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          style={btn(
            adding ? 'var(--accent-dim)' : 'var(--chalk)',
            adding ? 'var(--chalk)' : 'var(--bg-card)',
            null
          )}
        >
          {adding ? 'Annuler' : '+ Objectif'}
        </button>
      </div>

      {adding && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: 10,
            marginBottom: 14,
            alignItems: 'end',
          }}
        >
          <div style={{ gridColumn: 'span 2' }}>
            <label style={lbl}>Test / objectif</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex : Back squat 1RM"
              style={inp}
            />
          </div>
          <div>
            <label style={lbl}>Départ</label>
            <input
              value={form.baseline_value}
              onChange={(e) => setForm((p) => ({ ...p, baseline_value: e.target.value }))}
              style={inp}
              inputMode="decimal"
            />
          </div>
          <div>
            <label style={lbl}>Actuel</label>
            <input
              value={form.current_value}
              onChange={(e) => setForm((p) => ({ ...p, current_value: e.target.value }))}
              placeholder="= départ"
              style={inp}
              inputMode="decimal"
            />
          </div>
          <div>
            <label style={lbl}>Cible</label>
            <input
              value={form.target_value}
              onChange={(e) => setForm((p) => ({ ...p, target_value: e.target.value }))}
              style={inp}
              inputMode="decimal"
            />
          </div>
          <div>
            <label style={lbl}>Unité</label>
            <input
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
              placeholder="kg, reps, s…"
              style={inp}
            />
          </div>
          <label
            style={{
              fontSize: 12,
              color: 'var(--chalk-dim)',
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <input
              type="checkbox"
              checked={form.lower_is_better}
              onChange={(e) => setForm((p) => ({ ...p, lower_is_better: e.target.checked }))}
            />
            Plus bas = mieux (temps)
          </label>
          <button onClick={add} style={btn('var(--accent)', 'var(--bg-card)', null)}>
            Ajouter
          </button>
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>{error}</div>
      )}
      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--chalk-dim)' }}>Chargement…</div>
      ) : !goals.length ? (
        <div style={{ fontSize: 13, color: 'var(--chalk-dim)', fontStyle: 'italic' }}>
          Aucun objectif. Ajoute les tests de l'Athlete Assessment : l'athlète les verra en haut de
          son accueil.
        </div>
      ) : (
        goals.map((g) => {
          const p = goalProgress(g)
          return (
            <div key={g.id} style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  alignItems: 'center',
                  fontSize: 13,
                }}
              >
                <b style={{ color: 'var(--chalk)' }}>
                  {g.name} {p.done && '✅'}
                </b>
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                    color: 'var(--chalk-dim)',
                  }}
                >
                  <input
                    defaultValue={g.current_value ?? ''}
                    onBlur={(e) => updateCurrent(g, e.target.value)}
                    aria-label={`Valeur actuelle ${g.name}`}
                    style={{ ...inp, width: 70, padding: '4px 6px', textAlign: 'right' }}
                    inputMode="decimal"
                  />
                  / {g.target_value} {g.unit}
                  <button
                    onClick={() => remove(g)}
                    aria-label={`Supprimer ${g.name}`}
                    style={{
                      background: 'none',
                      border: 0,
                      color: 'var(--chalk-dim)',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div
                style={{
                  height: 6,
                  background: 'var(--border)',
                  borderRadius: 99,
                  marginTop: 6,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${p.percent}%`,
                    height: '100%',
                    background: p.done ? 'var(--rx, #17a673)' : 'var(--accent)',
                    borderRadius: 99,
                  }}
                />
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
