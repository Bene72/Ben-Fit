import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function Nutrition() {
  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState(null)
  const [weeklyLogs, setWeeklyLogs] = useState([])
  const [activeTab, setActiveTab] = useState('today')
  const [loading, setLoading] = useState(true)
  const [todayLog, setTodayLog] = useState(null)
  const [editingLog, setEditingLog] = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)
  const [meals, setMeals] = useState([])
  const router = useRouter()

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: np } = await supabase.from('nutrition_plans').select('*').eq('client_id', user.id).eq('active', true).maybeSingle()
      setPlan(np)
      if (np) {
        const { data: ml } = await supabase.from('meals').select('*, food_items(*)').eq('nutrition_plan_id', np.id).order('order_index')
        setMeals(ml || [])
      }
      const { data: logs } = await supabase.from('nutrition_logs').select('*, nutrition_log_meals(*)').eq('client_id', user.id).order('date', { ascending: false }).limit(56)
      setWeeklyLogs(logs || [])
      const todayEntry = (logs || []).find(l => l.date === today)
      setTodayLog(todayEntry || null)
      setLoading(false)
    }
    load()
  }, [])

  const saveTodayLog = async (logData) => {
    if (todayLog) {
      const { data } = await supabase.from('nutrition_logs').update(logData).eq('id', todayLog.id).select().single()
      setTodayLog(data)
      setWeeklyLogs(prev => prev.map(l => l.id === todayLog.id ? { ...data, nutrition_log_meals: l.nutrition_log_meals } : l))
    } else {
      const { data } = await supabase.from('nutrition_logs').insert({ ...logData, client_id: user.id, date: today }).select().single()
      setTodayLog({ ...data, nutrition_log_meals: [] })
      setWeeklyLogs(prev => [{ ...data, nutrition_log_meals: [] }, ...prev])
    }
    setEditingLog(false)
  }

  if (loading) return <LoadingScreen />

  return (
    <Layout title="Nutrition" user={user}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[['today', "Aujourd'hui"], ['weekly', 'Suivi semaine'], ['plan', 'Mon plan']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: 'none', fontFamily: "'DM Sans',sans-serif", background: activeTab === id ? '#4A5240' : '#FDFAF4', color: activeTab === id ? 'white' : '#7A7A6A', borderBottom: activeTab === id ? 'none' : '1px solid #E0D9CC' }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'today' && <TodayTab plan={plan} todayLog={todayLog} editingLog={editingLog} setEditingLog={setEditingLog} saveTodayLog={saveTodayLog} meals={meals} userId={user?.id} today={today} weeklyLogs={weeklyLogs} />}
      {activeTab === 'weekly' && <WeeklyTab logs={weeklyLogs} plan={plan} />}
      {activeTab === 'plan' && <PlanTab plan={plan} meals={meals} />}
    </Layout>
  )
}

