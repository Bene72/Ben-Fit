// components/coach/CycleTasksPanel.js
//
// Remplace/complète les blocs "TÂCHES À VENIR" et "PROCHAINS SUIVIS"
// du cockpit coach. Combine :
//   - des tâches manuelles (table coach_tasks)
//   - des alertes automatiques de fin de cycle (vue cycle_alerts,
//     calculée depuis la table cycles — jamais désynchronisée)
//
// Niveaux d'alerte (vue cycle_alerts, cf. migration 17/09/2026) :
//   - 'upcoming'     : ≤ 21 jours restants avant la fin théorique du
//                      cycle (ex : J+14 pour un cycle de 5 semaines).
//                      Alerte précoce → affichée dans "TÂCHES À VENIR",
//                      mélangée aux tâches manuelles, triée par date.
//   - 'ending_soon'  : ≤ 5 jours restants. Alerte tardive → affichée
//                      dans "PROCHAINS SUIVIS" (encart dédié).
//   - 'expired'      : date de fin théorique dépassée. Même encart.
//
// Props :
//   coachId  (uuid, requis)
//   clients  (array [{ id, name }], pour les selects)
//
// Utilisation dans coach.js, à côté ou à la place du calendrier existant :
//   <CycleTasksPanel coachId={user?.id} clients={clients} />

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { S, font, bebas } from '../../lib/coachDashboard/offersAndCompliance'

function daysLabel(n) {
  if (n < 0) return `en retard de ${Math.abs(n)} j`
  if (n === 0) return "aujourd'hui"
  if (n === 1) return 'demain'
  return `dans ${n} j`
}

// Style visuel par niveau d'alerte — centralisé ici pour ne pas dupliquer
// la logique dans le JSX.
const ALERT_STYLES = {
  expired: { bg: 'var(--danger-dim)', border: 'var(--danger)', icon: '🔴' },
  ending_soon: { bg: 'var(--gold-dim)', border: 'var(--gold)', icon: '🟡' },
  upcoming: { bg: 'var(--info-dim, rgba(59,130,246,0.10))', border: 'var(--info, #3B82F6)', icon: '🔵' },
}

function alertStyle(level) {
  return ALERT_STYLES[level] || ALERT_STYLES.ending_soon
}

