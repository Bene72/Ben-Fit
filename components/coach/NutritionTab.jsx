/**
 * components/coach/NutritionTab.jsx  —  Vue COACH
 * 1108 lignes → ~320 lignes
 *
 * Logique propre à la vue coach :
 *   - Édition du plan nutritionnel (diète cyclique, note coach)
 *   - NutritionRing (SVG), NutritionScoreBlock, NutritionWeekGraph
 *   - NutritionMacroBlock (saisie rapide des macros d'un jour côté coach)
 *
 * Composants partagés avec nutrition.js (client) :
 *   - FoodBlock  → components/nutrition/FoodBlock.jsx
 *   - WeekTable  → components/nutrition/WeekTable.jsx
 *   - nutritionUtils → lib/nutritionUtils.js
 */

import { useEffect, useState } from 'react'
import { supabase }      from '../../lib/supabase'
import { ci, inp, lbl, btn } from '../../lib/coachShared'
import { todayString, clampPercent, MACROS } from '../../lib/nutritionUtils'
import FoodBlock  from '../nutrition/FoodBlock'
import WeekTable  from '../nutrition/WeekTable'

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

// ─── Composant principal ──────────────────────────────────────────────────────

function NutritionTab({ clientId, clientName }) {
  const [plan,     setPlan]     = useState(null)
  const [logs,     setLogs]     = useState([])
  const [editPlan, setEditPlan] = useState(false)
  const [planForm, setPlanForm] = useState({
    target_calories: '', target_protein: '', target_carbs: '', target_fat: '',
    coach_note: '', cyclic_diet: false,
    high_calories: '', high_protein: '', high_carbs: '', high_fat: '',
    low_calories: '',  low_protein: '',  low_carbs: '',  low_fat: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [view,    setView]    = useState('week')
  const today = todayString()

  // ── Chargement ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [{ data: np }, { data: lg }] = await Promise.all([
          supabase.from('nutrition_plans').select('*').eq('client_id', clientId).eq('active', true).maybeSingle(),
          supabase.from('nutrition_logs').select('*, nutrition_log_meals(*)').eq('client_id', clientId).order('date', { ascending: false }).limit(84),
        ])
        setPlan(np)
        if (np) {
          setPlanForm({
            target_calories: np.target_calories || '', target_protein: np.target_protein || '',
            target_carbs:    np.target_carbs    || '', target_fat:     np.target_fat     || '',
            coach_note: np.coach_note || '', cyclic_diet: np.cyclic_diet || false,
            high_calories: np.high_calories || '', high_protein: np.high_protein || '', high_carbs: np.high_carbs || '', high_fat: np.high_fat || '',
            low_calories:  np.low_calories  || '', low_protein:  np.low_protein  || '', low_carbs:  np.low_carbs  || '', low_fat:  np.low_fat  || '',
          })
        }
        setLogs(lg || [])
      } catch (e) {
        console.error('Erreur chargement nutrition:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
    setEditPlan(false)
  }, [clientId])

  // ── Sauvegarde plan ──────────────────────────────────────────────────────────
  const savePlan = async () => {
    setSaving(true)
    try {
      const planData = {
        client_id: clientId, active: true,
        target_calories: +planForm.target_calories || 0, target_protein: +planForm.target_protein || 0,
        target_carbs:    +planForm.target_carbs    || 0, target_fat:     +planForm.target_fat     || 0,
        coach_note: planForm.coach_note || '', cyclic_diet: planForm.cyclic_diet || false,
        high_calories: +planForm.high_calories || 0, high_protein: +planForm.high_protein || 0, high_carbs: +planForm.high_carbs || 0, high_fat: +planForm.high_fat || 0,
        low_calories:  +planForm.low_calories  || 0, low_protein:  +planForm.low_protein  || 0, low_carbs:  +planForm.low_carbs  || 0, low_fat:  +planForm.low_fat  || 0,
      }
      const query = plan
        ? supabase.from('nutrition_plans').update(planData).eq('id', plan.id)
        : supabase.from('nutrition_plans').insert(planData)
      const { data } = await query.select().single()
      setPlan(data)
    } catch (e) {
      console.error('Erreur sauvegarde plan:', e)
    } finally {
      setSaving(false); setEditPlan(false)
    }
  }

  // ── Upsert log (passé en prop aux sous-composants) ───────────────────────────
  const upsertLog = async (date, fields) => {
    try {
      const existing = logs.find((l) => l.date === date)
      if (existing) {
        const { data } = await supabase.from('nutrition_logs').update(fields).eq('id', existing.id).select('*, nutrition_log_meals(*)').single()
        if (data) setLogs((prev) => prev.map((l) => (l.id === existing.id ? data : l)))
        return data
      } else {
        const { data } = await supabase.from('nutrition_logs').insert({ client_id: clientId, date, ...fields }).select('*, nutrition_log_meals(*)').single()
        if (data) setLogs((prev) => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
        return data
      }
    } catch (e) {
      console.error('Erreur upsert log:', e)
      return null
    }
  }

  if (loading) return <div style={{ color: '#999', textAlign: 'center', padding: 40 }}>Chargement…</div>

  return (
    <div>
      {/* ── Bloc plan nutritionnel ── */}
      <PlanBlock
        plan={plan} editPlan={editPlan} setEditPlan={setEditPlan}
        planForm={planForm} setPlanForm={setPlanForm}
        savePlan={savePlan} saving={saving}
      />

      {/* ── Suivi client ── */}
      <div style={{ borderTop: '2px solid #EAEAEA', paddingTop: 24 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0D1B4E', marginRight: 8 }}>📊 Suivi client</div>
          {[['today', "Aujourd'hui"], ['week', 'Par semaine']].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)} style={{ padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: "'DM Sans',sans-serif", background: view === id ? '#0D1B4E' : 'white', color: view === id ? 'white' : '#666', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              {label}
            </button>
          ))}
        </div>

        {view === 'today' && (
          <NutritionTodayView today={today} logs={logs} plan={plan} onSave={upsertLog} />
        )}
        {view === 'week' && (
          /* Vue semaine partagée — mode coach avec détail inline */
          <WeekTable
            logs={logs} plan={plan} today={today} mode="coach"
            renderDayDetail={(date, log) => (
              <>
                <NutritionMacroBlock log={log} plan={plan} date={date} onSave={upsertLog} />
                <FoodBlock log={log} mode="coach" />
              </>
            )}
          />
        )}
      </div>
    </div>
  )
}

