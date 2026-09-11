// pages/dashboard.js
// "Aujourd'hui" — nouvel accueil client (V2).
// Remplace l'ancien contenu de cette route (déplacé sans changement vers
// pages/mensurations.js, accessible depuis le menu ⋯). Inspiré de l'écran
// "Aujourd'hui" de BoxLog (Track-your-progress) : bandeau semaine + aperçu
// de la séance du jour + aperçu nutrition du jour, sans quitter l'écran.
'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import AppShell from '../components/ui/AppShell'
import WeekStrip, { localDateKey, isoWeekday } from '../components/ui/WeekStrip'
import { normalizeExercises } from '../lib/trainingUtils'

// ── Chargement défensif des dates d'activité (séances loguées) ─────────────
// Même logique de repli que hooks/useTrainingData.js (colonnes historiques
// différentes selon l'ancienneté des lignes) mais on ne garde que les dates,
// pour alimenter les pastilles du bandeau semaine sans dupliquer le hook.
async function loadLoggedDates(userId) {
  try {
    const { data, error } = await supabase
      .from('workout_logs').select('logged_at').eq('client_id', userId).limit(500)
    if (error) throw error
    return new Set((data || []).map((r) => r.logged_at?.slice(0, 10)).filter(Boolean))
  } catch {
    try {
      const { data } = await supabase
        .from('workout_sessions').select('date').eq('client_id', userId).limit(500)
      return new Set((data || []).map((r) => r.date).filter(Boolean))
    } catch {
      return new Set() // pas de pastille plutôt qu'un écran cassé
    }
  }
}

