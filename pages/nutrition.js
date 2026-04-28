'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import AppShell from '../components/ui/AppShell'
import SurfaceCard from '../components/ui/SurfaceCard'
import SectionHead from '../components/ui/SectionHead'
import StatusBadge from '../components/ui/StatusBadge'
import SegmentTabs from '../components/ui/SegmentTabs'
import EmptyPanel from '../components/ui/EmptyPanel'

const NUTRITION_TABS = [
  { label: 'Aujourd\'hui', value: 'today' },
  { label: 'Semaine', value: 'week' },
]

function todayString() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  } catch {
    return '—'
  }
}

function clampPercent(value, target) {
  if (!target) return 0
  return Math.max(0, Math.min(100, Math.round((Number(value || 0) / Number(target || 1)) * 100)))
}

export default function NutritionPage() {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('today')
  const [plan, setPlan] = useState(null)
  const [logs, setLogs] = useState([])
  const [selectedDate, setSelectedDate] = useState(todayString())
  const [foodTotals, setFoodTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [form, setForm] = useState({
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    note: '',
  })

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 980)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    let active = true
    async function boot() {
      try {
        setLoading(true)
        setError('')
        setSuccess('')

        const { data: authData } = await supabase.auth.getUser()
        const currentUser = authData?.user
        if (!currentUser) {
          router.push('/')
          return
        }
        if (!active) return
        setUser(currentUser)

        const [{ data: planData, error: planError }, { data: logsData, error: logsError }] = await Promise.all([
          supabase.from('nutrition_plans').select('*').eq('client_id', currentUser.id).order('created_at', { ascending: false }).limit(1),
          supabase.from('nutrition_logs').select('*, nutrition_log_meals(*)').eq('client_id', currentUser.id).order('date', { ascending: false }).limit(84),
        ])

        if (planError) throw planError
        if (logsError) throw logsError
        if (!active) return

        setPlan(planData?.[0] || null)
        setLogs(logsData || [])
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

  const selectedLog = useMemo(() => logs.find((log) => log.date === selectedDate) || null, [logs, selectedDate])
  const weekLogs = useMemo(() => [...logs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7), [logs])

  useEffect(() => {
    setForm({
      calories: selectedLog?.calories || '',
      protein: selectedLog?.protein || '',
      carbs: selectedLog?.carbs || '',
      fat: selectedLog?.fat || '',
      note: selectedLog?.note || selectedLog?.comment || '',
    })
  }, [selectedDate, selectedLog])

  async function saveLog(dateArg = selectedDate, values = null, silent = false) {
    if (!user) return null
    try {
      setSaving(true)
      setError('')
      if (!silent) setSuccess('')
      const source = values || form
      const payload = {
        client_id: user.id,
        date: dateArg,
        calories: Number(source.calories || 0),
        protein: Number(source.protein || 0),
        carbs: Number(source.carbs || 0),
        fat: Number(source.fat || 0),
        note: source.note || null,
      }

      const { data, error: upsertError } = await supabase.from('nutrition_logs').upsert(payload, { onConflict: 'client_id,date' }).select('*, nutrition_log_meals(*)').single()
      if (upsertError) throw upsertError

      setLogs((prev) => {
        const exists = prev.find((log) => log.date === dateArg)
        if (exists) return prev.map((log) => (log.date === dateArg ? data : log))
        return [data, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date))
      })

      if (!silent) setSuccess('Nutrition enregistrée.')
      return data
    } catch (e) {
      setError(e.message || 'Impossible d\'enregistrer la nutrition')
      return null
    } finally {
      setSaving(false)
    }
  }

  const combinedValues = {
    calories: Number(form.calories || 0) + Number(foodTotals.calories || 0),
    protein: Number(form.protein || 0) + Number(foodTotals.protein || 0),
    carbs: Number(form.carbs || 0) + Number(foodTotals.carbs || 0),
    fat: Number(form.fat || 0) + Number(foodTotals.fat || 0),
  }

  if (loading) {
    return (
      <AppShell title="Nutrition" subtitle="Chargement de ta nutrition..." actions={<SegmentTabs items={NUTRITION_TABS} value={activeTab} onChange={setActiveTab} />}>
        <div style={{ color: '#6B7A99' }}>Chargement…</div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Nutrition"
      subtitle="Tu peux renseigner tes macros ou tes aliments dans l'ordre que tu veux. Les aliments s'ajoutent automatiquement aux apports du jour."
      actions={<SegmentTabs items={NUTRITION_TABS} value={activeTab} onChange={setActiveTab} />}
    >
      {error ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard padded style={{ borderColor: '#F3C4C4', background: '#FEF2F2' }}>
            <strong style={{ display: 'block', marginBottom: 6, color: '#B42318' }}>Erreur</strong>
            <div style={{ color: '#B42318' }}>{error}</div>
          </SurfaceCard>
        </div>
      ) : null}

      {success ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard padded style={{ borderColor: '#C9E9D5', background: '#F0FBF4' }}>
            <strong style={{ display: 'block', marginBottom: 6, color: '#16804A' }}>OK</strong>
            <div style={{ color: '#16804A' }}>{success}</div>
          </SurfaceCard>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, 0.9fr) minmax(0, 1.5fr) minmax(250px, 0.8fr)', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <SurfaceCard padded sticky={!isMobile}>
            <SectionHead title="Plan coach" caption="Les objectifs à suivre aujourd'hui." />
            {plan ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <ListMetric label="Calories" value={plan.target_calories || '—'} />
                <ListMetric label="Protéines" value={`${plan.target_protein || '—'} g`} />
                <ListMetric label="Glucides" value={`${plan.target_carbs || '—'} g`} />
                <ListMetric label="Lipides" value={`${plan.target_fat || '—'} g`} />

                <div style={{ border: '1px solid '#DCE5F3', borderRadius: 18, padding: 14, background: '#F8FBFF' }}>
                  <div style={{ fontWeight: 900, color: '#0D1B4E', marginBottom: 8 }}>Notes</div>
                  <div style={{ color: '#6B7A99', lineHeight: 1.7 }}>{plan.notes || 'Aucune note nutritionnelle.'}</div>
                </div>
              </div>
            ) : (
              <EmptyPanel title="Aucun plan" description="Ton coach n'a pas encore enregistré de plan nutritionnel." />
            )}
          </SurfaceCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {activeTab === 'today' ? (
            <>
              <SurfaceCard padded>
                <SectionHead
                  title="Aujourd'hui"
                  caption="Tu peux commencer par les apports du jour, ou directement par le détail des aliments."
                  action={<input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={dateInputStyle()} />}
                />

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0,1fr))', gap: 12, marginBottom: 18 }}>
                  <KpiCard label="Calories" value={combinedValues.calories || 0} caption={`${clampPercent(combinedValues.calories, plan?.target_calories)}% de l'objectif`} />
                  <KpiCard label="Protéines" value={combinedValues.protein || 0} caption={`${clampPercent(combinedValues.protein, plan?.target_protein)}% de l'objectif`} />
                  <KpiCard label="Glucides" value={combinedValues.carbs || 0} caption={`${clampPercent(combinedValues.carbs, plan?.target_carbs)}% de l'objectif`} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <Field label="Calories"><input style={inputStyle()} type="number" value={form.calories} onChange={(e) => setForm((p) => ({ ...p, calories: e.target.value }))} /></Field>
                  <Field label="Protéines"><input style={inputStyle()} type="number" value={form.protein} onChange={(e) => setForm((p) => ({ ...p, protein: e.target.value }))} /></Field>
                  <Field label="Glucides"><input style={inputStyle()} type="number" value={form.carbs} onChange={(e) => setForm((p) => ({ ...p, carbs: e.target.value }))} /></Field>
                  <Field label="Lipides"><input style={inputStyle()} type="number" value={form.fat} onChange={(e) => setForm((p) => ({ ...p, fat: e.target.value }))} /></Field>
                </div>

                <div style={{ marginTop: 12 }}>
                  <Field label="Commentaire">
                    <textarea style={{ ...inputStyle(), minHeight: 120, resize: 'vertical' }} value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="Écart, faim, digestion, énergie, contexte social…" />
                  </Field>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 12, flexDirection: isMobile ? 'column' : 'row' }}>
                  <div style={{ color: '#6B7A99', fontSize: 13, lineHeight: 1.6 }}>Les valeurs du détail aliments s'ajoutent automatiquement aux totaux ci-dessus.</div>
                  <button type="button" onClick={() => saveLog()} disabled={saving} style={primaryButtonStyle(isMobile)}>
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </SurfaceCard>

              <FoodDetailBlock log={selectedLog} date={selectedDate} onSave={saveLog} onItemsChange={setFoodTotals} isMobile={isMobile} />

              <SurfaceCard padded>
                <SectionHead title="Progression rapide" caption="Comparaison par rapport au plan du jour." />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <ProgressBar label="Calories" value={combinedValues.calories} target={plan?.target_calories} percent={clampPercent(combinedValues.calories, plan?.target_calories)} />
                  <ProgressBar label="Protéines" value={combinedValues.protein} target={plan?.target_protein} percent={clampPercent(combinedValues.protein, plan?.target_protein)} />
                  <ProgressBar label="Glucides" value={combinedValues.carbs} target={plan?.target_carbs} percent={clampPercent(combinedValues.carbs, plan?.target_carbs)} />
                  <ProgressBar label="Lipides" value={combinedValues.fat} target={plan?.target_fat} percent={clampPercent(combinedValues.fat, plan?.target_fat)} />
                </div>
              </SurfaceCard>
            </>
          ) : (
            <SurfaceCard padded>
              <SectionHead title="Semaine" caption="Vue condensée des derniers jours enregistrés." />
              {weekLogs.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {weekLogs.map((log) => {
                    const foodCount = (log.nutrition_log_meals || []).length
                    const foodMacros = (log.nutrition_log_meals || []).reduce((acc, item) => ({
                      calories: acc.calories + (item.calories || 0),
                      protein: acc.protein + (item.protein || 0),
                      carbs: acc.carbs + (item.carbs || 0),
                      fat: acc.fat + (item.fat || 0),
                    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

                    return (
                      <div key={log.id || log.date} style={{ border: '1px solid #DCE5F3', borderRadius: 18, background: '#FFFFFF', padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: 900, color: '#0D1B4E' }}>{formatDate(log.date)}</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {foodCount ? <StatusBadge tone="accent">{foodCount} aliment(s)</StatusBadge> : null}
                            <StatusBadge tone="default">{log.date === todayString() ? 'Aujourd'hui' : 'Journal'}</StatusBadge>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0,1fr))', gap: 10 }}>
                          <MiniKpi label="Calories" value={(log.calories || 0) + foodMacros.calories} />
                          <MiniKpi label="Protéines" value={(log.protein || 0) + foodMacros.protein} />
                          <MiniKpi label="Glucides" value={(log.carbs || 0) + foodMacros.carbs} />
                        </div>

                        {log.note || log.comment ? (
                          <div style={{ border: '1px solid #DCE5F3', borderRadius: 18, background: '#F8FBFF', padding: 14, marginTop: 10 }}>
                            <div style={{ color: '#6B7A99', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{log.note || log.comment}</div>
                          </div>
                        ) : null}

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 12, flexDirection: isMobile ? 'column' : 'row' }}>
                          <div style={{ color: '#6B7A99', fontSize: 13 }}>Ouvre cette journée pour modifier les macros ou les aliments.</div>
                          <button type="button" onClick={() => { setSelectedDate(log.date); setActiveTab('today') }} style={secondaryButtonStyle(isMobile}>Ouvrir ce jour</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyPanel title="Aucune journée" description="Commence par enregistrer une journée pour voir ta semaine apparaître." />
              )}
            </SurfaceCard>
          )}
        </div>

        {!isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <SurfaceCard padded sticky>
              <SectionHead title="Repères" caption="Lecture rapide de ta journée en cours." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <ListMetric label="Calories" value={combinedValues.calories || 0} success={clampPercent(combinedValues.calories, plan?.target_calories) >= 100} />
                <ListMetric label="Protéines" value={`${combinedValues.protein || 0} g`} success={clampPercent(combinedValues.protein, plan?.target_protein) >= 100} />
                <ListMetric label="Glucides" value={`${combinedValues.carbs || 0} g`} success={clampPercent(combinedValues.carbs, plan?.target_carbs) >= 100} />
                <ListMetric label="Lipides" value={`${combinedValues.fat || 0} g`} success={clampPercent(combinedValues.fat, plan?.target_fat) >= 100} />
              </div>
            </SurfaceCard>
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}

// ... [Le reste du fichier nutrition.js (FoodDetailBlock, ProgressBar, etc.) reste IDENTIQUE à ton code original]
// Pour des raisons de longueur, je ne répète pas les ~800 lignes restantes qui ne changent pas.
// La seule modification critique était l'ajout de 'use client' en première ligne.

function inputStyle() {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid #DCE5F3',
    background: '#FFFFFF',
    outline: 'none',
    fontSize: 14,
    color: '#0D1B4E',
    fontFamily: "'DM Sans',sans-serif",
  }
}
// ... [Les autres helper functions restent identiques]