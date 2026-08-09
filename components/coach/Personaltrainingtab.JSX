// components/coach/PersonalTrainingTab.jsx
//
// Entraînements persos du coach : saisie exercice par exercice
// (séries / reps / repos / RPE), classés par groupe musculaire,
// avec récap du volume hebdomadaire (semaine calendaire, lundi→dimanche).
//
// Props : coachId (uuid, requis)

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { S, font, bebas } from '../../lib/coachDashboard/shared'
import { getMondayOfWeek } from '../../lib/coachShared'

const MUSCLE_GROUPS = ['Pectoraux', 'Dos', 'Épaules', 'Jambes', 'Bras', 'Abdos']
const MUSCLE_COLOR = {
  Pectoraux: '#D85A30',
  Dos: '#378ADD',
  Épaules: '#BA7517',
  Jambes: '#639922',
  Bras: '#7F77DD',
  Abdos: '#1D9E75',
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function PersonalTrainingTab({ coachId }) {
  const [exercises, setExercises] = useState([])
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [sets, setSets] = useState(4)
  const [reps, setReps] = useState(8)
  const [rest, setRest] = useState(90)
  const [rpe, setRpe] = useState(8)
  const [entries, setEntries] = useState([])
  const [weekEntries, setWeekEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewExercise, setShowNewExercise] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseMuscle, setNewExerciseMuscle] = useState(MUSCLE_GROUPS[0])
  const [sessionDate] = useState(todayStr())

  const load = useCallback(async () => {
    if (!coachId) return
    setLoading(true)
    const monday = getMondayOfWeek()

    const [{ data: exs }, { data: session }, { data: weekSessions }] = await Promise.all([
      supabase
        .from('exercises')
        .select('*')
        .or(`coach_id.is.null,coach_id.eq.${coachId}`)
        .order('muscle_group')
        .order('name'),
      supabase
        .from('personal_workout_sessions')
        .select('id, personal_workout_entries(*, exercises(name, muscle_group))')
        .eq('coach_id', coachId)
        .eq('date', sessionDate)
        .maybeSingle(),
      supabase
        .from('personal_workout_sessions')
        .select('date, personal_workout_entries(sets, exercises(muscle_group))')
        .eq('coach_id', coachId)
        .gte('date', monday),
    ])

    setExercises(exs || [])
    setEntries(session?.personal_workout_entries || [])
    setWeekEntries(weekSessions || [])
    if (!selectedExerciseId && exs?.length) setSelectedExerciseId(exs[0].id)
    setLoading(false)
  }, [coachId, sessionDate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
  }, [load])

  const weeklyVolume = useMemo(() => {
    const totals = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, 0]))
    weekEntries.forEach((s) => {
      ;(s.personal_workout_entries || []).forEach((e) => {
        const m = e.exercises?.muscle_group
        if (m && totals[m] != null) totals[m] += e.sets
      })
    })
    return totals
  }, [weekEntries])

  const maxVolume = Math.max(...Object.values(weeklyVolume), 1)

  async function ensureSession() {
    const { data: existing } = await supabase
      .from('personal_workout_sessions')
      .select('id')
      .eq('coach_id', coachId)
      .eq('date', sessionDate)
      .maybeSingle()
    if (existing) return existing.id
    const { data } = await supabase
      .from('personal_workout_sessions')
      .insert({ coach_id: coachId, date: sessionDate })
      .select('id')
      .single()
    return data?.id
  }

  async function addEntry() {
    if (!selectedExerciseId) return
    const sessionId = await ensureSession()
    if (!sessionId) return
    const { data } = await supabase
      .from('personal_workout_entries')
      .insert({
        session_id: sessionId,
        exercise_id: selectedExerciseId,
        sets: Number(sets) || 1,
        reps: Number(reps) || 1,
        rest_seconds: Number(rest) || 0,
        rpe: Number(rpe) || null,
      })
      .select('*, exercises(name, muscle_group)')
      .single()
    if (data) {
      setEntries((prev) => [...prev, data])
      load()
    }
  }

  async function deleteEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    await supabase.from('personal_workout_entries').delete().eq('id', id)
    load()
  }

  async function createCustomExercise() {
    if (!newExerciseName.trim()) return
    const { data } = await supabase
      .from('exercises')
      .insert({ coach_id: coachId, name: newExerciseName.trim(), muscle_group: newExerciseMuscle })
      .select()
      .single()
    if (data) {
      setExercises((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedExerciseId(data.id)
      setNewExerciseName('')
      setShowNewExercise(false)
    }
  }

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId)

  if (loading) {
    return <div style={{ color: S.muted, textAlign: 'center', padding: 40 }}>Chargement…</div>
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontFamily: bebas, fontSize: 20, color: S.navy, letterSpacing: 2 }}>
          MA SÉANCE — {new Date(sessionDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* ── Formulaire d'ajout ── */}
      <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 0.8fr 0.8fr 0.9fr 0.8fr', gap: 10, alignItems: 'end', marginBottom: 10 }}>
          <div>
            <label style={fieldLabel()}>Exercice</label>
            <select value={selectedExerciseId} onChange={(e) => setSelectedExerciseId(e.target.value)} style={fieldInput()}>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={fieldLabel()}>Séries</label>
            <input type="number" min={1} value={sets} onChange={(e) => setSets(e.target.value)} style={fieldInput()} />
          </div>
          <div>
            <label style={fieldLabel()}>Reps</label>
            <input type="number" min={1} value={reps} onChange={(e) => setReps(e.target.value)} style={fieldInput()} />
          </div>
          <div>
            <label style={fieldLabel()}>Repos (s)</label>
            <input type="number" min={0} step={15} value={rest} onChange={(e) => setRest(e.target.value)} style={fieldInput()} />
          </div>
          <div>
            <label style={fieldLabel()}>RPE</label>
            <input type="number" min={1} max={10} value={rpe} onChange={(e) => setRpe(e.target.value)} style={fieldInput()} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: S.muted }}>
            {selectedExercise ? `Groupe : ${selectedExercise.muscle_group}` : ''}
            {' · '}
            <button
              onClick={() => setShowNewExercise((v) => !v)}
              style={{ border: 'none', background: 'transparent', color: S.blue, fontWeight: 700, cursor: 'pointer', fontFamily: font, fontSize: 12, padding: 0 }}
            >
              + Nouvel exercice
            </button>
          </div>
          <button onClick={addEntry} style={primaryBtn()}>
            + Ajouter
          </button>
        </div>

        {showNewExercise && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #D0DCFF', display: 'flex', gap: 8 }}>
            <input
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              placeholder="Nom de l'exercice"
              style={{ ...fieldInput(), flex: 1 }}
            />
            <select value={newExerciseMuscle} onChange={(e) => setNewExerciseMuscle(e.target.value)} style={fieldInput()}>
              {MUSCLE_GROUPS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button onClick={createCustomExercise} style={primaryBtn()}>
              Créer
            </button>
          </div>
        )}
      </div>

      {/* ── Séance du jour ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
        {entries.length === 0 ? (
          <div style={{ fontSize: 13, color: S.muted, padding: '8px 0' }}>Aucun exercice ajouté aujourd'hui.</div>
        ) : (
          entries.map((e) => (
            <div
              key={e.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: 'white',
                border: '1px solid #EEF2F8',
                borderRadius: 10,
              }}
            >
              <div>
                <span style={{ fontWeight: 700, fontSize: 13, color: S.navy }}>{e.exercises?.name}</span>
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 10,
                    fontWeight: 700,
                    color: MUSCLE_COLOR[e.exercises?.muscle_group],
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {e.exercises?.muscle_group}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 12, color: S.muted }}>
                  {e.sets} x {e.reps} · repos {e.rest_seconds}s · RPE {e.rpe}
                </span>
                <button onClick={() => deleteEntry(e.id)} title="Supprimer" style={iconBtn()}>
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Volume hebdo ── */}
      <div style={{ fontFamily: bebas, fontSize: 16, color: S.navy, letterSpacing: 1, marginBottom: 12 }}>
        VOLUME DE LA SEMAINE — SÉRIES PAR GROUPE
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MUSCLE_GROUPS.map((m) => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 78, fontSize: 12, color: S.muted }}>{m}</div>
            <div style={{ flex: 1, background: '#F0F2F7', borderRadius: 4, height: 14, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.round((weeklyVolume[m] / maxVolume) * 100)}%`,
                  height: '100%',
                  background: MUSCLE_COLOR[m],
                  opacity: 0.85,
                }}
              />
            </div>
            <div style={{ width: 70, textAlign: 'right', fontSize: 12, fontWeight: 700, color: S.navy }}>
              {weeklyVolume[m]} séries
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function fieldLabel() {
  return { fontSize: 11, color: S.muted, display: 'block', marginBottom: 4, fontFamily: font }
}
function fieldInput() {
  return {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #DCE5F3',
    fontSize: 13,
    fontFamily: font,
    outline: 'none',
    background: 'white',
  }
}
function primaryBtn() {
  return {
    border: 'none',
    background: S.navy,
    color: 'white',
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: font,
  }
}
function iconBtn() {
  return {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 12,
    color: S.muted,
    padding: 4,
  }
}