function cycleEndLabel(a) {
  return `Fin de cycle ${daysLabel(a.days_remaining)} · ${new Date(a.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
}

export default function CycleTasksPanel({ coachId, clients = [] }) {
  const [tasks, setTasks] = useState([])
  const [alerts, setAlerts] = useState([]) // ending_soon / expired -> encart "Prochains suivis"
  const [upcomingCycles, setUpcomingCycles] = useState([]) // upcoming -> liste "Tâches à venir"
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

  const [activeCycles, setActiveCycles] = useState([])

  const load = useCallback(async () => {
    if (!coachId) return
    setLoading(true)
    const [{ data: taskData }, { data: alertData }, { data: upcomingData }, { data: cycleData }] = await Promise.all([
      supabase
        .from('coach_tasks')
        .select('*')
        .eq('coach_id', coachId)
        .eq('done', false)
        .order('due_date', { ascending: true }),
      // Alerte tardive (encart "Prochains suivis") : cycle presque fini
      // ou déjà dépassé.
      supabase
        .from('cycle_alerts')
        .select('*')
        .eq('coach_id', coachId)
        .in('alert_level', ['ending_soon', 'expired'])
        .order('end_date', { ascending: true }),
      // Alerte précoce (liste "Tâches à venir") : ≤ 21 j restants,
      // pour anticiper le prochain cycle avant que ça devienne urgent.
      supabase
        .from('cycle_alerts')
        .select('*')
        .eq('coach_id', coachId)
        .eq('alert_level', 'upcoming')
        .order('end_date', { ascending: true }),
      // Cycles actifs, tous niveaux confondus — sert à afficher la date
      // de début de cycle de chaque athlète (demande coach).
      supabase
        .from('cycles')
        .select('id, client_id, name, start_date, duration_weeks')
        .eq('coach_id', coachId)
        .eq('status', 'active')
        .order('start_date', { ascending: false }),
    ])
    setTasks(taskData || [])
    setAlerts(alertData || [])
    setUpcomingCycles(upcomingData || [])
    setActiveCycles(cycleData || [])
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

    const durationWeeks = Number(cycleForm.duration_weeks) || 5

    const { data: cycle, error } = await supabase
      .from('cycles')
      .insert({
        client_id: cycleForm.client_id,
        coach_id: coachId,
        name: cycleForm.name,
        start_date: cycleForm.start_date,
        duration_weeks: durationWeeks,
        status: 'active',
      })
      .select()
      .single()

    if (!error && cycle) {
      // Crée automatiquement une tâche "Prog <client> à changer" au
      // moment prévu de fin de cycle (start_date + durée en semaines).
      // L'alerte précoce "upcoming" (3 semaines avant), elle, n'a pas
      // besoin de tâche insérée : elle est calculée à la volée par la
      // vue cycle_alerts et injectée dans la liste au chargement.
      const dueDate = new Date(cycleForm.start_date + 'T12:00:00')
      dueDate.setDate(dueDate.getDate() + durationWeeks * 7)
      const dueDateStr = dueDate.toISOString().split('T')[0]
      const cName = clientName(cycleForm.client_id)

      // Garde le libellé texte à jour pour compat avec l'existant
      // (lu par bilan.js, nutrition.js et dashboard.js côté client)
      await supabase
        .from('profiles')
        .update({ current_cycle_name: cycleForm.name })
        .eq('id', cycleForm.client_id)

      await supabase.from('coach_tasks').insert({
        coach_id: coachId,
        client_id: cycleForm.client_id,
        cycle_id: cycle.id,
        type: 'cycle_reminder',
        title: `Prog ${cName} à changer`,
        due_date: dueDateStr,
      })

      setCycleForm({ client_id: '', name: '', start_date: new Date().toISOString().split('T')[0], duration_weeks: 5 })
      setShowCycleForm(false)
      load()
    }
  }

  const clientName = (id) => clients.find((c) => c.id === id)?.name || '—'

  // Fusionne tâches manuelles + alertes de cycle "upcoming" en une seule
  // liste triée par date, pour l'onglet "Tâches à venir".
  const upcomingItems = [
    ...tasks.map((t) => ({ kind: 'task', sortDate: t.due_date, data: t })),
    ...upcomingCycles.map((a) => ({ kind: 'cycle', sortDate: a.end_date, data: a })),
  ].sort((a, b) => a.sortDate.localeCompare(b.sortDate))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── PROCHAINS SUIVIS (alerte tardive : cycle presque fini / dépassé) ── */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 16, border: `1px solid ${S.border}` }}>
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
          <form onSubmit={createCycle} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, background: 'var(--bg-card-2)', padding: 12, borderRadius: 10 }}>
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
                required
              />
              <input
                type="number"
                min="1"
                value={cycleForm.duration_weeks}
                onChange={(e) => setCycleForm((f) => ({ ...f, duration_weeks: e.target.value }))}
                style={{ ...inputStyle(), width: 60 }}
                required
              />
              <span style={{ fontSize: 11, color: S.muted, alignSelf: 'center' }}>sem.</span>
            </div>
            <button type="submit" style={primaryBtnStyle()}>Démarrer le cycle</button>
          </form>
        )}

        {/* Cycles en cours — date de début par athlète */}
        {!loading && activeCycles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Cycles en cours
            </div>
            {activeCycles.map((c) => {
              const end = new Date(c.start_date + 'T12:00:00')
              end.setDate(end.getDate() + (c.duration_weeks || 5) * 7)
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '7px 10px',
                    borderRadius: 8,
                    background: 'var(--bg-card-2)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: S.navy }}>
                    {clientName(c.client_id)}
                    <span style={{ fontWeight: 500, color: S.muted }}> · {c.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: S.muted, fontFamily: font, whiteSpace: 'nowrap' }}>
                    {new Date(c.start_date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    <span style={{ color: 'var(--chalk-muted)' }}> → </span>
                    {end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {loading ? (
          <div style={{ fontSize: 12, color: S.muted }}>Chargement…</div>
        ) : alerts.length === 0 && activeCycles.length === 0 ? (
          <div style={{ fontSize: 12, color: S.muted, padding: '8px 0' }}>Aucun suivi à venir.</div>
        ) : alerts.length === 0 ? null : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alerts.map((a) => {
              const st = alertStyle(a.alert_level)
              return (
                <div
                  key={a.cycle_id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: st.bg,
                    border: `1px solid ${st.border}`,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: S.navy }}>
                      {a.client_name}
                      <span style={{ fontWeight: 500, color: S.muted }}> · {a.cycle_name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: S.muted }}>{cycleEndLabel(a)}</div>
                  </div>
                  <span style={{ fontSize: 16 }}>{st.icon}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── TÂCHES À VENIR (tâches manuelles + alerte précoce "upcoming") ── */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 16, border: `1px solid ${S.border}` }}>
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
          <form onSubmit={createTask} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, background: 'var(--bg-card-2)', padding: 12, borderRadius: 10 }}>
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
        ) : upcomingItems.length === 0 ? (
          <div style={{ fontSize: 12, color: S.muted, padding: '8px 0' }}>
            Aucune tâche — clique sur "+ Ajouter" pour en créer une.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcomingItems.map((item) => {
              if (item.kind === 'task') {
                const t = item.data
                const overdue = t.due_date < new Date().toISOString().split('T')[0]
                return (
                  <div
                    key={`task-${t.id}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '9px 12px',
                      borderRadius: 10,
                      background: overdue ? 'var(--danger-dim)' : 'var(--bg-card-2)',
                      border: `1px solid ${overdue ? 'var(--danger)' : S.border}`,
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
              }
              // item.kind === 'cycle' : alerte précoce dérivée de cycle_alerts,
              // pas une vraie ligne coach_tasks — pas de checkbox/suppression,
              // juste un badge distinctif et le rappel d'info.
              const a = item.data
              const st = alertStyle('upcoming')
              return (
                <div
                  key={`cycle-${a.cycle_id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '9px 12px',
                    borderRadius: 10,
                    background: st.bg,
                    border: `1px solid ${st.border}`,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: S.navy }}>
                      {a.client_name}
                      <span style={{ fontWeight: 500, color: S.muted }}> · {a.cycle_name} à préparer</span>
                    </div>
                    <div style={{ fontSize: 11, color: S.muted }}>{cycleEndLabel(a)}</div>
                  </div>
                  <span style={{ fontSize: 14 }}>{st.icon}</span>
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
    border: '1px solid var(--border-hi)',
    fontSize: 12.5,
    fontFamily: font,
    outline: 'none',
    background: 'var(--bg-input)',
    color: 'var(--chalk)',
  }
}
function selectStyle() {
  return { ...inputStyle(), cursor: 'pointer' }
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
    background: 'var(--bg-card-2)',
    color: 'var(--chalk)',
    borderRadius: 6,
    width: 24,
    height: 24,
    cursor: 'pointer',
    fontSize: 12,
  }
}
