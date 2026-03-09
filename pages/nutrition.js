import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export default function Nutrition() {
  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('week') // 'today' | 'week'
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: np } = await supabase.from('nutrition_plans').select('*').eq('client_id', user.id).eq('active', true).maybeSingle()
      setPlan(np)
      const { data: lg } = await supabase.from('nutrition_logs').select('*').eq('client_id', user.id).order('date', { ascending: false }).limit(84)
      setLogs(lg || [])
      setLoading(false)
    }
    load()
  }, [])

  const upsertLog = async (date, fields) => {
    const existing = logs.find(l => l.date === date)
    if (existing) {
      const { data } = await supabase.from('nutrition_logs').update(fields).eq('id', existing.id).select().single()
      if (data) setLogs(prev => prev.map(l => l.id === existing.id ? data : l))
    } else {
      const { data } = await supabase.from('nutrition_logs').insert({ client_id: user.id, date, ...fields }).select().single()
      if (data) setLogs(prev => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    }
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8', fontFamily: "'Playfair Display',serif", fontSize: '20px', color: '#7A7A6A' }}>Chargement…</div>

  return (
    <Layout title="Nutrition" user={user}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[['today', "Aujourd'hui"], ['week', 'Par semaine']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: 'none', fontFamily: "'DM Sans',sans-serif", background: view === id ? '#4A5240' : '#FDFAF4', color: view === id ? 'white' : '#7A7A6A', boxShadow: view === id ? 'none' : '0 1px 3px rgba(0,0,0,0.06)' }}>
            {label}
          </button>
        ))}
        {plan && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center', background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '10px', padding: '6px 16px', fontSize: '12px', color: '#7A7A6A' }}>
            <span>🎯 Objectifs :</span>
            <span style={{ color: '#1A1A14', fontWeight: '600' }}>🔥 {plan.target_calories} kcal</span>
            <span style={{ color: '#C45C3A', fontWeight: '600' }}>🥩 {plan.target_protein}g P</span>
            <span style={{ color: '#A07820', fontWeight: '600' }}>🌾 {plan.target_carbs}g G</span>
            <span style={{ color: '#8FA07A', fontWeight: '600' }}>🥑 {plan.target_fat}g L</span>
          </div>
        )}
      </div>

      {view === 'today' && <TodayView today={today} logs={logs} plan={plan} onSave={upsertLog} />}
      {view === 'week' && <WeekView logs={logs} plan={plan} onSave={upsertLog} today={today} />}
    </Layout>
  )
}

// ─── TODAY VIEW ──────────────────────────────────────────────
function TodayView({ today, logs, plan, onSave }) {
  const existing = logs.find(l => l.date === today)
  return (
    <div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '17px', fontWeight: '700', marginBottom: '16px' }}>
        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
      <DayRow date={today} log={existing} plan={plan} onSave={onSave} isToday forceOpen />
    </div>
  )
}

