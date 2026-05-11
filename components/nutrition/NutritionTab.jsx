import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { btn, lbl, inp } from '../../lib/coachUtils'

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function NutritionTab({ clientId, clientName }) {
  const [plan, setPlan] = useState(null)
  const [planHistory, setPlanHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [logs, setLogs] = useState([])
  const [editPlan, setEditPlan] = useState(false)
  const [planForm, setPlanForm] = useState({ target_calories: '', target_protein: '', target_carbs: '', target_fat: '', coach_note: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState('week')
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      
      const { data: np } = await supabase.from('nutrition_plans').select('*').eq('client_id', clientId).eq('active', true).maybeSingle()
      setPlan(np)
      if (np) setPlanForm({ target_calories: np.target_calories||'', target_protein: np.target_protein||'', target_carbs: np.target_carbs||'', target_fat: np.target_fat||'', coach_note: np.coach_note||'' })
      
      const { data: history } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('client_id', clientId)
        .eq('active', false)
        .order('created_at', { ascending: false })
        .limit(20)
      setPlanHistory(history || [])
      
      const { data: lg } = await supabase.from('nutrition_logs').select('*, nutrition_log_meals(*)').eq('client_id', clientId).order('date', { ascending: false }).limit(84)
      setLogs(lg || [])
      setLoading(false)
    }
    load()
    setEditPlan(false)
  }, [clientId])

  const savePlan = async () => {
    setSaving(true)
    
    if (plan) {
      await supabase.from('nutrition_plans').update({ active: false }).eq('id', plan.id)
    }
    
    const planData = { 
      client_id: clientId, 
      active: true, 
      target_calories: +planForm.target_calories||0, 
      target_protein: +planForm.target_protein||0, 
      target_carbs: +planForm.target_carbs||0, 
      target_fat: +planForm.target_fat||0, 
      coach_note: planForm.coach_note,
      created_at: new Date().toISOString()
    }
    
    const { data } = await supabase.from('nutrition_plans').insert(planData).select().single()
    if (data) {
      setPlan(data)
      if (plan) {
        setPlanHistory(prev => [plan, ...prev])
      }
    }
    setSaving(false)
    setEditPlan(false)
  }

  const restoreOldPlan = async (oldPlan) => {
    if (!confirm(`Restaurer le plan du ${new Date(oldPlan.created_at).toLocaleDateString('fr-FR')} ?`)) return
    setSaving(true)
    
    if (plan) {
      await supabase.from('nutrition_plans').update({ active: false }).eq('id', plan.id)
      setPlanHistory(prev => [plan, ...prev.filter(p => p.id !== plan.id)])
    }
    
    await supabase.from('nutrition_plans').update({ active: true }).eq('id', oldPlan.id)
    
    const { data } = await supabase.from('nutrition_plans').select('*').eq('id', oldPlan.id).single()
    if (data) {
      setPlan(data)
      setPlanForm({ 
        target_calories: data.target_calories||'', 
        target_protein: data.target_protein||'', 
        target_carbs: data.target_carbs||'', 
        target_fat: data.target_fat||'', 
        coach_note: data.coach_note||'' 
      })
      setPlanHistory(prev => prev.filter(p => p.id !== oldPlan.id))
    }
    setSaving(false)
    setShowHistory(false)
  }

  const upsertLog = async (date, fields) => {
    const existing = logs.find(l => l.date === date)
    if (existing) {
      const { data } = await supabase.from('nutrition_logs').update(fields).eq('id', existing.id).select('*, nutrition_log_meals(*)').single()
      if (data) setLogs(prev => prev.map(l => l.id === existing.id ? data : l))
      return data
    } else {
      const { data } = await supabase.from('nutrition_logs').insert({ client_id: clientId, date, ...fields }).select('*, nutrition_log_meals(*)').single()
      if (data) setLogs(prev => [data, ...prev].sort((a,b) => b.date.localeCompare(a.date)))
      return data
    }
  }

  if (loading) return <div style={{ color: '#999', textAlign: 'center', padding: '40px' }}>Chargement…</div>

  return (
    <div>
      <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '18px', color: '#0D1B4E', letterSpacing: '2px' }}>
            {plan ? 'PLAN NUTRITIONNEL ACTUEL' : 'CRÉER UN PLAN NUTRITIONNEL'}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {planHistory.length > 0 && (
              <button onClick={() => setShowHistory(!showHistory)} style={btn('#EEF2FF', '#4A6FD4', '#C5D0F0')}>
                📜 Historique ({planHistory.length})
              </button>
            )}
            <button onClick={() => setEditPlan(!editPlan)} style={btn(editPlan ? '#0D1B4E' : '#0D1B4E', 'white')}>
              {editPlan ? '✕ Annuler' : plan ? '✏️ Modifier' : '+ Créer le plan'}
            </button>
          </div>
        </div>
        
        {showHistory && planHistory.length > 0 && (
          <div style={{ marginBottom: '16px', background: 'white', borderRadius: '10px', border: '1px solid #C5D0F0', overflow: 'hidden' }}>
            <div style={{ background: '#EEF2FF', padding: '10px 14px', fontWeight: '700', fontSize: '12px', color: '#0D1B4E' }}>
              📜 Anciens plans nutritionnels
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {planHistory.map(oldPlan => (
                <div key={oldPlan.id} style={{ padding: '12px 14px', borderBottom: '1px solid #E8ECFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: '#0D1B4E' }}>
                      📅 {new Date(oldPlan.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11px', flexWrap: 'wrap' }}>
                      <span>🔥 {oldPlan.target_calories || 0} kcal</span>
                      <span>🥩 {oldPlan.target_protein || 0}g</span>
                      <span>🌾 {oldPlan.target_carbs || 0}g</span>
                      <span>🥑 {oldPlan.target_fat || 0}g</span>
                    </div>
                    {oldPlan.coach_note && (
                      <div style={{ fontSize: '11px', color: '#6B7A99', marginTop: '4px' }}>
                        📝 {oldPlan.coach_note}
                      </div>
                    )}
                  </div>
                  <button onClick={() => restoreOldPlan(oldPlan)} style={btn('#0D1B4E', 'white')}>
                    Restaurer
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {editPlan ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '12px' }}>
              {[['target_calories','🔥 Calories','2200'],['target_protein','🥩 Protéines (g)','160'],['target_carbs','🌾 Glucides (g)','220'],['target_fat','🥑 Lipides (g)','70']].map(([key,label,ph]) => (
                <div key={key}><label style={lbl}>{label}</label><input type="number" value={planForm[key]} onChange={e => setPlanForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={inp} /></div>
              ))}
            </div>
            <div style={{ marginBottom: '12px' }}><label style={lbl}>Note coach</label><textarea value={planForm.coach_note} onChange={e => setPlanForm(p => ({ ...p, coach_note: e.target.value }))} rows={3} style={{ ...inp, resize: 'vertical' }} /></div>
            <button onClick={savePlan} disabled={saving} style={btn('#0D1B4E', 'white')}>{saving ? 'Sauvegarde…' : '✓ Enregistrer le plan'}</button>
          </div>
        ) : plan ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '16px' }}>
              {[['🔥',plan.target_calories,'kcal / jour'],['🥩',plan.target_protein,'g protéines'],['🌾',plan.target_carbs,'g glucides'],['🥑',plan.target_fat,'g lipides']].map(([icon,val,label]) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '28px', color: '#0D1B4E' }}>{val||'—'}</div>
                  <div style={{ fontSize: '12px', color: '#6B7A99' }}>{label}</div>
                </div>
              ))}
            </div>
            {plan.coach_note && (
              <div style={{ background: '#EEF4FF', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#4A6FD4' }}>
                📌 {plan.coach_note}
              </div>
            )}
            {plan.created_at && (
              <div style={{ fontSize: '11px', color: '#9BA8C0', marginTop: '12px', textAlign: 'right' }}>
                Créé le {new Date(plan.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: '#6B7A99', fontSize: '14px', textAlign: 'center', padding: '10px' }}>Aucun plan nutritionnel. Clique sur "+ Créer le plan" pour commencer.</div>
        )}
      </div>

      <div style={{ borderTop: '2px solid #EAEAEA', paddingTop: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color: '#0D1B4E', marginRight: '8px' }}>📊 Suivi client</div>
          {[['today',"Aujourd'hui"], ['week','Par semaine']].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)} style={{ padding:'6px 16px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', border:'none', fontFamily:"'DM Sans',sans-serif", background: view===id ? '#0D1B4E' : 'white', color: view===id ? 'white' : '#666', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
              {label}
            </button>
          ))}
        </div>
        {view === 'today' && <NutritionTodayView today={today} logs={logs} plan={plan} onSave={upsertLog} />}
        {view === 'week'  && <NutritionWeekView logs={logs} plan={plan} onSave={upsertLog} today={today} />}
      </div>
    </div>
  )
}

// ============================================
// NUTRITION RING
// ============================================
function NutritionRing({ value, target, label, unit, color }) {
  const percent = target ? Math.min(100, (value / target) * 100) : 0
  const over = percent >= 100
  const radius = 50, stroke = 8
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (percent / 100) * circumference
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ position:'relative', display:'inline-block' }}>
        <svg height={radius*2} width={radius*2} style={{ transform:'rotate(-90deg)' }}>
          <circle stroke="#EEEEEE" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
          <circle stroke={over?'#C45C3A':color} fill="transparent" strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition:'stroke-dashoffset 0.5s', strokeLinecap:'round' }}
            r={normalizedRadius} cx={radius} cy={radius} />
        </svg>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', lineHeight:1.2 }}>
          <div style={{ fontWeight:'800', fontSize:'14px', color: over?'#C45C3A':'#0D1B4E' }}>{value}</div>
          <div style={{ fontSize:'9px', color:'#AAA' }}>/{target}</div>
        </div>
      </div>
      <div style={{ marginTop:'6px', fontWeight:'600', fontSize:'12px', color:'#444' }}>{label}</div>
      <div style={{ fontSize:'10px', color:'#AAA' }}>{unit}</div>
    </div>
  )
}

