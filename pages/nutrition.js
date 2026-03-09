import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function Nutrition() {
  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState(null)
  const [meals, setMeals] = useState([])
  const [weeklyLogs, setWeeklyLogs] = useState([])
  const [activeTab, setActiveTab] = useState('today')
  const [loading, setLoading] = useState(true)
  const [showAddMeal, setShowAddMeal] = useState(false)
  const [newMeal, setNewMeal] = useState({ name: '', time_slot: '08h00', calories: '', day: 'tous' })
  const [showAddFood, setShowAddFood] = useState(null)
  const [newFood, setNewFood] = useState({ name: '', quantity: '', unit: 'g', protein: '', carbs: '', fat: '' })
  const [todayLog, setTodayLog] = useState(null)
  const [editingLog, setEditingLog] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      const { data: np } = await supabase.from('nutrition_plans').select('*').eq('client_id', user.id).eq('active', true).single()
      setPlan(np)

      if (np) {
        const { data: ml } = await supabase.from('meals').select('*, food_items(*)').eq('nutrition_plan_id', np.id).order('order_index')
        setMeals(ml || [])
      }

      // Load weekly nutrition logs
      const { data: logs } = await supabase.from('nutrition_logs').select('*').eq('client_id', user.id).order('date', { ascending: false }).limit(28)
      setWeeklyLogs(logs || [])

      // Today's log
      const today = new Date().toISOString().split('T')[0]
      const todayEntry = (logs || []).find(l => l.date === today)
      setTodayLog(todayEntry || null)
      setLoading(false)
    }
    load()
  }, [])

  const saveTodayLog = async (logData) => {
    const today = new Date().toISOString().split('T')[0]
    if (todayLog) {
      const { data } = await supabase.from('nutrition_logs').update(logData).eq('id', todayLog.id).select().single()
      setTodayLog(data)
      setWeeklyLogs(prev => prev.map(l => l.id === todayLog.id ? data : l))
    } else {
      const { data } = await supabase.from('nutrition_logs').insert({ ...logData, client_id: user.id, date: today }).select().single()
      setTodayLog(data)
      setWeeklyLogs(prev => [data, ...prev])
    }
    setEditingLog(false)
  }

  const addMeal = async () => {
    if (!plan || !newMeal.name.trim()) return
    const { data } = await supabase.from('meals').insert({ ...newMeal, nutrition_plan_id: plan.id, order_index: meals.length, calories: +newMeal.calories || 0 }).select().single()
    if (data) { setMeals(prev => [...prev, { ...data, food_items: [] }]); setShowAddMeal(false); setNewMeal({ name: '', time_slot: '08h00', calories: '', day: 'tous' }) }
  }

  const deleteMeal = async (mealId) => {
    if (!confirm('Supprimer ce repas ?')) return
    await supabase.from('meals').delete().eq('id', mealId)
    setMeals(prev => prev.filter(m => m.id !== mealId))
  }

  const addFoodItem = async (mealId) => {
    if (!newFood.name.trim()) return
    const { data } = await supabase.from('food_items').insert({ ...newFood, meal_id: mealId, quantity: +newFood.quantity || 0, protein: +newFood.protein || 0, carbs: +newFood.carbs || 0, fat: +newFood.fat || 0 }).select().single()
    if (data) {
      setMeals(prev => prev.map(m => m.id === mealId ? { ...m, food_items: [...(m.food_items || []), data] } : m))
      setShowAddFood(null)
      setNewFood({ name: '', quantity: '', unit: 'g', protein: '', carbs: '', fat: '' })
    }
  }

  const deleteFoodItem = async (mealId, foodId) => {
    await supabase.from('food_items').delete().eq('id', foodId)
    setMeals(prev => prev.map(m => m.id === mealId ? { ...m, food_items: m.food_items.filter(f => f.id !== foodId) } : m))
  }

  // Get last 7 days
  const getLast7Days = () => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const log = weeklyLogs.find(l => l.date === dateStr)
      days.push({ date: dateStr, dayName: DAYS_FR[d.getDay() === 0 ? 6 : d.getDay() - 1].substring(0, 3), log })
    }
    return days
  }

  const totalCals = meals.reduce((s, m) => s + (m.calories || 0), 0)

  if (loading) return <LoadingScreen />

  return (
    <Layout title="Nutrition" user={user}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[['today', "Aujourd'hui"], ['plan', 'Plan alimentaire'], ['weekly', 'Suivi semaine']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: 'none', fontFamily: "'DM Sans',sans-serif", background: activeTab === id ? '#4A5240' : '#FDFAF4', color: activeTab === id ? 'white' : '#7A7A6A', borderBottom: activeTab === id ? 'none' : '1px solid #E0D9CC' }}>
            {label}
          </button>
        ))}
      </div>

      {/* TODAY TAB */}
      {activeTab === 'today' && (
        <div>
          {plan && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  {[
                    { label: 'Consommées', value: todayLog?.calories || 0, color: '#1A1A14' },
                    { label: 'Objectif', value: plan.target_calories || 0, color: '#7A7A6A' },
                    { label: 'Restantes', value: (plan.target_calories || 0) - (todayLog?.calories || 0), color: '#8FA07A' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '24px', fontWeight: '700', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '12px', color: '#7A7A6A' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {[
                  { label: 'Protéines', current: todayLog?.protein || 0, target: plan.target_protein, color: '#C45C3A', unit: 'g' },
                  { label: 'Glucides', current: todayLog?.carbs || 0, target: plan.target_carbs, color: '#C8A85A', unit: 'g' },
                  { label: 'Lipides', current: todayLog?.fat || 0, target: plan.target_fat, color: '#8FA07A', unit: 'g' },
                ].map(m => (
                  <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ width: '80px', fontSize: '13px', fontWeight: '500' }}>{m.label}</div>
                    <div style={{ flex: 1, height: '8px', background: '#E0D9CC', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: m.color, borderRadius: '4px', width: `${Math.min(100, ((m.current || 0) / (m.target || 1)) * 100)}%`, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ width: '90px', textAlign: 'right', fontSize: '12px', color: '#7A7A6A', fontFamily: "'DM Mono',monospace" }}>{m.current || 0}{m.unit} / {m.target || 0}{m.unit}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>📊 Saisir mes apports du jour</div>
                  {!editingLog && <button onClick={() => setEditingLog(true)} style={{ padding: '6px 12px', background: '#4A5240', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>✏️ Modifier</button>}
                </div>
                {editingLog
                  ? <LogForm plan={plan} initial={todayLog} onSave={saveTodayLog} onCancel={() => setEditingLog(false)} />
                  : todayLog
                    ? <div style={{ fontSize: '14px', color: '#1A1A14', lineHeight: '1.8' }}>
                        <div>🔥 <strong>{todayLog.calories} kcal</strong></div>
                        <div>🥩 Protéines : <strong>{todayLog.protein}g</strong></div>
                        <div>🌾 Glucides : <strong>{todayLog.carbs}g</strong></div>
                        <div>🥑 Lipides : <strong>{todayLog.fat}g</strong></div>
                        {todayLog.notes && <div style={{ marginTop: '8px', fontSize: '13px', color: '#7A7A6A' }}>📝 {todayLog.notes}</div>}
                      </div>
                    : <div style={{ color: '#7A7A6A', fontSize: '14px' }}>Aucune saisie aujourd'hui. Clique sur "Modifier" pour enregistrer tes apports.</div>
                }
              </div>
            </div>
          )}
          {plan?.coach_note && (
            <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '20px 24px' }}>
              <div style={{ fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '10px' }}>📌 Note du coach</div>
              <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#1A1A14' }}>{plan.coach_note}</p>
            </div>
          )}
          {!plan && <EmptyState msg="Ton plan nutritionnel n'est pas encore configuré. Ton coach va le préparer prochainement." />}
        </div>
      )}

      {/* PLAN TAB */}
      {activeTab === 'plan' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', fontWeight: '700' }}>Plan alimentaire</div>
            <button onClick={() => setShowAddMeal(true)} style={btnSt('#4A5240', 'white')}>+ Ajouter un repas</button>
          </div>

          {showAddMeal && (
            <div style={{ background: '#FDFAF4', border: '2px solid #C8A85A', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontWeight: '600', marginBottom: '12px' }}>Nouveau repas</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '12px' }}>
                <div><label style={lbl}>Nom</label><input value={newMeal.name} onChange={e => setNewMeal(p => ({ ...p, name: e.target.value }))} placeholder="Petit-déjeuner" style={inp} /></div>
                <div><label style={lbl}>Horaire</label><input value={newMeal.time_slot} onChange={e => setNewMeal(p => ({ ...p, time_slot: e.target.value }))} placeholder="08h00" style={inp} /></div>
                <div><label style={lbl}>Calories</label><input type="number" value={newMeal.calories} onChange={e => setNewMeal(p => ({ ...p, calories: e.target.value }))} placeholder="500" style={inp} /></div>
                <div><label style={lbl}>Jour</label>
                  <select value={newMeal.day} onChange={e => setNewMeal(p => ({ ...p, day: e.target.value }))} style={inp}>
                    <option value="tous">Tous les jours</option>
                    {DAYS_FR.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={addMeal} style={btnSt('#4A5240', 'white')}>✓ Créer</button>
                <button onClick={() => setShowAddMeal(false)} style={btnSt('transparent', '#7A7A6A', '#E0D9CC')}>Annuler</button>
              </div>
            </div>
          )}

          {meals.length === 0
            ? <EmptyState msg="Aucun repas. Ajoute ton premier repas !" />
            : meals.map(meal => (
              <div key={meal.id} style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '20px 24px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#7A7A6A', fontFamily: "'DM Mono',monospace" }}>{meal.time_slot} · {meal.day}</div>
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>{meal.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#A07820', background: 'rgba(200,168,90,0.12)', padding: '3px 10px', borderRadius: '20px' }}>{meal.calories} kcal</span>
                    <button onClick={() => setShowAddFood(showAddFood === meal.id ? null : meal.id)} style={btnSt('#4A5240', 'white', null, '12px')}>+ Aliment</button>
                    <button onClick={() => deleteMeal(meal.id)} style={btnSt('rgba(196,92,58,0.1)', '#C45C3A', null, '12px')}>🗑</button>
                  </div>
                </div>

                {/* Food items */}
                {meal.food_items && meal.food_items.length > 0 && (
                  <ul style={{ listStyle: 'none' }}>
                    {meal.food_items.map(food => (
                      <li key={food.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: '14px' }}>
                        <span>{food.name} {food.quantity ? `(${food.quantity}${food.unit})` : ''}</span>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#7A7A6A', fontFamily: "'DM Mono',monospace" }}>P:{food.protein}g · G:{food.carbs}g · L:{food.fat}g</span>
                          <button onClick={() => deleteFoodItem(meal.id, food.id)} style={{ background: 'none', border: 'none', color: '#C45C3A', cursor: 'pointer', fontSize: '14px' }}>×</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Add food form */}
                {showAddFood === meal.id && (
                  <div style={{ marginTop: '12px', padding: '14px', background: '#F5F0E8', borderRadius: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 60px 50px 60px 60px 60px', gap: '8px', alignItems: 'end', marginBottom: '10px' }}>
                      <div><label style={lbl}>Aliment</label><input value={newFood.name} onChange={e => setNewFood(p => ({ ...p, name: e.target.value }))} placeholder="Riz cuit" style={inp} /></div>
                      <div><label style={lbl}>Qté</label><input type="number" value={newFood.quantity} onChange={e => setNewFood(p => ({ ...p, quantity: e.target.value }))} placeholder="200" style={inp} /></div>
                      <div><label style={lbl}>Unité</label><select value={newFood.unit} onChange={e => setNewFood(p => ({ ...p, unit: e.target.value }))} style={inp}>{['g','ml','cs','cc','pc'].map(u => <option key={u}>{u}</option>)}</select></div>
                      <div><label style={lbl}>Prot.</label><input type="number" value={newFood.protein} onChange={e => setNewFood(p => ({ ...p, protein: e.target.value }))} placeholder="0" style={inp} /></div>
                      <div><label style={lbl}>Gluc.</label><input type="number" value={newFood.carbs} onChange={e => setNewFood(p => ({ ...p, carbs: e.target.value }))} placeholder="0" style={inp} /></div>
                      <div><label style={lbl}>Lip.</label><input type="number" value={newFood.fat} onChange={e => setNewFood(p => ({ ...p, fat: e.target.value }))} placeholder="0" style={inp} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => addFoodItem(meal.id)} style={btnSt('#4A5240', 'white', null, '12px')}>✓ Ajouter</button>
                      <button onClick={() => setShowAddFood(null)} style={btnSt('transparent', '#7A7A6A', '#E0D9CC', '12px')}>Annuler</button>
                    </div>
                  </div>
                )}
              </div>
            ))
          }
        </div>
      )}

      {/* WEEKLY TAB */}
      {activeTab === 'weekly' && (
        <div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Suivi semaine par semaine</div>
          <WeeklyTable logs={weeklyLogs} plan={plan} />
        </div>
      )}
    </Layout>
  )
}

function LogForm({ plan, initial, onSave, onCancel }) {
  const [form, setForm] = useState({ calories: initial?.calories || '', protein: initial?.protein || '', carbs: initial?.carbs || '', fat: initial?.fat || '', notes: initial?.notes || '' })
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        {[
          { label: '🔥 Calories', key: 'calories', placeholder: plan?.target_calories || '2000' },
          { label: '🥩 Protéines (g)', key: 'protein', placeholder: plan?.target_protein || '150' },
          { label: '🌾 Glucides (g)', key: 'carbs', placeholder: plan?.target_carbs || '200' },
          { label: '🥑 Lipides (g)', key: 'fat', placeholder: plan?.target_fat || '60' },
        ].map(f => (
          <div key={f.key}>
            <label style={lbl}>{f.label}</label>
            <input type="number" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inp} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={lbl}>Notes</label>
        <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Repas cheat, sortie restaurant…" style={inp} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => onSave({ calories: +form.calories || 0, protein: +form.protein || 0, carbs: +form.carbs || 0, fat: +form.fat || 0, notes: form.notes })} style={btnSt('#4A5240', 'white', null, '12px')}>✓ Enregistrer</button>
        <button onClick={onCancel} style={btnSt('transparent', '#7A7A6A', '#E0D9CC', '12px')}>Annuler</button>
      </div>
    </div>
  )
}

function EmptyState({ msg }) {
  return <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '40px', textAlign: 'center', color: '#7A7A6A', fontSize: '14px' }}>{msg}</div>
}

function LoadingScreen() {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8', fontFamily: "'Playfair Display',serif", fontSize: '20px', color: '#7A7A6A' }}>Chargement…</div>
}

function WeeklyTable({ logs, plan }) {
  // Group logs by ISO week
  const getWeekKey = (dateStr) => {
    const d = new Date(dateStr)
    const day = d.getDay() === 0 ? 7 : d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - day + 1)
    return monday.toISOString().split('T')[0]
  }

  const getWeekLabel = (weekKey) => {
    const start = new Date(weekKey)
    const end = new Date(weekKey)
    end.setDate(end.getDate() + 6)
    const fmt = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    return `${fmt(start)} – ${fmt(end)}`
  }

  const getDayLabel = (dateStr) => {
    const d = new Date(dateStr)
    return DAYS_FR[d.getDay() === 0 ? 6 : d.getDay() - 1]
  }

  const avg = (arr, key) => {
    const vals = arr.filter(l => l[key] > 0)
    if (!vals.length) return '—'
    return Math.round(vals.reduce((s, l) => s + l[key], 0) / vals.length)
  }

  // Group by week
  const weeks = {}
  logs.forEach(log => {
    const wk = getWeekKey(log.date)
    if (!weeks[wk]) weeks[wk] = []
    weeks[wk].push(log)
  })
  const sortedWeeks = Object.keys(weeks).sort((a, b) => b.localeCompare(a))
  const today = new Date().toISOString().split('T')[0]

  if (logs.length === 0) {
    return <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '40px', textAlign: 'center', color: '#7A7A6A', fontSize: '14px' }}>Aucune saisie pour le moment. Commence à logger tes repas dans "Aujourd'hui" !</div>
  }

  const barColors = { calories: '#C8A85A', protein: '#C45C3A', carbs: '#4A7A9B', fat: '#8FA07A' }

  const MiniBar = ({ value, max, color }) => {
    if (!max || !value) return <div style={{ width: '80px', height: '5px', background: '#E0D9CC', borderRadius: '3px' }} />
    const pct = Math.min(100, (value / max) * 100)
    return (
      <div style={{ width: '80px', height: '5px', background: '#E0D9CC', borderRadius: '3px', overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', marginLeft: '6px' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {sortedWeeks.map(weekKey => {
        const weekLogs = weeks[weekKey].sort((a, b) => a.date.localeCompare(b.date))
        const totalCals = weekLogs.reduce((s, l) => s + (l.calories || 0), 0)
        return (
          <div key={weekKey} style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', overflow: 'hidden' }}>
            {/* Week header */}
            <div style={{ padding: '12px 20px', background: '#F0EBE0', borderBottom: '1px solid #E0D9CC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>📅 {getWeekLabel(weekKey)}</div>
              <div style={{ fontSize: '12px', color: '#7A7A6A', fontFamily: "'DM Mono',monospace" }}>Total semaine : <strong style={{ color: '#1A1A14' }}>{totalCals} kcal</strong></div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8F4EC' }}>
                  {['Jour', 'Calories', 'Protéines', 'Glucides', 'Lipides', 'Notes'].map(h => (
                    <th key={h} style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', fontWeight: '500', textAlign: 'left', padding: '8px 16px', borderBottom: '1px solid #E0D9CC' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekLogs.map(log => {
                  const isToday = log.date === today
                  return (
                    <tr key={log.id} style={{ background: isToday ? 'rgba(200,168,90,0.06)' : 'transparent', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: isToday ? '700' : '500' }}>{getDayLabel(log.date)}{isToday ? ' 📍' : ''}</div>
                        <div style={{ fontSize: '11px', color: '#7A7A6A', fontFamily: "'DM Mono',monospace" }}>{new Date(log.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '14px', fontWeight: '600', color: '#1A1A14', minWidth: '45px' }}>{log.calories || '—'}</span>
                          <MiniBar value={log.calories} max={plan?.target_calories || 2500} color={barColors.calories} />
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '13px', fontWeight: '500', color: '#C45C3A', minWidth: '45px' }}>{log.protein ? `${log.protein}g` : '—'}</span>
                          <MiniBar value={log.protein} max={plan?.target_protein || 180} color={barColors.protein} />
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '13px', fontWeight: '500', color: '#4A7A9B', minWidth: '45px' }}>{log.carbs ? `${log.carbs}g` : '—'}</span>
                          <MiniBar value={log.carbs} max={plan?.target_carbs || 250} color={barColors.carbs} />
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '13px', fontWeight: '500', color: '#8FA07A', minWidth: '45px' }}>{log.fat ? `${log.fat}g` : '—'}</span>
                          <MiniBar value={log.fat} max={plan?.target_fat || 80} color={barColors.fat} />
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '12px', color: '#7A7A6A', maxWidth: '200px' }}>{log.notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Average row */}
              <tfoot>
                <tr style={{ background: '#F0EBE0', borderTop: '2px solid #E0D9CC' }}>
                  <td style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', color: '#7A7A6A' }}>Moyenne</td>
                  <td style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600', fontFamily: "'DM Mono',monospace" }}>{avg(weekLogs, 'calories')}</td>
                  <td style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600', color: '#C45C3A', fontFamily: "'DM Mono',monospace" }}>{avg(weekLogs, 'protein')}{avg(weekLogs, 'protein') !== '—' ? 'g' : ''}</td>
                  <td style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600', color: '#4A7A9B', fontFamily: "'DM Mono',monospace" }}>{avg(weekLogs, 'carbs')}{avg(weekLogs, 'carbs') !== '—' ? 'g' : ''}</td>
                  <td style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600', color: '#8FA07A', fontFamily: "'DM Mono',monospace" }}>{avg(weekLogs, 'fat')}{avg(weekLogs, 'fat') !== '—' ? 'g' : ''}</td>
                  <td style={{ padding: '8px 16px' }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )
      })}
    </div>
  )
}

const lbl = { display: 'block', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '5px', fontWeight: '500' }
const inp = { width: '100%', padding: '8px 10px', border: '1.5px solid #E0D9CC', borderRadius: '7px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", background: 'white', outline: 'none', color: '#1A1A14' }
const btnSt = (bg, color, border, fs) => ({ padding: `7px 14px`, background: bg, color, border: border ? `1.5px solid ${border}` : 'none', borderRadius: '8px', fontSize: fs || '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" })
