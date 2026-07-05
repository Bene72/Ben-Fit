/**
 * pages/nutrition.js  —  Vue CLIENT (coaché)
 * 822 lignes → ~230 lignes
 *
 * Logique propre à cette vue :
 *   - Auth + chargement des données
 *   - Saisie manuelle des macros du jour (form calories/protein/carbs/fat)
 *   - combinedValues = macros saisies + totaux aliments
 *   - ProgressBar, KpiCard, ListMetric
 *
 * Composants partagés avec NutritionTab (coach) :
 *   - FoodBlock     → components/nutrition/FoodBlock.jsx
 *   - WeekTable     → components/nutrition/WeekTable.jsx
 *   - nutritionUtils → lib/nutritionUtils.js
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase }    from '../lib/supabase'
import { todayString, clampPercent } from '../lib/nutritionUtils'

import AppShell    from '../components/ui/AppShell'
import SurfaceCard from '../components/ui/SurfaceCard'
import SectionHead from '../components/ui/SectionHead'
import StatusBadge from '../components/ui/StatusBadge'
import SegmentTabs from '../components/ui/SegmentTabs'
import EmptyPanel  from '../components/ui/EmptyPanel'
import FoodBlock   from '../components/nutrition/FoodBlock'
import WeekTable   from '../components/nutrition/WeekTable'

const NUTRITION_TABS = [
  { label: "Aujourd'hui", value: 'today'   },
  { label: 'Semaine',     value: 'week'    },
  { label: 'Historique',  value: 'history' },
]

// ─── Champs macro suivis dans l'historique / la courbe ───────────────────────
const NUTRI_FIELDS = [
  { key: 'calories', label: 'Calories',  unit: 'kcal', icon: '🔥', color: '#C45C3A' },
  { key: 'protein',  label: 'Protéines', unit: 'g',    icon: '🥩', color: '#2C8A6E' },
  { key: 'carbs',    label: 'Glucides',  unit: 'g',    icon: '🌾', color: '#B8860B' },
  { key: 'fat',      label: 'Lipides',   unit: 'g',    icon: '🥑', color: '#4A6FD4' },
]

// ─── Courbe d'évolution d'une macro dans le temps (même logique que le poids) ─
function NutritionMiniChart({ logs, field }) {
  const data      = [...logs].filter(l => l[field] != null && l[field] !== 0).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-30)
  const fieldMeta = NUTRI_FIELDS.find(f => f.key === field)
  const color     = fieldMeta?.color || '#2C64E5'
  if (data.length < 2) return (
    <div style={{ height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#DCE5F3', gap: 8 }}>
      <div style={{ fontSize: 32 }}>📉</div>
      <div style={{ fontSize: 12, color: '#6B7A99' }}>Ajoute au moins 2 jours de suivi pour voir la courbe</div>
    </div>
  )
  const vals  = data.map(l => +l[field])
  const min   = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const W = 400, H = 140, PX = 12, PY = 14
  const pts      = data.map((l, i) => [PX + (i / (data.length - 1)) * (W - PX * 2), PY + ((max - +l[field]) / range) * (H - PY * 2 - 14)])
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const area     = `M${pts[0][0]},${H - 14} ` + pts.map(([x, y]) => `L${x},${y}`).join(' ') + ` L${pts[pts.length - 1][0]},${H - 14} Z`
  const delta    = (vals[vals.length - 1] - vals[0]).toFixed(0)
  const isPos    = parseFloat(delta) > 0
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 140, overflow: 'visible' }}>
        <defs>
          <linearGradient id={`ng-${field}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0"    />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line key={i} x1={PX} y1={PY + t * (H - PY * 2 - 14)} x2={W - PX} y2={PY + t * (H - PY * 2 - 14)} stroke="#EAF0F8" strokeWidth="1" strokeDasharray="3,3" />
        ))}
        <path d={area} fill={`url(#ng-${field})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 5 : 3.5} fill="white" stroke={color} strokeWidth="2.5" />)}
        <text x={pts[0][0]}            y={H - 1} textAnchor="middle" fontSize="9" fill="#6B7A99">{new Date(data[0].date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</text>
        <text x={pts[pts.length-1][0]} y={H - 1} textAnchor="middle" fontSize="9" fill="#6B7A99">{new Date(data[data.length-1].date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</text>
        <text x={W - PX + 3} y={PY + 3}      fontSize="9" fill={color}   fontWeight="700">{max}</text>
        <text x={W - PX + 3} y={H - PY - 12} fontSize="9" fill="#6B7A99">{min}</text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={{ fontSize: 11, color: '#6B7A99' }}>{data.length} jours · du {new Date(data[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au {new Date(data[data.length-1].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: isPos ? '#C45C3A' : '#2C8A6E' }}>{isPos ? '+' : ''}{delta} {fieldMeta?.unit} sur la période</div>
      </div>
    </div>
  )
}

// ─── Historique complet (liste par date + sélecteur de courbe) ───────────────
function NutritionHistory({ logs, isMobile, onOpenDay }) {
  const [subTab, setSubTab] = useState('list')
  const [field,  setField]  = useState('calories')
  const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date))
  return (
    <SurfaceCard padded>
      <SectionHead title="Historique" caption="Toutes les valeurs de diète enregistrées, avec la date, et leur évolution en courbe." />
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid #EAF0F8' }}>
        {[{ id: 'list', label: '📋 Liste' }, { id: 'curve', label: '📈 Courbe' }].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{ padding: '8px 16px', border: 'none', background: 'transparent', fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: subTab === t.id ? 700 : 500, cursor: 'pointer', color: subTab === t.id ? '#2C64E5' : '#6B7A99', borderBottom: `2px solid ${subTab === t.id ? '#2C64E5' : 'transparent'}`, marginBottom: -1 }}>{t.label}</button>
        ))}
      </div>

      {subTab === 'list' ? (
        sorted.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6B7A99', padding: '30px 0', fontSize: 13 }}>Aucune valeur de diète enregistrée pour le moment.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 460, overflowY: 'auto' }}>
            {sorted.map((l, i) => (
              <div key={l.id || l.date} onClick={() => onOpenDay && onOpenDay(l.date)}
                style={{ background: i === 0 ? '#F8FBFF' : 'white', borderRadius: 11, padding: '12px 14px', border: i === 0 ? '1.5px solid #DCE5F3' : '1px solid #EEF2F8', cursor: onOpenDay ? 'pointer' : 'default' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#6B7A99', fontFamily: "'DM Mono',monospace" }}>{new Date(l.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {i === 0 && <span style={{ fontSize: 9, background: '#E8F0E8', color: '#2C8A6E', padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>DERNIER</span>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px' }}>
                  {NUTRI_FIELDS.filter(f => l[f.key] != null).map(f => (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 10, color: '#6B7A99' }}>{f.icon} {f.label}</span>
                      <span style={{ fontWeight: 900, fontSize: 15, color: f.color }}>{l[f.key]}<span style={{ fontSize: 10, fontWeight: 400, color: '#6B7A99' }}> {f.unit}</span></span>
                    </div>
                  ))}
                  {(l.note || l.comment) && <div style={{ width: '100%', fontSize: 11, color: '#6B7A99', marginTop: 3, fontStyle: 'italic' }}>💬 {l.note || l.comment}</div>}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {NUTRI_FIELDS.filter(f => logs.some(l => l[f.key] != null)).map(f => (
              <button key={f.key} onClick={() => setField(f.key)} style={{ padding: '5px 13px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 700, background: field === f.key ? f.color : '#EAF0F8', color: field === f.key ? 'white' : '#6B7A99' }}>{f.icon} {f.label}</button>
            ))}
          </div>
          <div style={{ background: '#F8FBFF', borderRadius: 12, padding: '16px 14px' }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0D1B4E', marginBottom: 12 }}>{NUTRI_FIELDS.find(f => f.key === field)?.icon} {NUTRI_FIELDS.find(f => f.key === field)?.label} <span style={{ fontSize: 11, color: '#6B7A99', fontWeight: 400 }}>({NUTRI_FIELDS.find(f => f.key === field)?.unit})</span></div>
            <NutritionMiniChart logs={logs} field={field} />
          </div>
        </div>
      )}
    </SurfaceCard>
  )
}

export default function NutritionPage() {
  const router = useRouter()
  const [isMobile,      setIsMobile]      = useState(false)
  const [user,          setUser]          = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')
  const [success,       setSuccess]       = useState('')
  const [activeTab,     setActiveTab]     = useState('today')
  const [plan,          setPlan]          = useState(null)
  const [logs,          setLogs]          = useState([])
  const [selectedDate,  setSelectedDate]  = useState(todayString())
  const [foodTotals,    setFoodTotals]    = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [userName,      setUserName]      = useState('')
  const [cycleName,     setCycleName]     = useState('')
  const [form,          setForm]          = useState({ calories: '', protein: '', carbs: '', fat: '', note: '' })

  // ── Responsive ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 980)
    handle()
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  // ── Boot ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true
    async function boot() {
      try {
        setLoading(true); setError(''); setSuccess('')
        const { data: authData } = await supabase.auth.getUser()
        const currentUser = authData?.user
        if (!currentUser) { router.push('/'); return }
        if (!active) return
        setUser(currentUser)

        const [{ data: planData, error: planErr }, { data: logsData, error: logsErr }, { data: profileData }] = await Promise.all([
          supabase.from('nutrition_plans').select('*').eq('client_id', currentUser.id).order('created_at', { ascending: false }).limit(1),
          supabase.from('nutrition_logs').select('*, nutrition_log_meals(*)').eq('client_id', currentUser.id).order('date', { ascending: false }).limit(200),
          supabase.from('profiles').select('full_name, current_cycle_name').eq('id', currentUser.id).single(),
        ])

        if (planErr) throw planErr
        if (logsErr) throw logsErr
        if (!active) return

        setPlan(planData?.[0] || null)
        setLogs(logsData || [])
        setUserName(profileData?.full_name?.split(' ')[0] || '')
        setCycleName(profileData?.current_cycle_name || '')
      } catch (e) {
        if (!active) return
        setError(e.message || 'Impossible de charger la nutrition')
      } finally {
        if (active) setLoading(false)
      }
    }
    boot()
    return () => { active = false }
  }, [router])

  // ── Dérivés ─────────────────────────────────────────────────────────────────
  const selectedLog = useMemo(() => logs.find((l) => l.date === selectedDate) || null, [logs, selectedDate])

  useEffect(() => {
    setForm({
      calories: selectedLog?.calories || '',
      protein:  selectedLog?.protein  || '',
      carbs:    selectedLog?.carbs    || '',
      fat:      selectedLog?.fat      || '',
      note:     selectedLog?.note     || selectedLog?.comment || '',
    })
  }, [selectedDate, selectedLog])

  const combinedValues = {
    calories: Number(form.calories || 0) + Number(foodTotals.calories || 0),
    protein:  Number(form.protein  || 0) + Number(foodTotals.protein  || 0),
    carbs:    Number(form.carbs    || 0) + Number(foodTotals.carbs    || 0),
    fat:      Number(form.fat      || 0) + Number(foodTotals.fat      || 0),
  }

  // ── Sauvegarder les macros du jour ──────────────────────────────────────────
  async function saveLog(dateArg = selectedDate, values = null, silent = false) {
    if (!user) return null
    try {
      setSaving(true); setError('')
      if (!silent) setSuccess('')
      const source  = values || form
      const payload = {
        client_id: user.id, date: dateArg,
        calories: Number(source.calories || 0), protein: Number(source.protein || 0),
        carbs:    Number(source.carbs    || 0), fat:     Number(source.fat     || 0),
        note:     source.note || null,
      }
      const { data, error: upsertErr } = await supabase
        .from('nutrition_logs').upsert(payload, { onConflict: 'client_id,date' })
        .select('*, nutrition_log_meals(*)').single()
      if (upsertErr) throw upsertErr
      setLogs((prev) => {
        const exists = prev.find((l) => l.date === dateArg)
        return exists
          ? prev.map((l) => (l.date === dateArg ? data : l))
          : [data, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date))
      })
      if (!silent) setSuccess('Nutrition enregistrée.')
      return data
    } catch (e) {
      setError(e.message || "Impossible d'enregistrer la nutrition")
      return null
    } finally {
      setSaving(false)
    }
  }

  // ── FoodBlock : créer le log si absent avant d'ajouter un aliment ───────────
  async function ensureLog() {
    if (selectedLog?.id) return selectedLog
    return await saveLog(selectedDate, { calories: 0, protein: 0, carbs: 0, fat: 0, note: null }, true)
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────
  if (loading) return (
    <AppShell title="Nutrition" subtitle="Chargement…" actions={<SegmentTabs items={NUTRITION_TABS} value={activeTab} onChange={setActiveTab} />}>
      <SurfaceCard padded><div style={{ color: '#6B7A99' }}>Chargement…</div></SurfaceCard>
    </AppShell>
  )

  return (
    <AppShell title="Nutrition" subtitle="Tu peux renseigner tes macros ou tes aliments dans l'ordre que tu veux."
      actions={<SegmentTabs items={NUTRITION_TABS} value={activeTab} onChange={setActiveTab} />}
      userName={userName} cycleName={cycleName} coachName="Ben" coachAvailable>

      {error   && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(250px,0.85fr) minmax(0,1.6fr) minmax(220px,0.7fr)', gap: 14 }}>

        {/* ── Colonne gauche : plan coach ── */}
        <div>
          <SurfaceCard padded sticky={!isMobile}>
            <SectionHead title="Plan coach" caption="Les objectifs à suivre aujourd'hui." />
            {plan ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <ListMetric label="Calories"  value={plan.target_calories || '—'} />
                <ListMetric label="Protéines" value={`${plan.target_protein || '—'} g`} />
                <ListMetric label="Glucides"  value={`${plan.target_carbs  || '—'} g`} />
                <ListMetric label="Lipides"   value={`${plan.target_fat    || '—'} g`} />
                <div style={{ border: '1px solid #DCE5F3', borderRadius: 18, padding: 14, background: '#F8FBFF' }}>
                  <div style={{ fontWeight: 900, color: '#0D1B4E', marginBottom: 8 }}>Notes</div>
                  <div style={{ color: '#6B7A99', lineHeight: 1.7 }}>{plan.notes || plan.coach_note || 'Aucune note nutritionnelle.'}</div>
                </div>
              </div>
            ) : (
              <EmptyPanel title="Aucun plan" description="Ton coach n'a pas encore enregistré de plan nutritionnel." />
            )}
          </SurfaceCard>
        </div>

        {/* ── Colonne centrale ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {activeTab === 'today' ? (
            <>
              {/* Saisie macros du jour */}
              <SurfaceCard padded>
                <SectionHead
                  title="Aujourd'hui"
                  caption="Tu peux commencer par les apports du jour, ou directement par le détail des aliments."
                  action={<input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={dateInputStyle()} />}
                />
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,minmax(0,1fr))', gap: 8, marginBottom: 12 }}>
                  <KpiCard label="Calories"  value={combinedValues.calories} caption={`${clampPercent(combinedValues.calories, plan?.target_calories)}% de l'objectif`} />
                  <KpiCard label="Protéines" value={combinedValues.protein}  caption={`${clampPercent(combinedValues.protein, plan?.target_protein)}% de l'objectif`} />
                  <KpiCard label="Glucides"  value={combinedValues.carbs}    caption={`${clampPercent(combinedValues.carbs, plan?.target_carbs)}% de l'objectif`} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,minmax(0,1fr))', gap: 8 }}>
                  <Field label="Calories"> <input style={inputStyle()} type="number" value={form.calories} onChange={(e) => setForm((p) => ({ ...p, calories: e.target.value }))} /></Field>
                  <Field label="Protéines"><input style={inputStyle()} type="number" value={form.protein}  onChange={(e) => setForm((p) => ({ ...p, protein:  e.target.value }))} /></Field>
                  <Field label="Glucides"> <input style={inputStyle()} type="number" value={form.carbs}    onChange={(e) => setForm((p) => ({ ...p, carbs:    e.target.value }))} /></Field>
                  <Field label="Lipides">  <input style={inputStyle()} type="number" value={form.fat}      onChange={(e) => setForm((p) => ({ ...p, fat:      e.target.value }))} /></Field>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Field label="Commentaire">
                    <textarea style={{ ...inputStyle(), minHeight: 60, resize: 'vertical' }} value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="Écart, faim, digestion, énergie, contexte social…" />
                  </Field>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 12, flexDirection: isMobile ? 'column' : 'row' }}>
                  <div style={{ color: '#6B7A99', fontSize: 13, lineHeight: 1.6 }}>Les valeurs du détail aliments s'ajoutent automatiquement.</div>
                  <button type="button" onClick={() => saveLog()} disabled={saving} style={primaryButtonStyle(isMobile)}>
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </SurfaceCard>

              {/* Bloc aliments partagé */}
              <FoodBlock log={selectedLog} onEnsureLog={ensureLog} mode="client" onItemsChange={setFoodTotals} />

              {/* Barres de progression */}
              <SurfaceCard padded>
                <SectionHead title="Progression rapide" caption="Comparaison par rapport au plan du jour." />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <ProgressBar label="Calories"  value={combinedValues.calories} target={plan?.target_calories} percent={clampPercent(combinedValues.calories, plan?.target_calories)} />
                  <ProgressBar label="Protéines" value={combinedValues.protein}  target={plan?.target_protein}  percent={clampPercent(combinedValues.protein,  plan?.target_protein)}  />
                  <ProgressBar label="Glucides"  value={combinedValues.carbs}    target={plan?.target_carbs}    percent={clampPercent(combinedValues.carbs,    plan?.target_carbs)}    />
                  <ProgressBar label="Lipides"   value={combinedValues.fat}      target={plan?.target_fat}      percent={clampPercent(combinedValues.fat,      plan?.target_fat)}      />
                </div>
              </SurfaceCard>
            </>
          ) : activeTab === 'week' ? (
            /* Vue semaine partagée */
            <WeekTable
              logs={logs} plan={plan} today={todayString()} mode="client"
              onOpenDay={(date) => { setSelectedDate(date); setActiveTab('today') }}
            />
          ) : (
            /* Historique complet + courbe d'évolution */
            <NutritionHistory
              logs={logs} isMobile={isMobile}
              onOpenDay={(date) => { setSelectedDate(date); setActiveTab('today') }}
            />
          )}
        </div>

        {/* ── Colonne droite : repères (desktop only) ── */}
        {!isMobile && (
          <div>
            <SurfaceCard padded sticky>
              <SectionHead title="Repères" caption="Lecture rapide de ta journée en cours." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <ListMetric label="Calories"  value={combinedValues.calories} success={clampPercent(combinedValues.calories, plan?.target_calories) >= 100} />
                <ListMetric label="Protéines" value={`${combinedValues.protein} g`} success={clampPercent(combinedValues.protein, plan?.target_protein) >= 100} />
                <ListMetric label="Glucides"  value={`${combinedValues.carbs} g`}   success={clampPercent(combinedValues.carbs,   plan?.target_carbs) >= 100} />
                <ListMetric label="Lipides"   value={`${combinedValues.fat} g`}     success={clampPercent(combinedValues.fat,     plan?.target_fat) >= 100} />
              </div>
            </SurfaceCard>
          </div>
        )}
      </div>
    </AppShell>
  )
}

