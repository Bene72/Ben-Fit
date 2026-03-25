import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const lbl = {
  display: 'block',
  fontSize: '11px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#999',
  marginBottom: '5px',
  fontWeight: '600'
}

const inp = {
  width: '100%',
  padding: '8px 10px',
  border: '1.5px solid #E8E8E8',
  borderRadius: '7px',
  fontSize: '13px',
  fontFamily: "'DM Sans',sans-serif",
  background: 'white',
  outline: 'none',
  color: '#0D1B4E'
}

function emptyPlanForm() {
  return { target_calories: '', target_protein: '', target_carbs: '', target_fat: '', coach_note: '' }
}

function normalizePlanForm(plan) {
  return {
    target_calories: plan?.target_calories ?? '',
    target_protein: plan?.target_protein ?? '',
    target_carbs: plan?.target_carbs ?? '',
    target_fat: plan?.target_fat ?? '',
    coach_note: plan?.coach_note ?? ''
  }
}

function getTodayIso() {
  return new Date().toISOString().split('T')[0]
}

function scoreFrom(log, plan) {
  if (!log || !plan) return 0
  const keys = ['calories', 'protein', 'carbs', 'fat']
  const targets = [plan.target_calories, plan.target_protein, plan.target_carbs, plan.target_fat]
  const score = keys.reduce((acc, key, i) => {
    const target = targets[i]
    if (!target) return acc
    return acc + Math.min(1, (log[key] || 0) / target)
  }, 0)
  return Math.min(100, Math.round((score / 4) * 100))
}

