import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function Nutrition() {
  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('week')
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: np } = await supabase.from('nutrition_plans').select('*').eq('client_id', user.id).eq('active', true).maybeSingle()
      setPlan(np)
      const { data: lg } = await supabase.from('nutrition_logs').select('*, nutrition_log_meals(*)').eq('client_id', user.id).order('date', { ascending: false }).limit(84)
      setLogs(lg || [])
      setLoading(false)
    }
    load()
  }, [])

  const upsertLog = async (date, fields) => {
    const existing = logs.find(l => l.date === date)
    if (existing) {
      const { data } = await supabase.from('nutrition_logs').update(fields).eq('id', existing.id).select('*, nutrition_log_meals(*)').single()
      if (data) setLogs(prev => prev.map(l => l.id === existing.id ? data : l))
      return data
    } else {
      const { data } = await supabase.from('nutrition_logs').insert({ client_id: user.id, date, ...fields }).select('*, nutrition_log_meals(*)').single()
      if (data) setLogs(prev => [data, ...prev].sort((a,b) => b.date.localeCompare(a.date)))
      return data
    }
  }

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#EEF0F5', fontFamily:"'DM Sans',sans-serif", fontSize:'18px', color:'#999' }}>Chargement…</div>

  return (
    <Layout title="Nutrition" user={user}>
      <div style={{ display:'flex', gap:'8px', marginBottom:'24px', alignItems:'center' }}>
        {[['today',"Aujourd'hui"], ['week','Par semaine']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{ padding:'8px 20px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', border:'none', fontFamily:"'DM Sans',sans-serif", background: view===id ? '#0D1B4E' : 'white', color: view===id ? 'white' : '#666', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
            {label}
          </button>
        ))}
        {plan && (
          <div style={{ marginLeft:'auto', display:'flex', gap:'16px', alignItems:'center', background:'white', border:'1px solid #E8E8E8', borderRadius:'10px', padding:'7px 16px', fontSize:'12px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <span style={{ color:'#999' }}>Objectifs :</span>
            <span style={{ fontWeight:'700' }}>🔥 {plan.target_calories} kcal</span>
            <span style={{ fontWeight:'700', color:'#C45C3A' }}>P {plan.target_protein}g</span>
            <span style={{ fontWeight:'700', color:'#A07820' }}>G {plan.target_carbs}g</span>
            <span style={{ fontWeight:'700', color:'#5A8A5A' }}>L {plan.target_fat}g</span>
          </div>
        )}
      </div>
      {view === 'today' && <TodayView today={today} logs={logs} plan={plan} onSave={upsertLog} />}
      {view === 'week'  && <WeekView logs={logs} plan={plan} onSave={upsertLog} today={today} />}
    </Layout>
  )
}

function MacroBlock({ log, plan, date, onSave }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ calories: log?.calories||'', protein: log?.protein||'', carbs: log?.carbs||'', fat: log?.fat||'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (log) setForm({ calories: log.calories||'', protein: log.protein||'', carbs: log.carbs||'', fat: log.fat||'' })
  }, [log?.id, log?.calories])

  const save = async () => {
    setSaving(true)
    await onSave(date, { calories:+form.calories||0, protein:+form.protein||0, carbs:+form.carbs||0, fat:+form.fat||0 })
    setSaving(false); setEditing(false)
  }

  const macros = [
    { key:'calories', label:'Calories', unit:'kcal', target:plan?.target_calories, color:'#0D1B4E' },
    { key:'protein',  label:'Protéines', unit:'g',   target:plan?.target_protein,  color:'#C45C3A' },
    { key:'carbs',    label:'Glucides',  unit:'g',   target:plan?.target_carbs,    color:'#A07820' },
    { key:'fat',      label:'Lipides',   unit:'g',   target:plan?.target_fat,      color:'#5A8A5A' }
  ]

  return (
    <div style={{ background:'white', borderRadius:'14px', padding:'24px', border:'1px solid #EAEAEA', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginBottom:'16px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <span style={{ fontWeight:'700', fontSize:'15px', color:'#0D1B4E' }}>📊 Apports du jour</span>
        <button onClick={() => setEditing(!editing)} style={{ padding:'5px 14px', background: editing?'#EEF0F5':'#0D1B4E', color: editing?'#666':'white', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
          {editing ? 'Annuler' : log?.calories > 0 ? '✏️ Modifier' : '+ Saisir'}
        </button>
      </div>

      {editing ? (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'16px' }}>
            {macros.map(m => (
              <div key={m.key}>
                <label style={{ display:'block', fontSize:'11px', letterSpacing:'1px', textTransform:'uppercase', color:'#999', marginBottom:'5px', fontWeight:'600' }}>{m.label}</label>
                <input type="number" value={form[m.key]} onChange={e => setForm(p=>({...p,[m.key]:e.target.value}))} placeholder={m.target||'0'}
                  style={{ width:'100%', padding:'9px 10px', border:`2px solid ${m.color}33`, borderRadius:'8px', fontSize:'14px', fontFamily:"'DM Sans',sans-serif", outline:'none' }} />
                {m.target && <div style={{ fontSize:'10px', color:'#999', marginTop:'3px' }}>Objectif : {m.target} {m.unit}</div>}
              </div>
            ))}
          </div>
          <button onClick={save} disabled={saving} style={{ padding:'8px 20px', background:'#0D1B4E', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
            {saving ? '…' : '✓ Enregistrer'}
          </button>
        </div>
      ) : (
        macros.map(m => {
          const value = log?.[m.key] || 0
          const target = m.target || 0
          const percent = target ? Math.min(100, (value / target) * 100) : 0
          return (
            <div key={m.key} style={{ marginBottom:'18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                <span style={{ fontWeight:'600', color:'#333' }}>{m.label}</span>
                <span style={{ color: percent > 100 ? '#C45C3A' : '#666' }}>{value} / {target} {m.unit}</span>
              </div>
              <div style={{ height:'10px', background:'#EEE', borderRadius:'6px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${percent}%`, background: percent > 100 ? '#C45C3A' : m.color, transition:'0.4s' }} />
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

function FoodDetailBlock({ log }) {
  const [items, setItems] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [qty, setQty] = useState('100')
  const [mealName, setMealName] = useState('')
  const [searching, setSearching] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (log?.id) {
      supabase.from('nutrition_log_meals').select('*').eq('log_id', log.id).order('created_at').then(({ data }) => setItems(data || []))
    } else setItems([])
  }, [log?.id])

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase.from('foods').select('*').ilike('name', `%${query}%`).limit(20)
      setResults(data || [])
      setSearching(false)
    }, 300)
  }, [query])

  const addItem = async () => {
    if (!selected || !log?.id) return
    const qtyNum = parseFloat(qty) || 100
    const ratio = qtyNum / 100
    const item = {
      log_id: log.id,
      name: selected.name + (mealName ? ` (${mealName})` : ''),
      quantity: qtyNum,
      unit: 'g',
      calories: Math.round(selected.calories * ratio),
      protein: Math.round(selected.protein * ratio * 10) / 10,
      carbs: Math.round(selected.carbs * ratio * 10) / 10,
      fat: Math.round(selected.fat * ratio * 10) / 10,
      fiber: 0
    }
    const { data } = await supabase.from('nutrition_log_meals').insert(item).select().single()
    if (data) { setItems(prev => [...prev, data]); setSelected(null); setQuery(''); setQty('100'); setMealName(''); setResults([]) }
  }

  const deleteItem = async (id) => {
    await supabase.from('nutrition_log_meals').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const totals = items.reduce((a,i) => ({ calories:a.calories+(i.calories||0), protein:a.protein+(i.protein||0), carbs:a.carbs+(i.carbs||0), fat:a.fat+(i.fat||0), fiber:a.fiber+(i.fiber||0) }), {calories:0,protein:0,carbs:0,fat:0,fiber:0})

  return (
    <div style={{ background:'white', borderRadius:'14px', border:'1px solid #EAEAEA', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ padding:'14px 20px', borderBottom:'1px solid #F0F0F0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontWeight:'700', fontSize:'15px', color:'#0D1B4E' }}>🍽️ Détail des aliments <span style={{ fontSize:'12px', color:'#999', fontWeight:'400' }}>(optionnel)</span></div>
        {log && <button onClick={() => setShowSearch(!showSearch)} style={{ padding:'5px 12px', background:'#0D1B4E', color:'white', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>+ Ajouter un aliment</button>}
      </div>

      {showSearch && log && (
        <div style={{ padding:'16px 20px', background:'#F8F9FC', borderBottom:'1px solid #EAEAEA' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 180px', gap:'10px', marginBottom:'10px' }}>
            <div style={{ position:'relative' }}>
              <label style={lbl}>Recherche (8 000+ aliments)</label>
              <input value={query} onChange={e => { setQuery(e.target.value); setSelected(null) }} placeholder="Ex: poulet, riz, avocat…" style={inp} />
              {searching && <div style={{ position:'absolute', right:'10px', top:'34px', fontSize:'11px', color:'#999' }}>…</div>}
              {results.length > 0 && !selected && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #E0E0E0', borderRadius:'8px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:200, maxHeight:'220px', overflowY:'auto' }}>
                  {results.map(f => (
                    <div key={f.id} onClick={() => { setSelected(f); setQuery(f.name); setResults([]) }}
                      style={{ padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid #F5F5F5', display:'flex', justifyContent:'space-between' }}
                      onMouseEnter={e => e.currentTarget.style.background='#F0F4FF'}
                      onMouseLeave={e => e.currentTarget.style.background='white'}>
                      <div>
                        <div style={{ fontSize:'13px', fontWeight:'500' }}>{f.name}</div>
                        <div style={{ fontSize:'11px', color:'#999' }}>{f.portion} · P:{f.protein}g G:{f.carbs}g L:{f.fat}g</div>
                      </div>
                      <span style={{ fontSize:'12px', fontWeight:'700', color:'#0D1B4E' }}>{f.calories} kcal</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={lbl}>Quantité (g)</label>
              <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="100" style={inp} />
            </div>
            <div>
              <label style={lbl}>Repas (optionnel)</label>
              <input value={mealName} onChange={e => setMealName(e.target.value)} placeholder="Déjeuner, collation…" style={inp} />
            </div>
          </div>
          {selected && qty && (
            <div style={{ background:'#EEF2FF', border:'1px solid #C5D0F5', borderRadius:'8px', padding:'9px 14px', marginBottom:'10px', fontSize:'13px', display:'flex', gap:'16px', flexWrap:'wrap' }}>
              <strong>{selected.name} — {qty}g</strong>
              <span>🔥 {Math.round(selected.calories * +qty/100)} kcal</span>
              <span style={{ color:'#C45C3A' }}>P: {Math.round(selected.protein * +qty/100 * 10)/10}g</span>
              <span style={{ color:'#A07820' }}>G: {Math.round(selected.carbs * +qty/100 * 10)/10}g</span>
              <span style={{ color:'#5A8A5A' }}>L: {Math.round(selected.fat * +qty/100 * 10)/10}g</span>
            </div>
          )}
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={addItem} disabled={!selected} style={{ padding:'7px 16px', background: selected?'#0D1B4E':'#CCC', color:'white', border:'none', borderRadius:'7px', fontSize:'13px', fontWeight:'600', cursor: selected?'pointer':'not-allowed' }}>✓ Ajouter</button>
            <button onClick={() => setShowSearch(false)} style={{ padding:'7px 12px', background:'transparent', color:'#666', border:'1px solid #DDD', borderRadius:'7px', fontSize:'13px', cursor:'pointer' }}>Fermer</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ padding:'24px', textAlign:'center', color:'#CCC', fontSize:'13px' }}>
          {log ? 'Aucun aliment ajouté — clique sur "+ Ajouter un aliment"' : 'Saisis d\'abord tes apports du jour ci-dessus'}
        </div>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#F8F9FC' }}>
              {['Aliment','Repas','Qté','Calories','Protéines','Glucides','Lipides','Fibres',''].map(h => (
                <th key={h} style={{ fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color:'#999', fontWeight:'600', textAlign:'left', padding:'8px 12px', borderBottom:'1px solid #EAEAEA' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom:'1px solid #F5F5F5' }}
                onMouseEnter={e => e.currentTarget.style.background='#FAFBFF'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <td style={{ padding:'9px 12px', fontSize:'13px', fontWeight:'500' }}>{item.name.split('(')[0].trim()}</td>
                <td style={{ padding:'9px 12px', fontSize:'12px', color:'#999' }}>{item.name.includes('(') ? item.name.match(/\(([^)]+)\)/)?.[1] : '—'}</td>
                <td style={{ padding:'9px 12px', fontSize:'12px', color:'#666' }}>{item.quantity}g</td>
                <td style={{ padding:'9px 12px', fontSize:'13px', fontWeight:'600' }}>{item.calories}</td>
                <td style={{ padding:'9px 12px', fontSize:'13px', color:'#C45C3A' }}>{item.protein}g</td>
                <td style={{ padding:'9px 12px', fontSize:'13px', color:'#A07820' }}>{item.carbs}g</td>
                <td style={{ padding:'9px 12px', fontSize:'13px', color:'#5A8A5A' }}>{item.fat}g</td>
                <td style={{ padding:'9px 12px', fontSize:'13px', color:'#7A7AAA' }}>{item.fiber||0}g</td>
                <td style={{ padding:'9px 12px' }}>
                  <button onClick={() => deleteItem(item.id)} style={{ background:'none', border:'none', color:'#DDD', cursor:'pointer', fontSize:'18px' }}
                    onMouseEnter={e=>e.target.style.color='#C45C3A'} onMouseLeave={e=>e.target.style.color='#DDD'}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background:'#F0F4FF', borderTop:'2px solid #D0D8F0' }}>
              <td colSpan={3} style={{ padding:'8px 12px', fontSize:'12px', fontWeight:'700', color:'#0D1B4E', textTransform:'uppercase', letterSpacing:'1px' }}>Total</td>
              <td style={{ padding:'8px 12px', fontSize:'13px', fontWeight:'700' }}>{Math.round(totals.calories)}</td>
              <td style={{ padding:'8px 12px', fontSize:'13px', fontWeight:'700', color:'#C45C3A' }}>{Math.round(totals.protein*10)/10}g</td>
              <td style={{ padding:'8px 12px', fontSize:'13px', fontWeight:'700', color:'#A07820' }}>{Math.round(totals.carbs*10)/10}g</td>
              <td style={{ padding:'8px 12px', fontSize:'13px', fontWeight:'700', color:'#5A8A5A' }}>{Math.round(totals.fat*10)/10}g</td>
              <td style={{ padding:'8px 12px', fontSize:'13px', fontWeight:'700', color:'#7A7AAA' }}>{Math.round(totals.fiber*10)/10}g</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}

function TodayView({ today, logs, plan, onSave }) {
  const log = logs.find(l => l.date === today)
  return (
    <div>
      <div style={{ fontWeight:'700', fontSize:'17px', color:'#0D1B4E', marginBottom:'16px' }}>
        {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
      </div>
      <MacroBlock log={log} plan={plan} date={today} onSave={onSave} autoOpen />
      <FoodDetailBlock log={log} />
    </div>
  )
}

function WeekView({ logs, plan, onSave, today }) {
  const [openDay, setOpenDay] = useState(today)

  const getWeekStart = (dateStr) => {
    const d = new Date(dateStr), day = d.getDay()===0?7:d.getDay()
    const mon = new Date(d); mon.setDate(d.getDate()-day+1)
    return mon.toISOString().split('T')[0]
  }

  const weeks = {}
  const thisWeek = getWeekStart(today)
  weeks[thisWeek] = []
  logs.forEach(log => { const wk = getWeekStart(log.date); if(!weeks[wk]) weeks[wk]=[]; weeks[wk].push(log) })
  const sortedWeeks = Object.keys(weeks).sort((a,b)=>b.localeCompare(a))

  const getWeekLabel = (wk) => {
    const s=new Date(wk), e=new Date(wk); e.setDate(e.getDate()+6)
    return `${s.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} – ${e.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}`
  }

  const macros = [
    { key:'calories', label:'Calories', unit:'kcal', target:'target_calories', color:'#0D1B4E' },
    { key:'protein',  label:'Protéines', unit:'g', target:'target_protein', color:'#C45C3A' },
    { key:'carbs',    label:'Glucides',  unit:'g', target:'target_carbs',   color:'#A07820' },
    { key:'fat',      label:'Lipides',   unit:'g', target:'target_fat',     color:'#5A8A5A' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      {sortedWeeks.map(weekStart => {
        const weekLogs = weeks[weekStart]
        const isCurrent = weekStart === getWeekStart(today)
        const days = Array.from({length:7},(_,i)=>{ const d=new Date(weekStart); d.setDate(d.getDate()+i); const ds=d.toISOString().split('T')[0]; return { date:ds, log:weekLogs.find(l=>l.date===ds)||null, isToday:ds===today, isFuture:ds>today } })

        return (
          <div key={weekStart} style={{ background:'white', borderRadius:'14px', border:`1px solid ${isCurrent?'#C0CAEF':'#EAEAEA'}`, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ padding:'12px 20px', background:isCurrent?'#EEF2FF':'#F8F8F8', borderBottom:'1px solid #EAEAEA', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:'700', fontSize:'14px', color:'#0D1B4E' }}>📅 {getWeekLabel(weekStart)}</div>
              <div style={{ fontSize:'12px', color:'#999' }}>{weekLogs.filter(l=>l.calories>0).length}/7 jours saisis</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'150px 1fr 1fr 1fr 1fr', background:'#FAFAFA', borderBottom:'1px solid #F0F0F0' }}>
              {['Jour','Calories','Protéines','Glucides','Lipides'].map(h => (
                <div key={h} style={{ fontSize:'10px', letterSpacing:'1.5px', textTransform:'uppercase', color:'#999', fontWeight:'600', padding:'7px 14px' }}>{h}</div>
              ))}
            </div>
            {days.map(({ date, log, isToday, isFuture }) => {
              const isOpen = openDay === date
              const dayName = DAYS_FR[new Date(date).getDay()===0?6:new Date(date).getDay()-1]
              const dateLabel = new Date(date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})
              const hasData = log && log.calories > 0
              return (
                <div key={date}>
                  <div onClick={() => !isFuture && setOpenDay(isOpen?null:date)}
                    style={{ display:'grid', gridTemplateColumns:'150px 1fr 1fr 1fr 1fr', borderBottom:'1px solid #F5F5F5', background:isToday?'#FAFBFF':isOpen?'#F5F7FF':'transparent', cursor:isFuture?'default':'pointer' }}
                    onMouseEnter={e => { if(!isFuture) e.currentTarget.style.background='#F0F4FF' }}
                    onMouseLeave={e => { e.currentTarget.style.background=isToday?'#FAFBFF':isOpen?'#F5F7FF':'transparent' }}>
                    <div style={{ padding:'10px 14px' }}>
                      <div style={{ fontSize:'13px', fontWeight:isToday?'700':'500', color:isFuture?'#CCC':'#1A1A14' }}>{isToday?'📍 ':''}{dayName}</div>
                      <div style={{ fontSize:'11px', color:'#BBB' }}>{dateLabel}</div>
                    </div>
                    {macros.map(m => {
                      const val = log?.[m.key]||0
                      const target = plan?.[m.target]
                      const pct = target&&val ? Math.min(100,(val/target)*100) : 0
                      return (
                        <div key={m.key} style={{ padding:'10px 14px' }}>
                          {hasData && val > 0 ? (
                            <>
                              <div style={{ fontSize:'13px', fontWeight:'600', color:m.color }}>{val}<span style={{ fontSize:'10px', color:'#BBB', fontWeight:'400' }}> {m.unit}</span></div>
                              {target && <div style={{ marginTop:'3px', height:'4px', width:'80px', background:'#F0F0F0', borderRadius:'2px', overflow:'hidden' }}><div style={{ height:'100%', background:m.color, width:`${pct}%`, opacity:0.8 }} /></div>}
                            </>
                          ) : <span style={{ color:'#DDD' }}>—</span>}
                        </div>
                      )
                    })}
                  </div>
                  {isOpen && (
                    <div style={{ padding:'16px 20px', background:'#F8F9FC', borderBottom:'2px solid #E8ECFA' }}>
                      <MacroBlock log={log} plan={plan} date={date} onSave={onSave} />
                      <FoodDetailBlock log={log} />
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

const lbl = { display:'block', fontSize:'11px', letterSpacing:'1px', textTransform:'uppercase', color:'#999', marginBottom:'5px', fontWeight:'600' }
const inp = { width:'100%', padding:'8px 10px', border:'1.5px solid #E8E8E8', borderRadius:'7px', fontSize:'13px', fontFamily:"'DM Sans',sans-serif", background:'white', outline:'none', color:'#1A1A14' }
