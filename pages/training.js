import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import AppShell from '../components/ui/AppShell'
import SurfaceCard from '../components/ui/SurfaceCard'
import SectionHead from '../components/ui/SectionHead'
import StatusBadge from '../components/ui/StatusBadge'
import SegmentTabs from '../components/ui/SegmentTabs'
import EmptyPanel from '../components/ui/EmptyPanel'

const TRAINING_TABS = [
  { label: 'Séance', value: 'session' },
  { label: 'Historique', value: 'history' },
]

function safeDateLabel(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  } catch {
    return '—'
  }
}

function normalizeExercises(exercises) {
  return [...(exercises || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
}

function buildExerciseGroups(exercises) {
  const rendered = new Set()
  const items = []
  normalizeExercises(exercises).forEach((ex) => {
    if (rendered.has(ex.id)) return
    if (ex.group_id && ex.group_type && ex.group_type !== 'Normal') {
      const groupItems = normalizeExercises(exercises).filter((item) => item.group_id === ex.group_id)
      groupItems.forEach((item) => rendered.add(item.id))
      items.push({ kind: 'group', id: ex.group_id, groupType: ex.group_type, exercises: groupItems })
    } else {
      rendered.add(ex.id)
      items.push({ kind: 'single', id: ex.id, exercise: ex })
    }
  })
  return items
}

function workoutLogCount(workout, logsByExerciseName) {
  return (workout?.exercises || []).reduce((sum, ex) => sum + ((logsByExerciseName[ex.name] || []).length || 0), 0)
}

function latestPerfText(log) {
  if (!log) return 'Aucun log'
  const chunks = []
  if (log.weight_used) chunks.push(log.weight_used)
  if (log.reps_done) chunks.push(`${log.reps_done} reps`)
  return chunks.length ? chunks.join(' · ') : 'Log enregistré'
}

function getWorkoutDayLabel(day) {
  const labels = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim' }
  return labels[day] || 'Jour'
}

function getLogNote(log) {
  return log?.notes || log?.note || log?.comment || ''
}

function getLogDate(log) {
  return log?.logged_at || log?.created_at || log?.date || null
}

function buildInputFromLog(log) {
  if (!log) return {}
  const noteText = log?.notes || log?.note || log?.comment || ''
  let cleanNote = noteText || ''
  let rpe = ''
  const match = cleanNote.match(/(?:^|·)\sRPE\s([0-9]+(?:[.,][0-9]+)?)/i)
  if (match) {
    rpe = String(match[1]).replace(',', '.')
    cleanNote = cleanNote.replace(match[0], '').replace(/^\s*·\s*|\s*·\s*$/g, '').trim()
  }
  return {
    weight: log?.weight_used || '',
    reps: log?.reps_done || '',
    rpe,
    note: cleanNote,
  }
}

async function loadLogsForClient(currentUserId) {
  const attempts = [
    async () => {
      const { data, error } = await supabase.from('workout_logs').select('').eq('client_id', currentUserId).order('logged_at', { ascending: false }).limit(300)
      if (error) throw error
      return data || []
    },
    async () => {
      const { data, error } = await supabase.from('workout_logs').select('').eq('client_id', currentUserId).order('created_at', { ascending: false }).limit(300)
      if (error) throw error
      return data || []
    },
    async () => {
      const { data, error } = await supabase.from('workout_sessions').select('*').eq('client_id', currentUserId).order('created_at', { ascending: false }).limit(300)
      if (error) throw error
      return (data || []).map((row) => ({ ...row, exercise_name: row.exercise_name || row.exercise || row.name, weight_used: row.weight_used || row.weight || null, reps_done: row.reps_done || row.reps || null, notes: row.notes || row.note || row.comment || null, logged_at: row.logged_at || row.created_at || null }))
    },
  ]
  let lastError = null
  for (const attempt of attempts) {
    try { return await attempt() } catch (e) { lastError = e }
  }
  if (lastError) throw lastError
  return []
}

async function insertWorkoutLogWithFallback(payload) {
  const attempts = [
    { table: 'workout_logs', build: () => ({ client_id: payload.client_id, workout_id: payload.workout_id, exercise_id: payload.exercise_id, exercise_name: payload.exercise_name, weight_used: payload.weight_used, reps_done: payload.reps_done, notes: payload.notes, logged_at: payload.logged_at }) },
    { table: 'workout_logs', build: () => ({ client_id: payload.client_id, workout_id: payload.workout_id, exercise_id: payload.exercise_id, exercise_name: payload.exercise_name, weight_used: payload.weight_used, reps_done: payload.reps_done, note: payload.notes, logged_at: payload.logged_at }) },
    { table: 'workout_sessions', build: () => ({ client_id: payload.client_id, workout_id: payload.workout_id, exercise_id: payload.exercise_id, exercise_name: payload.exercise_name, weight_used: payload.weight_used, reps_done: payload.reps_done, comment: payload.notes, created_at: payload.logged_at }) },
  ]
  let lastError = null
  for (const attempt of attempts) {
    try {
      const { data, error } = await supabase.from(attempt.table).insert(attempt.build()).select().single()
      if (error) throw error
      return { row: { ...data, exercise_name: data.exercise_name || payload.exercise_name, weight_used: data.weight_used || payload.weight_used, reps_done: data.reps_done || payload.reps_done, notes: data.notes || data.note || data.comment || payload.notes || null, logged_at: data.logged_at || data.created_at || payload.logged_at }, table: attempt.table }
    } catch (e) { lastError = e }
  }
  throw lastError || new Error("Impossible d'enregistrer la performance")
}


// ── Helpers calendrier ─────────────────────────────────────────
const DAY_LABELS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const DAY_LABELS_FULL  = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

/** Retourne le lundi de la semaine contenant `date` */
function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay() // 0=dim
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Retourne les 7 dates (Lun→Dim) d'une semaine décalée de `offset` semaines par rapport à aujourd'hui */
function getWeekDays(offset = 0) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monday = getMondayOf(today)
  monday.setDate(monday.getDate() + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
}

/** Mappe day_of_week (1=Lun…7=Dim) vers getDay() JS (0=Dim…6=Sam) */
function dowToJS(dow) {
  // 1=Lun→1, 7=Dim→0
  return dow === 7 ? 0 : dow
}

/** Retourne le label "Semaine du DD MOIS" */
function weekLabel(days) {
  const fmt = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  return `Sem. du ${fmt(days[0])} au ${fmt(days[6])}`
}

/** Vérifie si des logs existent pour une date donnée */
function hasLogsOnDate(date, logsByExerciseName) {
  const dateStr = date.toISOString().split('T')[0]
  return Object.values(logsByExerciseName).some(logs =>
    logs.some(log => {
      const logDate = log.logged_at || log.created_at || log.date || null
      return logDate && logDate.startsWith(dateStr)
    })
  )
}

export default function TrainingPage() {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('session')
  const [workouts, setWorkouts] = useState([])
  const [logsByExerciseName, setLogsByExerciseName] = useState({})
  const [openWorkout, setOpenWorkout] = useState(null)
  const [selectedExerciseId, setSelectedExerciseId] = useState(null)
  const [logInputs, setLogInputs] = useState({})
  const [loggingIds, setLoggingIds] = useState({})
  const [imageLightbox, setImageLightbox] = useState(null)

  // ── Calendrier ─────────────────────────────────────────────
  // weekOffset=0 → semaine courante, -1 → semaine passée, etc.
  const [weekOffset, setWeekOffset] = useState(0)

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
        if (!currentUser) { router.push('/'); return }
        if (!active) return
        setUser(currentUser)

        const [{ data: workoutData, error: workoutError }, logsData] = await Promise.all([
          supabase.from('workouts').select('*, exercises(*)').eq('client_id', currentUser.id).eq('is_archived', false).order('day_of_week', { ascending: true }),
          loadLogsForClient(currentUser.id),
        ])

        if (workoutError) throw workoutError
        if (!active) return

        const mapped = (workoutData || []).map((workout) => ({ ...workout, exercises: normalizeExercises(workout.exercises || []) }))
        const groupedLogs = {}
        ;(logsData || []).forEach((log) => {
          const key = log.exercise_name || 'Sans nom'
          if (!groupedLogs[key]) groupedLogs[key] = []
          groupedLogs[key].push(log)
        })

        setWorkouts(mapped)
        setLogsByExerciseName(groupedLogs)

        const prefills = {}
        mapped.forEach((workout) => {
          ;(workout.exercises || []).forEach((exercise) => {
            const latest = (groupedLogs[exercise.name] || [])[0]
            if (latest) prefills[exercise.id] = buildInputFromLog(latest)
          })
        })
        setLogInputs(prefills)

        // Sur mobile, on n'ouvre pas de séance par défaut pour afficher la liste d'abord
        // Sur desktop, on ouvre la première
        if (mapped.length && !isMobile) {
          setOpenWorkout(mapped[0].id)
          if (mapped[0].exercises?.length) setSelectedExerciseId(mapped[0].exercises[0].id)
        }
      } catch (e) {
        if (!active) return
        setError(e.message || "Impossible de charger la séance")
      } finally {
        if (active) setLoading(false)
      }
    }
    boot()
    return () => { active = false }
  }, [router])

  const currentWorkout = useMemo(() => workouts.find((workout) => workout.id === openWorkout) || null, [workouts, openWorkout])
  const selectedExercise = useMemo(() => {
    if (!currentWorkout) return null
    return (currentWorkout.exercises || []).find((item) => item.id === selectedExerciseId) || currentWorkout.exercises?.[0] || null
  }, [currentWorkout, selectedExerciseId])
  const selectedLogs = useMemo(() => (selectedExercise ? logsByExerciseName[selectedExercise.name] || [] : []), [selectedExercise, logsByExerciseName])
  const selectedLatestLog = selectedLogs[0] || null
  const exerciseBlocks = useMemo(() => (currentWorkout ? buildExerciseGroups(currentWorkout.exercises) : []), [currentWorkout])

  // ── Calendrier calculé ─────────────────────────────────────
  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset])
  const todayStr = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString().split('T')[0] }, [])

  // Map jsDay → workout(s) de ce jour
  const workoutByJsDay = useMemo(() => {
    const map = {}
    workouts.forEach(w => {
      const jsDay = dowToJS(w.day_of_week)
      if (!map[jsDay]) map[jsDay] = []
      map[jsDay].push(w)
    })
    return map
  }, [workouts])

  // Sélection du jour dans le calendrier
  const [selectedCalDay, setSelectedCalDay] = useState(null)

  // Au montage, pré-sélectionner aujourd'hui si un workout correspond
  useEffect(() => {
    if (workouts.length && selectedCalDay === null) {
      const todayJsDay = new Date().getDay()
      const todayWorkouts = workoutByJsDay[todayJsDay] || []
      if (todayWorkouts.length) {
        setSelectedCalDay(new Date().toISOString().split('T')[0])
        // Ouvrir la séance du jour automatiquement
        openSession(todayWorkouts[0].id)
      }
    }
  }, [workouts, workoutByJsDay])

  // Workouts du jour sélectionné dans le calendrier
  const calDayWorkouts = useMemo(() => {
    if (!selectedCalDay) return []
    const jsDay = new Date(selectedCalDay + 'T12:00:00').getDay()
    return workoutByJsDay[jsDay] || []
  }, [selectedCalDay, workoutByJsDay])

  function openSession(id) {
    setOpenWorkout(id)
    const workout = workouts.find((w) => w.id === id)
    if (workout?.exercises?.length) setSelectedExerciseId(workout.exercises[0].id)
    else setSelectedExerciseId(null)
  }

  function onLogInput(exerciseId, field, value) {
    setLogInputs((prev) => ({ ...prev, [exerciseId]: { ...(prev[exerciseId] || {}), [field]: value } }))
  }

  async function logPerformance(exercise) {
    const input = logInputs[exercise.id] || {}
    if (!input.weight && !input.reps && !input.note && !input.rpe) return
    try {
      setLoggingIds((prev) => ({ ...prev, [exercise.id]: true }))
      setError('')
      setSuccess('')
      const noteParts = []
      if (input.rpe) noteParts.push(`RPE ${input.rpe}`)
      if (input.note) noteParts.push(input.note)
      const payload = { client_id: user.id, workout_id: exercise.workout_id || null, exercise_id: exercise.id || null, exercise_name: exercise.name, weight_used: input.weight ? String(input.weight) : null, reps_done: input.reps ? String(input.reps) : null, notes: noteParts.length ? noteParts.join(' · ') : null, logged_at: new Date().toISOString() }
      const { row } = await insertWorkoutLogWithFallback(payload)
      setLogsByExerciseName((prev) => ({ ...prev, [exercise.name]: [row, ...(prev[exercise.name] || [])] }))
      setLogInputs((prev) => ({ ...prev, [exercise.id]: buildInputFromLog(row) }))
      setSuccess('Performance enregistrée.')
    } catch (e) {
      setError(e.message || "Impossible d'enregistrer la performance")
    } finally {
      setLoggingIds((prev) => ({ ...prev, [exercise.id]: false }))
    }
  }

  if (loading) return (<AppShell title="Training" subtitle="Chargement..." actions={<SegmentTabs items={TRAINING_TABS} value={activeTab} onChange={setActiveTab} />}><SurfaceCard padded><div style={{ color: '#6B7A99' }}>Chargement…</div></SurfaceCard></AppShell>)

  return (
    <AppShell title="Training" subtitle="Un espace clair et lisible" actions={<SegmentTabs items={TRAINING_TABS} value={activeTab} onChange={setActiveTab} />}>
      {error ? (<div style={{ marginBottom: isMobile ? 6 : 12 }}><SurfaceCard padded style={{ borderColor: '#F3C4C4', background: '#FEF2F2' }}><strong style={{ display: 'block', color: '#B42318', fontSize: 11 }}>Erreur</strong><div style={{ color: '#B42318', fontSize: 11 }}>{error}</div></SurfaceCard></div>) : null}
      {success ? (<div style={{ marginBottom: isMobile ? 6 : 12 }}><SurfaceCard padded style={{ borderColor: '#C9E9D5', background: '#F0FBF4' }}><strong style={{ display: 'block', color: '#16804A', fontSize: 11 }}>OK</strong><div style={{ color: '#16804A', fontSize: 11 }}>{success}</div></SurfaceCard></div>) : null}

      {imageLightbox ? (<div onClick={() => setImageLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}><img src={imageLightbox} alt="Exercice" style={{ maxWidth: 'min(1000px, 100%)', maxHeight: '88vh', borderRadius: 16 }} /></div>) : null}

      {activeTab === 'session' ? (
        <>
          {/* LAYOUT MOBILE : Affiche soit la liste, soit le détail de la séance sélectionnée */}
          {isMobile ? (
            openWorkout ? (
              // VUE DÉTAIL SÉANCE (prend tout l'écran)
              <div>
                <button onClick={() => setOpenWorkout(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6B7A99', fontSize: 13, fontWeight: 700, padding: '4px 0 12px', cursor: 'pointer' }}>
                  ← Retour aux séances
                </button>
                <SurfaceCard padded>
                  <SectionHead title={currentWorkout?.name || 'Programme'} action={currentWorkout?.type ? <StatusBadge tone="default">{currentWorkout.type}</StatusBadge> : null} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {exerciseBlocks.map((block) => {
                      if (block.kind === 'group' && block.groupType === 'Workout Block') {
                        let meta = {}
                        try { meta = JSON.parse(block.exercises[0]?.note || '{}') } catch {}
                        const typeColors = { 'For Time': '#C45C3A', 'AMRAP': '#2C64E5', 'EMOM': '#3A7A5A', 'Hyrox': '#0D1B4E', 'Interval': '#6B4FD4', 'Zone 2': '#2A6B8A', 'Cap Time': '#B8860B' }
                        const tc = typeColors[meta.type] || '#0D1B4E'
                        return (
                          <div key={block.id} style={{ borderRadius: 10, overflow: 'hidden', border: `2px solid ${tc}`, boxShadow: '0 4px 12px rgba(13,27,78,0.1)', marginBottom: 4 }}>
                            <div style={{ background: tc, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 14 }}>🔥</span>
                              <div style={{ color: 'white', fontWeight: 800, fontSize: 11, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{meta.type || 'Workout Block'}{meta.cap ? ` — CAP ${meta.cap} min` : ''}{meta.rounds && meta.rounds > 1 ? ` · ${meta.rounds} rounds` : ''}</div>
                            </div>
                            <div style={{ background: '#0D1B4E', padding: '8px 12px' }}>
                              {block.exercises.map((e, i) => (<div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: i < block.exercises.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}><span style={{ color: tc, fontSize: 11, fontWeight: 800, minWidth: 12 }}>•</span><span style={{ color: 'white', fontSize: 12, fontWeight: 500 }}>{e.name}</span></div>))}
                            </div>
                          </div>
                        )
                      }
                      if (block.kind === 'group') {
                        const gc = { 'Superset': '#C45C3A', 'Giant Set': '#3A5FD4', 'Drop Set': '#2C64E5' }[block.groupType] || '#3A5FD4'
                        return (
                          <div key={block.id} style={{ borderRadius: 12, border: `2px solid ${gc}22`, overflow: 'hidden', background: 'white' }}>
                            <div style={{ background: gc, color: 'white', padding: '6px 10px', fontWeight: 800, letterSpacing: '1px', fontSize: 10, textTransform: 'uppercase' }}>⚡ {block.groupType}</div>
                            <div style={{ padding: 8 }}>
                              {block.exercises.map((exercise) => (
                                <div key={exercise.id}>
                                  <CompactExerciseRow exercise={exercise} selected={selectedExerciseId === exercise.id} latestLog={(logsByExerciseName[exercise.name] || [])[0]} onSelect={() => setSelectedExerciseId(selectedExerciseId === exercise.id ? null : exercise.id)} isMobile={isMobile} />
                                  {selectedExerciseId === exercise.id ? (
                                    <div style={{ marginTop: 2, marginBottom: 8 }}>
                                      <ExerciseWorkspace exercise={exercise} input={logInputs[exercise.id] || {}} onInput={(field, value) => onLogInput(exercise.id, field, value)} onLog={() => logPerformance(exercise)} logging={!!loggingIds[exercise.id]} onImageOpen={setImageLightbox} latestLog={(logsByExerciseName[exercise.name] || [])[0]} isMobile={isMobile} />
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }
                      const exercise = block.exercise
                      return (
                        <div key={exercise.id}>
                          <CompactExerciseRow exercise={exercise} selected={selectedExerciseId === exercise.id} latestLog={(logsByExerciseName[exercise.name] || [])[0]} onSelect={() => setSelectedExerciseId(selectedExerciseId === exercise.id ? null : exercise.id)} isMobile={isMobile} />
                          {selectedExerciseId === exercise.id ? (
                            <div style={{ marginTop: 2 }}>
                              <ExerciseWorkspace exercise={exercise} input={logInputs[exercise.id] || {}} onInput={(field, value) => onLogInput(exercise.id, field, value)} onLog={() => logPerformance(exercise)} logging={!!loggingIds[exercise.id]} onImageOpen={setImageLightbox} latestLog={(logsByExerciseName[exercise.name] || [])[0]} isMobile={isMobile} />
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </SurfaceCard>
              </div>
            ) : (
              // VUE LISTE DES SÉANCES + CALENDRIER
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* ── CALENDRIER HEBDOMADAIRE ── */}
                <div style={{ background: 'white', borderRadius: 16, border: '1px solid #DCE5F3', overflow: 'hidden', boxShadow: '0 2px 8px rgba(13,27,78,0.06)' }}>
                  {/* Header semaine */}
                  <div style={{ background: '#0D1B4E', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                    <div style={{ color: 'white', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                      {weekOffset === 0 ? '📍 Cette semaine' : weekOffset === -1 ? 'Semaine passée' : weekOffset === 1 ? 'Semaine prochaine' : weekLabel(weekDays)}
                      <div style={{ fontSize: 10, opacity: 0.65, fontWeight: 400, marginTop: 1 }}>{weekLabel(weekDays)}</div>
                    </div>
                    <button onClick={() => setWeekOffset(w => w + 1)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                  </div>

                  {/* Grille 7 jours */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '10px 8px 12px', gap: 4 }}>
                    {weekDays.map((day) => {
                      const dateStr = day.toISOString().split('T')[0]
                      const jsDay = day.getDay()
                      const isToday = dateStr === todayStr
                      const isSelected = dateStr === selectedCalDay
                      const hasWorkout = !!(workoutByJsDay[jsDay]?.length)
                      const hasLogs = hasLogsOnDate(day, logsByExerciseName)
                      const isPast = day < new Date(todayStr)

                      return (
                        <button key={dateStr} onClick={() => {
                          setSelectedCalDay(isSelected ? null : dateStr)
                          if (!isSelected && workoutByJsDay[jsDay]?.length) {
                            openSession(workoutByJsDay[jsDay][0].id)
                          }
                        }}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                            padding: '6px 2px', borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: isSelected ? '#2C64E5' : isToday ? '#EEF4FF' : 'transparent',
                            transition: 'all 0.15s',
                            fontFamily: "'DM Sans',sans-serif",
                          }}>
                          {/* Jour abrégé */}
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: isSelected ? 'rgba(255,255,255,0.75)' : '#6B7A99' }}>
                            {DAY_LABELS_SHORT[jsDay]}
                          </span>
                          {/* Numéro du jour */}
                          <span style={{ fontSize: 15, fontWeight: isToday || isSelected ? 900 : 600, color: isSelected ? 'white' : isToday ? '#2C64E5' : isPast ? '#B0B8CC' : '#0D1B4E', lineHeight: 1 }}>
                            {day.getDate()}
                          </span>
                          {/* Indicateurs */}
                          <div style={{ display: 'flex', gap: 2, height: 6, alignItems: 'center' }}>
                            {hasWorkout && <div style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.7)' : '#2C64E5' }} />}
                            {hasLogs && <div style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.9)' : '#3A7A5A' }} />}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Légende */}
                  <div style={{ display: 'flex', gap: 14, padding: '0 16px 12px', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6B7A99' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2C64E5' }} /> Séance programmée
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6B7A99' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3A7A5A' }} /> Entraînement logué ✓
                    </div>
                  </div>
                </div>

                {/* ── SÉANCES DU JOUR SÉLECTIONNÉ ── */}
                {selectedCalDay && calDayWorkouts.length > 0 && (
                  <div style={{ background: '#EEF4FF', borderRadius: 12, padding: '10px 12px', border: '1.5px solid #2C64E5' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#2C64E5', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      📅 {DAY_LABELS_FULL[new Date(selectedCalDay + 'T12:00:00').getDay()]} — {new Date(selectedCalDay + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {calDayWorkouts.map(workout => (
                        <button key={workout.id} onClick={() => openSession(workout.id)}
                          style={{ width: '100%', textAlign: 'left', background: openWorkout === workout.id ? '#2C64E5' : 'white', borderRadius: 10, border: openWorkout === workout.id ? 'none' : '1px solid #DCE5F3', padding: '10px 12px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                          <div style={{ fontWeight: 800, fontSize: 14, color: openWorkout === workout.id ? 'white' : '#0D1B4E', marginBottom: 2 }}>{workout.name}</div>
                          <div style={{ fontSize: 11, color: openWorkout === workout.id ? 'rgba(255,255,255,0.7)' : '#6B7A99' }}>{(workout.exercises || []).length} exercices · {workout.duration || '—'} min</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {selectedCalDay && calDayWorkouts.length === 0 && (
                  <div style={{ background: '#F8F9FB', borderRadius: 12, padding: '14px', border: '1px solid #E8ECF5', textAlign: 'center', color: '#6B7A99', fontSize: 13 }}>
                    😴 Pas de séance programmée ce jour — repos ou cardio libre
                  </div>
                )}

                {/* ── TOUTES LES SÉANCES ── */}
                <div style={{ background: 'white', borderRadius: 14, border: '1px solid #DCE5F3', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid #E8ECF5' }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#0D1B4E' }}>📋 Programme complet</div>
                    <div style={{ fontSize: 11, color: '#6B7A99', marginTop: 2 }}>Toutes tes séances du cycle actuel</div>
                  </div>
                  {workouts.length ? (
                    <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {workouts.map((workout) => {
                        const isActive = workout.id === openWorkout
                        const jsDay = dowToJS(workout.day_of_week)
                        const hasLogs = Object.values(logsByExerciseName).some(logs => logs.some(l => l.workout_id === workout.id))
                        return (
                          <button key={workout.id} type="button" onClick={() => openSession(workout.id)}
                            style={{ width: '100%', textAlign: 'left', borderRadius: 10, border: isActive ? '1.5px solid #2C64E5' : '1px solid #DCE5F3', background: isActive ? '#F5F8FF' : '#FAFBFF', padding: '10px 12px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* Cercle jour */}
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: isActive ? '#2C64E5' : '#EEF4FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: isActive ? 'rgba(255,255,255,0.7)' : '#6B7A99', lineHeight: 1 }}>{DAY_LABELS_SHORT[jsDay]}</span>
                              <span style={{ fontSize: 15, fontWeight: 900, color: isActive ? 'white' : '#0D1B4E', lineHeight: 1.1 }}>{dowToJS(workout.day_of_week) === new Date().getDay() ? new Date().getDate() : ''}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: 13, color: '#0D1B4E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{workout.name}</div>
                              <div style={{ color: '#6B7A99', fontSize: 11, marginTop: 1 }}>{getWorkoutDayLabel(workout.day_of_week)} · {(workout.exercises || []).length} exos{workout.duration ? ` · ${workout.duration} min` : ''}</div>
                            </div>
                            {hasLogs && <span style={{ fontSize: 12 }}>✅</span>}
                            {isActive && <span style={{ fontSize: 10, background: '#2C64E5', color: 'white', padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>Actif</span>}
                          </button>
                        )
                      })}
                    </div>
                  ) : <EmptyPanel title="Aucune séance" description="Ton coach n'a pas encore chargé de séance active." />}
                </div>

              </div>
            )
          ) : (
            // LAYOUT DESKTOP (3 colonnes)
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 0.92fr) minmax(380px, 1.4fr) minmax(220px, 0.92fr)', gap: 14, alignItems: 'start' }}>
              <SurfaceCard padded sticky>
                <SectionHead title="Séances" caption="Choisis la séance active puis navigue exercice par exercice." />
                {workouts.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {workouts.map((workout) => {
                      const active = workout.id === openWorkout
                      return (
                        <button key={workout.id} type="button" onClick={() => openSession(workout.id)} style={{ width: '100%', textAlign: 'left', borderRadius: 10, border: active ? '1.5px solid #2C64E5' : '1px solid #DCE5F3', background: active ? '#F5F8FF' : '#FFFFFF', padding: '10px 12px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 14, color: '#0D1B4E', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{workout.name}</div>
                              <div style={{ color: '#6B7A99', fontSize: 11 }}>{getWorkoutDayLabel(workout.day_of_week)} · {(workout.exercises || []).length} exos</div>
                            </div>
                            {active ? <StatusBadge tone="accent">Active</StatusBadge> : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : <EmptyPanel title="Aucune séance" description="Ton coach n'a pas encore chargé de séance active." />}

                <div style={{ marginTop: 12 }}>
                  <SectionHead title="Vue rapide" caption="Résumé de la séance sélectionnée." />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
                    <MiniKpi label="Exos" value={currentWorkout?.exercises?.length || 0} />
                    <MiniKpi label="Blocs" value={currentWorkout ? buildExerciseGroups(currentWorkout.exercises).length : 0} />
                    <MiniKpi label="Logs" value={currentWorkout ? workoutLogCount(currentWorkout, logsByExerciseName) : 0} />
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard padded>
                <SectionHead title={currentWorkout?.name || 'Programme'} caption="Sélectionne un exercice depuis la liste. Le détail s'affiche dans l'espace de travail juste en dessous." action={currentWorkout?.type ? <StatusBadge tone="default">{currentWorkout.type}</StatusBadge> : null} />

                {currentWorkout ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {exerciseBlocks.map((block) => {
                      if (block.kind === 'group' && block.groupType === 'Workout Block') {
                        let meta = {}
                        try { meta = JSON.parse(block.exercises[0]?.note || '{}') } catch {}
                        const typeColors = { 'For Time': '#C45C3A', 'AMRAP': '#2C64E5', 'EMOM': '#3A7A5A', 'Hyrox': '#0D1B4E', 'Interval': '#6B4FD4', 'Zone 2': '#2A6B8A', 'Cap Time': '#B8860B' }
                        const tc = typeColors[meta.type] || '#0D1B4E'
                        return (
                          <div key={block.id} style={{ borderRadius: 10, overflow: 'hidden', border: `2px solid ${tc}`, boxShadow: '0 4px 12px rgba(13,27,78,0.1)', marginBottom: 4 }}>
                            <div style={{ background: tc, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 14 }}>🔥</span>
                              <div style={{ color: 'white', fontWeight: 800, fontSize: 11, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{meta.type || 'Workout Block'}{meta.cap ? ` — CAP ${meta.cap} min` : ''}{meta.rounds && meta.rounds > 1 ? ` · ${meta.rounds} rounds` : ''}</div>
                            </div>
                            <div style={{ background: '#0D1B4E', padding: '8px 12px' }}>
                              {block.exercises.map((e, i) => (<div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: i < block.exercises.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}><span style={{ color: tc, fontSize: 11, fontWeight: 800, minWidth: 12 }}>•</span><span style={{ color: 'white', fontSize: 12, fontWeight: 500 }}>{e.name}</span></div>))}
                            </div>
                          </div>
                        )
                      }
                      if (block.kind === 'group') {
                        const gc = { 'Superset': '#C45C3A', 'Giant Set': '#3A5FD4', 'Drop Set': '#2C64E5' }[block.groupType] || '#3A5FD4'
                        return (
                          <div key={block.id} style={{ borderRadius: 12, border: `2px solid ${gc}22`, overflow: 'hidden', background: 'white' }}>
                            <div style={{ background: gc, color: 'white', padding: '6px 10px', fontWeight: 800, letterSpacing: '1px', fontSize: 10, textTransform: 'uppercase' }}>⚡ {block.groupType}</div>
                            <div style={{ padding: 10 }}>
                              {block.exercises.map((exercise) => (
                                <div key={exercise.id}>
                                  <CompactExerciseRow exercise={exercise} selected={selectedExerciseId === exercise.id} latestLog={(logsByExerciseName[exercise.name] || [])[0]} onSelect={() => setSelectedExerciseId(selectedExerciseId === exercise.id ? null : exercise.id)} isMobile={isMobile} />
                                  {selectedExerciseId === exercise.id ? (
                                    <div style={{ marginTop: 2, marginBottom: 8 }}>
                                      <ExerciseWorkspace exercise={exercise} input={logInputs[exercise.id] || {}} onInput={(field, value) => onLogInput(exercise.id, field, value)} onLog={() => logPerformance(exercise)} logging={!!loggingIds[exercise.id]} onImageOpen={setImageLightbox} latestLog={(logsByExerciseName[exercise.name] || [])[0]} isMobile={isMobile} />
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }
                      const exercise = block.exercise
                      return (
                        <div key={exercise.id}>
                          <CompactExerciseRow exercise={exercise} selected={selectedExerciseId === exercise.id} latestLog={(logsByExerciseName[exercise.name] || [])[0]} onSelect={() => setSelectedExerciseId(selectedExerciseId === exercise.id ? null : exercise.id)} isMobile={isMobile} />
                          {selectedExerciseId === exercise.id ? (
                            <div style={{ marginTop: 2 }}>
                              <ExerciseWorkspace exercise={exercise} input={logInputs[exercise.id] || {}} onInput={(field, value) => onLogInput(exercise.id, field, value)} onLog={() => logPerformance(exercise)} logging={!!loggingIds[exercise.id]} onImageOpen={setImageLightbox} latestLog={(logsByExerciseName[exercise.name] || [])[0]} isMobile={isMobile} />
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                ) : (<EmptyPanel title="Aucune séance ouverte" description="..." />)}
              </SurfaceCard>

              <SurfaceCard padded sticky>
                <SectionHead title="Historique mouvement" caption="" />
                {selectedExercise ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedExercise.image_url ? (<button type="button" onClick={() => setImageLightbox(selectedExercise.image_url)} style={{ padding: 0, border: '1px solid #DCE5F3', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: 'white' }}><img src={selectedExercise.image_url} alt={selectedExercise.name} style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover' }} /></button>) : null}
                    <InfoCard title="Exercice" value={selectedExercise.name} />
                    <InfoCard title="Dernière entrée" value={selectedLatestLog ? `${latestPerfText(selectedLatestLog)} · ${safeDateLabel(getLogDate(selectedLatestLog))}` : "Aucune donnée."} />
                  </div>
                ) : (<EmptyPanel title="Sélectionne un exercice" description="" />)}
              </SurfaceCard>
            </div>
          )}
        </>
      ) : (
        <HistoryCalendar
          weekDays={weekDays}
          weekOffset={weekOffset}
          setWeekOffset={setWeekOffset}
          todayStr={todayStr}
          logsByExerciseName={logsByExerciseName}
          workoutByJsDay={workoutByJsDay}
          isMobile={isMobile}
        />
      )}
    </AppShell>
  )
}

// ── HISTORIQUE CALENDRIER ─────────────────────────────────────
function HistoryCalendar({ weekDays, weekOffset, setWeekOffset, todayStr, logsByExerciseName, workoutByJsDay, isMobile }) {
  const [selectedDay, setSelectedDay] = useState(null)

  // Init : sélectionner aujourd'hui au montage
  useEffect(() => {
    setSelectedDay(todayStr)
  }, [todayStr])

  // Logs du jour sélectionné
  const logsForDay = useMemo(() => {
    if (!selectedDay) return {}
    const result = {}
    Object.entries(logsByExerciseName).forEach(([exName, logs]) => {
      const dayLogs = logs.filter(log => {
        const d = log.logged_at || log.created_at || log.date || null
        return d && d.startsWith(selectedDay)
      })
      if (dayLogs.length > 0) result[exName] = dayLogs
    })
    return result
  }, [selectedDay, logsByExerciseName])

  // Jours qui ont des logs
  const daysWithLogs = useMemo(() => {
    const days = new Set()
    Object.values(logsByExerciseName).forEach(logs => {
      logs.forEach(log => {
        const d = log.logged_at || log.created_at || log.date || null
        if (d) days.add(d.split('T')[0])
      })
    })
    return days
  }, [logsByExerciseName])

  const selectedDayLabel = selectedDay
    ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SurfaceCard padded>
        {/* Navigation semaine */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: '#EEF4FF', border: '1px solid #C5D8F5', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, color: '#2C64E5', fontSize: 16 }}>‹</button>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1B4E', textAlign: 'center' }}>
            {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {weekDays[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            {weekOffset === 0 && <div style={{ fontSize: 10, color: '#6B8ED6', marginTop: 2 }}>Semaine en cours</div>}
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0} style={{ background: weekOffset >= 0 ? '#F5F5F5' : '#EEF4FF', border: '1px solid #C5D8F5', borderRadius: 8, padding: '6px 12px', cursor: weekOffset >= 0 ? 'not-allowed' : 'pointer', fontWeight: 700, color: weekOffset >= 0 ? '#CCC' : '#2C64E5', fontSize: 16 }}>›</button>
        </div>

        {/* Grille 7 jours */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {weekDays.map(day => {
            const dateStr = day.toISOString().split('T')[0]
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDay
            const hasLogs = daysWithLogs.has(dateStr)
            const jsDay = day.getDay()
            const hasWorkout = (workoutByJsDay[jsDay] || []).length > 0
            const isFuture = dateStr > todayStr

            return (
              <button
                key={dateStr}
                onClick={() => !isFuture && setSelectedDay(dateStr)}
                style={{
                  border: isSelected ? '2px solid #2C64E5' : isToday ? '2px solid #B0C4F5' : '1px solid #E8F0FF',
                  borderRadius: 10,
                  padding: '8px 4px',
                  textAlign: 'center',
                  cursor: isFuture ? 'default' : 'pointer',
                  background: isSelected ? '#2C64E5' : isToday ? '#EEF4FF' : hasLogs ? '#F0F7FF' : 'white',
                  opacity: isFuture ? 0.35 : 1,
                  transition: 'all 0.15s',
                  fontFamily: "'DM Sans',sans-serif",
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: 9, color: isSelected ? 'rgba(255,255,255,0.8)' : '#6B8ED6', fontWeight: 600, marginBottom: 2, textTransform: 'uppercase' }}>
                  {['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][jsDay]}
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: isSelected ? 'white' : isToday ? '#2C64E5' : '#0D1B4E' }}>
                  {day.getDate()}
                </div>
                {/* Indicateurs */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 4, minHeight: 6 }}>
                  {hasLogs && <div style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.9)' : '#2C64E5' }} />}
                  {hasWorkout && !hasLogs && <div style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.5)' : '#C5D8F5' }} />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Légende */}
        <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 10, color: '#6B8ED6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2C64E5' }} />
            Séance loggée
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C5D8F5' }} />
            Séance planifiée
          </div>
        </div>
      </SurfaceCard>

      {/* Logs du jour sélectionné */}
      <SurfaceCard padded>
        <SectionHead
          title={selectedDayLabel || 'Sélectionne un jour'}
          caption={Object.keys(logsForDay).length ? `${Object.keys(logsForDay).length} exercice(s) loggé(s)` : 'Aucune performance ce jour'}
        />

        {Object.keys(logsForDay).length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(logsForDay).map(([exName, logs]) => (
              <div key={exName} style={{ border: '1.5px solid #C5D8F5', borderRadius: 12, background: 'white', overflow: 'hidden' }}>
                {/* Header exo */}
                <div style={{ background: '#EEF4FF', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, color: '#0D1B4E', fontSize: 13 }}>{exName}</div>
                  <StatusBadge tone="default">{logs.length} série(s)</StatusBadge>
                </div>
                {/* Logs */}
                <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {logs.map((log, i) => {
                    const perf = latestPerfText(log)
                    const note = getLogNote(log)
                    const time = log.logged_at ? new Date(log.logged_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null
                    return (
                      <div key={log.id || i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '6px 0', borderBottom: i < logs.length - 1 ? '1px solid #F0F5FF' : 'none' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#2C64E5', color: 'white', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#0D1B4E' }}>{perf}</div>
                          {note && <div style={{ fontSize: 11, color: '#6B8ED6', marginTop: 2 }}>{note}</div>}
                        </div>
                        {time && <div style={{ fontSize: 10, color: '#9AAAD4', flexShrink: 0 }}>{time}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="Aucune perf ce jour"
            description={selectedDay && selectedDay <= todayStr ? "Tu n'as rien loggé ce jour-là." : "Sélectionne un jour passé pour voir tes performances."}
          />
        )}
      </SurfaceCard>
    </div>
  )
}

// COMPOSANT EXERCICE COMPACT
function CompactExerciseRow({ exercise, selected, latestLog, onSelect, isMobile }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: '100%',
        textAlign: 'left',
        background: selected ? '#EEF4FF' : '#FFFFFF',
        border: selected ? '1.5px solid #2C64E5' : '1px solid #DCE5F3',
        borderRadius: isMobile ? 10 : 12,
        padding: isMobile ? '8px' : '12px',
        cursor: 'pointer',
        fontFamily: "'DM Sans',sans-serif",
        marginBottom: isMobile ? 6 : 8,
        boxShadow: selected ? '0 0 0 2px rgba(44,100,229,0.1)' : 'none',
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 10 : 12
      }}
    >
      <div style={{ width: isMobile ? 50 : 60, height: isMobile ? 50 : 60, borderRadius: 8, overflow: 'hidden', background: '#F0F5FF', border: '1px solid #E0E8F5', flexShrink: 0 }}>
        {exercise.image_url ? (
          <img src={exercise.image_url} alt={exercise.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 18 }}>💪</div>
        )}
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: isMobile ? 14 : 15, color: '#0D1B4E', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exercise.name}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', background: '#2C64E5', color: 'white', borderRadius: 6 }}>{exercise.sets} × {exercise.reps}</span>
          <span style={{ fontSize: 11, padding: '3px 8px', background: '#EEF4FF', color: '#2C64E5', borderRadius: 6, border: '1px solid #DCE5F3' }}> {exercise.rest || '—'}</span>
        </div>
      </div>

      <div style={{ color: selected ? '#2C64E5' : '#E0E0E0', fontSize: 20 }}>{selected ? '●' : '○'}</div>
    </button>
  )
}

function ExerciseWorkspace({ exercise, input, onInput, onLog, logging, onImageOpen, latestLog, isMobile }) {
  return (
    <div style={{ borderRadius: 10, border: '1.5px solid #2C64E5', background: '#F8FBFF', padding: isMobile ? 12 : 16, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 14, color: '#0D1B4E' }}>{exercise.name}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, color: '#0D1B4E', marginBottom: 6, fontSize: 10, letterSpacing: '0.5px' }}>PRESCRIPTION</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', background: '#2C64E5', color: 'white', borderRadius: 20 }}>{exercise.sets} × {exercise.reps}</span>
            <span style={{ fontSize: 12, padding: '4px 10px', background: '#EEF4FF', color: '#2C64E5', borderRadius: 20 }}>⏱ {exercise.rest}</span>
          </div>
          <div style={{ color: '#4A6FB5', lineHeight: 1.5, fontSize: 12 }}>{exercise.note || 'Aucune note.'}</div>
        </div>
        <div>
          <div style={{ fontWeight: 800, color: '#0D1B4E', marginBottom: 6, fontSize: 10, letterSpacing: '0.5px' }}>RÉSULTAT</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="Charge"><input value={input.weight || ''} onChange={(e) => onInput('weight', e.target.value)} placeholder="kg" style={inputStyle()} /></Field>
            <Field label="Reps"><input value={input.reps || ''} onChange={(e) => onInput('reps', e.target.value)} placeholder="reps" style={inputStyle()} /></Field>
          </div>
          <button type="button" onClick={onLog} disabled={logging} style={{ marginTop: 8, width: '100%', border: 'none', background: '#2C64E5', color: 'white', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            {logging ? '...' : '✓ Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function inputStyle() {
  return { width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: 8, border: '1px solid #C5D8F5', background: 'white', fontSize: 13, color: '#0D1B4E', fontFamily: "'DM Sans',sans-serif" }
}

function Field({ label, children }) {
  return (<div><div style={{ fontSize: 10, fontWeight: 800, color: '#6B7A99', marginBottom: 4 }}>{label}</div>{children}</div>)
}

function MiniKpi({ label, value }) {
  return <div style={{ border: '1px solid #C5D8F5', borderRadius: 10, background: '#EEF4FF', padding: 10 }}><div style={{ fontSize: 10, color: '#6B8ED6', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>{label}</div><div style={{ fontWeight: 900, fontSize: 22, color: '#0D1B4E' }}>{value}</div></div>
}

function InfoCard({ title, value }) {
  return <div style={{ border: '1px solid #C5D8F5', borderRadius: 10, background: 'white', padding: 12 }}><div style={{ fontWeight: 800, color: '#0D1B4E', marginBottom: 6, fontSize: 10, textTransform: 'uppercase' }}>{title}</div><div style={{ color: '#4A6FB5', fontSize: 13 }}>{value}</div></div>
}