export default function Aujourdhui() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [nutritionPlan, setNutritionPlan] = useState(null)
  const [nutritionLogsByDate, setNutritionLogsByDate] = useState({})
  const [loggedDates, setLoggedDates] = useState(new Set())
  const [selectedKey, setSelectedKey] = useState(() => localDateKey(new Date()))
  const [sessionExpanded, setSessionExpanded] = useState(false)
  const [quickLog, setQuickLog] = useState({ calories: '', protein: '', carbs: '', fat: '' })
  const [quickLogSaving, setQuickLogSaving] = useState(false)
  const [quickLogOpen, setQuickLogOpen] = useState(false)
  const [quickLogMsg, setQuickLogMsg] = useState('')

  useEffect(() => {
    let active = true
    async function boot() {
      try {
        setLoading(true); setError('')
        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        if (!user) { router.replace('/'); return }

        const [
          profileRes,
          workoutsRes,
          planRes,
          logsRes,
          loggedDatesSet,
        ] = await Promise.all([
          supabase.from('profiles').select('full_name, current_cycle_name').eq('id', user.id).single(),
          supabase.from('workouts').select('*, exercises(*)')
            .eq('client_id', user.id).eq('is_archived', false).eq('is_future', false)
            .order('day_of_week', { ascending: true }),
          supabase.from('nutrition_plans').select('*').eq('client_id', user.id)
            .order('created_at', { ascending: false }).limit(1),
          supabase.from('nutrition_logs').select('date, calories, protein, carbs, fat')
            .eq('client_id', user.id).order('date', { ascending: false }).limit(200),
          loadLoggedDates(user.id),
        ])

        if (!active) return
        if (workoutsRes.error) throw workoutsRes.error

        setProfile(profileRes.data || null)
        setWorkouts((workoutsRes.data || []).map((w) => ({ ...w, exercises: normalizeExercises(w.exercises || []) })))
        setNutritionPlan(planRes.data?.[0] || null)

        const byDate = {}
        ;(logsRes.data || []).forEach((log) => { byDate[log.date] = log })
        setNutritionLogsByDate(byDate)
        setLoggedDates(loggedDatesSet)
      } catch (e) {
        if (!active) return
        setError(e.message || "Impossible de charger l'aperçu du jour")
      } finally {
        if (active) setLoading(false)
      }
    }
    boot()
    return () => { active = false }
  }, [router])

  const selectedDate = useMemo(() => new Date(`${selectedKey}T00:00:00`), [selectedKey])
  const selectedIso = isoWeekday(selectedDate)
  const isToday = selectedKey === localDateKey(new Date())

  const workoutOfDay = useMemo(
    () => workouts.find((w) => w.day_of_week === selectedIso) || null,
    [workouts, selectedIso]
  )
  const nutritionLog = nutritionLogsByDate[selectedKey] || null
  const wasLogged = loggedDates.has(selectedKey)

  const dateLabel = selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const dotsForDate = (key, isoDay) => {
    const dots = []
    if (workouts.some((w) => w.day_of_week === isoDay)) dots.push({ color: 'var(--accent)' })
    if (nutritionLogsByDate[key]) dots.push({ color: 'var(--gold)' })
    return dots
  }

  // Repli la séance et réinitialise le mini-formulaire nutrition quand on
  // change de jour dans le bandeau — évite d'afficher/éditer le mauvais jour.
  useEffect(() => {
    setSessionExpanded(false)
    setQuickLogOpen(false)
    setQuickLogMsg('')
    const existing = nutritionLogsByDate[selectedKey]
    setQuickLog({
      calories: existing?.calories || '',
      protein: existing?.protein || '',
      carbs: existing?.carbs || '',
      fat: existing?.fat || '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey])

  async function saveQuickLog() {
    try {
      setQuickLogSaving(true); setQuickLogMsg('')
      const { data: authData } = await supabase.auth.getUser()
      const uid = authData?.user?.id
      if (!uid) return
      const payload = {
        client_id: uid,
        date: selectedKey,
        calories: Number(quickLog.calories || 0),
        protein: Number(quickLog.protein || 0),
        carbs: Number(quickLog.carbs || 0),
        fat: Number(quickLog.fat || 0),
      }
      // Même pattern d'upsert que pages/nutrition.js (onConflict client_id,date)
      // pour rester compatible avec les lignes déjà créées depuis cette page-là.
      const { data, error: upsertErr } = await supabase
        .from('nutrition_logs')
        .upsert(payload, { onConflict: 'client_id,date' })
        .select('date, calories, protein, carbs, fat')
        .single()
      if (upsertErr) throw upsertErr
      setNutritionLogsByDate((prev) => ({ ...prev, [selectedKey]: data }))
      setQuickLogMsg('Enregistré ✓')
      setQuickLogOpen(false)
    } catch (e) {
      setQuickLogMsg(e.message || "Impossible d'enregistrer")
    } finally {
      setQuickLogSaving(false)
    }
  }

  if (loading) {
    return (
      <AppShell title="Aujourd'hui">
        <div style={{ color: 'var(--text-soft)', fontSize: 13, padding: '20px 4px' }}>Chargement…</div>
      </AppShell>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] || ''

  return (
    <AppShell
      title={`Salut ${firstName || ''} 👋`}
      subtitle={dateLabel}
      cycleName={profile?.current_cycle_name}
      coachName="Ben"
      coachAvailable
    >
      {error && (
        <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 12, fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>
          {error}
        </div>
      )}

      <WeekStrip selectedKey={selectedKey} onSelect={setSelectedKey} dotsForDate={dotsForDate} />

      {/* ── Séance du jour ── */}
      <div style={cardStyle}>
        <div style={cardHeadStyle}>
          <span style={eyebrowStyle}>{isToday ? 'Séance du jour' : `Séance du ${selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}</span>
          {workoutOfDay && (
            <span style={{ ...statusStyle, ...(wasLogged ? statusDone : statusTodo) }}>
              {wasLogged ? 'Fait' : 'À faire'}
            </span>
          )}
        </div>

        {!workoutOfDay ? (
          <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: 0 }}>
            🌙 Jour de repos — rien de programmé.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setSessionExpanded((v) => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                background: 'none', border: 'none', padding: 0, marginBottom: sessionExpanded ? 12 : 0,
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>
                  {workoutOfDay.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                  {workoutOfDay.type ? `${workoutOfDay.type} · ` : ''}
                  {(workoutOfDay.exercises || []).length} exercice{(workoutOfDay.exercises || []).length > 1 ? 's' : ''}
                  {workoutOfDay.duration_min ? ` · ~${workoutOfDay.duration_min} min` : ''}
                </div>
              </div>
              <span style={{
                flexShrink: 0, width: 26, height: 26, borderRadius: 8, background: 'var(--surface-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)', fontSize: 12,
                transform: sessionExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s',
              }}>
                ▾
              </span>
            </button>

            {sessionExpanded && (
              <>
                {(workoutOfDay.exercises || []).slice(0, 4).map((ex, i) => (
                  <div key={ex.id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px',
                    borderTop: i === 0 ? '1px solid var(--border-soft)' : '1px solid var(--border-soft)',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 7, background: 'var(--surface-strong)', color: 'var(--navy)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 800, flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy)' }}>{ex.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                        {ex.sets ? `${ex.sets} × ${ex.reps || '—'}` : ex.reps}
                        {ex.target_weight ? ` · ${ex.target_weight}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
                {(workoutOfDay.exercises || []).length > 4 && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-faint)', padding: '6px 2px 0' }}>
                    + {(workoutOfDay.exercises || []).length - 4} autre{(workoutOfDay.exercises || []).length - 4 > 1 ? 's' : ''}…
                  </div>
                )}
              </>
            )}

            <Link href="/training" style={{ textDecoration: 'none' }}>
              <button type="button" style={{ ...btnNavy, marginTop: sessionExpanded ? 6 : 12 }}>Ouvrir la séance complète</button>
            </Link>
          </>
        )}
      </div>

      {/* ── Nutrition du jour ── */}
      <div style={cardStyle}>
        <div style={cardHeadStyle}>
          <span style={eyebrowStyle}>Nutrition du jour</span>
          {nutritionPlan?.target_calories && (
            <span style={{ ...statusStyle, ...(nutritionLog ? statusDone : statusTodo) }}>
              {nutritionLog?.calories || 0} / {nutritionPlan.target_calories} kcal
            </span>
          )}
        </div>

        {!nutritionPlan ? (
          <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: 0 }}>
            Pas encore de plan nutrition défini par ton coach.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <Macro label="Protéines" value={nutritionLog?.protein} target={nutritionPlan.target_protein} color="var(--accent)" unit="g" />
              <Macro label="Glucides" value={nutritionLog?.carbs} target={nutritionPlan.target_carbs} color="var(--gold-deep)" unit="g" />
              <Macro label="Lipides" value={nutritionLog?.fat} target={nutritionPlan.target_fat} color="var(--success)" unit="g" />
            </div>

            {!quickLogOpen ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" style={{ ...btnGhost, flex: 1, marginTop: 0 }} onClick={() => setQuickLogOpen(true)}>
                  ⚡ Logger rapidement
                </button>
                <Link href="/nutrition" style={{ textDecoration: 'none', flex: 1 }}>
                  <button type="button" style={{ ...btnGhost, marginTop: 0 }}>Voir le plan complet</button>
                </Link>
              </div>
            ) : (
              <div style={{ background: 'var(--surface-muted)', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <QuickInput label="Kcal" value={quickLog.calories} onChange={(v) => setQuickLog((p) => ({ ...p, calories: v }))} />
                  <QuickInput label="Prot." value={quickLog.protein} onChange={(v) => setQuickLog((p) => ({ ...p, protein: v }))} />
                  <QuickInput label="Gluc." value={quickLog.carbs} onChange={(v) => setQuickLog((p) => ({ ...p, carbs: v }))} />
                  <QuickInput label="Lip." value={quickLog.fat} onChange={(v) => setQuickLog((p) => ({ ...p, fat: v }))} />
                </div>
                {quickLogMsg && (
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: quickLogMsg.includes('✓') ? 'var(--success)' : 'var(--danger)', marginBottom: 6 }}>
                    {quickLogMsg}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" style={{ ...btnNavy, marginTop: 0 }} disabled={quickLogSaving} onClick={saveQuickLog}>
                    {quickLogSaving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                  <button type="button" style={{ ...btnGhost, marginTop: 0, flex: '0 0 auto', padding: '11px 14px' }} onClick={() => setQuickLogOpen(false)}>
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}

function QuickInput({ label, value, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <input
        type="number" inputMode="numeric" min="0" value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        style={{
          width: '100%', padding: '8px 6px', textAlign: 'center', borderRadius: 8,
          border: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--navy)',
          fontFamily: 'inherit', background: 'var(--surface)',
        }}
      />
      <div style={{ fontSize: 9.5, color: 'var(--text-faint)', fontWeight: 700, textAlign: 'center', marginTop: 3, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

function Macro({ label, value, target, color, unit }) {
  const v = Number(value || 0)
  const t = Number(target || 0)
  const pct = t > 0 ? Math.min(100, Math.round((v / t) * 100)) : 0
  return (
    <div style={{ flex: 1, background: 'var(--surface-muted)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>{v}{unit}</div>
      <div style={{ fontSize: 9.5, color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase', marginTop: 1 }}>{label}</div>
      <div style={{ height: 5, borderRadius: 100, background: 'var(--surface-strong)', overflow: 'hidden', marginTop: 6 }}>
        <span style={{ display: 'block', height: '100%', borderRadius: 100, width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

const cardStyle = {
  background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 16,
  boxShadow: 'var(--shadow-sm)', marginBottom: 12, border: '1px solid var(--border-soft)',
}
const cardHeadStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }
const eyebrowStyle = { fontSize: 10.5, fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '.6px' }
const statusStyle = { fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 100 }
const statusDone = { background: 'var(--success-bg)', color: 'var(--success)' }
const statusTodo = { background: 'var(--gold-dim)', color: 'var(--gold-deep)' }
const btnNavy = {
  width: '100%', padding: 11, borderRadius: 12, border: 'none', background: 'var(--navy)', color: '#fff',
  fontSize: 12.5, fontWeight: 700, cursor: 'pointer', marginTop: 6, fontFamily: 'inherit',
}
const btnGhost = {
  width: '100%', padding: 11, borderRadius: 12, border: 'none', background: 'var(--surface-strong)', color: 'var(--navy)',
  fontSize: 12.5, fontWeight: 700, cursor: 'pointer', marginTop: 6, fontFamily: 'inherit',
}