function useNutritionWorkspace({ clientId, requireAuth = false, redirectIfMissing = false }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [resolvedClientId, setResolvedClientId] = useState(clientId || null)
  const [plan, setPlan] = useState(null)
  const [logs, setLogs] = useState([])
  const [view, setView] = useState('week')
  const [editPlan, setEditPlan] = useState(false)
  const [planForm, setPlanForm] = useState(emptyPlanForm())
  const [loading, setLoading] = useState(true)
  const [savingPlan, setSavingPlan] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      let uid = clientId || null
      let authUser = null

      if (!uid && requireAuth) {
        const { data, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        authUser = data?.user || null
        if (!authUser) {
          if (redirectIfMissing) router.push('/')
          setLoading(false)
          return
        }
        uid = authUser.id
      }

      if (!uid) throw new Error('Client introuvable')

      setUser(authUser || user)
      setResolvedClientId(uid)

      const [{ data: np, error: planError }, { data: lg, error: logsError }] = await Promise.all([
        supabase.from('nutrition_plans').select('*').eq('client_id', uid).eq('active', true).maybeSingle(),
        supabase.from('nutrition_logs').select('*, nutrition_log_meals(*)').eq('client_id', uid).order('date', { ascending: false }).limit(84)
      ])

      if (planError) throw planError
      if (logsError) throw logsError

      setPlan(np || null)
      setPlanForm(normalizePlanForm(np))
      setLogs(lg || [])
      setEditPlan(false)
    } catch (err) {
      setError(err?.message || 'Impossible de charger la nutrition')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [clientId])

  const savePlan = async () => {
    if (!resolvedClientId) return null
    try {
      setSavingPlan(true)
      setError('')
      const payload = {
        client_id: resolvedClientId,
        active: true,
        target_calories: +planForm.target_calories || 0,
        target_protein: +planForm.target_protein || 0,
        target_carbs: +planForm.target_carbs || 0,
        target_fat: +planForm.target_fat || 0,
        coach_note: planForm.coach_note || ''
      }

      let data = null
      if (plan?.id) {
        const res = await supabase.from('nutrition_plans').update(payload).eq('id', plan.id).select().single()
        if (res.error) throw res.error
        data = res.data
      } else {
        const res = await supabase.from('nutrition_plans').insert(payload).select().single()
        if (res.error) throw res.error
        data = res.data
      }

      setPlan(data)
      setPlanForm(normalizePlanForm(data))
      setEditPlan(false)
      return data
    } catch (err) {
      setError(err?.message || 'Impossible de sauvegarder le plan')
      return null
    } finally {
      setSavingPlan(false)
    }
  }

  const upsertLog = async (date, fields) => {
    if (!resolvedClientId) return null
    try {
      setError('')
      const existing = logs.find(l => l.date === date)
      let data = null

      if (existing) {
        const res = await supabase
          .from('nutrition_logs')
          .update(fields)
          .eq('id', existing.id)
          .select('*, nutrition_log_meals(*)')
          .single()
        if (res.error) throw res.error
        data = res.data
        setLogs(prev => prev.map(l => l.id === existing.id ? data : l))
      } else {
        const res = await supabase
          .from('nutrition_logs')
          .insert({ client_id: resolvedClientId, date, ...fields })
          .select('*, nutrition_log_meals(*)')
          .single()
        if (res.error) throw res.error
        data = res.data
        setLogs(prev => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
      }

      return data
    } catch (err) {
      setError(err?.message || 'Impossible de sauvegarder le suivi du jour')
      return null
    }
  }

  return {
    user,
    clientId: resolvedClientId,
    plan,
    logs,
    view,
    setView,
    editPlan,
    setEditPlan,
    planForm,
    setPlanForm,
    loading,
    savingPlan,
    error,
    today: getTodayIso(),
    savePlan,
    upsertLog,
    reload: load
  }
}

export function NutritionCoachPanel({ clientId, clientName }) {
  const state = useNutritionWorkspace({ clientId })
  return <NutritionWorkspace {...state} mode="coach" clientName={clientName} />
}

export function NutritionClientPage({ clientId, layoutComponent: LayoutComponent }) {
  const state = useNutritionWorkspace({ clientId, requireAuth: !clientId, redirectIfMissing: !clientId })
  const content = <NutritionWorkspace {...state} mode={clientId ? 'embedded' : 'client'} />

  if (clientId) {
    return content
  }

  return (
    <LayoutComponent title="Nutrition" user={state.user}>
      {content}
    </LayoutComponent>
  )
}

function NutritionWorkspace({
  mode,
  clientName,
  plan,
  logs,
  view,
  setView,
  editPlan,
  setEditPlan,
  planForm,
  setPlanForm,
  loading,
  savingPlan,
  error,
  today,
  savePlan,
  upsertLog,
  reload
}) {
  const isCoach = mode === 'coach'
  const showPlanEditor = isCoach
  const showToolbar = mode !== 'embedded' || isCoach

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#999', fontFamily: "'DM Sans',sans-serif" }}>Chargement…</div>
  }

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#FFF3F2', border: '1px solid #F2C9C3', color: '#9B3D2A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <span>{error}</span>
          <button onClick={reload} style={{ padding: '6px 12px', border: 'none', borderRadius: '8px', background: '#9B3D2A', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Réessayer</button>
        </div>
      )}

      {showPlanEditor ? (
        <CoachPlanCard
          plan={plan}
          clientName={clientName}
          editPlan={editPlan}
          setEditPlan={setEditPlan}
          planForm={planForm}
          setPlanForm={setPlanForm}
          savingPlan={savingPlan}
          savePlan={savePlan}
        />
      ) : (
        <ObjectivesBanner plan={plan} />
      )}

      {showToolbar && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          {!isCoach && <div style={{ fontWeight: '700', fontSize: '15px', color: '#0D1B4E', marginRight: '8px' }}>📊 Mon suivi</div>}
          {isCoach && <div style={{ fontWeight: '700', fontSize: '15px', color: '#0D1B4E', marginRight: '8px' }}>📊 Suivi client</div>}
          {[['today', "Aujourd'hui"], ['week', 'Par semaine']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                border: 'none',
                fontFamily: "'DM Sans',sans-serif",
                background: view === id ? '#0D1B4E' : 'white',
                color: view === id ? 'white' : '#666',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {view === 'today' && <TodayView today={today} logs={logs} plan={plan} onSave={upsertLog} />}
      {view === 'week' && <WeekView logs={logs} plan={plan} onSave={upsertLog} today={today} />}
    </div>
  )
}

function ObjectivesBanner({ plan }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
      {plan ? (
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center', background: 'white', border: '1px solid #E8E8E8', borderRadius: '10px', padding: '7px 16px', fontSize: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <span style={{ color: '#999' }}>Objectifs :</span>
          <span style={{ fontWeight: '700' }}>🔥 {plan.target_calories} kcal</span>
          <span style={{ fontWeight: '700', color: '#C45C3A' }}>P {plan.target_protein}g</span>
          <span style={{ fontWeight: '700', color: '#2A50B0' }}>G {plan.target_carbs}g</span>
          <span style={{ fontWeight: '700', color: '#3A7BD5' }}>L {plan.target_fat}g</span>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #E8E8E8', borderRadius: '10px', padding: '10px 16px', fontSize: '12px', color: '#6B7A99' }}>
          Aucun plan nutritionnel actif pour le moment.
        </div>
      )}
    </div>
  )
}

function CoachPlanCard({ plan, clientName, editPlan, setEditPlan, planForm, setPlanForm, savingPlan, savePlan }) {
  return (
    <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '18px', color: '#0D1B4E', letterSpacing: '2px' }}>
            {plan ? 'PLAN NUTRITIONNEL ACTUEL' : 'CRÉER UN PLAN NUTRITIONNEL'}
          </div>
          {clientName && <div style={{ fontSize: '12px', color: '#6B7A99' }}>{clientName}</div>}
        </div>
        <button onClick={() => setEditPlan(!editPlan)} style={{ padding: '9px 14px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
          {editPlan ? '✕ Annuler' : plan ? '✏️ Modifier' : '+ Créer le plan'}
        </button>
      </div>

      {editPlan ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '10px', marginBottom: '12px' }}>
            {[
              ['target_calories', '🔥 Calories', '2200'],
              ['target_protein', '🥩 Protéines (g)', '160'],
              ['target_carbs', '🌾 Glucides (g)', '220'],
              ['target_fat', '🥑 Lipides (g)', '70']
            ].map(([key, label, placeholder]) => (
              <div key={key}>
                <label style={lbl}>{label}</label>
                <input
                  type="number"
                  value={planForm[key]}
                  onChange={e => setPlanForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={inp}
                />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={lbl}>Note coach</label>
            <textarea
              value={planForm.coach_note}
              onChange={e => setPlanForm(prev => ({ ...prev, coach_note: e.target.value }))}
              rows={3}
              style={{ ...inp, resize: 'vertical' }}
            />
          </div>
          <button onClick={savePlan} disabled={savingPlan} style={{ padding: '9px 16px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            {savingPlan ? 'Sauvegarde…' : '✓ Enregistrer le plan'}
          </button>
        </div>
      ) : plan ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: '12px' }}>
            {[
              ['🔥', plan.target_calories, 'kcal / jour'],
              ['🥩', plan.target_protein, 'g protéines'],
              ['🌾', plan.target_carbs, 'g glucides'],
              ['🥑', plan.target_fat, 'g lipides']
            ].map(([icon, val, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '28px', color: '#0D1B4E' }}>{val || '—'}</div>
                <div style={{ fontSize: '12px', color: '#6B7A99' }}>{label}</div>
              </div>
            ))}
          </div>
          {plan.coach_note && (
            <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(13,27,78,0.08)' }}>
              <div style={{ ...lbl, marginBottom: '6px' }}>Note coach</div>
              <div style={{ fontSize: '13px', color: '#44516E', lineHeight: 1.5 }}>{plan.coach_note}</div>
            </div>
          )}
        </>
      ) : (
        <div style={{ color: '#6B7A99', fontSize: '14px', textAlign: 'center', padding: '10px' }}>Aucun plan nutritionnel. Clique sur « + Créer le plan » pour commencer.</div>
      )}
    </div>
  )
}