// ─── WEEK VIEW ───────────────────────────────────────────────
function WeekView({ logs, plan, onSave, today }) {
  const getWeekStart = (dateStr) => {
    const d = new Date(dateStr)
    const day = d.getDay() === 0 ? 7 : d.getDay()
    const mon = new Date(d); mon.setDate(d.getDate() - day + 1)
    return mon.toISOString().split('T')[0]
  }

  // Build weeks — always show current week even if empty
  const weeks = {}
  const thisWeekStart = getWeekStart(today)
  weeks[thisWeekStart] = []

  logs.forEach(log => {
    const wk = getWeekStart(log.date)
    if (!weeks[wk]) weeks[wk] = []
    weeks[wk].push(log)
  })

  const sortedWeeks = Object.keys(weeks).sort((a, b) => b.localeCompare(a))

  const getWeekLabel = (wk) => {
    const s = new Date(wk), e = new Date(wk); e.setDate(e.getDate() + 6)
    return `${s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }

  const avg = (arr, key) => {
    const vals = arr.filter(l => l[key] > 0)
    return vals.length ? Math.round(vals.reduce((s, l) => s + (l[key] || 0), 0) / vals.length) : null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {sortedWeeks.map(weekStart => {
        const weekLogs = weeks[weekStart]
        const isCurrentWeek = weekStart === getWeekStart(today)

        // Build 7 days for this week
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStart); d.setDate(d.getDate() + i)
          const dateStr = d.toISOString().split('T')[0]
          const log = weekLogs.find(l => l.date === dateStr) || null
          const isPast = dateStr <= today
          return { date: dateStr, log, isPast, isToday: dateStr === today }
        })

        const filledDays = days.filter(d => d.log)
        const avgCal = avg(filledDays.map(d => d.log), 'calories')
        const avgProt = avg(filledDays.map(d => d.log), 'protein')
        const avgCarbs = avg(filledDays.map(d => d.log), 'carbs')
        const avgFat = avg(filledDays.map(d => d.log), 'fat')

        return (
          <div key={weekStart} style={{ background: '#FDFAF4', border: `1px solid ${isCurrentWeek ? '#C8A85A' : '#E0D9CC'}`, borderRadius: '14px', overflow: 'hidden' }}>
            {/* Week header */}
            <div style={{ padding: '12px 20px', background: isCurrentWeek ? '#F5EDD8' : '#F0EBE0', borderBottom: '1px solid #E0D9CC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '700', fontSize: '14px' }}>
                {isCurrentWeek ? '📅 Cette semaine — ' : '📅 '}{getWeekLabel(weekStart)}
              </div>
              <div style={{ fontSize: '12px', color: '#7A7A6A' }}>{filledDays.length} jour{filledDays.length !== 1 ? 's' : ''} renseigné{filledDays.length !== 1 ? 's' : ''}</div>
            </div>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr 1fr 160px', gap: '0', background: '#F8F4EC', borderBottom: '1px solid #E0D9CC' }}>
              {['Jour', 'Calories', 'Glucides', 'Protéines', 'Lipides', 'Commentaire'].map(h => (
                <div key={h} style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', fontWeight: '600', padding: '7px 14px' }}>{h}</div>
              ))}
            </div>

            {/* Day rows */}
            {days.map(({ date, log, isPast, isToday }) => (
              <DayRow key={date} date={date} log={log} plan={plan} onSave={onSave} isToday={isToday} isPast={isPast} />
            ))}

            {/* Average row */}
            {filledDays.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr 1fr 160px', background: '#F0EBE0', borderTop: '2px solid #E0D9CC' }}>
                <div style={{ padding: '8px 14px', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: '#7A7A6A', display: 'flex', alignItems: 'center' }}>Moyenne</div>
                {[
                  { val: avgCal, unit: 'kcal', target: plan?.target_calories, color: '#C8A85A' },
                  { val: avgCarbs, unit: 'g', target: plan?.target_carbs, color: '#A07820' },
                  { val: avgProt, unit: 'g', target: plan?.target_protein, color: '#C45C3A' },
                  { val: avgFat, unit: 'g', target: plan?.target_fat, color: '#8FA07A' },
                ].map((m, i) => (
                  <div key={i} style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', fontFamily: "'DM Mono',monospace" }}>
                      {m.val ?? '—'}{m.val ? ` ${m.unit}` : ''}
                      {m.target && m.val ? <span style={{ fontSize: '10px', color: '#7A7A6A', fontWeight: '400' }}> / {m.target}{m.unit}</span> : ''}
                    </div>
                    {m.target && m.val && (
                      <div style={{ marginTop: '3px', height: '4px', width: '80px', background: '#E0D9CC', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: m.color, width: `${Math.min(100, (m.val / m.target) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                ))}
                <div />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── DAY ROW ─────────────────────────────────────────────────
function DayRow({ date, log, plan, onSave, isToday, isPast, forceOpen }) {
  const [editing, setEditing] = useState(forceOpen || false)
  const [form, setForm] = useState({ calories: log?.calories || '', protein: log?.protein || '', carbs: log?.carbs || '', fat: log?.fat || '', notes: log?.notes || '' })
  const [saving, setSaving] = useState(false)

  // Sync form if log changes externally
  useEffect(() => {
    if (log) setForm({ calories: log.calories || '', protein: log.protein || '', carbs: log.carbs || '', fat: log.fat || '', notes: log.notes || '' })
  }, [log?.id])

  const save = async () => {
    setSaving(true)
    await onSave(date, { calories: +form.calories || 0, protein: +form.protein || 0, carbs: +form.carbs || 0, fat: +form.fat || 0, notes: form.notes })
    setSaving(false)
    if (!forceOpen) setEditing(false)
  }

  const d = new Date(date)
  const dayName = DAYS_FR[d.getDay() === 0 ? 6 : d.getDay() - 1]
  const dayShort = DAYS_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1]
  const dateLabel = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })

  const macros = [
    { key: 'calories', label: 'kcal', target: plan?.target_calories, color: '#C8A85A', barColor: '#C8A85A' },
    { key: 'carbs', label: 'g', target: plan?.target_carbs, color: '#A07820', barColor: '#D4A820' },
    { key: 'protein', label: 'g', target: plan?.target_protein, color: '#C45C3A', barColor: '#C45C3A' },
    { key: 'fat', label: 'g', target: plan?.target_fat, color: '#8FA07A', barColor: '#8FA07A' },
  ]

  const isFuture = date > new Date().toISOString().split('T')[0]
  const hasData = log && (log.calories > 0 || log.protein > 0)

  if (editing) {
    return (
      <div style={{ borderBottom: '1px solid #E0D9CC', background: isToday ? 'rgba(200,168,90,0.06)' : '#FFFDF8' }}>
        {/* Edit form inline */}
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '10px', color: '#4A5240' }}>
            ✏️ {dayName} {dateLabel}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 2fr', gap: '10px', marginBottom: '10px' }}>
            {[
              { label: '🔥 Calories', key: 'calories', ph: plan?.target_calories || '2000' },
              { label: '🌾 Glucides (g)', key: 'carbs', ph: plan?.target_carbs || '200' },
              { label: '🥩 Protéines (g)', key: 'protein', ph: plan?.target_protein || '150' },
              { label: '🥑 Lipides (g)', key: 'fat', ph: plan?.target_fat || '60' },
              { label: '💬 Commentaire', key: 'notes', ph: 'Repas cheat, restaurant…' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '4px' }}>{f.label}</label>
                <input
                  type={f.key === 'notes' ? 'text' : 'number'}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.ph}
                  style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #C8A85A', borderRadius: '7px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", background: 'white', outline: 'none' }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={save} disabled={saving} style={{ padding: '7px 16px', background: '#4A5240', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
              {saving ? '…' : '✓ Enregistrer'}
            </button>
            {!forceOpen && <button onClick={() => setEditing(false)} style={{ padding: '7px 12px', background: 'transparent', color: '#7A7A6A', border: '1px solid #E0D9CC', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Annuler</button>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => !isFuture && setEditing(true)}
      style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr 1fr 160px', gap: '0', borderBottom: '1px solid rgba(0,0,0,0.05)', background: isToday ? 'rgba(200,168,90,0.05)' : 'transparent', cursor: isFuture ? 'default' : 'pointer', transition: 'background 0.15s' }}
      onMouseEnter={e => { if (!isFuture) e.currentTarget.style.background = 'rgba(200,168,90,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.background = isToday ? 'rgba(200,168,90,0.05)' : 'transparent' }}
    >
      {/* Day label */}
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: isToday ? '700' : '500', color: isFuture ? '#BBBBB0' : '#1A1A14' }}>
          {isToday ? '📍 ' : ''}{dayName}
        </div>
        <div style={{ fontSize: '11px', color: '#9A9A8A', fontFamily: "'DM Mono',monospace" }}>{dateLabel}</div>
      </div>

      {/* Macro columns */}
      {macros.map(m => {
        const val = log?.[m.key]
        const pct = m.target && val ? Math.min(100, (val / m.target) * 100) : 0
        const over = pct > 100
        return (
          <div key={m.key} style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {hasData && val > 0 ? (
              <>
                <div style={{ fontSize: '14px', fontWeight: '600', fontFamily: "'DM Mono',monospace", color: m.color }}>
                  {val}<span style={{ fontSize: '11px', fontWeight: '400', color: '#9A9A8A' }}> {m.label}</span>
                </div>
                {m.target && (
                  <div style={{ marginTop: '4px', height: '5px', width: '100%', maxWidth: '100px', background: '#E8E3D8', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: over ? '#C45C3A' : m.barColor, width: `${pct}%`, borderRadius: '3px', transition: 'width 0.3s ease' }} />
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: '13px', color: isFuture ? '#DEDEDA' : '#CCCCC0' }}>—</div>
            )}
          </div>
        )
      })}

      {/* Comment */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center' }}>
        {log?.notes ? (
          <span style={{ fontSize: '12px', color: '#7A7A6A', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>💬 {log.notes}</span>
        ) : !isFuture ? (
          <span style={{ fontSize: '11px', color: '#CCCCC0' }}>Cliquer pour saisir</span>
        ) : null}
      </div>
    </div>
  )
}
