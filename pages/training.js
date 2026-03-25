import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export const dynamic = 'force-dynamic'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const REST_OPTIONS = ['30s', '45s', '60s', '90s', '2 min', '3 min', '4 min', '5 min']
const GROUP_COLORS = {
  Superset: '#C45C3A',
  'Giant Set': '#8FA07A',
  'Drop Set': '#4A6FD4',
  Normal: 'transparent',
}

function normalizeExerciseName(name = '') {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bs\d+\b/g, '')
    .replace(/[()/_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildLibraryIndex(rows = []) {
  const exact = new Map()

  rows.forEach((row) => {
    if (!row?.name || !row?.image_url) return
    const key = normalizeExerciseName(row.name)
    if (!exact.has(key)) exact.set(key, row.image_url)
  })

  return exact
}

function resolveImageUrl(exercise, libraryIndex) {
  if (exercise?.image_url) return exercise.image_url

  const normalized = normalizeExerciseName(exercise?.name)
  if (!normalized) return ''

  if (libraryIndex.has(normalized)) return libraryIndex.get(normalized)

  const simplified = normalized
    .replace(/\btempo\b/g, '')
    .replace(/\bhalt[eè]res?\b/g, '')
    .replace(/\bbarre\b/g, '')
    .replace(/\bmachine\b/g, '')
    .replace(/\scable\b/g, '')
    .replace(/\spoulie\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (libraryIndex.has(simplified)) return libraryIndex.get(simplified)

  for (const [key, imageUrl] of libraryIndex.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) return imageUrl
  }

  return ''
}

function sortExercises(exercises = []) {
  return [...exercises].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
}

export default function Training() {
  const [user, setUser] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [sessions, setSessions] = useState([])
  const [openWorkout, setOpenWorkout] = useState(null)
  const [editMode, setEditMode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddWorkout, setShowAddWorkout] = useState(false)
  const [workoutLogs, setWorkoutLogs] = useState({})
  const [logInputs, setLogInputs] = useState({})
  const [logging, setLogging] = useState({})
  const [athleteComments, setAthleteComments] = useState({})
  const [libraryIndex, setLibraryIndex] = useState(new Map())
  const [newWorkout, setNewWorkout] = useState({ name: '', type: 'Push', day_of_week: 1, duration_min: 60 })

  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()

        if (!currentUser) {
          router.push('/')
          return
        }

        setUser(currentUser)

        const [libraryMap, workoutsData, sessionsData, logsData] = await Promise.all([
          loadExerciseLibraryIndex(),
          loadWorkouts(currentUser.id),
          loadCurrentWeekSessions(currentUser.id),
          loadWorkoutLogs(currentUser.id),
        ])

        setLibraryIndex(libraryMap)
        setWorkouts(mergeImagesIntoWorkouts(workoutsData, libraryMap))
        setSessions(sessionsData)
        setWorkoutLogs(logsData)

        const comments = {}
        sessionsData.forEach((session) => {
          if (session?.athlete_comment) comments[session.workout_id] = session.athlete_comment
        })
        setAthleteComments(comments)
      } catch (error) {
        console.error('Erreur chargement training:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router])

  const todayNum = new Date().getDay()
  const currentDayNumber = todayNum === 0 ? 7 : todayNum

  const workoutsByDay = useMemo(() => {
    const map = new Map()
    workouts.forEach((workout) => map.set(workout.day_of_week, workout))
    return map
  }, [workouts])

  const refreshWorkouts = async (uid, incomingLibraryIndex = libraryIndex) => {
    const workoutsData = await loadWorkouts(uid)
    setWorkouts(mergeImagesIntoWorkouts(workoutsData, incomingLibraryIndex))
  }

  const addWorkout = async () => {
    if (!newWorkout.name.trim() || !user?.id) return

    const { data, error } = await supabase
      .from('workouts')
      .insert({ ...newWorkout, client_id: user.id })
      .select()
      .single()

    if (error) {
      console.error('Erreur création séance:', error)
      return
    }

    if (data) {
      setWorkouts((prev) => [...prev, { ...data, exercises: [] }].sort((a, b) => (a.day_of_week ?? 0) - (b.day_of_week ?? 0)))
      setShowAddWorkout(false)
      setNewWorkout({ name: '', type: 'Push', day_of_week: 1, duration_min: 60 })
      setOpenWorkout(data.id)
      setEditMode(data.id)
    }
  }

  const deleteWorkout = async (workoutId) => {
    if (!confirm('Supprimer cette séance ?')) return

    const { error } = await supabase.from('workouts').delete().eq('id', workoutId)
    if (error) {
      console.error('Erreur suppression séance:', error)
      return
    }

    setWorkouts((prev) => prev.filter((workout) => workout.id !== workoutId))
    setOpenWorkout(null)
  }

  const addExercise = async (workoutId, groupType = 'Normal', groupId = null) => {
    const workout = workouts.find((item) => item.id === workoutId)
    const order = workout?.exercises?.length || 0
    const gid = groupId || (groupType !== 'Normal' ? Date.now().toString() : null)
    const exerciseName = 'Nouvel exercice'
    const imageUrl = resolveImageUrl({ name: exerciseName }, libraryIndex)

    const payload = {
      workout_id: workoutId,
      name: exerciseName,
      sets: 3,
      reps: '10',
      rest: '90s',
      note: '',
      target_weight: '',
      order_index: order,
      group_type: groupType,
      group_id: gid,
      image_url: imageUrl || null,
    }

    const { data, error } = await supabase.from('exercises').insert(payload).select().single()
    if (error) {
      console.error('Erreur ajout exercice:', error)
      return
    }

    if (data) {
      const withImage = { ...data, image_url: data.image_url || imageUrl || '' }
      setWorkouts((prev) =>
        prev.map((workoutItem) =>
          workoutItem.id === workoutId
            ? { ...workoutItem, exercises: sortExercises([...(workoutItem.exercises || []), withImage]) }
            : workoutItem,
        ),
      )
    }
  }

  const addSuperset = async (workoutId) => {
    const workout = workouts.find((item) => item.id === workoutId)
    const order = workout?.exercises?.length || 0
    const gid = `ss_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const base = {
      workout_id: workoutId,
      sets: 3,
      reps: '10',
      rest: '90s',
      note: '',
      target_weight: '',
      group_type: 'Superset',
      group_id: gid,
    }

    const [resA, resB] = await Promise.all([
      supabase
        .from('exercises')
        .insert({ ...base, name: 'Exercice A', order_index: order, image_url: null })
        .select()
        .single(),
      supabase
        .from('exercises')
        .insert({ ...base, name: 'Exercice B', order_index: order + 1, image_url: null })
        .select()
        .single(),
    ])

    if (resA.error || resB.error) {
      console.error('Erreur ajout superset:', resA.error || resB.error)
      return
    }

    if (resA.data && resB.data) {
      setWorkouts((prev) =>
        prev.map((workoutItem) =>
          workoutItem.id === workoutId
            ? { ...workoutItem, exercises: sortExercises([...(workoutItem.exercises || []), resA.data, resB.data]) }
            : workoutItem,
        ),
      )
    }
  }

  const addGiantSet = async (workoutId) => {
    const workout = workouts.find((item) => item.id === workoutId)
    const order = workout?.exercises?.length || 0
    const gid = `gs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const base = {
      workout_id: workoutId,
      sets: 3,
      reps: '10',
      note: '',
      target_weight: '',
      group_type: 'Giant Set',
      group_id: gid,
    }

    const results = await Promise.all(
      ['Exercice A', 'Exercice B', 'Exercice C'].map((name, index) =>
        supabase
          .from('exercises')
          .insert({ ...base, name, rest: index === 2 ? '90s' : '0s', order_index: order + index, image_url: null })
          .select()
          .single(),
      ),
    )

    const hasError = results.find((result) => result.error)
    if (hasError) {
      console.error('Erreur ajout giant set:', hasError.error)
      return
    }

    const newExercises = results.map((result) => result.data).filter(Boolean)
    if (newExercises.length === 3) {
      setWorkouts((prev) =>
        prev.map((workoutItem) =>
          workoutItem.id === workoutId
            ? { ...workoutItem, exercises: sortExercises([...(workoutItem.exercises || []), ...newExercises]) }
            : workoutItem,
        ),
      )
    }
  }

  const updateExercise = async (workoutId, exId, field, value) => {
    const nextPatch = { [field]: value }

    if (field === 'name') {
      const resolvedImage = resolveImageUrl({ name: value }, libraryIndex)
      nextPatch.image_url = resolvedImage || null
    }

    setWorkouts((prev) =>
      prev.map((workout) =>
        workout.id === workoutId
          ? {
              ...workout,
              exercises: workout.exercises.map((exercise) =>
                exercise.id === exId ? { ...exercise, ...nextPatch } : exercise,
              ),
            }
          : workout,
      ),
    )

    const { error } = await supabase.from('exercises').update(nextPatch).eq('id', exId)
    if (error) {
      console.error('Erreur update exercice:', error)
      await refreshWorkouts(user.id)
    }
  }

  const deleteExercise = async (workoutId, exId) => {
    const { error } = await supabase.from('exercises').delete().eq('id', exId)
    if (error) {
      console.error('Erreur suppression exercice:', error)
      return
    }

    setWorkouts((prev) =>
      prev.map((workout) =>
        workout.id === workoutId
          ? { ...workout, exercises: workout.exercises.filter((exercise) => exercise.id !== exId) }
          : workout,
      ),
    )
  }

  const logPerformance = async (exercise) => {
    const input = logInputs[exercise.id] || {}
    if (!input.weight && !input.reps) return

    setLogging((prev) => ({ ...prev, [exercise.id]: true }))

    const entry = {
      client_id: user.id,
      workout_id: exercise.workout_id,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      sets_done: exercise.sets,
      reps_done: input.reps || exercise.reps,
      weight_used: input.weight || '',
      notes: input.note || '',
      cycle_name: '',
    }

    const { data, error } = await supabase.from('workout_logs').insert(entry).select().single()

    if (error) {
      console.error('Erreur log performance:', error)
      setLogging((prev) => ({ ...prev, [exercise.id]: false }))
      return
    }

    if (data) {
      setWorkoutLogs((prev) => ({
        ...prev,
        [exercise.name]: [data, ...(prev[exercise.name] || [])],
      }))
      setLogInputs((prev) => ({ ...prev, [exercise.id]: {} }))
    }

    setLogging((prev) => ({ ...prev, [exercise.id]: false }))
  }

  const markDone = async (workoutId) => {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({ client_id: user.id, workout_id: workoutId, date: today, completed: true })
      .select()
      .single()

    if (error) {
      console.error('Erreur séance terminée:', error)
      return
    }

    if (data) {
      setSessions((prev) => [...prev, data])
    }
  }

  const saveComment = async (workoutId, comment) => {
    setAthleteComments((prev) => ({ ...prev, [workoutId]: comment }))
    const existingSession = sessions.find((session) => session.workout_id === workoutId)

    if (existingSession) {
      const { error } = await supabase
        .from('workout_sessions')
        .update({ athlete_comment: comment })
        .eq('id', existingSession.id)

      if (error) console.error('Erreur update commentaire:', error)
      return
    }

    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({ client_id: user.id, workout_id: workoutId, date: today, completed: false, athlete_comment: comment })
      .select()
      .single()

    if (error) {
      console.error('Erreur création commentaire:', error)
      return
    }

    if (data) setSessions((prev) => [...prev, data])
  }

  const syncMissingImages = async () => {
    if (!user?.id) return

    const rowsToSync = []
    workouts.forEach((workout) => {
      workout.exercises?.forEach((exercise) => {
        if (!exercise.image_url) {
          const resolved = resolveImageUrl(exercise, libraryIndex)
          if (resolved) rowsToSync.push({ id: exercise.id, image_url: resolved })
        }
      })
    })

    if (!rowsToSync.length) return

    try {
      await Promise.all(
        rowsToSync.map((row) => supabase.from('exercises').update({ image_url: row.image_url }).eq('id', row.id)),
      )
      await refreshWorkouts(user.id)
    } catch (error) {
      console.error('Erreur sync images:', error)
    }
  }

  const isDone = (workoutId) => sessions.some((session) => session.workout_id === workoutId)

  if (loading) return <LoadingScreen />

  return (
    <Layout title="Entrainements" user={user}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '8px', marginBottom: '28px' }}>
        {DAYS.map((day, index) => {
          const workout = workoutsByDay.get(index + 1)
          const done = workout && isDone(workout.id)
          const isToday = index + 1 === currentDayNumber

          return (
            <div
              key={day}
              onClick={() => workout && setOpenWorkout(openWorkout === workout.id ? null : workout.id)}
              style={{
                background: done ? '#0D1B4E' : '#F0F4FF',
                border: `1.5px solid ${isToday ? '#4A6FD4' : done ? '#0D1B4E' : '#C5D0F0'}`,
                borderRadius: '10px',
                padding: '12px 8px',
                textAlign: 'center',
                boxShadow: isToday ? '0 0 0 3px rgba(74,111,212,0.2)' : 'none',
                opacity: !workout ? 0.45 : 1,
                cursor: workout ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: done ? '#D4E0CC' : '#6B7A99' }}>{day}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '700', margin: '4px 0', color: done ? 'white' : '#0D1B4E' }}>{index + 1}</div>
              <div style={{ fontSize: '10px', fontWeight: '600', color: done ? '#D4E0CC' : isToday ? '#4A6FD4' : '#8FA07A' }}>
                {done ? '✓ ' : ''}
                {workout ? workout.name : 'Repos'}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '700' }}>Programme de la semaine</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={syncMissingImages} style={btnStyle('white', '#0D1B4E', '#C5D0F0')}>🖼 Sync images</button>
          <button onClick={() => setShowAddWorkout(true)} style={btnStyle('#0D1B4E', 'white')}>+ Nouvelle séance</button>
        </div>
      </div>

      {showAddWorkout && (
        <div style={{ background: '#F0F4FF', border: '2px solid #4A6FD4', borderRadius: '14px', padding: '24px', marginBottom: '16px' }}>
          <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '16px' }}>Créer une nouvelle séance</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {[
              {
                label: 'Nom',
                el: <input value={newWorkout.name} onChange={(e) => setNewWorkout((prev) => ({ ...prev, name: e.target.value }))} placeholder="ex: Push A" style={fieldStyle} />,
              },
              {
                label: 'Type',
                el: (
                  <select value={newWorkout.type} onChange={(e) => setNewWorkout((prev) => ({ ...prev, type: e.target.value }))} style={fieldStyle}>
                    {['Push', 'Pull', 'Legs', 'Full Body', 'Upper', 'Lower', 'Cardio', 'Autre'].map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                ),
              },
              {
                label: 'Jour',
                el: (
                  <select value={newWorkout.day_of_week} onChange={(e) => setNewWorkout((prev) => ({ ...prev, day_of_week: Number(e.target.value) }))} style={fieldStyle}>
                    {DAYS.map((day, index) => (
                      <option key={day} value={index + 1}>{day}</option>
                    ))}
                  </select>
                ),
              },
              {
                label: 'Durée (min)',
                el: <input type="number" value={newWorkout.duration_min} onChange={(e) => setNewWorkout((prev) => ({ ...prev, duration_min: Number(e.target.value) }))} style={fieldStyle} />,
              },
            ].map(({ label, el }) => (
              <div key={label}>
                <label style={labelSt}>{label}</label>
                {el}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={addWorkout} style={btnStyle('#0D1B4E', 'white')}>✓ Créer</button>
            <button onClick={() => setShowAddWorkout(false)} style={btnStyle('transparent', '#6B7A99', '#C5D0F0')}>Annuler</button>
          </div>
        </div>
      )}

      {workouts.length === 0 ? (
        <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '40px', textAlign: 'center', color: '#6B7A99', fontSize: '14px' }}>
          Aucune séance. Clique sur "+ Nouvelle séance" pour commencer 💪
        </div>
      ) : (
        workouts.map((workout) => {
          const isOpen = openWorkout === workout.id
          const isEdit = editMode === workout.id

          return (
            <div key={workout.id} style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' }}>
              <div
                onClick={() => setOpenWorkout(isOpen ? null : workout.id)}
                style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: isOpen ? '1px solid #C5D0F0' : 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '20px', background: '#D4E0CC', color: '#0D1B4E' }}>{workout.type}</span>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>{workout.name}</div>
                    <div style={{ fontSize: '13px', color: '#6B7A99', marginTop: '2px' }}>
                      {DAYS[(workout.day_of_week || 1) - 1]} · {workout.exercises?.length || 0} exercices · {workout.duration_min} min
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isDone(workout.id) ? (
                    <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: 'rgba(143,160,122,0.2)', color: '#0D1B4E' }}>✓ Complété</span>
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: 'rgba(74,111,212,0.12)', color: '#2A50B0' }}>À faire</span>
                  )}
                  <span style={{ color: '#6B7A99', fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <button onClick={() => setEditMode(isEdit ? null : workout.id)} style={btnStyle(isEdit ? '#0D1B4E' : 'white', isEdit ? 'white' : '#6B7A99', '#C5D0F0')}>
                      {isEdit ? "✓ Terminer l'édition" : '✏️ Modifier'}
                    </button>
                    {!isDone(workout.id) && <button onClick={() => markDone(workout.id)} style={btnStyle('#0D1B4E', 'white')}>✓ Séance terminée</button>}
                    {isEdit && <button onClick={() => deleteWorkout(workout.id)} style={{ ...btnStyle('rgba(196,92,58,0.1)', '#C45C3A'), marginLeft: 'auto' }}>🗑 Supprimer</button>}
                  </div>

                  <WorkoutBlocks
                    workout={workout}
                    isEdit={isEdit}
                    workoutLogs={workoutLogs}
                    logInputs={logInputs}
                    logging={logging}
                    setLogInputs={setLogInputs}
                    updateExercise={updateExercise}
                    deleteExercise={deleteExercise}
                    logPerformance={logPerformance}
                    addExercise={addExercise}
                  />

                  {workout.exercises?.length === 0 && !isEdit && (
                    <div style={{ textAlign: 'center', color: '#6B7A99', fontSize: '14px', padding: '20px' }}>Passe en mode édition pour ajouter des exercices</div>
                  )}

                  {isEdit && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                      <button onClick={() => addExercise(workout.id, 'Normal', null)} style={btnStyle('#0D1B4E', 'white')}>+ Exercice</button>
                      <button onClick={() => addSuperset(workout.id)} style={btnStyle('#C45C3A', 'white')}>⚡ Superset (2 exos)</button>
                      <button onClick={() => addGiantSet(workout.id)} style={btnStyle('#8FA07A', 'white')}>🔥 Giant Set (3+ exos)</button>
                      <button onClick={() => addExercise(workout.id, 'Drop Set', null)} style={btnStyle('#4A6FD4', 'white')}>📉 Drop Set</button>
                    </div>
                  )}

                  <div style={{ marginTop: '20px', borderTop: '1px solid #E8ECFA', paddingTop: '16px' }}>
                    <div style={{ fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6B7A99', fontWeight: '600', marginBottom: '8px' }}>💬 Commentaire Athlète</div>
                    <textarea
                      value={athleteComments[workout.id] || ''}
                      onChange={(e) => setAthleteComments((prev) => ({ ...prev, [workout.id]: e.target.value }))}
                      onBlur={(e) => saveComment(workout.id, e.target.value)}
                      placeholder="Comment s'est passée la séance ? Sensations, difficultés, notes…"
                      rows={3}
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #C5D0F0', borderRadius: '8px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", outline: 'none', resize: 'vertical', color: '#0D1B4E', background: '#FAFBFF', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </Layout>
  )
}

function WorkoutBlocks({ workout, isEdit, workoutLogs, logInputs, logging, setLogInputs, updateExercise, deleteExercise, logPerformance, addExercise }) {
  const exercises = workout.exercises || []
  const rendered = new Set()
  const blocks = []

  exercises.forEach((exercise) => {
    if (rendered.has(exercise.id)) return

    if (exercise.group_id && exercise.group_type !== 'Normal') {
      const group = exercises.filter((item) => item.group_id === exercise.group_id)
      group.forEach((item) => rendered.add(item.id))

      blocks.push(
        <div key={exercise.group_id} style={{ border: `2px solid ${GROUP_COLORS[exercise.group_type]}`, borderRadius: '12px', marginBottom: '16px', overflow: 'hidden' }}>
          <div style={{ background: GROUP_COLORS[exercise.group_type], color: 'white', padding: '7px 14px', fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚡ {exercise.group_type}</span>
            {isEdit && (
              <button onClick={() => addExercise(workout.id, exercise.group_type, exercise.group_id)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                + Exercice
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0' }}>
            {group.map((item) => (
              <ExCard
                key={item.id}
                ex={item}
                wId={workout.id}
                edit={isEdit}
                onUpdate={updateExercise}
                onDelete={deleteExercise}
                logs={workoutLogs[item.name] || []}
                logInput={logInputs[item.id] || {}}
                onLogInput={(field, val) => setLogInputs((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), [field]: val } }))}
                onLog={() => logPerformance(item)}
                isLogging={logging[item.id]}
              />
            ))}
          </div>
        </div>,
      )
      return
    }

    rendered.add(exercise.id)
    blocks.push(
      <ExCard
        key={exercise.id}
        ex={exercise}
        wId={workout.id}
        edit={isEdit}
        onUpdate={updateExercise}
        onDelete={deleteExercise}
        logs={workoutLogs[exercise.name] || []}
        logInput={logInputs[exercise.id] || {}}
        onLogInput={(field, val) => setLogInputs((prev) => ({ ...prev, [exercise.id]: { ...(prev[exercise.id] || {}), [field]: val } }))}
        onLog={() => logPerformance(exercise)}
        isLogging={logging[exercise.id]}
      />,
    )
  })

  return blocks
}

function ExCard({ ex, wId, edit, onUpdate, onDelete, logs, logInput, onLogInput, onLog, isLogging }) {
  const [showImg, setShowImg] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const lastLog = logs?.[0]

  return (
    <>
      {showImg && ex.image_url && (
        <div onClick={() => setShowImg(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', maxWidth: '500px', width: '90%' }}>
            <img src={ex.image_url} alt={ex.name} style={{ width: '100%', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
            <div style={{ textAlign: 'center', color: 'white', marginTop: '12px', fontWeight: '600', fontSize: '16px' }}>{ex.name}</div>
            <button onClick={() => setShowImg(false)} style={{ position: 'absolute', top: '-12px', right: '-12px', width: '32px', height: '32px', borderRadius: '50%', background: 'white', border: 'none', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E8ECFA', marginBottom: edit ? '0' : '10px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '0', alignItems: 'stretch' }}>
          <div style={{ width: '100px', flexShrink: 0, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: ex.image_url ? 'pointer' : 'default' }} onClick={() => ex.image_url && setShowImg(true)}>
            {ex.image_url ? <img src={ex.image_url} alt={ex.name} style={{ width: '100px', height: '100px', objectFit: 'cover' }} /> : <span style={{ fontSize: '28px' }}>💪</span>}
          </div>

          <div style={{ flex: 1, padding: '12px 14px' }}>
            {edit ? (
              <input value={ex.name} onChange={(e) => onUpdate(wId, ex.id, 'name', e.target.value)} style={{ ...cellInput, fontWeight: '600', fontSize: '14px', marginBottom: '8px' }} />
            ) : (
              <div style={{ fontWeight: '600', fontSize: '14px', color: '#0D1B4E', marginBottom: '6px' }}>{ex.name}</div>
            )}

            {edit ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                <div>
                  <div style={{ fontSize: '9px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Séries</div>
                  <input type="number" value={ex.sets} onChange={(e) => onUpdate(wId, ex.id, 'sets', e.target.value)} style={{ ...cellInput, textAlign: 'center', padding: '4px 6px' }} />
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Reps</div>
                  <input value={ex.reps} onChange={(e) => onUpdate(wId, ex.id, 'reps', e.target.value)} style={{ ...cellInput, textAlign: 'center', padding: '4px 6px' }} />
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Repos</div>
                  <select value={ex.rest || '90s'} onChange={(e) => onUpdate(wId, ex.id, 'rest', e.target.value)} style={{ ...cellInput, textAlign: 'center', padding: '4px 6px' }}>
                    {REST_OPTIONS.map((rest) => (
                      <option key={rest}>{rest}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Charge</div>
                  <input value={ex.target_weight || ''} onChange={(e) => onUpdate(wId, ex.id, 'target_weight', e.target.value)} placeholder="80 kg" style={{ ...cellInput, textAlign: 'center', padding: '4px 6px' }} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', padding: '3px 8px', background: '#EEF2FF', color: '#0D1B4E', borderRadius: '20px' }}>{ex.sets} × {ex.reps}</span>
                <span style={{ fontSize: '12px', padding: '3px 8px', background: '#F5F5F5', color: '#6B7A99', borderRadius: '20px' }}>⏱ {ex.rest}</span>
                {ex.target_weight && <span style={{ fontSize: '12px', fontWeight: '600', padding: '3px 8px', background: '#FFF3EE', color: '#C45C3A', borderRadius: '20px' }}>🎯 {ex.target_weight}</span>}
              </div>
            )}

            {edit ? (
              <input value={ex.note || ''} onChange={(e) => onUpdate(wId, ex.id, 'note', e.target.value)} placeholder="Consigne coach…" style={{ ...cellInput, fontSize: '12px', padding: '4px 8px' }} />
            ) : (
              ex.note && <div style={{ fontSize: '12px', color: '#6B7A99', fontStyle: 'italic' }}>📋 {ex.note}</div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px', gap: '6px', borderLeft: '1px solid #F0F2FA' }}>
            {edit ? (
              <button onClick={() => onDelete(wId, ex.id)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'rgba(196,92,58,0.1)', color: '#C45C3A', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            ) : (
              <button onClick={() => setShowLog(!showLog)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #C5D0F0', background: showLog ? '#0D1B4E' : 'white', color: showLog ? 'white' : '#6B7A99', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📝</button>
            )}
          </div>
        </div>

        {!edit && showLog && (
          <div style={{ padding: '10px 14px 12px', background: '#F5F8FF', borderTop: '1px solid #E8ECFA' }}>
            {lastLog && (
              <div style={{ fontSize: '11px', color: '#6B7A99', marginBottom: '8px', padding: '6px 10px', background: 'rgba(74,111,212,0.08)', borderRadius: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span>🕐 Dernière fois :</span>
                {lastLog.weight_used && <span style={{ fontWeight: '700', color: '#0D1B4E' }}>{lastLog.weight_used}</span>}
                {lastLog.reps_done && <span>{lastLog.reps_done} reps</span>}
                <span style={{ color: '#9AA' }}>{new Date(lastLog.logged_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
              </div>
            )}

            {logs?.length > 1 && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                {logs.slice(0, 5).map((log, index) => (
                  <div key={log.id} style={{ fontSize: '10px', padding: '3px 8px', background: index === 0 ? '#0D1B4E' : '#EEF2FF', color: index === 0 ? 'white' : '#6B7A99', borderRadius: '20px' }}>
                    {log.weight_used || '—'} · {new Date(log.logged_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input value={logInput?.weight || ''} onChange={(e) => onLogInput('weight', e.target.value)} placeholder="Charge (ex: 80 kg)" style={{ padding: '6px 10px', border: '1.5px solid #C5D0F0', borderRadius: '7px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '130px' }} />
              <input value={logInput?.reps || ''} onChange={(e) => onLogInput('reps', e.target.value)} placeholder="Reps réelles" style={{ padding: '6px 10px', border: '1.5px solid #C5D0F0', borderRadius: '7px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '110px' }} />
              <input value={logInput?.note || ''} onChange={(e) => onLogInput('note', e.target.value)} placeholder="Note (optionnel)" style={{ padding: '6px 10px', border: '1.5px solid #C5D0F0', borderRadius: '7px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", outline: 'none', flex: 1, minWidth: '120px' }} />
              <button onClick={onLog} disabled={isLogging || (!logInput?.weight && !logInput?.reps)} style={{ padding: '6px 14px', background: !logInput?.weight && !logInput?.reps ? '#CCC' : '#0D1B4E', color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                {isLogging ? '…' : '✓ Logger'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

async function loadExerciseLibraryIndex() {
  const { data, error } = await supabase.from('exercise_library').select('name, image_url').not('image_url', 'is', null)
  if (error) {
    console.error('Erreur chargement exercise_library:', error)
    return new Map()
  }
  return buildLibraryIndex(data || [])
}

async function loadWorkouts(userId) {
  const { data, error } = await supabase.from('workouts').select('*, exercises(*)').eq('client_id', userId).order('day_of_week')
  if (error) {
    console.error('Erreur chargement workouts:', error)
    return []
  }
  return (data || []).map((workout) => ({ ...workout, exercises: sortExercises(workout.exercises || []) }))
}

async function loadCurrentWeekSessions(userId) {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)

  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('client_id', userId)
    .gte('date', weekStart.toISOString().split('T')[0])

  if (error) {
    console.error('Erreur chargement sessions:', error)
    return []
  }

  return data || []
}

async function loadWorkoutLogs(userId) {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('client_id', userId)
    .order('logged_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('Erreur chargement logs:', error)
    return {}
  }

  const logsByExercise = {}
  ;(data || []).forEach((log) => {
    if (!logsByExercise[log.exercise_name]) logsByExercise[log.exercise_name] = []
    logsByExercise[log.exercise_name].push(log)
  })

  return logsByExercise
}

function mergeImagesIntoWorkouts(workouts, libraryIndex) {
  return workouts.map((workout) => ({
    ...workout,
    exercises: sortExercises(
      (workout.exercises || []).map((exercise) => ({
        ...exercise,
        image_url: resolveImageUrl(exercise, libraryIndex),
      })),
    ),
  }))
}

const cellInput = {
  width: '100%',
  padding: '5px 8px',
  border: '1.5px solid #C5D0F0',
  borderRadius: '6px',
  fontSize: '13px',
  fontFamily: "'DM Sans', sans-serif",
  background: 'white',
  outline: 'none',
  color: '#0D1B4E',
}

const fieldStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1.5px solid #C5D0F0',
  borderRadius: '8px',
  fontSize: '14px',
  fontFamily: "'DM Sans', sans-serif",
  background: 'white',
  outline: 'none',
  color: '#0D1B4E',
}

const labelSt = {
  display: 'block',
  fontSize: '11px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: '#6B7A99',
  marginBottom: '6px',
  fontWeight: '500',
}

const btnStyle = (bg, color, borderColor) => ({
  padding: '8px 16px',
  background: bg,
  color,
  border: borderColor ? `1.5px solid ${borderColor}` : 'none',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
})

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EEF2FF', fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#6B7A99' }}>
      Chargement…
    </div>
  )
}
