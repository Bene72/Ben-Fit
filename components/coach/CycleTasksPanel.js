// components/coach/CycleTasksPanel.js
//
// Remplace/complète les blocs "TÂCHES À VENIR" et "PROCHAINS SUIVIS"
// du cockpit coach. Combine :
//   - des tâches manuelles (table coach_tasks)
//   - des alertes automatiques de fin de cycle (vue cycle_alerts,
//     calculée depuis la table cycles — jamais désynchronisée)
//
// Props :
//   coachId  (uuid, requis)
//   clients  (array [{ id, name }], pour les selects)
//
// Utilisation dans coach.js, à côté ou à la place du calendrier existant :
//   <CycleTasksPanel coachId={user?.id} clients={clients} />

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { S, font, bebas } from '../../lib/coachDashboard/shared'

function daysLabel(n) {
  if (n < 0) return `en retard de ${Math.abs(n)} j`
  if (n === 0) return "aujourd'hui"
  if (n === 1) return 'demain'
  return `dans ${n} j`
}

export default function CycleTasksPanel({ coachId, clients = [] }) {
  const [tasks, setTasks] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    type: 'task',
    title: '',
    due_date: new Date().toISOString().split('T')[0],
    client_id: '',
  })
  const [showCycleForm, setShowCycleForm] = useState(false)
  const [cycleForm, setCycleForm] = useState({
    client_id: '',
    name: '',
    start_date: new Date().toISOString().split('T')[0],
    duration_weeks: 5,
  })

  const load = useCallback(async () => {
    if (!coachId) return
    setLoading(true)
    const [{ data: taskData }, { data: alertData }] = await Promise.all([
      supabase
        .from('coach_tasks')
        .select('*')
        .eq('coach_id', coachId)
        .eq('done', false)
        .order('due_date', { ascending: true }),
      supabase
        .from('cycle_alerts')
        .select('*')
        .eq('coach_id', coachId)
        .in('alert_level', ['ending_soon', 'expired'])
        .order('end_date', { ascending: true }),
    ])
    setTasks(taskData || [])
    setAlerts(alertData || [])
    setLoading(false)
  }, [coachId])

  useEffect(() => {
    load()
  }, [load])

  async function createTask(e) {
    e.preventDefault()
    if (!form.title || !form.due_date) return
    const { data, error } = await supabase
      .from('coach_tasks')
      .insert({
        coach_id: coachId,
        client_id: form.client_id || null,
        type: form.type,
        title: form.title,
        due_date: form.due_date,
      })
      .select()
      .single()
    if (!error && data) {
      setTasks((prev) => [...prev, data].sort((a, b) => a.due_date.localeCompare(b.due_date)))
      setForm({ type: 'task', title: '', due_date: new Date().toISOString().split('T')[0], client_id: '' })
      setShowForm(false)
    }
  }

  async function completeTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    await supabase.from('coach_tasks').update({ done: true }).eq('id', id)
  }

  async function deleteTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    await supabase.from('coach_tasks').delete().eq('id', id)
  }

  async function createCycle(e) {
    e.preventDefault()
    if (!cycleForm.client_id || !cycleForm.name) return
    // Ferme l'éventuel cycle actif précédent du même client
    await supabase
      .from('cycles')
      .update({ status: 'completed' })
      .eq('client_id', cycleForm.client_id)
      .eq('status', 'active')

    const { error } = await supabase.from('cycles').insert({
      client_id: cycleForm.client_id,
      coach_id: coachId,
      name: cycleForm.name,
      start_date: cycleForm.start_date,
      duration_weeks: Number(cycleForm.duration_weeks) || 5,
      status: 'active',
    })
    // Garde aussi le libellé texte à jour pour compat avec l'existant (bilan/nutrition)
    if (!error) {
      await supabase
        .from('profiles')
        .update({ current_cycle_name: cycleForm.name })
        .eq('id', cycleForm.client_id)
      setCycleForm({ client_id: '', name: '', start_date: new Date().toISOString().split('T')[0], duration_weeks: 5 })
      setShowCycleForm(false)
      load()
    }
  }

  const clientName = (id) => clients.find((c) => c.id === id)?.name || '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── PROCHAINS SUIVIS (alertes fin de cycle + suivis manuels) ── */}
      <div style={{ background: 'white', borderRadius: 16, padding: 16, border: `1px solid ${S.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: bebas, fontSize: 15, color: S.navy, letterSpacing: 0.5 }}>
            PROCHAINS SUIVIS
          </div>
          <button
            onClick={() => setShowCycleForm((v) => !v)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: S.blue, fontFamily: font, fontWeight: 700 }}
          >
            + Nouveau cycle
          </button>
        </div>

        {showCycleForm && (
          <form onSubmit={createCycle} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, background: '#F7F9FC', padding: 12, borderRadius: 10 }}>
            <select
              value={cycleForm.client_id}
              onChange={(e) => setCycleForm((f) => ({ ...f, client_id: e.target.value }))}
              style={selectStyle()}
              required
            >
              <option value="">Client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              value={cycleForm.name}
              onChange={(e) => setCycleForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nom du cycle (ex: Bloc Force 1)"
              style={inputStyle()}
              required
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="date"
                value={cycleForm.start_date}
                onChange={(e) => setCycleForm((f) => ({ ...f, start_date: e.target.value }))}
                style={{ ...inputStyle(), flex: 1 }}
              />
              <input
                type="number"
                min={1}
                value={cycleForm.duration_weeks}
                onChange={(e) => setCycleForm((f) => ({ ...f, duration_weeks: e.target.value }))}
                style={{ ...inputStyle(), width: 70 }}
                title="Durée en semaines"
              />
              <span style={{ fontSize: 11, color: S.muted, alignSelf: 'center' }}>sem.</span>
            </div>
            <button type="submit" style={primaryBtnStyle()}>Démarrer le cycle</button>
          </form>
        )}

        {loading ? (
          <div style={{ fontSize: 12, color: S.muted }}>Chargement…</div>
        ) : alerts.length === 0 ? (
          <div style={{ fontSize: 12, color: S.muted, padding: '8px 0' }}>Aucun suivi à venir.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.map((a) => (
              <div
                key={a.cycle_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: a.alert_level === 'expired' ? '#FDEDED' : '#FFF7E6',
                  border: `1px solid ${a.alert_level === 'expired' ? '#F3C4C4' : '#F2DDA0'}`,
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: S.navy }}>
                    {a.client_name}
                    <span style={{ fontWeight: 500, color: S.muted }}> · {a.cycle_name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: S.muted }}>
                    Fin de cycle {daysLabel(a.days_remaining)} · {new Date(a.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                  </div>
                </div>
                <span style={{ fontSize: 16 }}>{a.alert_level === 'expired' ? '🔴' : '🟡'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── TÂCHES À VENIR (manuelles) ── */}
      <div style={{ background: 'white', borderRadius: 16, padding: 16, border: `1px solid ${S.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: bebas, fontSize: 15, color: S.navy, letterSpacing: 0.5 }}>
            TÂCHES À VENIR
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: S.blue, fontFamily: font, fontWeight: 700 }}
          >
            + Ajouter
          </button>
        </div>

        {showForm && (
          <form onSubmit={createTask} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, background: '#F7F9FC', padding: 12, borderRadius: 10 }}>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex : Relancer Clément pour son bilan"
              style={inputStyle()}
              required
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                style={{ ...selectStyle(), flex: 1 }}
              >
                <option value="">Client (optionnel)…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                style={inputStyle()}
                required
              />
            </div>
            <button type="submit" style={primaryBtnStyle()}>Créer la tâche</button>
          </form>
        )}

        {loading ? (
          <div style={{ fontSize: 12, color: S.muted }}>Chargement…</div>
        ) : tasks.length === 0 ? (
          <div style={{ fontSize: 12, color: S.muted, padding: '8px 0' }}>
            Aucune tâche — clique sur "+ Ajouter" pour en créer une.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tasks.map((t) => {
              const overdue = t.due_date < new Date().toISOString().split('T')[0]
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '9px 12px',
                    borderRadius: 10,
                    background: overdue ? '#FDEDED' : '#F7F9FC',
                    border: `1px solid ${overdue ? '#F3C4C4' : S.border}`,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: S.navy }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: S.muted }}>
                      {t.client_id ? `${clientName(t.client_id)} · ` : ''}
                      {new Date(t.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => completeTask(t.id)} title="Marquer comme fait" style={iconBtnStyle()}>✓</button>
                    <button onClick={() => deleteTask(t.id)} title="Supprimer" style={iconBtnStyle()}>✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function inputStyle() {
  return {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #DCE5F3',
    fontSize: 12.5,
    fontFamily: font,
    outline: 'none',
  }
}
function selectStyle() {
  return { ...inputStyle(), background: 'white', cursor: 'pointer' }
}
function primaryBtnStyle() {
  return {
    border: 'none',
    background: '#0D1B4E',
    color: 'white',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: font,
  }
}
function iconBtnStyle() {
  return {
    border: 'none',
    background: 'white',
    borderRadius: 6,
    width: 24,
    height: 24,
    cursor: 'pointer',
    fontSize: 12,
  }
}