// ─── TODAY TAB ───────────────────────────────────────────────
function TodayTab({ plan, todayLog, editingLog, setEditingLog, saveTodayLog, meals, userId, today, weeklyLogs }) {
  const [showMealDetail, setShowMealDetail] = useState(false)
  const [logMeals, setLogMeals] = useState([])
  const [newMealEntry, setNewMealEntry] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' })
  const [showAddMeal, setShowAddMeal] = useState(false)

  useEffect(() => {
    if (todayLog?.id) {
      supabase.from('nutrition_log_meals').select('*').eq('log_id', todayLog.id).order('created_at').then(({ data }) => setLogMeals(data || []))
    } else {
      setLogMeals([])
    }
  }, [todayLog?.id])

  const addLogMeal = async () => {
    if (!newMealEntry.name.trim() || !todayLog?.id) return
    const { data } = await supabase.from('nutrition_log_meals').insert({ log_id: todayLog.id, name: newMealEntry.name, calories: +newMealEntry.calories || 0, protein: +newMealEntry.protein || 0, carbs: +newMealEntry.carbs || 0, fat: +newMealEntry.fat || 0 }).select().single()
    if (data) { setLogMeals(prev => [...prev, data]); setNewMealEntry({ name: '', calories: '', protein: '', carbs: '', fat: '' }); setShowAddMeal(false) }
  }

  const deleteLogMeal = async (id) => {
    await supabase.from('nutrition_log_meals').delete().eq('id', id)
    setLogMeals(prev => prev.filter(m => m.id !== id))
  }

  const calPct = plan && todayLog ? Math.min(100, (todayLog.calories / plan.target_calories) * 100) : 0

  return (
    <div>
      {!plan && <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '24px', textAlign: 'center', color: '#7A7A6A', marginBottom: '16px' }}>Ton plan nutritionnel n'est pas encore configuré par ton coach.</div>}

      {/* Daily summary card */}
      <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '16px', fontWeight: '700' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          {!editingLog && <button onClick={() => setEditingLog(true)} style={btnSt('#4A5240', 'white')}>✏️ {todayLog ? 'Modifier' : 'Saisir mes macros'}</button>}
        </div>

        {editingLog ? (
          <LogForm plan={plan} initial={todayLog} onSave={saveTodayLog} onCancel={() => setEditingLog(false)} />
        ) : todayLog ? (
          <div>
            {/* Calories big display */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', textAlign: 'center' }}>
              {[
                { label: 'Consommées', value: todayLog.calories, unit: 'kcal', color: '#1A1A14' },
                { label: 'Objectif', value: plan?.target_calories || '—', unit: 'kcal', color: '#7A7A6A' },
                { label: 'Restantes', value: plan ? (plan.target_calories - todayLog.calories) : '—', unit: 'kcal', color: (plan && todayLog.calories > plan.target_calories) ? '#C45C3A' : '#8FA07A' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '28px', fontWeight: '700', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: '#7A7A6A' }}>{s.unit}</div>
                  <div style={{ fontSize: '11px', color: '#9A9A8A', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Macro bars */}
            {[
              { label: 'Protéines', current: todayLog.protein, target: plan?.target_protein, color: '#C45C3A', unit: 'g' },
              { label: 'Glucides', current: todayLog.carbs, target: plan?.target_carbs, color: '#C8A85A', unit: 'g' },
              { label: 'Lipides', current: todayLog.fat, target: plan?.target_fat, color: '#8FA07A', unit: 'g' },
            ].map(m => (
              <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ width: '80px', fontSize: '13px', fontWeight: '500' }}>{m.label}</div>
                <div style={{ flex: 1, height: '8px', background: '#E0D9CC', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: m.color, borderRadius: '4px', width: `${Math.min(100, ((m.current || 0) / (m.target || 1)) * 100)}%`, transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ width: '100px', textAlign: 'right', fontSize: '12px', color: '#7A7A6A', fontFamily: "'DM Mono',monospace" }}>{m.current || 0}g / {m.target || '—'}g</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#7A7A6A', fontSize: '14px', padding: '10px' }}>Clique sur "Saisir mes macros" pour enregistrer ta journée</div>
        )}
      </div>

      {/* Meal details section */}
      {todayLog && (
        <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>🍽️ Détail des repas <span style={{ fontSize: '12px', color: '#7A7A6A', fontWeight: '400' }}>(optionnel)</span></div>
            <button onClick={() => setShowAddMeal(!showAddMeal)} style={btnSt('#4A5240', 'white')}>+ Ajouter un repas</button>
          </div>

          {showAddMeal && (
            <div style={{ background: '#F5F0E8', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 80px 80px', gap: '8px', marginBottom: '10px' }}>
                <div><label style={lbl}>Repas</label><input value={newMealEntry.name} onChange={e => setNewMealEntry(p => ({ ...p, name: e.target.value }))} placeholder="Déjeuner, collation…" style={inp} /></div>
                <div><label style={lbl}>Kcal</label><input type="number" value={newMealEntry.calories} onChange={e => setNewMealEntry(p => ({ ...p, calories: e.target.value }))} placeholder="500" style={inp} /></div>
                <div><label style={lbl}>Prot.</label><input type="number" value={newMealEntry.protein} onChange={e => setNewMealEntry(p => ({ ...p, protein: e.target.value }))} placeholder="40" style={inp} /></div>
                <div><label style={lbl}>Gluc.</label><input type="number" value={newMealEntry.carbs} onChange={e => setNewMealEntry(p => ({ ...p, carbs: e.target.value }))} placeholder="60" style={inp} /></div>
                <div><label style={lbl}>Lip.</label><input type="number" value={newMealEntry.fat} onChange={e => setNewMealEntry(p => ({ ...p, fat: e.target.value }))} placeholder="15" style={inp} /></div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={addLogMeal} style={btnSt('#4A5240', 'white')}>✓ Ajouter</button>
                <button onClick={() => setShowAddMeal(false)} style={btnSt('transparent', '#7A7A6A', '#E0D9CC')}>Annuler</button>
              </div>
            </div>
          )}

          {logMeals.length === 0 ? (
            <div style={{ color: '#7A7A6A', fontSize: '13px', textAlign: 'center', padding: '12px' }}>Aucun repas détaillé pour aujourd'hui</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Repas', 'Calories', 'Protéines', 'Glucides', 'Lipides', ''].map(h => (
                    <th key={h} style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', fontWeight: '500', textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid #E0D9CC' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logMeals.map(meal => (
                  <tr key={meal.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <td style={{ padding: '8px 10px', fontSize: '14px', fontWeight: '500' }}>{meal.name}</td>
                    <td style={{ padding: '8px 10px', fontSize: '13px', fontFamily: "'DM Mono',monospace" }}>{meal.calories}</td>
                    <td style={{ padding: '8px 10px', fontSize: '13px', color: '#C45C3A', fontFamily: "'DM Mono',monospace" }}>{meal.protein}g</td>
                    <td style={{ padding: '8px 10px', fontSize: '13px', color: '#C8A85A', fontFamily: "'DM Mono',monospace" }}>{meal.carbs}g</td>
                    <td style={{ padding: '8px 10px', fontSize: '13px', color: '#8FA07A', fontFamily: "'DM Mono',monospace" }}>{meal.fat}g</td>
                    <td style={{ padding: '8px 10px' }}><button onClick={() => deleteLogMeal(meal.id)} style={{ background: 'none', border: 'none', color: '#C45C3A', cursor: 'pointer', fontSize: '16px' }}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {plan?.coach_note && (
            <div style={{ marginTop: '16px', padding: '14px', background: '#F5F0E8', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '6px' }}>📌 Consigne coach</div>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>{plan.coach_note}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── LOG FORM ────────────────────────────────────────────────
function LogForm({ plan, initial, onSave, onCancel }) {
  const [form, setForm] = useState({ calories: initial?.calories || '', protein: initial?.protein || '', carbs: initial?.carbs || '', fat: initial?.fat || '', notes: initial?.notes || '' })
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
        {[
          { label: '🔥 Calories', key: 'calories', ph: plan?.target_calories || '2000', color: '#1A1A14' },
          { label: '🥩 Protéines (g)', key: 'protein', ph: plan?.target_protein || '150', color: '#C45C3A' },
          { label: '🌾 Glucides (g)', key: 'carbs', ph: plan?.target_carbs || '200', color: '#C8A85A' },
          { label: '🥑 Lipides (g)', key: 'fat', ph: plan?.target_fat || '60', color: '#8FA07A' },
        ].map(f => (
          <div key={f.key}>
            <label style={{ ...lbl, color: f.color }}>{f.label}</label>
            <input type="number" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph} style={{ ...inp, borderColor: form[f.key] ? f.color : '#E0D9CC' }} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: '14px' }}>
        <label style={lbl}>Notes (optionnel)</label>
        <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Repas cheat, sortie restaurant, journée difficile…" style={inp} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => onSave({ calories: +form.calories || 0, protein: +form.protein || 0, carbs: +form.carbs || 0, fat: +form.fat || 0, notes: form.notes })} style={btnSt('#4A5240', 'white')}>✓ Enregistrer</button>
        <button onClick={onCancel} style={btnSt('transparent', '#7A7A6A', '#E0D9CC')}>Annuler</button>
      </div>
    </div>
  )
}

// ─── WEEKLY TAB ──────────────────────────────────────────────
function WeeklyTab({ logs, plan }) {
  const getWeekKey = (dateStr) => {
    const d = new Date(dateStr)
    const day = d.getDay() === 0 ? 7 : d.getDay()
    const monday = new Date(d); monday.setDate(d.getDate() - day + 1)
    return monday.toISOString().split('T')[0]
  }
  const getWeekLabel = (wk) => {
    const s = new Date(wk), e = new Date(wk); e.setDate(e.getDate() + 6)
    return `${s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  const getDayLabel = (dateStr) => DAYS_FR[new Date(dateStr).getDay() === 0 ? 6 : new Date(dateStr).getDay() - 1]
  const avg = (arr, key) => { const vals = arr.filter(l => l[key] > 0); return vals.length ? Math.round(vals.reduce((s, l) => s + (l[key] || 0), 0) / vals.length) : null }

  const weeks = {}
  logs.forEach(log => { const wk = getWeekKey(log.date); if (!weeks[wk]) weeks[wk] = []; weeks[wk].push(log) })
  const sortedWeeks = Object.keys(weeks).sort((a, b) => b.localeCompare(a))
  const today = new Date().toISOString().split('T')[0]

  if (logs.length === 0) return (
    <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '40px', textAlign: 'center', color: '#7A7A6A', fontSize: '14px' }}>
      Aucune saisie. Commence à logger dans "Aujourd'hui" !
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {sortedWeeks.map(weekKey => {
        const weekLogs = weeks[weekKey].sort((a, b) => a.date.localeCompare(b.date))
        const avgCal = avg(weekLogs, 'calories')
        const avgProt = avg(weekLogs, 'protein')
        const avgCarbs = avg(weekLogs, 'carbs')
        const avgFat = avg(weekLogs, 'fat')

        // Pie chart data for macro distribution
        const totalMacroG = (avgProt || 0) + (avgCarbs || 0) + (avgFat || 0)
        const macroSlices = totalMacroG > 0 ? [
          { label: 'Protéines', value: avgProt || 0, color: '#C45C3A', kcal: (avgProt || 0) * 4 },
          { label: 'Glucides', value: avgCarbs || 0, color: '#C8A85A', kcal: (avgCarbs || 0) * 4 },
          { label: 'Lipides', value: avgFat || 0, color: '#8FA07A', kcal: (avgFat || 0) * 9 },
        ] : []

        return (
          <div key={weekKey} style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', overflow: 'hidden' }}>
            {/* Week header */}
            <div style={{ padding: '14px 20px', background: '#F0EBE0', borderBottom: '1px solid #E0D9CC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '700', fontSize: '14px' }}>📅 {getWeekLabel(weekKey)}</div>
              <div style={{ fontSize: '12px', color: '#7A7A6A' }}>{weekLogs.length} jour{weekLogs.length > 1 ? 's' : ''} saisi{weekLogs.length > 1 ? 's' : ''}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '0' }}>
              {/* Table */}
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8F4EC' }}>
                      {['Jour', 'Calories', 'Protéines', 'Glucides', 'Lipides', 'Notes'].map(h => (
                        <th key={h} style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', fontWeight: '500', textAlign: 'left', padding: '8px 14px', borderBottom: '1px solid #E0D9CC' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weekLogs.map(log => {
                      const isToday = log.date === today
                      const calPct = plan?.target_calories ? Math.min(100, (log.calories / plan.target_calories) * 100) : 0
                      return (
                        <tr key={log.id} style={{ background: isToday ? 'rgba(200,168,90,0.06)' : 'transparent', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontSize: '13px', fontWeight: isToday ? '700' : '500' }}>{getDayLabel(log.date)}{isToday ? ' 📍' : ''}</div>
                            <div style={{ fontSize: '11px', color: '#7A7A6A', fontFamily: "'DM Mono',monospace" }}>{new Date(log.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</div>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '14px', fontWeight: '600', minWidth: '42px' }}>{log.calories || '—'}</span>
                              {plan && log.calories > 0 && <div style={{ width: '50px', height: '5px', background: '#E0D9CC', borderRadius: '3px', overflow: 'hidden' }}><div style={{ height: '100%', background: calPct > 105 ? '#C45C3A' : '#C8A85A', width: `${calPct}%` }} /></div>}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: '13px', color: '#C45C3A', fontFamily: "'DM Mono',monospace" }}>{log.protein ? `${log.protein}g` : '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: '13px', color: '#A07820', fontFamily: "'DM Mono',monospace" }}>{log.carbs ? `${log.carbs}g` : '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: '13px', color: '#8FA07A', fontFamily: "'DM Mono',monospace" }}>{log.fat ? `${log.fat}g` : '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: '12px', color: '#7A7A6A', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.notes || ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {/* Average row */}
                  <tfoot>
                    <tr style={{ background: '#F0EBE0', borderTop: '2px solid #E0D9CC' }}>
                      <td style={{ padding: '8px 14px', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: '#7A7A6A' }}>Moyenne</td>
                      <td style={{ padding: '8px 14px', fontSize: '13px', fontWeight: '700', fontFamily: "'DM Mono',monospace" }}>
                        {avgCal || '—'}
                        {plan && avgCal && <span style={{ fontSize: '11px', color: '#7A7A6A', marginLeft: '4px' }}>/ {plan.target_calories}</span>}
                      </td>
                      <td style={{ padding: '8px 14px', fontSize: '13px', fontWeight: '700', color: '#C45C3A', fontFamily: "'DM Mono',monospace" }}>
                        {avgProt ? `${avgProt}g` : '—'}
                        {plan && avgProt && <span style={{ fontSize: '11px', color: '#7A7A6A', marginLeft: '2px' }}>/ {plan.target_protein}g</span>}
                      </td>
                      <td style={{ padding: '8px 14px', fontSize: '13px', fontWeight: '700', color: '#A07820', fontFamily: "'DM Mono',monospace" }}>
                        {avgCarbs ? `${avgCarbs}g` : '—'}
                        {plan && avgCarbs && <span style={{ fontSize: '11px', color: '#7A7A6A', marginLeft: '2px' }}>/ {plan.target_carbs}g</span>}
                      </td>
                      <td style={{ padding: '8px 14px', fontSize: '13px', fontWeight: '700', color: '#8FA07A', fontFamily: "'DM Mono',monospace" }}>
                        {avgFat ? `${avgFat}g` : '—'}
                        {plan && avgFat && <span style={{ fontSize: '11px', color: '#7A7A6A', marginLeft: '2px' }}>/ {plan.target_fat}g</span>}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Macro pie chart */}
              {macroSlices.length > 0 && (
                <div style={{ borderLeft: '1px solid #E0D9CC', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '14px', textAlign: 'center' }}>Répartition macros</div>
                  <MacroPie slices={macroSlices} />
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                    {macroSlices.map(s => {
                      const pct = Math.round((s.kcal / macroSlices.reduce((t, x) => t + x.kcal, 0)) * 100)
                      const targetVal = s.label === 'Protéines' ? plan?.target_protein : s.label === 'Glucides' ? plan?.target_carbs : plan?.target_fat
                      return (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                          <div style={{ flex: 1, fontSize: '12px' }}>{s.label}</div>
                          <div style={{ fontSize: '12px', fontWeight: '600', fontFamily: "'DM Mono',monospace" }}>{s.value}g</div>
                          <div style={{ fontSize: '11px', color: '#7A7A6A', width: '32px', textAlign: 'right' }}>{pct}%</div>
                        </div>
                      )
                    })}
                    {plan && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E0D9CC' }}>
                        <div style={{ fontSize: '10px', color: '#7A7A6A', marginBottom: '4px', letterSpacing: '1px', textTransform: 'uppercase' }}>Objectifs coach</div>
                        {[
                          { label: 'P', target: plan.target_protein, actual: avgProt, color: '#C45C3A' },
                          { label: 'G', target: plan.target_carbs, actual: avgCarbs, color: '#A07820' },
                          { label: 'L', target: plan.target_fat, actual: avgFat, color: '#8FA07A' },
                        ].map(m => (
                          <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                            <div style={{ width: '14px', fontSize: '10px', fontWeight: '700', color: m.color }}>{m.label}</div>
                            <div style={{ flex: 1, height: '4px', background: '#E0D9CC', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: m.color, width: `${Math.min(100, ((m.actual || 0) / (m.target || 1)) * 100)}%`, opacity: 0.7 }} />
                            </div>
                            <div style={{ fontSize: '10px', color: '#7A7A6A', fontFamily: "'DM Mono',monospace", width: '55px', textAlign: 'right' }}>{m.actual || 0}/{m.target}g</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MacroPie({ slices }) {
  const size = 90, r = 36, cx = 45, cy = 45
  const totalKcal = slices.reduce((s, x) => s + x.kcal, 0)
  let angle = -Math.PI / 2
  const paths = slices.map(s => {
    const sweep = (s.kcal / totalKcal) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle)
    angle += sweep
    const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    return { path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`, color: s.color }
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p, i) => <path key={i} d={p.path} fill={p.color} stroke="white" strokeWidth="1.5" />)}
      <circle cx={cx} cy={cy} r={20} fill="#FDFAF4" />
    </svg>
  )
}

// ─── PLAN TAB ────────────────────────────────────────────────
function PlanTab({ plan, meals }) {
  if (!plan) return <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '40px', textAlign: 'center', color: '#7A7A6A', fontSize: '14px' }}>Ton plan nutritionnel n'est pas encore configuré. Ton coach va le préparer prochainement.</div>
  return (
    <div>
      <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '24px', marginBottom: '16px' }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Objectifs nutritionnels</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
          {[['🔥', plan.target_calories, 'kcal / jour'], ['🥩', plan.target_protein, 'g protéines'], ['🌾', plan.target_carbs, 'g glucides'], ['🥑', plan.target_fat, 'g lipides']].map(([icon, val, label]) => (
            <div key={label} style={{ textAlign: 'center', padding: '16px', background: '#F5F0E8', borderRadius: '10px' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{icon}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '24px', fontWeight: '700' }}>{val || '—'}</div>
              <div style={{ fontSize: '12px', color: '#7A7A6A' }}>{label}</div>
            </div>
          ))}
        </div>
        {plan.coach_note && <div style={{ marginTop: '16px', padding: '14px', background: '#F5F0E8', borderRadius: '10px' }}><div style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '6px' }}>📌 Consigne coach</div><div style={{ fontSize: '14px', lineHeight: '1.7' }}>{plan.coach_note}</div></div>}
      </div>
      {meals.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Repas du plan</div>
          {meals.map(meal => (
            <div key={meal.id} style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '12px', padding: '16px 20px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: meal.food_items?.length ? '10px' : '0' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#7A7A6A', fontFamily: "'DM Mono',monospace" }}>{meal.time_slot} · {meal.day}</div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{meal.name}</div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#A07820', background: 'rgba(200,168,90,0.12)', padding: '3px 10px', borderRadius: '20px' }}>{meal.calories} kcal</span>
              </div>
              {meal.food_items?.map(f => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid rgba(0,0,0,0.04)', fontSize: '13px' }}>
                  <span>{f.name} {f.quantity ? `(${f.quantity}${f.unit})` : ''}</span>
                  <span style={{ fontSize: '11px', color: '#7A7A6A', fontFamily: "'DM Mono',monospace" }}>P:{f.protein}g · G:{f.carbs}g · L:{f.fat}g</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LoadingScreen() {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8', fontFamily: "'Playfair Display',serif", fontSize: '20px', color: '#7A7A6A' }}>Chargement…</div>
}

const lbl = { display: 'block', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '5px', fontWeight: '500' }
const inp = { width: '100%', padding: '8px 10px', border: '1.5px solid #E0D9CC', borderRadius: '7px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", background: 'white', outline: 'none', color: '#1A1A14' }
const btnSt = (bg, color, border) => ({ padding: '7px 14px', background: bg, color, border: border ? `1.5px solid ${border}` : 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" })