// ─── Bloc plan (coach uniquement) ────────────────────────────────────────────

function PlanBlock({ plan, editPlan, setEditPlan, planForm, setPlanForm, savePlan, saving }) {
  return (
    <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: '#0D1B4E', letterSpacing: 2 }}>
          {plan ? 'PLAN NUTRITIONNEL ACTUEL' : 'CRÉER UN PLAN NUTRITIONNEL'}
        </div>
        <button onClick={() => setEditPlan(!editPlan)} style={btn(editPlan ? '#0D1B4E' : '#0D1B4E', 'white')}>
          {editPlan ? '✕ Annuler' : plan ? '✏️ Modifier' : '+ Créer le plan'}
        </button>
      </div>

      {editPlan ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 12 }}>
            {[['target_calories','🔥 Calories','2200'],['target_protein','🥩 Protéines (g)','160'],['target_carbs','🌾 Glucides (g)','220'],['target_fat','🥑 Lipides (g)','70']].map(([key, label, ph]) => (
              <div key={key}>
                <label style={lbl}>{label}</label>
                <input type="number" value={planForm[key]} onChange={(e) => setPlanForm((p) => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={inp} />
              </div>
            ))}
          </div>

          {/* Toggle diète cyclique */}
          <div style={{ marginBottom: 12, padding: '14px 16px', background: planForm.cyclic_diet ? '#EEF4FF' : '#F5F5F5', borderRadius: 10, border: `1px solid ${planForm.cyclic_diet ? '#B8CBF5' : '#E0E0E0'}`, transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0D1B4E' }}>🔄 Diète cyclique</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Définir des jours hauts et bas en glucides / calories</div>
              </div>
              <button type="button" onClick={() => setPlanForm((p) => ({ ...p, cyclic_diet: !p.cyclic_diet }))}
                style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: planForm.cyclic_diet ? '#0D1B4E' : '#CCC', transition: 'background 0.2s', flexShrink: 0, padding: 0 }}>
                <span style={{ position: 'absolute', top: 3, left: planForm.cyclic_diet ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', display: 'block' }} />
              </button>
            </div>
            {planForm.cyclic_diet && (
              <div style={{ marginTop: 14 }}>
                {[
                  { label: '📈 Jour Haut', color: '#3A7BD5', keys: [['high_calories','🔥 Calories','2600'],['high_protein','🥩 Protéines','180'],['high_carbs','🌾 Glucides','300'],['high_fat','🥑 Lipides','70']] },
                  { label: '📉 Jour Bas',  color: '#C45C3A', keys: [['low_calories','🔥 Calories','1800'],['low_protein','🥩 Protéines','160'],['low_carbs','🌾 Glucides','120'],['low_fat','🥑 Lipides','65']] },
                ].map(({ label, color, keys }) => (
                  <div key={label} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                      {keys.map(([key, l, ph]) => (
                        <div key={key}>
                          <label style={lbl}>{l}</label>
                          <input type="number" value={planForm[key]} onChange={(e) => setPlanForm((p) => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={{ ...inp, borderColor: `${color}66` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Note coach</label>
            <textarea value={planForm.coach_note || ''} onChange={(e) => setPlanForm((p) => ({ ...p, coach_note: e.target.value }))} rows={3} style={{ ...inp, resize: 'vertical' }} />
          </div>
          <button onClick={savePlan} disabled={saving} style={btn('#0D1B4E', 'white')}>
            {saving ? 'Sauvegarde…' : '✓ Enregistrer le plan'}
          </button>
        </div>
      ) : plan ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: plan.cyclic_diet ? 14 : 0 }}>
            {[['🔥', plan.target_calories, 'kcal / jour'],['🥩', plan.target_protein, 'g protéines'],['🌾', plan.target_carbs, 'g glucides'],['🥑', plan.target_fat, 'g lipides']].map(([icon, val, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: '#0D1B4E' }}>{val || '—'}</div>
                <div style={{ fontSize: 12, color: '#6B7A99' }}>{label}</div>
              </div>
            ))}
          </div>
          {plan.cyclic_diet && (
            <div style={{ marginTop: 14, padding: '12px 16px', background: '#F5F8FF', borderRadius: 10, border: '1px solid #D0DCFF' }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#0D1B4E', marginBottom: 10, letterSpacing: 1 }}>🔄 DIÈTE CYCLIQUE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: '📈 Jour Haut', color: '#3A7BD5', bg: '#EEF4FF', border: '#B8CBF5', vals: [['🔥', plan.high_calories, 'kcal'],['🥩', plan.high_protein,'g P'],['🌾', plan.high_carbs,'g G'],['🥑', plan.high_fat,'g L']] },
                  { label: '📉 Jour Bas',  color: '#C45C3A', bg: '#FFF4F0', border: '#F5C9BB', vals: [['🔥', plan.low_calories,  'kcal'],['🥩', plan.low_protein, 'g P'],['🌾', plan.low_carbs, 'g G'],['🥑', plan.low_fat, 'g L']] },
                ].map(({ label, color, bg, border, vals }) => (
                  <div key={label} style={{ background: bg, borderRadius: 8, padding: '10px 14px', border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {vals.map(([icon, val, unit]) => (
                        <div key={unit} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 13 }}>{icon}</div>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color }}>{val || '—'}</div>
                          <div style={{ fontSize: 9, color: '#6B7A99' }}>{unit}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ color: '#6B7A99', fontSize: 14, textAlign: 'center', padding: 10 }}>Aucun plan nutritionnel. Clique sur "+ Créer le plan" pour commencer.</div>
      )}
    </div>
  )
}

// ─── Composants propres au coach ──────────────────────────────────────────────

function NutritionRing({ value, target, label, unit, color }) {
  const percent = target ? Math.min(100, (value / target) * 100) : 0
  const over    = percent >= 100
  const R = 42, stroke = 7, nr = R - stroke * 2
  const circ   = nr * 2 * Math.PI
  const offset = circ - (percent / 100) * circ
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <svg height={R * 2} width={R * 2} style={{ transform: 'rotate(-90deg)' }}>
          <circle stroke="#EEE" fill="transparent" strokeWidth={stroke} r={nr} cx={R} cy={R} />
          <circle stroke={over ? '#C45C3A' : color} fill="transparent" strokeWidth={stroke} strokeDasharray={`${circ} ${circ}`} style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.5s', strokeLinecap: 'round' }} r={nr} cx={R} cy={R} />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', lineHeight: 1.2 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: over ? '#C45C3A' : '#0D1B4E' }}>{value}</div>
          <div style={{ fontSize: 9, color: '#AAA' }}>/{target}</div>
        </div>
      </div>
      <div style={{ marginTop: 6, fontWeight: 600, fontSize: 12, color: '#444' }}>{label}</div>
      <div style={{ fontSize: 10, color: '#AAA' }}>{unit}</div>
    </div>
  )
}

function NutritionMacroBlock({ log, plan, date, onSave }) {
  const [editing, setEditing] = useState(false)
  const [form,    setForm]    = useState({ calories: log?.calories || '', protein: log?.protein || '', carbs: log?.carbs || '', fat: log?.fat || '' })
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (log) setForm({ calories: log.calories || '', protein: log.protein || '', carbs: log.carbs || '', fat: log.fat || '' })
  }, [log?.id, log?.calories])

  const save = async () => {
    setSaving(true)
    await onSave(date, { calories: +form.calories || 0, protein: +form.protein || 0, carbs: +form.carbs || 0, fat: +form.fat || 0 })
    setSaving(false); setEditing(false)
  }

  const macros = MACROS.map((m) => ({ ...m, target: plan?.[m.target] || 0 }))

  return (
    <div style={{ background: 'white', borderRadius: 14, padding: 20, border: '1px solid #EAEAEA', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#0D1B4E' }}>📊 Apports du jour</span>
        <button onClick={() => setEditing(!editing)} style={{ padding: '4px 12px', background: editing ? '#EEF0F5' : '#0D1B4E', color: editing ? '#666' : 'white', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {editing ? 'Annuler' : log?.calories > 0 ? '✏️ Modifier' : '+ Saisir'}
        </button>
      </div>
      {editing ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14 }}>
            {macros.map((m) => (
              <div key={m.key}>
                <label style={{ display: 'block', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#999', marginBottom: 4, fontWeight: 600 }}>{m.label}</label>
                <input type="number" value={form[m.key]} onChange={(e) => setForm((p) => ({ ...p, [m.key]: e.target.value }))} placeholder={m.target || '0'}
                  style={{ width: '100%', padding: 8, border: `2px solid ${m.color}33`, borderRadius: 7, fontSize: 13, outline: 'none' }} />
              </div>
            ))}
          </div>
          <button onClick={save} disabled={saving} style={{ padding: '7px 18px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? '…' : '✓ Enregistrer'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, justifyItems: 'center' }}>
          {macros.map((m) => <NutritionRing key={m.key} value={log?.[m.key] || 0} target={m.target} label={m.label} unit={m.unit} color={m.color} />)}
        </div>
      )}
    </div>
  )
}

function NutritionScoreBlock({ log, plan }) {
  if (!plan) return <InfoBox bg="#FFF8E1" border="#FFD54F" color="#7B6000">⚠️ Aucun plan nutritionnel défini pour ce client</InfoBox>
  if (!log || log.calories === 0) return <InfoBox bg="#F7F7F7" border="#EAEAEA" color="#999">📝 Aucune donnée pour aujourd'hui</InfoBox>

  const targets = [plan.target_calories || 0, plan.target_protein || 0, plan.target_carbs || 0, plan.target_fat || 0]
  const keys    = ['calories', 'protein', 'carbs', 'fat']
  const score   = Math.min(100, Math.round(keys.reduce((acc, k, i) => acc + (targets[i] ? Math.min(1, (log[k] || 0) / targets[i]) : 0), 0) / 4 * 100))
  const color   = score >= 80 ? '#3A7BD5' : score >= 50 ? '#2A50B0' : '#C45C3A'

  const feedback = []
  if ((log.protein  || 0) < (plan.target_protein  || 0))       feedback.push('💪 Augmente les protéines')
  if ((log.calories || 0) < (plan.target_calories || 0) * 0.8) feedback.push('⚡ Trop bas en calories')
  if ((log.carbs    || 0) < (plan.target_carbs    || 0) * 0.8) feedback.push('🌾 Manque de glucides')
  if ((log.fat      || 0) < (plan.target_fat      || 0) * 0.7) feedback.push('🥑 Lipides bas')
  if (feedback.length === 0) feedback.push('✅ Objectifs atteints !')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 16 }}>
      <div style={{ padding: '14px 18px', borderRadius: 12, background: '#F7F7F7', border: '1px solid #EAEAEA', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color }}>{score}<span style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>/100</span></div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#333' }}>Score nutrition</div>
          <div style={{ fontSize: 11, color: '#999' }}>{score >= 80 ? '🟢 Excellente journée' : score >= 50 ? '🟡 Peut mieux faire' : '🔴 Objectifs non atteints'}</div>
        </div>
      </div>
      <div style={{ padding: '14px 18px', borderRadius: 12, background: '#EEF4FF', border: '1px solid #B8CBF5' }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: '#1A3580', marginBottom: 6 }}>Feedback</div>
        {feedback.map((f, i) => <div key={i} style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>{f}</div>)}
      </div>
    </div>
  )
}

function NutritionWeekGraph({ logs, plan, today }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d  = new Date(today); d.setDate(d.getDate() - 6 + i)
    const ds = d.toISOString().split('T')[0]
    const log = logs.find((l) => l.date === ds)
    return { date: ds, calories: log?.calories || 0, label: d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2) }
  })
  const max = Math.max(...days.map((d) => d.calories), plan?.target_calories || 1)
  return (
    <div style={{ padding: '14px 18px', borderRadius: 12, background: 'white', border: '1px solid #EAEAEA', marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#333', marginBottom: 14 }}>📈 Calories — 7 derniers jours</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70 }}>
        {days.map((d, i) => {
          const h       = max ? Math.max((d.calories / max) * 100, 2) : 2
          const isToday = d.date === today
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
              {d.calories > 0 && <div style={{ fontSize: 8, color: '#999' }}>{d.calories}</div>}
              <div style={{ width: '100%', height: `${h}%`, background: isToday ? '#0D1B4E' : '#C5CEEA', borderRadius: '3px 3px 0 0' }} />
              <div style={{ fontSize: 9, color: isToday ? '#0D1B4E' : '#999', fontWeight: isToday ? 700 : 400 }}>{d.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NutritionTodayView({ today, logs, plan, onSave }) {
  const log = logs.find((l) => l.date === today)
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#0D1B4E', marginBottom: 14 }}>
        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
      <NutritionMacroBlock log={log} plan={plan} date={today} onSave={onSave} />
      <NutritionScoreBlock log={log} plan={plan} />
      <NutritionWeekGraph  logs={logs} plan={plan} today={today} />
      {/* FoodBlock coach : pas de onEnsureLog car le log doit être créé via NutritionMacroBlock d'abord */}
      <FoodBlock log={log} mode="coach" />
    </div>
  )
}

function InfoBox({ bg, border, color, children }) {
  return (
    <div style={{ padding: '14px 18px', borderRadius: 12, background: bg, border: `1px solid ${border}`, marginBottom: 16, textAlign: 'center' }}>
      <span style={{ fontSize: 13, color }}>{children}</span>
    </div>
  )
}

export default NutritionTab
