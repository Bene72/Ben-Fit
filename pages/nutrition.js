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
  { label: 'Aujourd’hui', value: 'today' },
  { label: 'Semaine', value: 'week' },
]

function todayString() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    })
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

        const [{ data: planData, error: planError }, { data: logsData, error: logsError }] =
          await Promise.all([
            supabase
              .from('nutrition_plans')
              .select('*')
              .eq('client_id', currentUser.id)
              .order('created_at', { ascending: false })
              .limit(1),
            supabase
              .from('nutrition_logs')
              .select('*, nutrition_log_meals(*)')
              .eq('client_id', currentUser.id)
              .order('date', { ascending: false })
              .limit(84),
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

    return () => {
      active = false
    }
  }, [router])

  const selectedLog = useMemo(
    () => logs.find((log) => log.date === selectedDate) || null,
    [logs, selectedDate]
  )

  const weekLogs = useMemo(() => {
    return [...logs]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 7)
  }, [logs])

  useEffect(() => {
    setForm({
      calories: selectedLog?.calories || '',
      protein: selectedLog?.protein || '',
      carbs: selectedLog?.carbs || '',
      fat: selectedLog?.fat || '',
      note: selectedLog?.note || selectedLog?.comment || '',
    })
  }, [selectedDate, selectedLog])

  async function saveLog(dateArg = selectedDate, values = null) {
    if (!user) return null

    try {
      setSaving(true)
      setError('')
      setSuccess('')

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

      const { data, error: upsertError } = await supabase
        .from('nutrition_logs')
        .upsert(payload, { onConflict: 'client_id,date' })
        .select('*, nutrition_log_meals(*)')
        .single()

      if (upsertError) throw upsertError

      setLogs((prev) => {
        const exists = prev.find((log) => log.date === dateArg)
        if (exists) {
          return prev.map((log) => (log.date === dateArg ? data : log))
        }
        return [data, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date))
      })

      if (!values) setSuccess('Nutrition enregistrée.')
      return data
    } catch (e) {
      setError(e.message || 'Impossible d’enregistrer la nutrition')
      return null
    } finally {
      setSaving(false)
    }
  }

  const kcalPercent = clampPercent(form.calories, plan?.target_calories)
  const proteinPercent = clampPercent(form.protein, plan?.target_protein)
  const carbsPercent = clampPercent(form.carbs, plan?.target_carbs)
  const fatPercent = clampPercent(form.fat, plan?.target_fat)

  const combinedValues = {
    calories: Number(form.calories || 0) + Number(foodTotals.calories || 0),
    protein: Number(form.protein || 0) + Number(foodTotals.protein || 0),
    carbs: Number(form.carbs || 0) + Number(foodTotals.carbs || 0),
    fat: Number(form.fat || 0) + Number(foodTotals.fat || 0),
  }

  if (loading) {
    return (
      <AppShell title="Nutrition" subtitle="Chargement de ta nutrition...">
        <SurfaceCard padded>
          <div className="ui-muted">Chargement…</div>
        </SurfaceCard>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Nutrition"
      subtitle="Un tableau de bord plus clair pour suivre tes apports et comparer facilement avec le plan."
      actions={<SegmentTabs items={NUTRITION_TABS} value={activeTab} onChange={setActiveTab} />}
    >
      {error ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard padded style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>Erreur</strong>
            <div className="ui-muted" style={{ color: 'var(--danger)' }}>{error}</div>
          </SurfaceCard>
        </div>
      ) : null}

      {success ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard padded style={{ borderColor: 'var(--success)', background: 'var(--success-soft)' }}>
            <strong style={{ display: 'block', marginBottom: 6, color: 'var(--success)' }}>OK</strong>
            <div className="ui-muted" style={{ color: 'var(--success)' }}>{success}</div>
          </SurfaceCard>
        </div>
      ) : null}

      <div className="ui-grid-3">
        <div className="ui-stack">
          <SurfaceCard padded sticky>
            <SectionHead title="Plan coach" caption="Les objectifs à suivre aujourd’hui." />
            {plan ? (
              <div className="ui-stack">
                <div className="ui-list-item">
                  <span>Calories</span>
                  <StatusBadge tone="accent">{plan.target_calories || '—'}</StatusBadge>
                </div>
                <div className="ui-list-item">
                  <span>Protéines</span>
                  <StatusBadge tone="accent">{plan.target_protein || '—'} g</StatusBadge>
                </div>
                <div className="ui-list-item">
                  <span>Glucides</span>
                  <StatusBadge tone="accent">{plan.target_carbs || '—'} g</StatusBadge>
                </div>
                <div className="ui-list-item">
                  <span>Lipides</span>
                  <StatusBadge tone="accent">{plan.target_fat || '—'} g</StatusBadge>
                </div>

                <div className="ui-card ui-card--soft ui-card--padded">
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Notes</div>
                  <div className="ui-muted" style={{ lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                    {plan.notes || 'Aucune note nutritionnelle.'}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyPanel
                title="Aucun plan"
                description="Ton coach n’a pas encore enregistré de plan nutritionnel."
              />
            )}
          </SurfaceCard>
        </div>

        <div className="ui-stack">
          {activeTab === 'today' && (
            <>
              <SurfaceCard padded>
                <SectionHead
                  title="Aujourd’hui"
                  caption="Renseigne tes apports du jour, puis détaille ce que tu as mangé si tu veux."
                  action={
                    <input
                      className="ui-input"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      style={{ maxWidth: 170 }}
                    />
                  }
                />

                <div className="ui-kpi-row" style={{ marginBottom: 18 }}>
                  <div className="ui-kpi">
                    <p className="ui-kpi-label">Calories</p>
                    <p className="ui-kpi-value">{combinedValues.calories || 0}</p>
                    <div className="ui-muted">{clampPercent(combinedValues.calories, plan?.target_calories)}% de l’objectif</div>
                  </div>
                  <div className="ui-kpi">
                    <p className="ui-kpi-label">Protéines</p>
                    <p className="ui-kpi-value">{combinedValues.protein || 0}</p>
                    <div className="ui-muted">{clampPercent(combinedValues.protein, plan?.target_protein)}% de l’objectif</div>
                  </div>
                  <div className="ui-kpi">
                    <p className="ui-kpi-label">Glucides</p>
                    <p className="ui-kpi-value">{combinedValues.carbs || 0}</p>
                    <div className="ui-muted">{clampPercent(combinedValues.carbs, plan?.target_carbs)}% de l’objectif</div>
                  </div>
                </div>

                <div className="ui-stack">
                  <div className="ui-grid-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div>
                      <label className="ui-label">Calories</label>
                      <input className="ui-input" type="number" value={form.calories} onChange={(e) => setForm((prev) => ({ ...prev, calories: e.target.value }))} />
                    </div>
                    <div>
                      <label className="ui-label">Protéines</label>
                      <input className="ui-input" type="number" value={form.protein} onChange={(e) => setForm((prev) => ({ ...prev, protein: e.target.value }))} />
                    </div>
                  </div>

                  <div className="ui-grid-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div>
                      <label className="ui-label">Glucides</label>
                      <input className="ui-input" type="number" value={form.carbs} onChange={(e) => setForm((prev) => ({ ...prev, carbs: e.target.value }))} />
                    </div>
                    <div>
                      <label className="ui-label">Lipides</label>
                      <input className="ui-input" type="number" value={form.fat} onChange={(e) => setForm((prev) => ({ ...prev, fat: e.target.value }))} />
                    </div>
                  </div>

                  <div>
                    <label className="ui-label">Commentaire</label>
                    <textarea
                      className="ui-textarea"
                      value={form.note}
                      onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                      placeholder="Écart, faim, digestion, énergie, contexte social…"
                    />
                  </div>

                  <div className="ui-toolbar">
                    <div className="ui-muted">
                      Utilise cette zone pour garder une trace quotidienne simple. Les aliments détaillés s’ajoutent automatiquement au total.
                    </div>
                    <button type="button" className="ui-button ui-button--primary" onClick={() => saveLog()} disabled={saving}>
                      {saving ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              </SurfaceCard>

              <FoodDetailBlock
                log={selectedLog}
                date={selectedDate}
                onSave={saveLog}
                onItemsChange={setFoodTotals}
              />

              <SurfaceCard padded>
                <SectionHead title="Progression rapide" caption="Comparaison par rapport au plan du jour." />
                <div className="ui-stack">
                  <ProgressBar label="Calories" value={combinedValues.calories} target={plan?.target_calories} percent={clampPercent(combinedValues.calories, plan?.target_calories)} />
                  <ProgressBar label="Protéines" value={combinedValues.protein} target={plan?.target_protein} percent={clampPercent(combinedValues.protein, plan?.target_protein)} />
                  <ProgressBar label="Glucides" value={combinedValues.carbs} target={plan?.target_carbs} percent={clampPercent(combinedValues.carbs, plan?.target_carbs)} />
                  <ProgressBar label="Lipides" value={combinedValues.fat} target={plan?.target_fat} percent={clampPercent(combinedValues.fat, plan?.target_fat)} />
                </div>
              </SurfaceCard>
            </>
          )}

          {activeTab === 'week' && (
            <SurfaceCard padded>
              <SectionHead title="Semaine" caption="Vue condensée des derniers jours enregistrés." />
              {weekLogs.length ? (
                <div className="ui-stack">
                  {weekLogs.map((log) => {
                    const foodCount = (log.nutrition_log_meals || []).length
                    const foodMacros = (log.nutrition_log_meals || []).reduce(
                      (acc, item) => ({
                        calories: acc.calories + (item.calories || 0),
                        protein: acc.protein + (item.protein || 0),
                        carbs: acc.carbs + (item.carbs || 0),
                        fat: acc.fat + (item.fat || 0),
                      }),
                      { calories: 0, protein: 0, carbs: 0, fat: 0 }
                    )

                    return (
                      <div key={log.id || log.date} className="ui-card ui-card--padded">
                        <div className="ui-toolbar" style={{ marginBottom: 8 }}>
                          <div style={{ fontWeight: 800 }}>{formatDate(log.date)}</div>
                          <div className="ui-cluster">
                            {foodCount ? <StatusBadge tone="accent">{foodCount} aliment(s)</StatusBadge> : null}
                            <StatusBadge tone="default">{log.date === todayString() ? 'Aujourd’hui' : 'Journal'}</StatusBadge>
                          </div>
                        </div>

                        <div className="ui-kpi-row">
                          <div className="ui-kpi">
                            <p className="ui-kpi-label">Calories</p>
                            <p className="ui-kpi-value">{(log.calories || 0) + foodMacros.calories}</p>
                          </div>
                          <div className="ui-kpi">
                            <p className="ui-kpi-label">Protéines</p>
                            <p className="ui-kpi-value">{(log.protein || 0) + foodMacros.protein}</p>
                          </div>
                          <div className="ui-kpi">
                            <p className="ui-kpi-label">Glucides</p>
                            <p className="ui-kpi-value">{(log.carbs || 0) + foodMacros.carbs}</p>
                          </div>
                        </div>

                        {foodCount ? (
                          <div className="ui-muted" style={{ marginTop: 10 }}>
                            Détail aliments enregistré pour cette journée.
                          </div>
                        ) : null}

                        {log.note || log.comment ? (
                          <div className="ui-card ui-card--soft ui-card--padded" style={{ marginTop: 10 }}>
                            <div className="ui-muted" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                              {log.note || log.comment}
                            </div>
                          </div>
                        ) : null}

                        <div className="ui-toolbar" style={{ marginTop: 12 }}>
                          <div className="ui-muted">Ouvre cette journée pour modifier les macros ou les aliments.</div>
                          <button
                            type="button"
                            className="ui-button ui-button--secondary"
                            onClick={() => {
                              setSelectedDate(log.date)
                              setActiveTab('today')
                            }}
                          >
                            Ouvrir ce jour
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyPanel
                  title="Aucune journée"
                  description="Commence par enregistrer une journée pour voir ta semaine apparaître."
                />
              )}
            </SurfaceCard>
          )}
        </div>

        <div className="ui-stack">
          <SurfaceCard padded sticky>
            <SectionHead title="Repères" caption="Lecture rapide de ta journée en cours." />
            <div className="ui-stack">
              <div className="ui-list-item">
                <span>Calories</span>
                <StatusBadge tone={kcalPercent >= 100 ? 'success' : 'default'}>{combinedValues.calories || 0}</StatusBadge>
              </div>
              <div className="ui-list-item">
                <span>Protéines</span>
                <StatusBadge tone={proteinPercent >= 100 ? 'success' : 'default'}>{combinedValues.protein || 0} g</StatusBadge>
              </div>
              <div className="ui-list-item">
                <span>Glucides</span>
                <StatusBadge tone={carbsPercent >= 100 ? 'success' : 'default'}>{combinedValues.carbs || 0} g</StatusBadge>
              </div>
              <div className="ui-list-item">
                <span>Lipides</span>
                <StatusBadge tone={fatPercent >= 100 ? 'success' : 'default'}>{combinedValues.fat || 0} g</StatusBadge>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </AppShell>
  )
}

function ProgressBar({ label, value, target, percent }) {
  return (
    <div>
      <div className="ui-toolbar" style={{ marginBottom: 6 }}>
        <div style={{ fontWeight: 700 }}>{label}</div>
        <div className="ui-muted">
          {value || 0} / {target || '—'}
        </div>
      </div>
      <div style={{ height: 10, background: 'var(--surface-muted)', borderRadius: 999, overflow: 'hidden' }}>
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: 'var(--accent)',
            borderRadius: 999,
          }}
        />
      </div>
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

  useEffect(() => {
    setLog(initialLog)
  }, [initialLog?.id])

  const ensureLog = async () => {
    if (log?.id) return log
    const created = await onSave(date, { calories: 0, protein: 0, carbs: 0, fat: 0, note: null })
    if (created) setLog(created)
    return created
  }

  useEffect(() => {
    if (log?.id) {
      supabase
        .from('nutrition_log_meals')
        .select('*')
        .eq('log_id', log.id)
        .order('created_at')
        .then(({ data }) => setItems(data || []))
    } else {
      setItems([])
    }
  }, [log?.id])

  useEffect(() => {
    if (mode !== 'search' || query.length < 2) {
      setResults([])
      return
    }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      const q = query.trim().toLowerCase()
      const { data } = await supabase
        .from('foods')
        .select('*')
        .ilike('name', `%${q}%`)
        .order('name')
        .limit(100)

      const sorted = (data || [])
        .sort((a, b) => {
          const an = a.name.toLowerCase()
          const bn = b.name.toLowerCase()
          const aStarts = an.startsWith(q)
          const bStarts = bn.startsWith(q)
          if (aStarts && !bStarts) return -1
          if (!aStarts && bStarts) return 1
          return an.localeCompare(bn, 'fr')
        })
        .slice(0, 20)

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
    const item = {
      log_id: currentLog.id,
      name: selected.name + (mealName ? ` (${mealName})` : ''),
      quantity: qtyNum,
      unit: 'g',
      calories: Math.round(selected.calories * ratio),
      protein: Math.round(selected.protein * ratio * 10) / 10,
      carbs: Math.round(selected.carbs * ratio * 10) / 10,
      fat: Math.round(selected.fat * ratio * 10) / 10,
      fiber: 0,
    }

    const { data } = await supabase.from('nutrition_log_meals').insert(item).select().single()
    if (data) {
      setItems((prev) => [...prev, data])
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

    const item = {
      log_id: currentLog.id,
      name: manual.name.trim() + (mealName ? ` (${mealName})` : ''),
      quantity: parseFloat(manual.quantity) || 100,
      unit: 'g',
      calories: parseInt(manual.calories) || 0,
      protein: parseFloat(manual.protein) || 0,
      carbs: parseFloat(manual.carbs) || 0,
      fat: parseFloat(manual.fat) || 0,
      fiber: 0,
    }

    const { data } = await supabase.from('nutrition_log_meals').insert(item).select().single()
    if (data) {
      setItems((prev) => [...prev, data])
      setManual({ name: '', quantity: '100', calories: '', protein: '', carbs: '', fat: '' })
      setMealName('')
    }
  }

  const deleteItem = async (id) => {
    await supabase.from('nutrition_log_meals').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const totals = items.reduce(
    (a, i) => ({
      calories: a.calories + (i.calories || 0),
      protein: a.protein + (i.protein || 0),
      carbs: a.carbs + (i.carbs || 0),
      fat: a.fat + (i.fat || 0),
      fiber: a.fiber + (i.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  )

  useEffect(() => {
    if (onItemsChange) {
      onItemsChange({
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
      })
    }
  }, [items])

  return (
    <SurfaceCard padded>
      <SectionHead
        title="Détail des aliments"
        caption="Optionnel : indique ce que tu as mangé. Si l’aliment n’existe pas, ajoute-le manuellement."
        action={
          <div className="ui-cluster">
            <button type="button" className="ui-button ui-button--secondary" onClick={() => { setShowAdd(true); setMode('search') }}>
              Rechercher
            </button>
            <button type="button" className="ui-button ui-button--primary" onClick={() => { setShowAdd(true); setMode('manual') }}>
              Ajouter manuellement
            </button>
          </div>
        }
      >
      </SectionHead>

      {showAdd && mode === 'search' && (
        <div className="ui-card ui-card--soft ui-card--padded" style={{ marginBottom: 12 }}>
          <div className="ui-grid-3" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) 120px minmax(0, 1fr)' }}>
            <div style={{ position: 'relative' }}>
              <label className="ui-label">Recherche</label>
              <input className="ui-input" value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null) }} placeholder="Ex : poulet, riz, avocat…" />
              {searching ? <div className="ui-muted" style={{ marginTop: 6 }}>Recherche…</div> : null}
              {results.length > 0 && !selected ? (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 40, background: 'white', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 12px 28px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto' }}>
                  {results.map((food) => (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => { setSelected(food); setQuery(food.name); setResults([]) }}
                      style={{ width: '100%', textAlign: 'left', border: 'none', background: 'white', padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                    >
                      <div style={{ fontWeight: 700 }}>{food.name}</div>
                      <div className="ui-muted" style={{ fontSize: 12 }}>
                        {food.calories} kcal · P {food.protein} · G {food.carbs} · L {food.fat}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <label className="ui-label">Quantité (g)</label>
              <input className="ui-input" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>

            <div>
              <label className="ui-label">Repas (optionnel)</label>
              <input className="ui-input" value={mealName} onChange={(e) => setMealName(e.target.value)} placeholder="Déjeuner, collation…" />
            </div>
          </div>

          {selected ? (
            <div className="ui-card ui-card--padded" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{selected.name} — {qty || 100} g</div>
              <div className="ui-muted" style={{ fontSize: 13 }}>
                🔥 {Math.round((selected.calories || 0) * (parseFloat(qty || '100') / 100))} kcal ·
                P {Math.round((selected.protein || 0) * (parseFloat(qty || '100') / 100) * 10) / 10} ·
                G {Math.round((selected.carbs || 0) * (parseFloat(qty || '100') / 100) * 10) / 10} ·
                L {Math.round((selected.fat || 0) * (parseFloat(qty || '100') / 100) * 10) / 10}
              </div>
            </div>
          ) : null}

          <div className="ui-cluster" style={{ marginTop: 12 }}>
            <button type="button" className="ui-button ui-button--primary" disabled={!selected} onClick={addItem}>
              Ajouter l’aliment
            </button>
            <button type="button" className="ui-button ui-button--secondary" onClick={() => setShowAdd(false)}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {showAdd && mode === 'manual' && (
        <div className="ui-card ui-card--soft ui-card--padded" style={{ marginBottom: 12 }}>
          <div className="ui-grid-3" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) 120px minmax(0, 1fr)' }}>
            <div>
              <label className="ui-label">Nom de l’aliment</label>
              <input className="ui-input" value={manual.name} onChange={(e) => setManual((p) => ({ ...p, name: e.target.value }))} placeholder="Ex : Wrap maison" />
            </div>
            <div>
              <label className="ui-label">Quantité</label>
              <input className="ui-input" type="number" value={manual.quantity} onChange={(e) => setManual((p) => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="ui-label">Repas (optionnel)</label>
              <input className="ui-input" value={mealName} onChange={(e) => setMealName(e.target.value)} />
            </div>
          </div>

          <div className="ui-grid-4" style={{ marginTop: 12, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            <div>
              <label className="ui-label">Calories</label>
              <input className="ui-input" type="number" value={manual.calories} onChange={(e) => setManual((p) => ({ ...p, calories: e.target.value }))} />
            </div>
            <div>
              <label className="ui-label">Protéines</label>
              <input className="ui-input" type="number" value={manual.protein} onChange={(e) => setManual((p) => ({ ...p, protein: e.target.value }))} />
            </div>
            <div>
              <label className="ui-label">Glucides</label>
              <input className="ui-input" type="number" value={manual.carbs} onChange={(e) => setManual((p) => ({ ...p, carbs: e.target.value }))} />
            </div>
            <div>
              <label className="ui-label">Lipides</label>
              <input className="ui-input" type="number" value={manual.fat} onChange={(e) => setManual((p) => ({ ...p, fat: e.target.value }))} />
            </div>
          </div>

          <div className="ui-cluster" style={{ marginTop: 12 }}>
            <button type="button" className="ui-button ui-button--primary" disabled={!manual.name.trim()} onClick={addManualItem}>
              Ajouter manuellement
            </button>
            <button type="button" className="ui-button ui-button--secondary" onClick={() => setShowAdd(false)}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {items.length ? (
        <>
          <div className="ui-kpi-row" style={{ marginBottom: 12 }}>
            <div className="ui-kpi">
              <p className="ui-kpi-label">Calories aliments</p>
              <p className="ui-kpi-value">{Math.round(totals.calories)}</p>
            </div>
            <div className="ui-kpi">
              <p className="ui-kpi-label">Protéines</p>
              <p className="ui-kpi-value">{Math.round(totals.protein * 10) / 10}</p>
            </div>
            <div className="ui-kpi">
              <p className="ui-kpi-label">Glucides</p>
              <p className="ui-kpi-value">{Math.round(totals.carbs * 10) / 10}</p>
            </div>
          </div>

          <div className="ui-stack">
            {items.map((item) => (
              <div key={item.id} className="ui-list-item">
                <div>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <div className="ui-muted" style={{ fontSize: 12 }}>
                    {item.quantity} g · {item.calories} kcal · P {item.protein} · G {item.carbs} · L {item.fat}
                  </div>
                </div>
                <button type="button" className="ui-button ui-button--secondary" onClick={() => deleteItem(item.id)}>
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyPanel
          title="Aucun aliment enregistré"
          description="Tu peux rester en saisie simple des macros, ou détailler ce que tu as mangé ici."
        />
      )}
    </SurfaceCard>
  )
}