// ============================================
// NUTRITION MACRO BLOCK
// ============================================
function NutritionMacroBlock({ log, plan, date, onSave }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ calories: log?.calories||'', protein: log?.protein||'', carbs: log?.carbs||'', fat: log?.fat||'' })
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (log) setForm({ calories: log.calories||'', protein: log.protein||'', carbs: log.carbs||'', fat: log.fat||'' }) }, [log?.id, log?.calories])
  const save = async () => { setSaving(true); await onSave(date, { calories:+form.calories||0, protein:+form.protein||0, carbs:+form.carbs||0, fat:+form.fat||0 }); setSaving(false); setEditing(false) }
  const macros = [
    { key:'calories', label:'Calories', unit:'kcal', target:plan?.target_calories, color:'#0D1B4E' },
    { key:'protein',  label:'Protéines', unit:'g',   target:plan?.target_protein,  color:'#C45C3A' },
    { key:'carbs',    label:'Glucides',  unit:'g',   target:plan?.target_carbs,    color:'#2A50B0' },
    { key:'fat',      label:'Lipides',   unit:'g',   target:plan?.target_fat,      color:'#3A7BD5' }
  ]
  return (
    <div style={{ background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #EAEAEA', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginBottom:'16px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <span style={{ fontWeight:'700', fontSize:'14px', color:'#0D1B4E' }}>📊 Apports du jour</span>
        <button onClick={() => setEditing(!editing)} style={{ padding:'4px 12px', background: editing?'#EEF0F5':'#0D1B4E', color: editing?'#666':'white', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
          {editing ? 'Annuler' : log?.calories > 0 ? '✏️ Modifier' : '+ Saisir'}
        </button>
      </div>
      {editing ? (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'14px' }}>
            {macros.map(m => (
              <div key={m.key}>
                <label style={{ display:'block', fontSize:'11px', letterSpacing:'1px', textTransform:'uppercase', color:'#999', marginBottom:'4px', fontWeight:'600' }}>{m.label}</label>
                <input type="number" value={form[m.key]} onChange={e => setForm(p=>({...p,[m.key]:e.target.value}))} placeholder={m.target||'0'}
                  style={{ width:'100%', padding:'8px', border:`2px solid ${m.color}33`, borderRadius:'7px', fontSize:'13px', outline:'none' }} />
              </div>
            ))}
          </div>
          <button onClick={save} disabled={saving} style={{ padding:'7px 18px', background:'#0D1B4E', color:'white', border:'none', borderRadius:'7px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>{saving?'…':'✓ Enregistrer'}</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', justifyItems:'center' }}>
          {macros.map(m => <NutritionRing key={m.key} value={log?.[m.key]||0} target={m.target||0} label={m.label} unit={m.unit} color={m.color} />)}
        </div>
      )}
    </div>
  )
}

// ============================================
// NUTRITION SCORE BLOCK
// ============================================
function NutritionScoreBlock({ log, plan }) {
  if (!log || !plan) return null
  const keys = ['calories','protein','carbs','fat']
  const targets = [plan.target_calories, plan.target_protein, plan.target_carbs, plan.target_fat]
  const score = keys.reduce((acc, k, i) => acc + (targets[i] ? Math.min(1, (log[k]||0) / targets[i]) : 0), 0) / 4 * 100
  const rounded = Math.min(100, Math.round(score))
  const color = rounded >= 80 ? '#3A7BD5' : rounded >= 50 ? '#2A50B0' : '#C45C3A'
  const feedback = []
  if ((log.protein||0) < plan.target_protein) feedback.push('💪 Augmente les protéines')
  if ((log.calories||0) < plan.target_calories * 0.8) feedback.push('⚡ Trop bas en calories')
  if ((log.carbs||0) < plan.target_carbs * 0.8) feedback.push("🌾 Manque de glucides")
  if ((log.fat||0) < plan.target_fat * 0.7) feedback.push('🥑 Lipides bas')
  if (feedback.length === 0) feedback.push('✅ Objectifs atteints !')
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
      <div style={{ padding:'14px 18px', borderRadius:'12px', background:'#F7F7F7', border:'1px solid #EAEAEA', display:'flex', alignItems:'center', gap:'14px' }}>
        <div style={{ fontSize:'26px', fontWeight:'800', color }}>{rounded}<span style={{ fontSize:'12px', color:'#999', fontWeight:'400' }}>/100</span></div>
        <div>
          <div style={{ fontWeight:'700', fontSize:'12px', color:'#333' }}>Score nutrition</div>
          <div style={{ fontSize:'11px', color:'#999' }}>{rounded >= 80 ? '🟢 Excellente journée' : rounded >= 50 ? '🟡 Peut mieux faire' : '🔴 Objectifs non atteints'}</div>
        </div>
      </div>
      <div style={{ padding:'14px 18px', borderRadius:'12px', background:'#EEF4FF', border:'1px solid #B8CBF5' }}>
        <div style={{ fontWeight:'700', fontSize:'12px', color:'#1A3580', marginBottom:'6px' }}>Feedback</div>
        {feedback.map((f,i) => <div key={i} style={{ fontSize:'12px', color:'#555', marginBottom:'2px' }}>{f}</div>)}
      </div>
    </div>
  )
}

