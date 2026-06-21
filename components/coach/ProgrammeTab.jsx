import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { btn, btnVariant, lbl, inp, SUPABASE_URL, DAYS, DAYS_FR } from '../../lib/coachHelpers'
import ExRow from './ExerciseRow'
import ExercisePicker from './ExercisePicker'

// ── Toggle Actuel / Futur ──────────────────────────────────────
function CycleToggle({ mode, onChange }) {
  return (
    <div style={{ display: 'flex', background: '#F0F4FF', borderRadius: 10, padding: 3, gap: 2 }}>
      {[
        { id: 'current', label: '🟢 Cycle actuel' },
        { id: 'future',  label: '🔵 Cycle futur' },
      ].map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{
            padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: mode === id ? (id === 'future' ? '#4A6FD4' : '#0D1B4E') : 'transparent',
            color: mode === id ? 'white' : '#6B7A99',
            fontWeight: 700, fontSize: 13, fontFamily: "'DM Sans',sans-serif",
            transition: 'all 0.15s',
          }}
        >{label}</button>
      ))}
    </div>
  )
}

export default function ProgrammeTab({ clientId, clientName, coachId }) {
  const [cycleMode, setCycleMode]           = useState('current')
  const [workouts, setWorkouts]             = useState([])
  const [futureWorkouts, setFutureWorkouts] = useState([])
  const [openWorkout, setOpenWorkout]       = useState(null)
  const [editMode, setEditMode]             = useState(null)
  const [showAdd, setShowAdd]               = useState(false)
  const [newW, setNewW]                     = useState({ name: '', type: 'Push', day_of_week: 1, duration_min: 60 })
  const [loading, setLoading]               = useState(true)
  const [showDuplicate, setShowDuplicate]   = useState(false)
  const [duplicating, setDuplicating]       = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState('')
  const [resetWeights, setResetWeights]     = useState(true)
  const [allClients, setAllClients]         = useState([])
  const [showHistory, setShowHistory]       = useState(false)
  const [archivedWorkouts, setArchivedWorkouts] = useState([])
  const [archiving, setArchiving]           = useState(false)
  const [cycleName, setCycleName]           = useState('')
  const [exporting, setExporting]           = useState(false)
  const [imageSyncing, setImageSyncing]     = useState(false)
  const [exerciseImageFiles, setExerciseImageFiles] = useState([])
  const [imageFilesLoading, setImageFilesLoading]   = useState(true)
  const [athleteLogs, setAthleteLogs]       = useState({})
  const [activating, setActivating]         = useState(false)
  const [currentCycleName, setCurrentCycleName]   = useState('')
  const [savingCycleName, setSavingCycleName]     = useState(false)

  const displayedWorkouts = cycleMode === 'future' ? futureWorkouts : workouts

  // ── Logs athlète ───────────────────────────────────────────
  const fetchAthleteLogs = async () => {
    if (!clientId) return
    let data = null
    try {
      const r1 = await supabase
        .from('workout_logs')
        .select('exercise_name, notes, note, weight_used, reps_done, logged_at')
        .eq('client_id', clientId)
        .order('logged_at', { ascending: false })
        .limit(500)
      if (!r1.error) data = r1.data || []
    } catch (e) { console.warn('workout_logs fetch error:', e) }
    if (!data || !data.length) return
    const byName = {}
    data.forEach(log => {
      const name = log.exercise_name
      const note = log.notes || log.note || log.comment || ''
      if (!name) return
      if (!byName[name]) byName[name] = { note: '', weight: '', reps: '', date: '' }
      if (note && !byName[name].note) {
        byName[name].note = note
        byName[name].weight = log.weight_used || ''
        byName[name].reps = log.reps_done || ''
        byName[name].date = log.logged_at || log.created_at || ''
      }
      if (!byName[name].weight && log.weight_used) {
        byName[name].weight = log.weight_used
        byName[name].reps = log.reps_done || ''
        byName[name].date = log.logged_at || log.created_at || ''
      }
    })
    setAthleteLogs(byName)
  }

  useEffect(() => { fetchAthleteLogs() }, [clientId]) // eslint-disable-line

  // ── Chargement workouts ────────────────────────────────────
  async function reloadWorkouts() {
    const enrichWithExercises = async (list) => {
      if (!list?.length) return []
      const ids = list.map(w => w.id)
      const { data: exData } = await supabase
        .from('exercises').select('*').in('workout_id', ids).order('order_index')
      const exByWorkout = {}
      ;(exData || []).forEach(ex => {
        if (!exByWorkout[ex.workout_id]) exByWorkout[ex.workout_id] = []
        exByWorkout[ex.workout_id].push(ex)
      })
      return list.map(w => ({
        ...w,
        exercises: (exByWorkout[w.id] || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)),
      }))
    }

    const { data: wData } = await supabase
      .from('workouts').select('*')
      .eq('client_id', clientId).eq('is_archived', false).eq('is_future', false)
      .order('day_of_week')

    const { data: fData } = await supabase
      .from('workouts').select('*')
      .eq('client_id', clientId).eq('is_archived', false).eq('is_future', true)
      .order('day_of_week')

    const [current, future] = await Promise.all([
      enrichWithExercises(wData),
      enrichWithExercises(fData),
    ])
    setWorkouts(current)
    setFutureWorkouts(future)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await reloadWorkouts()
      setLoading(false)
      setOpenWorkout(null)
      setEditMode(null)
    }
    load()
  }, [clientId]) // eslint-disable-line

  useEffect(() => {
    setOpenWorkout(null)
    setEditMode(null)
    setShowAdd(false)
  }, [cycleMode])

  // ── Activation du cycle futur ──────────────────────────────
  const activateFutureCycle = async () => {
    if (!futureWorkouts.length) { alert('Aucune séance dans le cycle futur.'); return }
    if (!confirm('Activer le cycle futur ?\n\nLe cycle actuel sera archivé et le cycle futur deviendra actif pour le client.')) return
    setActivating(true)
    try {
      if (workouts.length) {
        await supabase.from('workouts')
          .update({ is_archived: true, archived_at: new Date().toISOString() })
          .eq('client_id', clientId).eq('is_archived', false).eq('is_future', false)
      }
      await supabase.from('workouts')
        .update({ is_future: false })
        .eq('client_id', clientId).eq('is_future', true)
      await reloadWorkouts()
      setCycleMode('current')
      alert('✅ Cycle futur activé ! Le client voit maintenant son nouveau programme.')
    } catch (e) { alert('Erreur : ' + e.message) }
    setActivating(false)
  }

  // ── Images d'exercices (listing direct depuis Supabase Storage) ──
  const fetchImageFiles = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('exercise-images')
        .list('', { limit: 500, sortBy: { column: 'name', order: 'asc' } })
      if (!error && data?.length) {
        const files = data
          .map(f => f.name)
          .filter(n => n && /\.(jpg|jpeg|png|gif|webp)$/i.test(n))
          .sort((a, b) => a.localeCompare(b, 'fr'))
        setExerciseImageFiles(files)
      }
    } catch {}
    setImageFilesLoading(false)
  }

  useEffect(() => { fetchImageFiles() }, []) // eslint-disable-line

  // ── Picker d'exercice ──────────────────────────────────────
  const [exPicker, setExPicker]         = useState(null)
  const [exPickerQuery, setExPickerQuery] = useState('')
  const [exPickerMode, setExPickerMode]   = useState('search')
  const [exPickerFree, setExPickerFree]   = useState('')

  const addExercise = (workoutId, groupType, groupId) => {
    setExPicker({ workoutId, groupType, groupId })
    setExPickerQuery(''); setExPickerMode('search'); setExPickerFree('')
  }

  const confirmAddExercise = async (name, imageUrl) => {
    if (!exPicker || !name.trim()) return
    const { workoutId, groupType, groupId } = exPicker
    const w = displayedWorkouts.find(w => w.id === workoutId)
    const gid = groupId || (groupType !== 'Normal' ? Date.now().toString() : null)
    const payload = {
      workout_id: workoutId, name: name.trim(), sets: 3, reps: '10', rest: '90s',
      note: '', target_weight: '', order_index: w?.exercises?.length || 0,
      group_type: groupType || 'Normal', group_id: gid,
    }
    const { data, error } = await supabase.from('exercises').insert(payload).select().single()
    if (error) { console.error('Erreur insertion:', error); alert('Erreur: ' + error.message); return }
    if (data) {
      if (imageUrl) supabase.from('exercises').update({ image_url: imageUrl }).eq('id', data.id)
      const setter = cycleMode === 'future' ? setFutureWorkouts : setWorkouts
      setter(prev => prev.map(w => {
        if (w.id !== workoutId) return w
        return { ...w, exercises: [...(w.exercises || []), { ...data, image_url: imageUrl || null }].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)) }
      }))
    }
    setExPicker(null)
  }

  // ── Workout Block ──────────────────────────────────────────
  const [wbPicker, setWbPicker] = useState(null)
  const [wbForm, setWbForm]     = useState({ type: 'For Time', rounds: '3', cap: '', rest: '90s', objective: '', coachNote: '', movements: '' })

  // ── updateExercise ─────────────────────────────────────────
  const updateExercise = async (workoutId, exId, field, value) => {
    const setter = cycleMode === 'future' ? setFutureWorkouts : setWorkouts
    setter(prev => prev.map(w => w.id !== workoutId ? w : { ...w, exercises: w.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e) }))

    let payload = { [field]: value }
    if (field === 'name') {
      try {
        const exNorm = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
        const nf = exerciseImageFiles.map(fname => ({
          normalized: fname.toLowerCase().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim(),
          url: `${SUPABASE_URL}/storage/v1/object/public/exercise-images/${encodeURIComponent(fname)}`,
        }))
        let match = nf.find(f => f.normalized === exNorm)
        if (!match) match = nf.find(f => f.normalized.includes(exNorm) || exNorm.includes(f.normalized))
        if (!match) {
          const words = exNorm.split(' ').filter(w => w.length > 2)
          match = nf.find(f => words.filter(w => f.normalized.includes(w)).length >= Math.min(2, words.length))
        }
        if (match) payload.image_url = match.url
      } catch {}
    }
    const { image_url: imgUrl, ...payloadCore } = payload
    const { error: upErr } = await supabase.from('exercises').update(payloadCore).eq('id', exId)
    if (upErr) console.error('Erreur update exercice:', upErr.message)
    if (imgUrl) {
      await supabase.from('exercises').update({ image_url: imgUrl }).eq('id', exId)
      setter(prev => prev.map(w => w.id !== workoutId ? w : { ...w, exercises: w.exercises.map(e => e.id === exId ? { ...e, image_url: imgUrl } : e) }))
    }
  }

  const deleteExercise = async (workoutId, exId) => {
    await supabase.from('exercises').delete().eq('id', exId)
    const setter = cycleMode === 'future' ? setFutureWorkouts : setWorkouts
    setter(prev => prev.map(w => w.id !== workoutId ? w : { ...w, exercises: w.exercises.filter(e => e.id !== exId) }))
  }

  const moveExercise = async (workoutId, exId, direction) => {
    const list   = cycleMode === 'future' ? futureWorkouts : workouts
    const setter = cycleMode === 'future' ? setFutureWorkouts : setWorkouts
    const w = list.find(w => w.id === workoutId); if (!w) return
    const exs = [...w.exercises]
    const idx = exs.findIndex(e => e.id === exId)
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= exs.length) return
    const ex1 = exs[idx], ex2 = exs[newIdx]
    const order1 = ex1.order_index ?? idx, order2 = ex2.order_index ?? newIdx
    const newExercises = [...exs]
    newExercises[idx] = { ...ex2, order_index: order1 }
    newExercises[newIdx] = { ...ex1, order_index: order2 }
    setter(prev => prev.map(ww => ww.id === workoutId ? { ...ww, exercises: newExercises } : ww))
    await Promise.all([
      supabase.from('exercises').update({ order_index: order2 }).eq('id', ex1.id),
      supabase.from('exercises').update({ order_index: order1 }).eq('id', ex2.id),
    ])
  }

  // ── Workout CRUD ───────────────────────────────────────────
  const addWorkout = async () => {
    if (!newW.name.trim()) return
    const isFuture = cycleMode === 'future'
    const { data } = await supabase.from('workouts').insert({ ...newW, client_id: clientId, is_future: isFuture }).select().single()
    if (data) {
      const setter = isFuture ? setFutureWorkouts : setWorkouts
      setter(prev => [...prev, { ...data, exercises: [] }])
      setShowAdd(false)
      setNewW({ name: '', type: 'Push', day_of_week: 1, duration_min: 60 })
      setOpenWorkout(data.id); setEditMode(data.id)
    }
  }

  const deleteWorkout = async (id) => {
    if (!confirm('Supprimer cette séance ?')) return
    await supabase.from('workouts').delete().eq('id', id)
    const setter = cycleMode === 'future' ? setFutureWorkouts : setWorkouts
    setter(prev => prev.filter(w => w.id !== id))
    if (openWorkout === id) setOpenWorkout(null)
  }

  const updateWorkoutDay = async (workoutId, newDay) => {
    await supabase.from('workouts').update({ day_of_week: +newDay }).eq('id', workoutId)
    const setter = cycleMode === 'future' ? setFutureWorkouts : setWorkouts
    setter(prev => prev.map(w => w.id === workoutId ? { ...w, day_of_week: +newDay } : w))
  }

  // ── Cycle (actuel seulement) ───────────────────────────────
  const saveCurrentCycleName = async () => {
    if (!currentCycleName.trim()) return
    setSavingCycleName(true)
    await supabase.from('workouts').update({ cycle_name: currentCycleName.trim() })
      .eq('client_id', clientId).eq('is_archived', false).eq('is_future', false)
    setSavingCycleName(false)
    alert('Nom du cycle sauvegardé !')
  }

  const archiveCycle = async () => {
    if (!cycleName.trim()) { alert("Donne un nom à ce cycle avant de l'archiver"); return }
    if (!confirm('Archiver ce cycle ? Les séances seront archivées et le programme sera vide.')) return
    setArchiving(true)
    try {
      await supabase.from('workouts')
        .update({ is_archived: true, cycle_name: cycleName.trim(), archived_at: new Date().toISOString() })
        .eq('client_id', clientId).eq('is_archived', false).eq('is_future', false)
      setWorkouts([]); setCycleName(''); setCurrentCycleName('')
    } catch (e) { alert('Erreur: ' + e.message) }
    setArchiving(false)
  }

  const loadHistory = async () => {
    const { data } = await supabase.from('workouts').select('*, exercises(*)')
      .eq('client_id', clientId).eq('is_archived', true).order('archived_at', { ascending: false })
    setArchivedWorkouts(data || [])
    setShowHistory(true)
  }

  // ── Duplication ────────────────────────────────────────────
  const loadAllClients = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'client').neq('id', clientId).order('full_name')
    setAllClients(data || [])
  }

  const duplicateProgram = async (targetClientId) => {
    if (!targetClientId) return
    setDuplicating(true)
    try {
      const sourceWorkouts = cycleMode === 'future' ? futureWorkouts : workouts
      if (!sourceWorkouts?.length) { alert('Aucune séance à dupliquer.'); setDuplicating(false); return }
      let totalExInserted = 0
      for (const workout of sourceWorkouts) {
        const { data: exData } = await supabase.from('exercises').select('*').eq('workout_id', workout.id).order('order_index')
        const exs = (exData || workout.exercises || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        const { data: newWorkout, error: wInsErr } = await supabase.from('workouts').insert({
          client_id: targetClientId, name: workout.name, type: workout.type,
          day_of_week: workout.day_of_week, duration_min: workout.duration_min,
          cycle_name: workout.cycle_name || null, is_future: cycleMode === 'future',
        }).select().single()
        if (wInsErr) throw new Error('Erreur création séance : ' + wInsErr.message)
        if (!newWorkout || !exs.length) continue
        const groupIdMap = {}; let gIdx = 0
        exs.forEach(ex => { if (ex.group_id && !groupIdMap[ex.group_id]) groupIdMap[ex.group_id] = `dup_${newWorkout.id.slice(0, 8)}_g${gIdx++}` })
        for (const ex of exs) {
          // ── Synchro image : réutiliser l'image source ou matcher depuis la bibliothèque ──
          let resolvedImageUrl = ex.image_url || null
          if (!resolvedImageUrl && exerciseImageFiles.length) {
            const exNorm = String(ex.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
            const nf = exerciseImageFiles.map(fname => ({
              normalized: fname.toLowerCase().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim(),
              url: `${SUPABASE_URL}/storage/v1/object/public/exercise-images/${encodeURIComponent(fname)}`,
            }))
            let match = nf.find(f => f.normalized === exNorm)
            if (!match) match = nf.find(f => f.normalized.includes(exNorm) || exNorm.includes(f.normalized))
            if (!match) {
              const words = exNorm.split(' ').filter(w => w.length > 2)
              match = nf.find(f => words.filter(w => f.normalized.includes(w)).length >= Math.min(2, words.length))
            }
            if (match) resolvedImageUrl = match.url
          }
          const { error: exErr } = await supabase.from('exercises').insert({
            workout_id: newWorkout.id, name: String(ex.name || ''),
            sets: ex.sets != null ? parseInt(ex.sets) || null : null,
            reps: ex.reps != null ? String(ex.reps) : null,
            rest: ex.rest || null, note: ex.note || null,
            target_weight: resetWeights ? null : (ex.target_weight || null),
            order_index: parseInt(ex.order_index) || 0,
            group_type: ex.group_type || 'Normal',
            group_id: ex.group_id ? groupIdMap[ex.group_id] : null,
            image_url: resolvedImageUrl,
          })
          if (exErr) console.error('Erreur insert exercice', ex.name, exErr.message)
          else totalExInserted++
        }
      }
      setShowDuplicate(false); setDuplicateTarget('')
      if (targetClientId === clientId) await reloadWorkouts()
      alert(`Programme dupliqué ! (${sourceWorkouts.length} séances · ${totalExInserted} exercices)`)
    } catch (e) { alert('Erreur : ' + e.message) }
    setDuplicating(false)
  }

  // ── Workout Block ──────────────────────────────────────────
  const groupColors = { 'Superset': '#C45C3A', 'Giant Set': '#8FA07A', 'Drop Set': '#4A6FD4', 'Workout Block': '#1A1A2E' }

  const addWorkoutBlock = (workoutId) => {
    setWbPicker({ workoutId })
    setWbForm({ type: 'For Time', rounds: '3', cap: '', rest: '90s', objective: '', coachNote: '', movements: '' })
  }

  const confirmAddWorkoutBlock = async () => {
    if (!wbPicker || !wbForm.movements.trim()) return
    const { workoutId } = wbPicker
    const w = displayedWorkouts.find(w => w.id === workoutId)
    const gid = 'wb_' + Date.now().toString()
    const meta = JSON.stringify({ type: wbForm.type, rounds: wbForm.rounds, cap: wbForm.cap, rest: wbForm.rest, objective: wbForm.objective, coachNote: wbForm.coachNote })
    const lines = wbForm.movements.split('\n').map(l => l.trim()).filter(Boolean)
    const baseIdx = w?.exercises?.length || 0
    const rows = lines.map((line, i) => ({
      workout_id: workoutId, name: line, sets: parseInt(wbForm.rounds) || 1, reps: '',
      rest: i === lines.length - 1 ? wbForm.rest : '0s',
      note: i === 0 ? meta : '', target_weight: '', order_index: baseIdx + i,
      group_type: 'Workout Block', group_id: gid,
    }))
    const { data } = await supabase.from('exercises').insert(rows).select()
    if (data) {
      const setter = cycleMode === 'future' ? setFutureWorkouts : setWorkouts
      setter(prev => prev.map(w => w.id !== workoutId ? w : { ...w, exercises: [...(w.exercises || []), ...data] }))
    }
    setWbPicker(null)
  }

  // ── Sync images ────────────────────────────────────────────
  const syncImages = async (forceAll = false) => {
    setImageSyncing(true)
    try {
      // Recharger la liste d'images si elle est vide (ex: 401 au mount)
      let files = exerciseImageFiles
      if (!files.length) {
        await fetchImageFiles()
        files = exerciseImageFiles
      }
      if (!files.length) { alert('⚠️ Aucune image trouvée dans la bibliothèque'); setImageSyncing(false); return }
      const normalizedFiles = files.map(fname => ({
        normalized: fname.toLowerCase().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim(),
        url: `${SUPABASE_URL}/storage/v1/object/public/exercise-images/${encodeURIComponent(fname)}`,
      }))
      const toSync = displayedWorkouts.flatMap(workout => (workout.exercises || []).filter(ex => forceAll || !ex.image_url))
      if (!toSync.length) { alert('✅ Toutes les images sont déjà synchronisées'); setImageSyncing(false); return }
      for (const ex of toSync) {
        const exNorm = ex.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
        let match = normalizedFiles.find(f => f.normalized === exNorm)
        if (!match) match = normalizedFiles.find(f => f.normalized.includes(exNorm) || exNorm.includes(f.normalized))
        if (!match) {
          const words = exNorm.split(' ').filter(w => w.length > 2)
          match = normalizedFiles.find(f => words.filter(w => f.normalized.includes(w)).length >= Math.min(2, words.length))
        }
        if (match) await supabase.from('exercises').update({ image_url: match.url }).eq('id', ex.id)
      }
      await reloadWorkouts()
      alert('✅ Images synchronisées !')
    } catch (e) { alert('Erreur sync images: ' + e.message) }
    setImageSyncing(false)
  }

  // ── Export PDF ─────────────────────────────────────────────
  const exportPDF = async () => {
    setExporting(true)
    try {
      const imgToBase64 = async (url) => {
        try {
          const res = await fetch(url); const blob = await res.blob()
          return await new Promise(resolve => { const r = new FileReader(); r.onloadend = () => resolve(r.result); r.readAsDataURL(blob) })
        } catch { return null }
      }
      const allExercises = displayedWorkouts.flatMap(w => w.exercises || [])
      const imgCache = {}
      await Promise.all(allExercises.filter(e => e.image_url).map(async e => { if (!imgCache[e.image_url]) imgCache[e.image_url] = await imgToBase64(e.image_url) }))
      const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
      const workoutBlocks = displayedWorkouts.map(workout => {
        const exercises = (workout.exercises || []).map(ex => {
          const img = ex.image_url && imgCache[ex.image_url]
            ? `<img src="${imgCache[ex.image_url]}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid #e0e6f0;" />`
            : `<div style="width:72px;height:72px;border-radius:8px;background:#EEF2FF;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">💪</div>`
          const details = [
            ex.sets && ex.reps ? `<span style="background:#EEF2FF;color:#2C64E5;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;">${ex.sets} × ${ex.reps}</span>` : '',
            ex.rest ? `<span style="border:1px solid #C5D0F0;color:#6B7A99;padding:2px 8px;border-radius:4px;font-size:12px;">⏱ ${ex.rest}</span>` : '',
            ex.target_weight ? `<span style="border:1px solid #C5D0F0;color:#6B7A99;padding:2px 8px;border-radius:4px;font-size:12px;">🏋️ ${ex.target_weight}</span>` : '',
          ].filter(Boolean).join(' ')
          const note = ex.note ? `<div style="font-size:11px;color:#6B7A99;margin-top:4px;font-style:italic;">📋 ${ex.note}</div>` : ''
          return `<div style="display:flex;gap:14px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #F0F4FF;">${img}<div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:14px;color:#0D1B4E;margin-bottom:4px;">${ex.name}</div><div style="display:flex;gap:6px;flex-wrap:wrap;">${details}</div>${note}</div></div>`
        }).join('')
        const dayLabel = dayNames[(workout.day_of_week || 1) - 1] || ''
        return `<div style="margin-bottom:28px;background:white;border-radius:12px;border:1px solid #E0E6F0;overflow:hidden;"><div style="background:#0D1B4E;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;"><div style="color:white;font-weight:700;font-size:16px;">${workout.name}</div><div style="color:#A0B0D0;font-size:13px;">${dayLabel} · ${workout.duration_min || 60} min</div></div><div style="padding:0 18px;">${exercises}</div></div>`
      }).join('')
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:24px;background:#F5F7FF;color:#0D1B4E;}</style></head><body><div style="text-align:center;margin-bottom:24px;"><h1 style="font-size:22px;color:#0D1B4E;margin:0 0 4px;">${clientName || 'Programme'}${cycleMode === 'future' ? ' — Cycle futur' : ''}</h1><div style="color:#6B7A99;font-size:13px;">${displayedWorkouts.length} séance${displayedWorkouts.length > 1 ? 's' : ''}</div></div>${workoutBlocks}</body></html>`
      const win = window.open('', '_blank'); win.document.write(html); win.document.close(); win.print()
    } catch (e) { alert('Erreur export PDF: ' + e.message) }
    setExporting(false)
  }

  // ── Render ─────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#6B7A99' }}>
      Chargement du programme…
    </div>
  )

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 0 80px' }}>

      {/* ── Toggle + bouton Activer ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <CycleToggle mode={cycleMode} onChange={setCycleMode} />
        {cycleMode === 'future' && futureWorkouts.length > 0 && (
          <button onClick={activateFutureCycle} disabled={activating} style={{
            padding: '8px 18px', background: activating ? '#9BA8C0' : '#4A6FD4', color: 'white',
            border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13,
            cursor: activating ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif",
            boxShadow: '0 2px 8px rgba(74,111,212,0.3)',
          }}>
            {activating ? '⏳ Activation…' : '🚀 Activer ce cycle'}
          </button>
        )}
      </div>

      {/* ── Bandeau info mode futur ── */}
      {cycleMode === 'future' && (
        <div style={{ background: '#EEF4FF', border: '1.5px solid #4A6FD4', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🔵</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0D1B4E' }}>Mode cycle futur</div>
            <div style={{ fontSize: 12, color: '#4A6FD4' }}>
              {futureWorkouts.length === 0
                ? 'Aucune séance encore. Crée le programme ici — le client ne le verra pas avant activation.'
                : `${futureWorkouts.length} séance(s) prête(s). Clique "🚀 Activer" quand tu veux le basculer.`}
            </div>
          </div>
        </div>
      )}

      {/* ── Barre d'outils ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <button onClick={() => setShowAdd(s => !s)} style={btnVariant('primary')}>+ Séance</button>
        <button onClick={exportPDF} disabled={exporting || !displayedWorkouts.length} style={btnVariant('outline')}>{exporting ? '⏳ Export…' : '📄 PDF'}</button>
        <button onClick={() => syncImages(false)} disabled={imageSyncing} style={btnVariant('outline')}>{imageSyncing ? '⏳ Sync…' : '🖼 Images'}</button>
        <button onClick={() => { loadAllClients(); setShowDuplicate(true) }} style={btnVariant('outline')}>📋 Dupliquer</button>
        {cycleMode === 'current' && <button onClick={loadHistory} style={btnVariant('ghost')}>🗂 Historique</button>}
        <button onClick={() => fetchAthleteLogs()} style={btnVariant('ghost')} title="Rafraîchir les logs athlète">🔄</button>
      </div>

      {/* ── Cycle name + archivage (actuel seulement) ── */}
      {cycleMode === 'current' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <input value={currentCycleName} onChange={e => setCurrentCycleName(e.target.value)}
            placeholder="Nom du cycle actuel (ex: Cycle Force #3)" style={{ ...inp, flex: 1, minWidth: 200 }} />
          <button onClick={saveCurrentCycleName} disabled={savingCycleName} style={btnVariant('outline')}>{savingCycleName ? '…' : '💾 Sauver nom'}</button>
          <input value={cycleName} onChange={e => setCycleName(e.target.value)}
            placeholder="Nom pour archiver…" style={{ ...inp, flex: 1, minWidth: 160 }} />
          <button onClick={archiveCycle} disabled={archiving} style={btnVariant('danger')}>{archiving ? '…' : '📦 Archiver'}</button>
        </div>
      )}

      {/* ── Formulaire nouvelle séance ── */}
      {showAdd && (
        <div style={{ background: cycleMode === 'future' ? '#EEF4FF' : '#F0F4FF', borderRadius: 12, padding: 16, marginBottom: 20, border: `1.5px solid ${cycleMode === 'future' ? '#4A6FD4' : '#C5D0F0'}` }}>
          {cycleMode === 'future' && <div style={{ fontSize: 12, color: '#4A6FD4', fontWeight: 700, marginBottom: 10 }}>🔵 Cette séance sera ajoutée au cycle futur</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Nom de la séance</label>
              <input value={newW.name} onChange={e => setNewW(p => ({ ...p, name: e.target.value }))} placeholder="Push Day A, Full Body…" style={inp} />
            </div>
            <div>
              <label style={lbl}>Type</label>
              <select value={newW.type} onChange={e => setNewW(p => ({ ...p, type: e.target.value }))} style={inp}>
                {['Push', 'Pull', 'Legs', 'Full Body', 'Upper', 'Lower', 'Core', 'Cardio', 'WOD', 'Autre'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Jour</label>
              <select value={newW.day_of_week} onChange={e => setNewW(p => ({ ...p, day_of_week: +e.target.value }))} style={inp}>
                {DAYS.map((d, i) => <option key={d} value={DAYS[i]}>{DAYS_FR[i]}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Durée (min)</label>
              <input type="number" value={newW.duration_min} onChange={e => setNewW(p => ({ ...p, duration_min: +e.target.value }))} style={inp} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addWorkout} style={btnVariant('primary')}>✓ Créer</button>
            <button onClick={() => setShowAdd(false)} style={btnVariant('ghost')}>Annuler</button>
          </div>
        </div>
      )}

      {/* ── Liste vide ── */}
      {displayedWorkouts.length === 0 && !showAdd && (
        <div style={{ textAlign: 'center', color: '#9BA8C0', padding: '40px 0', fontSize: 15 }}>
          {cycleMode === 'future'
            ? 'Aucune séance dans le cycle futur — clique sur "+ Séance" pour commencer'
            : 'Aucune séance — clique sur "+ Séance" pour commencer'}
        </div>
      )}

      {/* ── Liste des séances ── */}
      {displayedWorkouts.map(workout => {
        const isOpen = openWorkout === workout.id
        const isEdit = editMode === workout.id
        return (
          <div key={workout.id} style={{ marginBottom: 12, background: 'white', borderRadius: 14, border: `1.5px solid ${cycleMode === 'future' ? '#A0B8F0' : '#E0E6F0'}`, overflow: 'hidden', boxShadow: isOpen ? '0 4px 20px rgba(13,27,78,0.08)' : 'none' }}>

            <div onClick={() => setOpenWorkout(isOpen ? null : workout.id)}
              style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', background: isOpen ? (cycleMode === 'future' ? '#EEF4FF' : '#F0F4FF') : 'white', transition: 'background 0.15s' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0D1B4E', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {workout.name}
                  {cycleMode === 'future' && <span style={{ fontSize: 10, background: '#4A6FD4', color: 'white', padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>FUTUR</span>}
                </div>
                <div style={{ fontSize: 12, color: '#6B7A99', marginTop: 2 }}>
                  {DAYS_FR[(workout.day_of_week || 1) - 1]} · {workout.duration_min || 60} min · {workout.exercises?.length || 0} exercice{(workout.exercises?.length || 0) > 1 ? 's' : ''}
                  {workout.cycle_name && <span style={{ marginLeft: 8, color: '#4A6FD4' }}>· {workout.cycle_name}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
                <button onClick={e => { e.stopPropagation(); setEditMode(isEdit ? null : workout.id); if (!isOpen) setOpenWorkout(workout.id) }}
                  style={{ ...btnVariant(isEdit ? 'primary' : 'outline'), fontSize: 12, padding: '5px 10px' }}>
                  {isEdit ? '✓ Fin édition' : '✏️ Éditer'}
                </button>
                <button onClick={e => { e.stopPropagation(); deleteWorkout(workout.id) }}
                  style={{ ...btnVariant('ghost'), fontSize: 12, color: '#C45C3A', padding: '5px 10px' }}>🗑</button>
                <span style={{ fontSize: 12, color: '#9BA8C0' }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && (
              <div>
                {isEdit && (
                  <div style={{ padding: '10px 16px', background: '#FAFBFF', borderBottom: '1px solid #E0E6F0', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={lbl}>Jour :</label>
                    <select value={workout.day_of_week} onChange={e => updateWorkoutDay(workout.id, e.target.value)} style={{ ...inp, width: 120 }}>
                      {DAYS.map((d, i) => <option key={d} value={DAYS[i]}>{DAYS_FR[i]}</option>)}
                    </select>
                  </div>
                )}

                {!isEdit && workout.exercises?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 56px 80px', gap: 4, padding: '8px 12px 4px', borderBottom: '1px solid #F0F4FF' }}>
                    {['Exercice', 'Séries', 'Reps', 'Repos'].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#9BA8C0', textAlign: h === 'Exercice' ? 'left' : 'center' }}>{h}</div>
                    ))}
                  </div>
                )}

                {(() => {
                  const exercises = workout.exercises || []
                  const grouped = []
                  let i = 0
                  while (i < exercises.length) {
                    const ex = exercises[i]
                    if (ex.group_type && ex.group_type !== 'Normal' && ex.group_id) {
                      const groupExs = exercises.filter(e => e.group_id === ex.group_id)
                      if (!grouped.find(g => g.groupId === ex.group_id))
                        grouped.push({ type: 'group', groupId: ex.group_id, groupType: ex.group_type, exercises: groupExs })
                    } else {
                      grouped.push({ type: 'single', exercise: ex })
                    }
                    i++
                  }
                  return grouped.map((item) => {
                    if (item.type === 'single') {
                      const ex = item.exercise
                      const allExs = workout.exercises || []
                      const exIdx = allExs.findIndex(e => e.id === ex.id)
                      return (
                        <ExRow key={ex.id} ex={ex} wId={workout.id} edit={isEdit}
                          onUpdate={updateExercise} onDelete={deleteExercise} onMove={moveExercise}
                          isFirst={exIdx === 0} isLast={exIdx === allExs.length - 1}
                          recentLog={athleteLogs[ex.name] || null} />
                      )
                    }
                    const color = groupColors[item.groupType] || '#4A6FD4'
                    const allExs = workout.exercises || []
                    return (
                      <div key={item.groupId} style={{ borderLeft: `4px solid ${color}`, margin: '8px 10px', borderRadius: '0 10px 10px 0', background: '#FAFBFF', overflow: 'hidden' }}>
                        <div style={{ padding: '6px 12px', background: color, color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{item.groupType}</span>
                          {isEdit && (
                            <button onClick={() => addExercise(workout.id, item.groupType, item.groupId)}
                              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}>
                              + Exercice
                            </button>
                          )}
                        </div>
                        {item.exercises.map(ex => {
                          const exIdx = allExs.findIndex(e => e.id === ex.id)
                          return (
                            <ExRow key={ex.id} ex={ex} wId={workout.id} edit={isEdit}
                              onUpdate={updateExercise} onDelete={deleteExercise} onMove={moveExercise}
                              isFirst={exIdx === 0} isLast={exIdx === allExs.length - 1}
                              recentLog={athleteLogs[ex.name] || null} />
                          )
                        })}
                      </div>
                    )
                  })
                })()}

                {isEdit && (
                  <div style={{ padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid #F0F4FF' }}>
                    <button onClick={() => addExercise(workout.id, 'Normal', null)} style={btnVariant('outline')}>+ Exercice</button>
                    <button onClick={() => addExercise(workout.id, 'Superset', null)} style={{ ...btnVariant('outline'), borderColor: '#C45C3A', color: '#C45C3A' }}>+ Superset</button>
                    <button onClick={() => addExercise(workout.id, 'Giant Set', null)} style={{ ...btnVariant('outline'), borderColor: '#8FA07A', color: '#8FA07A' }}>+ Giant Set</button>
                    <button onClick={() => addExercise(workout.id, 'Drop Set', null)} style={{ ...btnVariant('outline'), borderColor: '#4A6FD4', color: '#4A6FD4' }}>+ Drop Set</button>
                    <button onClick={() => addWorkoutBlock(workout.id)} style={{ ...btnVariant('outline'), borderColor: '#1A1A2E', color: '#1A1A2E' }}>+ WOD Block</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* ── Modal picker exercice ── */}
      {exPicker && (
        <ExercisePicker
          query={exPickerQuery} setQuery={setExPickerQuery}
          mode={exPickerMode} setMode={setExPickerMode}
          freeText={exPickerFree} setFreeText={setExPickerFree}
          imageFiles={exerciseImageFiles || []}
          onConfirm={confirmAddExercise} onClose={() => setExPicker(null)}
        />
      )}

      {/* ── Modal Workout Block ── */}
      {wbPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 16px', color: '#0D1B4E' }}>Créer un Workout Block</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div><label style={lbl}>Format</label>
                <select value={wbForm.type} onChange={e => setWbForm(p => ({ ...p, type: e.target.value }))} style={inp}>
                  {['For Time', 'AMRAP', 'EMOM', 'Tabata', 'RFT', 'Death By'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Rounds / durée</label><input value={wbForm.rounds} onChange={e => setWbForm(p => ({ ...p, rounds: e.target.value }))} style={inp} /></div>
              <div><label style={lbl}>CAP (min)</label><input value={wbForm.cap} onChange={e => setWbForm(p => ({ ...p, cap: e.target.value }))} placeholder="ex: 20" style={inp} /></div>
              <div><label style={lbl}>Repos entre rounds</label><input value={wbForm.rest} onChange={e => setWbForm(p => ({ ...p, rest: e.target.value }))} style={inp} /></div>
            </div>
            <div style={{ marginBottom: 10 }}><label style={lbl}>Objectif athlète</label><input value={wbForm.objective} onChange={e => setWbForm(p => ({ ...p, objective: e.target.value }))} placeholder="Ex: finir en moins de 15 min" style={inp} /></div>
            <div style={{ marginBottom: 10 }}><label style={lbl}>Note coach</label><input value={wbForm.coachNote} onChange={e => setWbForm(p => ({ ...p, coachNote: e.target.value }))} placeholder="Consigne technique…" style={inp} /></div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Mouvements (1 par ligne)</label>
              <textarea value={wbForm.movements} onChange={e => setWbForm(p => ({ ...p, movements: e.target.value }))}
                placeholder={'21 Thrusters 43kg\n21 Pull-ups\n15 Thrusters\n15 Pull-ups\n9 Thrusters\n9 Pull-ups'}
                rows={6} style={{ ...inp, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={confirmAddWorkoutBlock} style={btnVariant('primary')}>✓ Créer</button>
              <button onClick={() => setWbPicker(null)} style={btnVariant('ghost')}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal duplication ── */}
      {showDuplicate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}>
            <h3 style={{ margin: '0 0 16px', color: '#0D1B4E' }}>Dupliquer le cycle {cycleMode === 'future' ? 'futur' : 'actuel'}</h3>
            <label style={lbl}>Choisir un client</label>
            <select value={duplicateTarget} onChange={e => setDuplicateTarget(e.target.value)} style={{ ...inp, marginBottom: 16 }}>
              <option value="">-- Sélectionner --</option>
              {allClients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer', fontSize: 13, color: '#0D1B4E' }}>
              <input type="checkbox" checked={resetWeights} onChange={e => setResetWeights(e.target.checked)} />
              Remettre les charges à zéro <span style={{ color: '#6B7A99', fontSize: 11 }}>(recommandé pour un nouveau client)</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => duplicateProgram(duplicateTarget)} disabled={!duplicateTarget || duplicating} style={btnVariant('primary')}>
                {duplicating ? '⏳ Duplication…' : '📋 Dupliquer'}
              </button>
              <button onClick={() => setShowDuplicate(false)} style={btnVariant('ghost')}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal historique ── */}
      {showHistory && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#0D1B4E' }}>Historique des cycles</h3>
              <button onClick={() => setShowHistory(false)} style={btnVariant('ghost')}>✕ Fermer</button>
            </div>
            {archivedWorkouts.length === 0
              ? <div style={{ color: '#9BA8C0', textAlign: 'center', padding: '20px 0' }}>Aucun cycle archivé</div>
              : archivedWorkouts.map(w => (
                <div key={w.id} style={{ marginBottom: 10, padding: '10px 14px', background: '#F5F7FF', borderRadius: 10, border: '1px solid #E0E6F0' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0D1B4E' }}>{w.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7A99' }}>
                    {w.cycle_name && <span>{w.cycle_name} · </span>}
                    {DAYS_FR[(w.day_of_week || 1) - 1]} · {(w.exercises || []).length} exercice(s)
                    {w.archived_at && <span> · archivé le {new Date(w.archived_at).toLocaleDateString('fr-FR')}</span>}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}