function NutritionScore({ log, plan }) {
  if (!log || !plan) return null
  const rounded = scoreFrom(log, plan)
  const color = rounded >= 80 ? '#3A7BD5' : rounded >= 50 ? '#2A50B0' : '#C45C3A'
  return (
    <div style={{ marginTop: '12px', padding: '16px 20px', borderRadius: '12px', background: '#F7F7F7', border: '1px solid #EAEAEA', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ fontSize: '28px', fontWeight: '800', color }}>{rounded}<span style={{ fontSize: '14px', color: '#999', fontWeight: '400' }}> / 100</span></div>
      <div>
        <div style={{ fontWeight: '700', fontSize: '13px', color: '#333' }}>Score nutrition du jour</div>
        <div style={{ fontSize: '12px', color: '#999' }}>{rounded >= 80 ? '🟢 Excellente journée !' : rounded >= 50 ? '🟡 Peut mieux faire' : '🔴 Objectifs non atteints'}</div>
      </div>
    </div>
  )
}

function Feedback({ log, plan }) {
  if (!log || !plan) return null
  const feedback = []
  if ((log.protein || 0) < (plan.target_protein || 0)) feedback.push('💪 Augmente les protéines')
  if ((log.calories || 0) < (plan.target_calories || 0) * 0.8) feedback.push('⚡ Tu es trop bas en calories')
  if ((log.carbs || 0) < (plan.target_carbs || 0) * 0.8) feedback.push("🌾 Ajoute des glucides pour l'énergie")
  if ((log.fat || 0) < (plan.target_fat || 0) * 0.7) feedback.push('🥑 Lipides un peu bas')
  if (feedback.length === 0) feedback.push('✅ Objectifs atteints, belle journée !')
  return (
    <div style={{ marginTop: '12px', padding: '16px 20px', borderRadius: '12px', background: '#EEF4FF', border: '1px solid #B8CBF5' }}>
      <div style={{ fontWeight: '700', fontSize: '13px', color: '#1A3580', marginBottom: '8px' }}>Feedback</div>
      {feedback.map((message, i) => <div key={i} style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>{message}</div>)}
    </div>
  )
}