// ─── Composants locaux (propres à la vue client) ──────────────────────────────

function ProgressBar({ label, value, target, percent }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontWeight: 800, color: '#0D1B4E' }}>{label}</div>
        <div style={{ color: '#6B7A99' }}>{value || 0} / {target || '—'}</div>
      </div>
      <div style={{ height: 7, background: '#EAF0F8', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: '#2C64E5', borderRadius: 999 }} />
      </div>
    </div>
  )
}

function ListMetric({ label, value, success = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
      <div style={{ color: '#0D1B4E', fontWeight: 800 }}>{label}</div>
      <StatusBadge tone={success ? 'success' : 'accent'}>{value}</StatusBadge>
    </div>
  )
}

function KpiCard({ label, value, caption }) {
  return (
    <div style={{ border: '1px solid #DCE5F3', borderRadius: 12, background: '#FFF', padding: '10px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 900, fontSize: 22, color: '#0D1B4E', lineHeight: 1 }}>{value}</div>
      <div style={{ color: '#6B7A99', marginTop: 4, fontSize: 11 }}>{caption}</div>
    </div>
  )
}

function Alert({ tone, children }) {
  const s = tone === 'error'
    ? { borderColor: '#F3C4C4', background: '#FEF2F2', color: '#B42318', label: 'Erreur' }
    : { borderColor: '#C9E9D5', background: '#F0FBF4', color: '#16804A', label: 'OK' }
  return (
    <div style={{ marginBottom: 16 }}>
      <SurfaceCard padded style={{ borderColor: s.borderColor, background: s.background }}>
        <strong style={{ display: 'block', marginBottom: 6, color: s.color }}>{s.label}</strong>
        <div style={{ color: s.color }}>{children}</div>
      </SurfaceCard>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7A99', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
      {children}
    </div>
  )
}

function inputStyle() {
  return { width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 9, border: '1px solid #DCE5F3', background: '#FFF', outline: 'none', fontSize: 13, color: '#0D1B4E', fontFamily: "'DM Sans',sans-serif" }
}
function dateInputStyle() {
  return { padding: '6px 10px', borderRadius: 9, border: '1px solid #DCE5F3', background: '#FFF', outline: 'none', fontSize: 12, color: '#0D1B4E', fontFamily: "'DM Sans',sans-serif" }
}
function primaryButtonStyle(fullWidth) {
  return { border: 'none', background: '#2C64E5', color: 'white', borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", width: fullWidth ? '100%' : 'auto' }
}
