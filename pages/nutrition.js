import { useEffect, useMemo, useState } from 'react'
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
              .select('*')
              .eq('client_id', currentUser.id)
              .order('date', { ascending: false })
              .limit(30),
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

  async function saveLog() {
    if (!user) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const payload = {
        client_id: user.id,
        date: selectedDate,
        calories: Number(form.calories || 0),
        protein: Number(form.protein || 0),
        carbs: Number(form.carbs || 0),
        fat: Number(form.fat || 0),
        note: form.note || null,
      }

      const { data, error: upsertError } = await supabase
        .from('nutrition_logs')
        .upsert(payload, { onConflict: 'client_id,date' })
        .select()
        .single()

      if (upsertError) throw upsertError

      setLogs((prev) => {
        const exists = prev.find((log) => log.date === selectedDate)
        if (exists) {
          return prev.map((log) => (log.date === selectedDate ? data : log))
        }
        return [data, ...prev]
      })

      setSuccess('Nutrition enregistrée.')
    } catch (e) {
      setError(e.message || 'Impossible d’enregistrer la nutrition')
    } finally {
      setSaving(false)
    }
  }

  const kcalPercent = clampPercent(form.calories, plan?.target_calories)
  const proteinPercent = clampPercent(form.protein, plan?.target_protein)
  const carbsPercent = clampPercent(form.carbs, plan?.target_carbs)
  const fatPercent = clampPercent(form.fat, plan?.target_fat)

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
                  caption="Renseigne tes apports du jour et compare-les aux objectifs."
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
                    <p className="ui-kpi-value">{form.calories || 0}</p>
                    <div className="ui-muted">{kcalPercent}% de l’objectif</div>
                  </div>
                  <div className="ui-kpi">
                    <p className="ui-kpi-label">Protéines</p>
                    <p className="ui-kpi-value">{form.protein || 0}</p>
                    <div className="ui-muted">{proteinPercent}% de l’objectif</div>
                  </div>
                  <div className="ui-kpi">
                    <p className="ui-kpi-label">Glucides</p>
                    <p className="ui-kpi-value">{form.carbs || 0}</p>
                    <div className="ui-muted">{carbsPercent}% de l’objectif</div>
                  </div>
                </div>

                <div className="ui-stack">
                  <div className="ui-grid-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div>
                      <label className="ui-label">Calories</label>
                      <input
                        className="ui-input"
                        type="number"
                        value={form.calories}
                        onChange={(e) => setForm((prev) => ({ ...prev, calories: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="ui-label">Protéines</label>
                      <input
                        className="ui-input"
                        type="number"
                        value={form.protein}
                        onChange={(e) => setForm((prev) => ({ ...prev, protein: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="ui-grid-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div>
                      <label className="ui-label">Glucides</label>
                      <input
                        className="ui-input"
                        type="number"
                        value={form.carbs}
                        onChange={(e) => setForm((prev) => ({ ...prev, carbs: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="ui-label">Lipides</label>
                      <input
                        className="ui-input"
                        type="number"
                        value={form.fat}
                        onChange={(e) => setForm((prev) => ({ ...prev, fat: e.target.value }))}
                      />
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
                      Utilise cette zone pour garder une trace quotidienne simple et exploitable.
                    </div>
                    <button
                      type="button"
                      className="ui-button ui-button--primary"
                      onClick={saveLog}
                      disabled={saving}
                    >
                      {saving ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              </SurfaceCard>
            </>
          )}

          {activeTab === 'week' && (
            <SurfaceCard padded>
              <SectionHead title="Semaine" caption="Vue condensée des derniers jours enregistrés." />
              {weekLogs.length ? (
                <div className="ui-stack">
                  {weekLogs.map((log) => (
                    <div key={log.id || log.date} className="ui-card ui-card--padded">
                      <div className="ui-toolbar" style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 800 }}>{formatDate(log.date)}</div>
                        <StatusBadge tone="default">{log.date === todayString() ? 'Aujourd’hui' : 'Journal'}</StatusBadge>
                      </div>
                      <div className="ui-kpi-row">
                        <div className="ui-kpi">
                          <p className="ui-kpi-label">Calories</p>
                          <p className="ui-kpi-value">{log.calories || 0}</p>
                        </div>
                        <div className="ui-kpi">
                          <p className="ui-kpi-label">Protéines</p>
                          <p className="ui-kpi-value">{log.protein || 0}</p>
                        </div>
                        <div className="ui-kpi">
                          <p className="ui-kpi-label">Glucides</p>
                          <p className="ui-kpi-value">{log.carbs || 0}</p>
                        </div>
                      </div>
                      {log.note || log.comment ? (
                        <div className="ui-card ui-card--soft ui-card--padded" style={{ marginTop: 12 }}>
                          <div className="ui-muted" style={{ lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                            {log.note || log.comment}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyPanel
                  title="Aucune donnée semaine"
                  description="Enregistre tes apports du jour pour commencer à remplir l’historique."
                />
              )}
            </SurfaceCard>
          )}
        </div>

        <div className="ui-stack">
          <SurfaceCard padded sticky>
            <SectionHead title="Contexte rapide" caption="Ta lecture instantanée." />
            <div className="ui-stack">
              <div className="ui-card ui-card--soft ui-card--padded">
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Date active</div>
                <div className="ui-muted">{formatDate(selectedDate)}</div>
              </div>

              <div className="ui-card ui-card--padded">
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Comparaison objectif</div>
                <div className="ui-stack" style={{ gap: 10 }}>
                  <div className="ui-list-item" style={{ padding: '10px 12px' }}>
                    <span>Calories</span>
                    <StatusBadge tone={kcalPercent >= 90 ? 'success' : kcalPercent >= 60 ? 'warning' : 'danger'}>
                      {kcalPercent}%
                    </StatusBadge>
                  </div>
                  <div className="ui-list-item" style={{ padding: '10px 12px' }}>
                    <span>Protéines</span>
                    <StatusBadge tone={proteinPercent >= 90 ? 'success' : proteinPercent >= 60 ? 'warning' : 'danger'}>
                      {proteinPercent}%
                    </StatusBadge>
                  </div>
                  <div className="ui-list-item" style={{ padding: '10px 12px' }}>
                    <span>Glucides</span>
                    <StatusBadge tone={carbsPercent >= 90 ? 'success' : carbsPercent >= 60 ? 'warning' : 'danger'}>
                      {carbsPercent}%
                    </StatusBadge>
                  </div>
                  <div className="ui-list-item" style={{ padding: '10px 12px' }}>
                    <span>Lipides</span>
                    <StatusBadge tone={fatPercent >= 90 ? 'success' : fatPercent >= 60 ? 'warning' : 'danger'}>
                      {fatPercent}%
                    </StatusBadge>
                  </div>
                </div>
              </div>

              <div className="ui-card ui-card--padded">
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Conseil</div>
                <div className="ui-muted" style={{ lineHeight: 1.65 }}>
                  Renseigne les chiffres simplement et ajoute un commentaire utile quand la journée est atypique :
                  restaurant, faim inhabituelle, baisse d’énergie, difficulté digestive, craquage, déplacement.
                </div>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </AppShell>
  )
}