function WeeklyGraph({ logs, plan, today }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - 6 + i)
    const ds = d.toISOString().split('T')[0]
    const log = logs.find(l => l.date === ds)
    return { date: ds, calories: log?.calories || 0, label: d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2) }
  })
  const max = Math.max(...days.map(d => d.calories), plan?.target_calories || 1)
  return (
    <div style={{ marginTop: '12px', padding: '16px 20px', borderRadius: '12px', background: 'white', border: '1px solid #EAEAEA' }}>
      <div style={{ fontWeight: '700', fontSize: '13px', color: '#333', marginBottom: '16px' }}>📈 Calories — 7 derniers jours</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px' }}>
        {days.map((day, i) => {
          const h = max ? Math.max((day.calories / max) * 100, 2) : 2
          const isToday = day.date === today
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
              {day.calories > 0 && <div style={{ fontSize: '9px', color: '#999' }}>{day.calories}</div>}
              <div style={{ width: '100%', height: `${h}%`, background: isToday ? '#0D1B4E' : '#C5CEEA', borderRadius: '4px 4px 0 0', transition: 'height 0.4s' }} />
              <div style={{ fontSize: '10px', color: isToday ? '#0D1B4E' : '#999', fontWeight: isToday ? '700' : '400' }}>{day.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Ring({ value, target, label, unit, color }) {
  const percent = target ? Math.min(100, (value / target) * 100) : 0
  const over = percent >= 100
  const radius = 54
  const stroke = 9
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (percent / 100) * circumference
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
          <circle stroke="#EEEEEE" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
          <circle
            stroke={over ? '#C45C3A' : color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s', strokeLinecap: 'round' }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', lineHeight: 1.2 }}>
          <div style={{ fontWeight: '800', fontSize: '16px', color: over ? '#C45C3A' : '#0D1B4E' }}>{value}</div>
          <div style={{ fontSize: '10px', color: '#AAA' }}>/ {target}</div>
        </div>
      </div>
      <div style={{ marginTop: '8px', fontWeight: '600', fontSize: '13px', color: '#444' }}>{label}</div>
      <div style={{ fontSize: '11px', color: '#AAA' }}>{unit}</div>
    </div>
  )
}

function MacroBlock({ log, plan, date, onSave, combined, foodTotals }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ calories: log?.calories || '', protein: log?.protein || '', carbs: log?.carbs || '', fat: log?.fat || '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (log) {
      setForm({
        calories: log.calories || '',
        protein: log.protein || '',
        carbs: log.carbs || '',
        fat: log.fat || ''
      })
    }
  }, [log?.id, log?.calories, log?.protein, log?.carbs, log?.fat])

  const save = async () => {
    setSaving(true)
    await onSave(date, {
      calories: +form.calories || 0,
      protein: +form.protein || 0,
      carbs: +form.carbs || 0,
      fat: +form.fat || 0
    })
    setSaving(false)
    setEditing(false)
  }

  const macros = [
    { key: 'calories', label: 'Calories', unit: 'kcal', target: plan?.target_calories, color: '#0D1B4E' },
    { key: 'protein', label: 'Protéines', unit: 'g', target: plan?.target_protein, color: '#C45C3A' },
    { key: 'carbs', label: 'Glucides', unit: 'g', target: plan?.target_carbs, color: '#2A50B0' },
    { key: 'fat', label: 'Lipides', unit: 'g', target: plan?.target_fat, color: '#3A7BD5' }
  ]

  const displayValues = combined || {
    calories: log?.calories || 0,
    protein: log?.protein || 0,
    carbs: log?.carbs || 0,
    fat: log?.fat || 0
  }

  return (
    <div style={{ background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #EAEAEA', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontWeight: '700', fontSize: '14px', color: '#0D1B4E' }}>📊 Apports du jour</span>
        <button onClick={() => setEditing(!editing)} style={{ padding: '6px 14px', background: editing ? '#C45C3A' : '#0D1B4E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
          {editing ? 'Annuler' : '✏️ Saisir'}
        </button>
      </div>

      {foodTotals && (foodTotals.calories || foodTotals.protein || foodTotals.carbs || foodTotals.fat) ? (
        <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '10px', background: '#F5F8FF', border: '1px solid #D9E2FA', fontSize: '12px', color: '#44516E' }}>
          Les aliments ajoutés au détail sont additionnés automatiquement aux totaux affichés.
        </div>
      ) : null}

      {editing ? (
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '10px' }}>💡 Saisis tes totaux importés. Les aliments du détail s'ajouteront automatiquement.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '12px', marginBottom: '16px' }}>
            {macros.map(m => (
              <div key={m.key}>
                <label style={lbl}>{m.label}</label>
                <input
                  type="number"
                  value={form[m.key]}
                  onChange={e => setForm(prev => ({ ...prev, [m.key]: e.target.value }))}
                  placeholder={m.target || '0'}
                  style={{ ...inp, border: `2px solid ${m.color}33` }}
                />
                {m.target ? <div style={{ fontSize: '10px', color: '#999', marginTop: '3px' }}>Objectif : {m.target} {m.unit}</div> : null}
              </div>
            ))}
          </div>
          <button onClick={save} disabled={saving} style={{ padding: '8px 20px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            {saving ? '…' : '✓ Enregistrer'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '8px', justifyItems: 'center' }}>
          {macros.map(m => (
            <Ring key={m.key} value={displayValues[m.key] || 0} target={m.target || 0} label={m.label} unit={m.unit} color={m.color} />
          ))}
        </div>
      )}
    </div>
  )
}

function FoodDetailBlock({ log: initialLog, date, onSave, onItemsChange }) {
  const [log, setLog] = useState(initialLog)
  const [items, setItems] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [mode, setMode] = useState('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [qty, setQty] = useState('100')
  const [mealName, setMealName] = useState('')
  const [searching, setSearching] = useState(false)
  const [manual, setManual] = useState({ name: '', quantity: '100', calories: '', protein: '', carbs: '', fat: '' })
  const timerRef = useRef(null)

  useEffect(() => { setLog(initialLog) }, [initialLog?.id])

  const ensureLog = async () => {
    if (log?.id) return log
    const created = await onSave(date, { calories: 0, protein: 0, carbs: 0, fat: 0 })
    if (created) setLog(created)
    return created
  }

  useEffect(() => {
    let ignore = false
    const loadItems = async () => {
      if (!log?.id) {
        setItems([])
        return
      }
      const { data } = await supabase.from('nutrition_log_meals').select('*').eq('log_id', log.id).order('created_at')
      if (!ignore) setItems(data || [])
    }
    loadItems()
    return () => { ignore = true }
  }, [log?.id])

  useEffect(() => {
    if (mode !== 'search' || query.trim().length < 2) {
      setResults([])
      return
    }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      const q = query.trim().toLowerCase()
      const { data } = await supabase.from('foods').select('*').ilike('name', `%${q}%`).order('name').limit(100)
      const sorted = (data || []).sort((a, b) => {
        const an = a.name.toLowerCase()
        const bn = b.name.toLowerCase()
        const aStarts = an.startsWith(q)
        const bStarts = bn.startsWith(q)
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1
        return an.localeCompare(bn, 'fr')
      }).slice(0, 20)
      setResults(sorted)
      setSearching(false)
    }, 300)

    return () => clearTimeout(timerRef.current)
  }, [query, mode])

  const addItem = async () => {
    if (!selected) return
    const currentLog = await ensureLog()
    if (!currentLog?.id) return
    const qtyNum = parseFloat(qty) || 100
    const ratio = qtyNum / 100
    const payload = {
      log_id: currentLog.id,
      name: selected.name + (mealName ? ` (${mealName})` : ''),
      quantity: qtyNum,
      unit: 'g',
      calories: Math.round(selected.calories * ratio),
      protein: Math.round(selected.protein * ratio * 10) / 10,
      carbs: Math.round(selected.carbs * ratio * 10) / 10,
      fat: Math.round(selected.fat * ratio * 10) / 10,
      fiber: 0
    }
    const { data } = await supabase.from('nutrition_log_meals').insert(payload).select().single()
    if (data) {
      setItems(prev => [...prev, data])
      setSelected(null)
      setQuery('')
      setQty('100')
      setMealName('')
      setResults([])
    }
  }

  const addManualItem = async () => {
    if (!manual.name.trim()) return
    const currentLog = await ensureLog()
    if (!currentLog?.id) return
    const payload = {
      log_id: currentLog.id,
      name: manual.name.trim() + (mealName ? ` (${mealName})` : ''),
      quantity: parseFloat(manual.quantity) || 100,
      unit: 'g',
      calories: parseInt(manual.calories) || 0,
      protein: parseFloat(manual.protein) || 0,
      carbs: parseFloat(manual.carbs) || 0,
      fat: parseFloat(manual.fat) || 0,
      fiber: 0
    }
    const { data } = await supabase.from('nutrition_log_meals').insert(payload).select().single()
    if (data) {
      setItems(prev => [...prev, data])
      setManual({ name: '', quantity: '100', calories: '', protein: '', carbs: '', fat: '' })
      setMealName('')
    }
  }

  const deleteItem = async (id) => {
    await supabase.from('nutrition_log_meals').delete().eq('id', id)
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const totals = useMemo(() => items.reduce((acc, item) => ({
    calories: acc.calories + (item.calories || 0),
    protein: acc.protein + (item.protein || 0),
    carbs: acc.carbs + (item.carbs || 0),
    fat: acc.fat + (item.fat || 0),
    fiber: acc.fiber + (item.fiber || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }), [items])

  useEffect(() => {
    onItemsChange?.({ calories: totals.calories, protein: totals.protein, carbs: totals.carbs, fat: totals.fat })
  }, [totals.calories, totals.protein, totals.carbs, totals.fat, onItemsChange])

  return (
    <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #EAEAEA', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontWeight: '700', fontSize: '15px', color: '#0D1B4E' }}>🍽️ Détail des aliments <span style={{ fontSize: '12px', color: '#999', fontWeight: '400' }}>(optionnel)</span></div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => { setShowAdd(true); setMode('search') }} style={{ padding: '5px 12px', background: showAdd && mode === 'search' ? '#EEF2FF' : '#0D1B4E', color: showAdd && mode === 'search' ? '#0D1B4E' : 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>🔍 Rechercher</button>
          <button onClick={() => { setShowAdd(true); setMode('manual') }} style={{ padding: '5px 12px', background: showAdd && mode === 'manual' ? '#EEF2FF' : '#4A6FD4', color: showAdd && mode === 'manual' ? '#0D1B4E' : 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>✏️ Libre</button>
        </div>
      </div>

      {showAdd && mode === 'search' && (
        <div style={{ padding: '16px 20px', background: '#F5F8FF', borderBottom: '1px solid #EAEAEA' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 180px', gap: '10px', marginBottom: '10px' }}>
            <div style={{ position: 'relative' }}>
              <label style={lbl}>Recherche (base foods)</label>
              <input value={query} onChange={e => { setQuery(e.target.value); setSelected(null) }} placeholder="Ex: poulet, riz, avocat…" style={inp} />
              {searching && <div style={{ position: 'absolute', right: '10px', top: '34px', fontSize: '11px', color: '#999' }}>…</div>}
              {results.length > 0 && !selected && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #E0E0E0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200, maxHeight: '220px', overflowY: 'auto' }}>
                  {results.map(food => (
                    <div key={food.id} onClick={() => { setSelected(food); setQuery(food.name); setResults([]) }} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #F5F5F5', display: 'flex', justifyContent: 'space-between' }} onMouseEnter={e => { e.currentTarget.style.background = '#F0F4FF' }} onMouseLeave={e => { e.currentTarget.style.background = 'white' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '500' }}>{food.name}</div>
                        <div style={{ fontSize: '11px', color: '#999' }}>{food.portion} · P:{food.protein}g G:{food.carbs}g L:{food.fat}g</div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#0D1B4E' }}>{food.calories} kcal</span>
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
            <div style={{ background: '#EEF2FF', border: '1px solid #C5D0F5', borderRadius: '8px', padding: '9px 14px', marginBottom: '10px', fontSize: '13px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <strong>{selected.name} — {qty}g</strong>
              <span>🔥 {Math.round(selected.calories * ((parseFloat(qty) || 100) / 100))} kcal</span>
              <span>🥩 {Math.round(selected.protein * ((parseFloat(qty) || 100) / 100) * 10) / 10} g</span>
              <span>🌾 {Math.round(selected.carbs * ((parseFloat(qty) || 100) / 100) * 10) / 10} g</span>
              <span>🥑 {Math.round(selected.fat * ((parseFloat(qty) || 100) / 100) * 10) / 10} g</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={addItem} disabled={!selected} style={{ padding: '7px 16px', background: selected ? '#0D1B4E' : '#CCC', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: selected ? 'pointer' : 'not-allowed' }}>✓ Ajouter</button>
            <button onClick={() => setShowAdd(false)} style={{ padding: '7px 12px', background: 'transparent', color: '#666', border: '1px solid #DDD', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>Fermer</button>
          </div>
        </div>
      )}

      {showAdd && mode === 'manual' && (
        <div style={{ padding: '16px 20px', background: '#F5F8FF', borderBottom: '1px solid #EAEAEA' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={lbl}>Nom de l'aliment *</label>
              <input value={manual.name} onChange={e => setManual(prev => ({ ...prev, name: e.target.value }))} placeholder="Ex: Wrap maison, Gâteau…" style={inp} />
            </div>
            <div>
              <label style={lbl}>Quantité (g)</label>
              <input type="number" value={manual.quantity} onChange={e => setManual(prev => ({ ...prev, quantity: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Repas (optionnel)</label>
              <input value={mealName} onChange={e => setMealName(e.target.value)} placeholder="Repas" style={inp} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '10px' }}>
            {[['calories', '🔥 Kcal'], ['protein', '🥩 Prot (g)'], ['carbs', '🌾 Gluc (g)'], ['fat', '🥑 Lip (g)']].map(([key, label]) => (
              <div key={key}>
                <label style={lbl}>{label}</label>
                <input type="number" value={manual[key]} onChange={e => setManual(prev => ({ ...prev, [key]: e.target.value }))} placeholder="0" style={inp} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={addManualItem} disabled={!manual.name.trim()} style={{ padding: '7px 16px', background: manual.name.trim() ? '#4A6FD4' : '#CCC', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: manual.name.trim() ? 'pointer' : 'not-allowed' }}>✓ Ajouter</button>
            <button onClick={() => setShowAdd(false)} style={{ padding: '7px 12px', background: 'transparent', color: '#666', border: '1px solid #DDD', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>Fermer</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ padding: '18px 20px', textAlign: 'center', color: '#BBB', fontSize: '12px' }}>Aucun aliment détaillé pour ce jour.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
                {['Aliment', 'Repas', 'Qté', 'Kcal', 'Prot', 'Gluc', 'Lip', 'Fibres', ''].map(header => (
                  <th key={header} style={{ padding: '8px 12px', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#999', textAlign: 'left' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #F5F5F5' }}>
                  <td style={{ padding: '9px 12px', fontSize: '13px', fontWeight: '500' }}>{item.name.split('(')[0].trim()}</td>
                  <td style={{ padding: '9px 12px', fontSize: '12px', color: '#999' }}>{item.name.includes('(') ? item.name.match(/\\(([^)]+)\\)/)?.[1] : '—'}</td>
                  <td style={{ padding: '9px 12px', fontSize: '12px', color: '#666' }}>{item.quantity}g</td>
                  <td style={{ padding: '9px 12px', fontSize: '13px', fontWeight: '600' }}>{item.calories}</td>
                  <td style={{ padding: '9px 12px', fontSize: '13px', color: '#C45C3A' }}>{item.protein}g</td>
                  <td style={{ padding: '9px 12px', fontSize: '13px', color: '#2A50B0' }}>{item.carbs}g</td>
                  <td style={{ padding: '9px 12px', fontSize: '13px', color: '#3A7BD5' }}>{item.fat}g</td>
                  <td style={{ padding: '9px 12px', fontSize: '13px', color: '#7A7AAA' }}>{item.fiber || 0}g</td>
                  <td style={{ padding: '9px 12px' }}>
                    <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', color: '#DDD', cursor: 'pointer', fontSize: '18px' }} onMouseEnter={e => { e.target.style.color = '#C45C3A' }} onMouseLeave={e => { e.target.style.color = '#DDD' }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#F0F4FF', borderTop: '2px solid #D0D8F0' }}>
                <td colSpan={3} style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '700', color: '#0D1B4E', textTransform: 'uppercase', letterSpacing: '1px' }}>Total</td>
                <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '700' }}>{Math.round(totals.calories)}</td>
                <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '700', color: '#C45C3A' }}>{Math.round(totals.protein * 10) / 10}g</td>
                <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '700', color: '#2A50B0' }}>{Math.round(totals.carbs * 10) / 10}g</td>
                <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '700', color: '#3A7BD5' }}>{Math.round(totals.fat * 10) / 10}g</td>
                <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '700', color: '#7A7AAA' }}>{Math.round(totals.fiber * 10) / 10}g</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

function TodayView({ today, logs, plan, onSave }) {
  const log = logs.find(l => l.date === today)
  const [foodTotals, setFoodTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const combined = {
    calories: (log?.calories || 0) + foodTotals.calories,
    protein: (log?.protein || 0) + foodTotals.protein,
    carbs: (log?.carbs || 0) + foodTotals.carbs,
    fat: (log?.fat || 0) + foodTotals.fat
  }
  return (
    <div>
      <div style={{ fontWeight: '700', fontSize: '17px', color: '#0D1B4E', marginBottom: '16px' }}>
        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
      <MacroBlock log={log} plan={plan} date={today} onSave={onSave} combined={combined} foodTotals={foodTotals} />
      <NutritionScore log={{ ...log, ...combined }} plan={plan} />
      <Feedback log={{ ...log, ...combined }} plan={plan} />
      <WeeklyGraph logs={logs} plan={plan} today={today} />
      <div style={{ marginTop: '16px' }}><FoodDetailBlock log={log} date={today} onSave={onSave} onItemsChange={setFoodTotals} /></div>
    </div>
  )
}

function WeekView({ logs, plan, onSave, today }) {
  const [openDay, setOpenDay] = useState(today)

  const getWeekStart = (dateStr) => {
    const d = new Date(dateStr)
    const day = d.getDay() === 0 ? 7 : d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - day + 1)
    return monday.toISOString().split('T')[0]
  }

  const weeks = {}
  const thisWeek = getWeekStart(today)
  weeks[thisWeek] = []
  logs.forEach(log => {
    const weekKey = getWeekStart(log.date)
    if (!weeks[weekKey]) weeks[weekKey] = []
    weeks[weekKey].push(log)
  })

  const sortedWeeks = Object.keys(weeks).sort((a, b) => b.localeCompare(a))

  const getWeekLabel = (weekStart) => {
    const start = new Date(weekStart)
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }

  const macros = [
    { key: 'calories', label: 'Calories', unit: 'kcal', target: 'target_calories', color: '#0D1B4E' },
    { key: 'protein', label: 'Protéines', unit: 'g', target: 'target_protein', color: '#C45C3A' },
    { key: 'carbs', label: 'Glucides', unit: 'g', target: 'target_carbs', color: '#2A50B0' },
    { key: 'fat', label: 'Lipides', unit: 'g', target: 'target_fat', color: '#3A7BD5' }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {sortedWeeks.map(weekStart => {
        const weekLogs = weeks[weekStart]
        const isCurrent = weekStart === getWeekStart(today)
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStart)
          d.setDate(d.getDate() + i)
          const ds = d.toISOString().split('T')[0]
          return {
            date: ds,
            log: weekLogs.find(l => l.date === ds) || null,
            isToday: ds === today,
            isFuture: ds > today
          }
        })

        return (
          <div key={weekStart} style={{ background: 'white', borderRadius: '14px', border: `1px solid ${isCurrent ? '#C0CAEF' : '#EAEAEA'}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '12px 20px', background: isCurrent ? '#EEF2FF' : '#F5F7FF', borderBottom: '1px solid #EAEAEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '700', fontSize: '14px', color: '#0D1B4E' }}>📅 {getWeekLabel(weekStart)}</div>
              <div style={{ fontSize: '12px', color: '#999' }}>{weekLogs.filter(l => l.calories > 0).length}/7 jours saisis</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 1fr 1fr 1fr', background: '#F8FAFF', borderBottom: '1px solid #F0F0F0' }}>
              {['Jour', 'Calories', 'Protéines', 'Glucides', 'Lipides'].map(header => (
                <div key={header} style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#999', fontWeight: '600', padding: '7px 14px' }}>{header}</div>
              ))}
            </div>
            {days.map(({ date, log, isToday, isFuture }) => {
              const isOpen = openDay === date
              const dayName = DAYS_FR[new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1]
              const dateLabel = new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
              const hasData = log && log.calories > 0
              return (
                <div key={date}>
                  <div onClick={() => !isFuture && setOpenDay(isOpen ? null : date)} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 1fr 1fr 1fr', borderBottom: '1px solid #F5F5F5', background: isToday ? '#FAFBFF' : isOpen ? '#F5F7FF' : 'transparent', cursor: isFuture ? 'default' : 'pointer' }} onMouseEnter={e => { if (!isFuture) e.currentTarget.style.background = '#F0F4FF' }} onMouseLeave={e => { e.currentTarget.style.background = isToday ? '#FAFBFF' : isOpen ? '#F5F7FF' : 'transparent' }}>
                    <div style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: '13px', fontWeight: isToday ? '700' : '500', color: isFuture ? '#CCC' : '#0D1B4E' }}>{isToday ? '📍 ' : ''}{dayName}</div>
                      <div style={{ fontSize: '11px', color: '#BBB' }}>{dateLabel}</div>
                    </div>
                    {macros.map(macro => {
                      const val = log?.[macro.key] || 0
                      const target = plan?.[macro.target]
                      const pct = target && val ? Math.min(100, (val / target) * 100) : 0
                      return (
                        <div key={macro.key} style={{ padding: '10px 14px' }}>
                          {hasData && val > 0 ? (
                            <>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: macro.color }}>{val}<span style={{ fontSize: '10px', color: '#BBB', fontWeight: '400' }}> {macro.unit}</span></div>
                              {target ? <div style={{ marginTop: '3px', height: '4px', width: '80px', background: '#F0F0F0', borderRadius: '2px', overflow: 'hidden' }}><div style={{ height: '100%', background: macro.color, width: `${pct}%`, opacity: 0.8 }} /></div> : null}
                            </>
                          ) : <span style={{ color: '#DDD' }}>—</span>}
                        </div>
                      )
                    })}
                  </div>
                  {isOpen && (
                    <div style={{ padding: '16px 20px', background: '#F5F8FF', borderBottom: '2px solid #E8ECFA' }}>
                      <WeekDayPanel log={log} plan={plan} date={date} onSave={onSave} />
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

function WeekDayPanel({ log, plan, date, onSave }) {
  const [foodTotals, setFoodTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const combined = {
    calories: (log?.calories || 0) + foodTotals.calories,
    protein: (log?.protein || 0) + foodTotals.protein,
    carbs: (log?.carbs || 0) + foodTotals.carbs,
    fat: (log?.fat || 0) + foodTotals.fat
  }
  return (
    <>
      <MacroBlock log={log} plan={plan} date={date} onSave={onSave} combined={combined} foodTotals={foodTotals} />
      <FoodDetailBlock log={log} date={date} onSave={onSave} onItemsChange={setFoodTotals} />
    </>
  )
}
