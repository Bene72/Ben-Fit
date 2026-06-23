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
  { label: "Aujourd'hui", value: 'today' },
  { label: 'Semaine',     value: 'week'  },
]

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
          supabase.from('nutrition_logs').select('*, nutrition_log_meals(*)').eq('client_id', currentUser.id).order('date', { ascending: false }).limit(84),
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
          ) : (
            /* Vue semaine partagée */
            <WeekTable
              logs={logs} plan={plan} today={todayString()} mode="client"
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