// ============================================
// NUTRITION WEEK GRAPH
// ============================================
function NutritionWeekGraph({ logs, plan, today }) {
  const days = Array.from({length:7}, (_,i) => {
    const d = new Date(today); d.setDate(d.getDate() - 6 + i)
    const ds = d.toISOString().split('T')[0]
    const log = logs.find(l => l.date === ds)
    return { date:ds, calories: log?.calories||0, label: d.toLocaleDateString('fr-FR',{weekday:'short'}).slice(0,2) }
  })
  const max = Math.max(...days.map(d => d.calories), plan?.target_calories || 1)
  return (
    <div style={{ padding:'14px 18px', borderRadius:'12px', background:'white', border:'1px solid #EAEAEA', marginBottom:'16px' }}>
      <div style={{ fontWeight:'700', fontSize:'13px', color:'#333', marginBottom:'14px' }}>📈 Calories — 7 derniers jours</div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:'6px', height:'70px' }}>
        {days.map((d,i) => {
          const h = max ? Math.max((d.calories/max)*100, 2) : 2
          const isToday = d.date === today
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', height:'100%', justifyContent:'flex-end' }}>
              {d.calories > 0 && <div style={{ fontSize:'8px', color:'#999' }}>{d.calories}</div>}
              <div style={{ width:'100%', height:`${h}%`, background: isToday ? '#0D1B4E' : '#C5CEEA', borderRadius:'3px 3px 0 0' }} />
              <div style={{ fontSize:'9px', color: isToday ? '#0D1B4E' : '#999', fontWeight: isToday ? '700' : '400' }}>{d.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// NUTRITION FOOD BLOCK
// ============================================
function NutritionFoodBlock({ log, clientId }) {
  const [items, setItems] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [mode, setMode] = useState('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [qty, setQty] = useState('100')
  const [searching, setSearching] = useState(false)
  const [manual, setManual] = useState({ name: '', quantity: '100', calories: '', protein: '', carbs: '', fat: '' })
  const timerRef = useRef(null)

  useEffect(() => {
    if (log?.id) supabase.from('nutrition_log_meals').select('*').eq('log_id', log.id).order('created_at').then(({ data }) => setItems(data || []))
    else setItems([])
  }, [log?.id])

  useEffect(() => {
    if (mode !== 'search' || query.length < 2) { setResults([]); return }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      const q = query.trim().toLowerCase()
      const { data } = await supabase.from('foods').select('*').ilike('name', `%${q}%`).order('name').limit(100)
      const sorted = (data || []).sort((a, b) => {
        const an = a.name.toLowerCase(), bn = b.name.toLowerCase()
        const aStarts = an.startsWith(q), bStarts = bn.startsWith(q)
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1
        return an.localeCompare(bn, 'fr')
      }).slice(0, 20)
      setResults(sorted); setSearching(false)
    }, 300)
  }, [query, mode])

  const addItem = async () => {
    if (!selected || !log?.id) return
    const ratio = parseFloat(qty)/100
    const item = { log_id: log.id, name: selected.name, quantity: parseFloat(qty)||100, unit:'g', calories: Math.round(selected.calories*ratio), protein: Math.round(selected.protein*ratio*10)/10, carbs: Math.round(selected.carbs*ratio*10)/10, fat: Math.round(selected.fat*ratio*10)/10, fiber:0 }
    const { data } = await supabase.from('nutrition_log_meals').insert(item).select().single()
    if (data) { setItems(prev => [...prev, data]); setSelected(null); setQuery(''); setQty('100'); setResults([]) }
  }

  const addManualItem = async () => {
    if (!manual.name.trim() || !log?.id) return
    const item = { log_id: log.id, name: manual.name.trim(), quantity: parseFloat(manual.quantity)||100, unit:'g', calories: parseInt(manual.calories)||0, protein: parseFloat(manual.protein)||0, carbs: parseFloat(manual.carbs)||0, fat: parseFloat(manual.fat)||0, fiber: 0 }
    const { data } = await supabase.from('nutrition_log_meals').insert(item).select().single()
    if (data) { setItems(prev => [...prev, data]); setManual({ name:'', quantity:'100', calories:'', protein:'', carbs:'', fat:'' }) }
  }

  const deleteItem = async (id) => { await supabase.from('nutrition_log_meals').delete().eq('id', id); setItems(prev => prev.filter(i => i.id !== id)) }
  const totals = items.reduce((a,i) => ({ cal:a.cal+(i.calories||0), prot:a.prot+(i.protein||0), carbs:a.carbs+(i.carbs||0), fat:a.fat+(i.fat||0) }), {cal:0,prot:0,carbs:0,fat:0})

  return (
    <div style={{ background:'white', borderRadius:'12px', border:'1px solid #EAEAEA', overflow:'hidden' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid #F0F0F0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontWeight:'700', fontSize:'13px', color:'#0D1B4E' }}>🍽️ Détail aliments</div>
        {log && (
          <div style={{ display:'flex', gap:'6px' }}>
            <button onClick={() => { setShowSearch(!showSearch); setMode('search') }} style={{ padding:'4px 10px', background: showSearch && mode==='search' ? '#EEF2FF' : '#0D1B4E', color: showSearch && mode==='search' ? '#0D1B4E' : 'white', border:'none', borderRadius:'6px', fontSize:'11px', fontWeight:'600', cursor:'pointer' }}>🔍 Rechercher</button>
            <button onClick={() => { setShowSearch(!showSearch); setMode('manual') }} style={{ padding:'4px 10px', background: showSearch && mode==='manual' ? '#EEF2FF' : '#4A6FD4', color: showSearch && mode==='manual' ? '#0D1B4E' : 'white', border:'none', borderRadius:'6px', fontSize:'11px', fontWeight:'600', cursor:'pointer' }}>✏️ Manuel</button>
          </div>
        )}
      </div>

      {showSearch && log && mode === 'search' && (
        <div style={{ padding:'12px 16px', background:'#F5F8FF', borderBottom:'1px solid #EAEAEA' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 80px', gap:'8px', marginBottom:'8px' }}>
            <div style={{ position:'relative' }}>
              <input value={query} onChange={e => { setQuery(e.target.value); setSelected(null) }} placeholder="Rechercher un aliment…" style={{ width:'100%', padding:'7px 10px', border:'1.5px solid #E8E8E8', borderRadius:'6px', fontSize:'12px', outline:'none' }} />
              {searching && <span style={{ position:'absolute', right:'8px', top:'8px', fontSize:'11px', color:'#999' }}>…</span>}
              {results.length > 0 && !selected && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #E0E0E0', borderRadius:'6px', boxShadow:'0 8px 20px rgba(0,0,0,0.12)', zIndex:200, maxHeight:'200px', overflowY:'auto' }}>
                  {results.map(f => (
                    <div key={f.id} onClick={() => { setSelected(f); setQuery(f.name); setResults([]) }}
                      style={{ padding:'7px 10px', cursor:'pointer', borderBottom:'1px solid #F5F5F5', display:'flex', justifyContent:'space-between', fontSize:'12px' }}
                      onMouseEnter={e => e.currentTarget.style.background='#F0F4FF'}
                      onMouseLeave={e => e.currentTarget.style.background='white'}>
                      <span>{f.name}</span>
                      <span style={{ color:'#0D1B4E', fontWeight:'700' }}>{f.calories}kcal</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="100g" style={{ padding:'7px 8px', border:'1.5px solid #E8E8E8', borderRadius:'6px', fontSize:'12px', outline:'none' }} />
          </div>
          <div style={{ display:'flex', gap:'6px' }}>
            <button onClick={addItem} disabled={!selected} style={{ padding:'6px 14px', background: selected?'#0D1B4E':'#CCC', color:'white', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'600', cursor: selected?'pointer':'not-allowed' }}>✓ Ajouter</button>
            <button onClick={() => setShowSearch(false)} style={{ padding:'6px 10px', background:'transparent', color:'#666', border:'1px solid #DDD', borderRadius:'6px', fontSize:'12px', cursor:'pointer' }}>Fermer</button>
          </div>
        </div>
      )}

      {showSearch && log && mode === 'manual' && (
        <div style={{ padding:'12px 16px', background:'#F5F8FF', borderBottom:'1px solid #EAEAEA' }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'8px', marginBottom:'8px' }}>
            <div><label style={{ fontSize:'10px', color:'#999', display:'block', marginBottom:'3px' }}>Nom de l'aliment *</label><input value={manual.name} onChange={e => setManual(p=>({...p,name:e.target.value}))} placeholder="Ex: Wrap maison, Gâteau…" style={{ width:'100%', padding:'7px 10px', border:'1.5px solid #E8E8E8', borderRadius:'6px', fontSize:'12px', outline:'none' }} /></div>
            <div><label style={{ fontSize:'10px', color:'#999', display:'block', marginBottom:'3px' }}>Quantité (g)</label><input type="number" value={manual.quantity} onChange={e => setManual(p=>({...p,quantity:e.target.value}))} style={{ width:'100%', padding:'7px 8px', border:'1.5px solid #E8E8E8', borderRadius:'6px', fontSize:'12px', outline:'none' }} /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'10px' }}>
            {[['calories','🔥 Kcal'],['protein','🥩 Prot (g)'],['carbs','🌾 Gluc (g)'],['fat','🥑 Lip (g)']].map(([k,l]) => (
              <div key={k}><label style={{ fontSize:'10px', color:'#999', display:'block', marginBottom:'3px' }}>{l}</label><input type="number" value={manual[k]} onChange={e => setManual(p=>({...p,[k]:e.target.value}))} placeholder="0" style={{ width:'100%', padding:'7px 8px', border:'1.5px solid #E8E8E8', borderRadius:'6px', fontSize:'12px', outline:'none' }} /></div>
            ))}
          </div>
          <div style={{ display:'flex', gap:'6px' }}>
            <button onClick={addManualItem} disabled={!manual.name.trim()} style={{ padding:'6px 14px', background: manual.name.trim()?'#4A6FD4':'#CCC', color:'white', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'600', cursor: manual.name.trim()?'pointer':'not-allowed' }}>✓ Ajouter</button>
            <button onClick={() => setShowSearch(false)} style={{ padding:'6px 10px', background:'transparent', color:'#666', border:'1px solid #DDD', borderRadius:'6px', fontSize:'12px', cursor:'pointer' }}>Fermer</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ padding:'16px', textAlign:'center', color:'#CCC', fontSize:'12px' }}>{log ? 'Aucun aliment' : "Saisis d'abord les apports"}</div>
      ) : (
        <>
          {items.map(item => (
            <div key={item.id} style={{ padding:'8px 16px', borderBottom:'1px solid #F5F5F5', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'12px' }}>
              <span style={{ fontWeight:'500' }}>{item.name} <span style={{ color:'#999' }}>({item.quantity}g)</span></span>
              <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                <span style={{ color:'#666' }}>{item.calories}kcal · P:{item.protein}g · G:{item.carbs}g · L:{item.fat}g</span>
                <button onClick={() => deleteItem(item.id)} style={{ background:'none', border:'none', color:'#DDD', cursor:'pointer', fontSize:'14px' }} onMouseEnter={e=>e.target.style.color='#C45C3A'} onMouseLeave={e=>e.target.style.color='#DDD'}>×</button>
              </div>
            </div>
          ))}
          <div style={{ padding:'8px 16px', background:'#F0F4FF', display:'flex', justifyContent:'space-between', fontSize:'12px', fontWeight:'700', color:'#0D1B4E' }}>
            <span>Total</span>
            <span>{Math.round(totals.cal)}kcal · P:{Math.round(totals.prot*10)/10}g · G:{Math.round(totals.carbs*10)/10}g · L:{Math.round(totals.fat*10)/10}g</span>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================
// NUTRITION TODAY VIEW
// ============================================
function NutritionTodayView({ today, logs, plan, onSave }) {
  const log = logs.find(l => l.date === today)
  return (
    <div>
      <div style={{ fontWeight:'700', fontSize:'14px', color:'#0D1B4E', marginBottom:'14px' }}>
        {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
      </div>
      <NutritionMacroBlock log={log} plan={plan} date={today} onSave={onSave} />
      <NutritionScoreBlock log={log} plan={plan} />
      <NutritionWeekGraph logs={logs} plan={plan} today={today} />
      <NutritionFoodBlock log={log} />
    </div>
  )
}

// ============================================
// NUTRITION WEEK VIEW
// ============================================
function NutritionWeekView({ logs, plan, onSave, today }) {
  const [openDay, setOpenDay] = useState(today)
  const getWeekStart = (dateStr) => { const d = new Date(dateStr), day = d.getDay()===0?7:d.getDay(); const mon = new Date(d); mon.setDate(d.getDate()-day+1); return mon.toISOString().split('T')[0] }
  const weeks = {}
  const thisWeek = getWeekStart(today)
  weeks[thisWeek] = []
  logs.forEach(log => { const wk = getWeekStart(log.date); if(!weeks[wk]) weeks[wk]=[]; weeks[wk].push(log) })
  const sortedWeeks = Object.keys(weeks).sort((a,b)=>b.localeCompare(a))
  const getWeekLabel = (wk) => { const s=new Date(wk), e=new Date(wk); e.setDate(e.getDate()+6); return `${s.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} – ${e.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}` }
  const macros = [
    { key:'calories', label:'Calories', unit:'kcal', target:'target_calories', color:'#0D1B4E' },
    { key:'protein',  label:'Protéines', unit:'g', target:'target_protein', color:'#C45C3A' },
    { key:'carbs',    label:'Glucides',  unit:'g', target:'target_carbs',   color:'#2A50B0' },
    { key:'fat',      label:'Lipides',   unit:'g', target:'target_fat',     color:'#3A7BD5' },
  ]
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      {sortedWeeks.map(weekStart => {
        const weekLogs = weeks[weekStart]
        const isCurrent = weekStart === getWeekStart(today)
        const days = Array.from({length:7},(_,i)=>{ const d=new Date(weekStart); d.setDate(d.getDate()+i); const ds=d.toISOString().split('T')[0]; return { date:ds, log:weekLogs.find(l=>l.date===ds)||null, isToday:ds===today, isFuture:ds>today } })
        return (
          <div key={weekStart} style={{ background:'white', borderRadius:'12px', border:`1px solid ${isCurrent?'#C0CAEF':'#EAEAEA'}`, overflow:'hidden', boxShadow:'0 2px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ padding:'10px 16px', background:isCurrent?'#EEF2FF':'#F5F7FF', borderBottom:'1px solid #EAEAEA', display:'flex', justifyContent:'space-between' }}>
              <div style={{ fontWeight:'700', fontSize:'13px', color:'#0D1B4E' }}>📅 {getWeekLabel(weekStart)}</div>
              <div style={{ fontSize:'11px', color:'#999' }}>{weekLogs.filter(l=>l.calories>0).length}/7 jours</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'130px 1fr 1fr 1fr 1fr', background:'#F8FAFF', borderBottom:'1px solid #F0F0F0' }}>
              {['Jour','Calories','Protéines','Glucides','Lipides'].map(h => (
                <div key={h} style={{ fontSize:'9px', letterSpacing:'1px', textTransform:'uppercase', color:'#999', fontWeight:'600', padding:'6px 12px' }}>{h}</div>
              ))}
            </div>
            {days.map(({ date, log, isToday, isFuture }) => {
              const isOpen = openDay === date
              const dayIndex = new Date(date).getDay()
              const dayName = DAYS_FR[dayIndex === 0 ? 6 : dayIndex - 1]
              const hasData = log && log.calories > 0
              return (
                <div key={date}>
                  <div onClick={() => !isFuture && setOpenDay(isOpen?null:date)}
                    style={{ display:'grid', gridTemplateColumns:'130px 1fr 1fr 1fr 1fr', borderBottom:'1px solid #F5F5F5', background:isToday?'#FAFBFF':isOpen?'#F5F7FF':'transparent', cursor:isFuture?'default':'pointer' }}
                    onMouseEnter={e => { if(!isFuture) e.currentTarget.style.background='#F0F4FF' }}
                    onMouseLeave={e => { e.currentTarget.style.background=isToday?'#FAFBFF':isOpen?'#F5F7FF':'transparent' }}>
                    <div style={{ padding:'9px 12px' }}>
                      <div style={{ fontSize:'12px', fontWeight:isToday?'700':'500', color:isFuture?'#CCC':'#0D1B4E' }}>{isToday?'📍 ':''}{dayName}</div>
                    </div>
                    {macros.map(m => {
                      const val = log?.[m.key]||0; const target = plan?.[m.target]; const pct = target&&val ? Math.min(100,(val/target)*100) : 0
                      return (
                        <div key={m.key} style={{ padding:'9px 12px' }}>
                          {hasData && val > 0 ? (
                            <>
                              <div style={{ fontSize:'12px', fontWeight:'600', color:m.color }}>{val}<span style={{ fontSize:'9px', color:'#BBB' }}> {m.unit}</span></div>
                              {target && <div style={{ marginTop:'2px', height:'3px', width:'60px', background:'#F0F0F0', borderRadius:'2px', overflow:'hidden' }}><div style={{ height:'100%', background:m.color, width:`${pct}%` }} /></div>}
                            </>
                          ) : <span style={{ color:'#DDD', fontSize:'12px' }}>—</span>}
                        </div>
                      )
                    })}
                  </div>
                  {isOpen && (
                    <div style={{ padding:'14px 16px', background:'#F5F8FF', borderBottom:'2px solid #E8ECFA' }}>
                      <NutritionMacroBlock log={log} plan={plan} date={date} onSave={onSave} />
                      <NutritionFoodBlock log={log} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
