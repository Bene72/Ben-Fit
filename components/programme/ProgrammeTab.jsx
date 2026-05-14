import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { btn, lbl, inp, SUPABASE_URL, DAYS, DAYS_FR } from '../../lib/coachUtils'
import ExRow from './ExerciseRow'
import ExercisePicker from './ExercisePicker'

export default function ProgrammeTab({ clientId, clientName, coachId }) {
  const [workouts, setWorkouts] = useState([])
  const [openWorkout, setOpenWorkout] = useState(null)
  const [editMode, setEditMode] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newW, setNewW] = useState({ name: '', type: 'Push', day_of_week: 1, duration_min: 60 })
  const [loading, setLoading] = useState(true)
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState('')
  const [allClients, setAllClients] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [archivedWorkouts, setArchivedWorkouts] = useState([])
  const [archiving, setArchiving] = useState(false)
  const [cycleName, setCycleName] = useState('')
  const [exporting, setExporting] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiProposal, setAiProposal] = useState(null)
  const [aiError, setAiError] = useState('')
  const [inserting, setInserting] = useState(false)
  const [imageSyncing, setImageSyncing] = useState(false)
  const [exerciseImageFiles, setExerciseImageFiles] = useState([])
  const [imageFilesLoading, setImageFilesLoading] = useState(true)

  // ── Notes athlète : charger les derniers logs pour affichage côté coach ──
  const [athleteLogs, setAthleteLogs] = useState({})

  useEffect(() => {
    if (!clientId) return
    const fetchAthleteLogs = async () => {
      let data = null
      const r1 = await supabase.from('workout_logs')
        .select('exercise_name, notes, note, comment, weight_used, reps_done, logged_at, created_at')
        .eq('client_id', clientId)
        .order('logged_at', { ascending: false })
        .limit(500)
      if (!r1.error && r1.data?.length) {
        data = r1.data
      } else {
        const r2 = await supabase.from('workout_sessions')
          .select('exercise_name, comment, weight_used, reps_done, created_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(500)
        if (!r2.error) data = r2.data
      }
      if (!data) return
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
    fetchAthleteLogs()
  }, [clientId])

  async function reloadWorkouts() {
    const { data, error } = await supabase
      .from('workouts')
      .select('*, exercises(*)')
      .eq('client_id', clientId)
      .eq('is_archived', false)
      .order('day_of_week')
    if (error) {
      console.error(error)
      setWorkouts([])
      return
    }
    
    setWorkouts((data || []).map(w => ({ 
      ...w, 
      exercises: (w.exercises || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)) 
    })))
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
  }, [clientId])

  useEffect(() => {
    setImageFilesLoading(true)
    fetch('/api/exercise-images')
      .then(r => r.json())
      .then(d => {
        const files = (d.files || []).filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr'))
        setExerciseImageFiles(files)
        setImageFilesLoading(false)
      })
      .catch(() => setImageFilesLoading(false))
  }, [])

  // États pour le picker d'exercice
  const [exPicker, setExPicker] = useState(null)
  const [exPickerQuery, setExPickerQuery] = useState('')
  const [exPickerMode, setExPickerMode] = useState('search')
  const [exPickerFree, setExPickerFree] = useState('')

  const addExercise = (workoutId, groupType, groupId) => {
    setExPicker({ workoutId, groupType, groupId })
    setExPickerQuery('')
    setExPickerMode('search')
    setExPickerFree('')
  }

  const confirmAddExercise = async (name, imageUrl) => {
    if (!exPicker || !name.trim()) return
    
    const { workoutId, groupType, groupId } = exPicker
    const w = workouts.find(w => w.id === workoutId)
    const gid = groupId || (groupType !== 'Normal' ? Date.now().toString() : null)
    
    const payload = {
      workout_id: workoutId,
      name: name.trim(),
      sets: 3,
      reps: '10',
      rest: '90s',
      note: '',
      target_weight: '',
      order_index: w?.exercises?.length || 0,
      group_type: groupType || 'Normal',
      group_id: gid,
    }
    const { data, error } = await supabase.from('exercises').insert(payload).select().single()
    if (error) { console.error('Erreur insertion:', error); alert('Erreur: ' + error.message); return }
    
    if (data) {
      if (imageUrl) {
        supabase.from('exercises').update({ image_url: imageUrl }).eq('id', data.id).then(({ error: imgErr }) => {
          if (imgErr) console.warn('image_url non sauvegardée en BDD')
        })
      }
      const exWithImg = { ...data, image_url: imageUrl || null }
      setWorkouts(prev => prev.map(w => {
        if (w.id === workoutId) {
          return { ...w, exercises: [...(w.exercises || []), exWithImg].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)) }
        }
        return w
      }))
    }
    
    setExPicker(null)
  }

  const [wbPicker, setWbPicker] = useState(null)
  const [wbForm, setWbForm] = useState({
    type: 'For Time', rounds: '3', cap: '18', rest: '90s',
    objective: '', coachNote: '', movements: ''
  })

  const updateExercise = async (workoutId, exId, field, value) => {
    setWorkouts(prev => prev.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e)
        }
      }
      return w
    }))

    let payload = { [field]: value }

    if (field === 'name') {
      try {
        const exNorm = value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
        const nf = exerciseImageFiles.map(name => ({
          normalized: name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim(),
          url: `${SUPABASE_URL}/storage/v1/object/public/exercise-images/${encodeURIComponent(name)}`
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

    const upRes = await supabase.from('exercises').update(payload).eq('id', exId)
    if (upRes.error?.message?.includes('image_url')) {
      const { image_url: _x, ...payloadSafe } = payload
      await supabase.from('exercises').update(payloadSafe).eq('id', exId)
    }

    if (field === 'name' && payload.image_url) {
      setWorkouts(prev => prev.map(w => {
        if (w.id === workoutId) {
          return {
            ...w,
            exercises: w.exercises.map(e => e.id === exId ? { ...e, image_url: payload.image_url } : e)
          }
        }
        return w
      }))
    }
  }

  // Mettre à jour la note partagée (coach ↔ athlète)
  const updateExerciseNote = async (exerciseId, note) => {
    const { error } = await supabase
      .from('exercises')
      .update({ note: note })
      .eq('id', exerciseId)
    
    if (error) {
      console.error('Erreur mise à jour note:', error)
      alert('Erreur: ' + error.message)
      return
    }
    
    // Mettre à jour le state local
    setWorkouts(prev => prev.map(workout => ({
      ...workout,
      exercises: workout.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, note: note } : ex
      )
    })))
  }

  const deleteExercise = async (workoutId, exId) => {
    await supabase.from('exercises').delete().eq('id', exId)
    setWorkouts(prev => prev.map(w => {
      if (w.id === workoutId) {
        return { ...w, exercises: w.exercises.filter(e => e.id !== exId) }
      }
      return w
    }))
  }

  // FONCTION MOVE EXERCICE CORRIGÉE
  const moveExercise = async (workoutId, exId, direction) => {
    const w = workouts.find(w => w.id === workoutId)
    if (!w) return
    
    const exs = [...w.exercises]
    const idx = exs.findIndex(e => e.id === exId)
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= exs.length) return
    
    const ex1 = exs[idx]
    const ex2 = exs[newIdx]
    
    const order1 = ex1.order_index ?? idx
    const order2 = ex2.order_index ?? newIdx
    
    await supabase
      .from('exercises')
      .update({ order_index: order2 })
      .eq('id', ex1.id)
    
    await supabase
      .from('exercises')
      .update({ order_index: order1 })
      .eq('id', ex2.id)
    
    const newExercises = [...exs]
    newExercises[idx] = { ...ex2, order_index: order1 }
    newExercises[newIdx] = { ...ex1, order_index: order2 }
    
    setWorkouts(prev => prev.map(ww => 
      ww.id === workoutId ? { ...ww, exercises: newExercises } : ww
    ))
  }

  const loadAllClients = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'client').neq('id', clientId).order('full_name')
    setAllClients(data || [])
  }

  const duplicateProgram = async (targetClientId) => {
    if (!targetClientId) return
    setDuplicating(true)
    try {
      const { data: freshWorkouts, error: wErr } = await supabase
        .from('workouts').select('*, exercises(*)').eq('client_id', clientId).eq('is_archived', false).order('day_of_week')
      if (wErr) throw new Error('Erreur chargement workouts : ' + wErr.message)
      if (!freshWorkouts?.length) { alert('Aucune séance à dupliquer.'); return }

      let totalExInserted = 0
      for (const workout of freshWorkouts) {
        const exs = (workout.exercises || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        const { data: newWorkout, error: wInsErr } = await supabase.from('workouts').insert({
          client_id: targetClientId,
          name: workout.name,
          type: workout.type,
          day_of_week: workout.day_of_week,
          duration_min: workout.duration_min,
          cycle_name: workout.cycle_name || null
        }).select().single()
        if (wInsErr) throw new Error('Erreur création séance : ' + wInsErr.message)
        if (!newWorkout || !exs.length) continue

        const groupIdMap = {}
        let gIdx = 0
        exs.forEach(ex => {
          if (ex.group_id && !groupIdMap[ex.group_id]) {
            groupIdMap[ex.group_id] = `dup_${newWorkout.id.slice(0, 8)}_g${gIdx++}`
          }
        })

        for (const ex of exs) {
          const payload = {
            workout_id: newWorkout.id,
            name: String(ex.name || ''),
            sets: ex.sets != null ? parseInt(ex.sets) || null : null,
            reps: ex.reps != null ? String(ex.reps) : null,
            rest: ex.rest || null,
            note: ex.note || null,
            target_weight: ex.target_weight || null,
            order_index: parseInt(ex.order_index) || 0,
            group_type: ex.group_type || 'Normal',
            group_id: ex.group_id ? groupIdMap[ex.group_id] : null,
          }
          const { error: exErr } = await supabase.from('exercises').insert(payload)
          if (exErr) console.error('Erreur insert exercice', ex.name, exErr.message)
          else totalExInserted++
        }
      }
      setShowDuplicate(false)
      setDuplicateTarget('')
      alert(`Programme dupliqué ! (${freshWorkouts.length} séances · ${totalExInserted} exercices)`)
    } catch(e) { alert('Erreur : ' + e.message) }
    finally { setDuplicating(false) }
  }

  const addWorkout = async () => {
    if (!newW.name.trim()) return
    const { data } = await supabase
      .from('workouts')
      .insert({ ...newW, client_id: clientId })
      .select()
      .single()
    
    if (data) {
      setWorkouts(prev => [...prev, { ...data, exercises: [] }])
      setShowAdd(false)
      setNewW({ name: '', type: 'Push', day_of_week: 1, duration_min: 60 })
      setOpenWorkout(data.id)
      setEditMode(data.id)
    }
  }

  const deleteWorkout = async (id) => {
    if (!confirm('Supprimer cette séance ?')) return
    await supabase.from('workouts').delete().eq('id', id)
    setWorkouts(prev => prev.filter(w => w.id !== id))
    if (openWorkout === id) setOpenWorkout(null)
  }

  const [currentCycleName, setCurrentCycleName] = useState('')
  const [savingCycleName, setSavingCycleName] = useState(false)

  const saveCurrentCycleName = async () => {
    if (!currentCycleName.trim()) return
    setSavingCycleName(true)
    await supabase.from('workouts').update({ cycle_name: currentCycleName.trim() }).eq('client_id', clientId).eq('is_archived', false)
    setSavingCycleName(false)
    alert('Nom du cycle sauvegarde !')
  }

  const archiveCycle = async () => {
    if (!cycleName.trim()) { alert("Donne un nom a ce cycle avant de l'archiver"); return }
    if (!confirm('Archiver ce cycle ? Les seances seront archivees et le programme sera vide.')) return
    setArchiving(true)
    try {
      await supabase.from('workouts').update({ is_archived: true, cycle_name: cycleName.trim(), archived_at: new Date().toISOString() }).eq('client_id', clientId).eq('is_archived', false)
      setWorkouts([])
      setCycleName('')
      setCurrentCycleName('')
    } catch(e) { alert('Erreur: ' + e.message) }
    setArchiving(false)
  }

  const loadHistory = async () => {
    const { data } = await supabase.from('workouts').select('*, exercises(*)').eq('client_id', clientId).eq('is_archived', true).order('archived_at', { ascending: false })
    setArchivedWorkouts(data || [])
    setShowHistory(true)
  }

  const updateWorkoutDay = async (workoutId, newDay) => {
    await supabase.from('workouts').update({ day_of_week: +newDay }).eq('id', workoutId)
    setWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, day_of_week: +newDay } : w))
  }

  const groupColors = { 'Superset': '#C45C3A', 'Giant Set': '#8FA07A', 'Drop Set': '#4A6FD4', 'Workout Block': '#1A1A2E' }

  const addWorkoutBlock = (workoutId) => {
    setWbPicker({ workoutId })
    setWbForm({ type: 'For Time', rounds: '3', cap: '', rest: '90s', objective: '', coachNote: '', movements: '' })
  }

  const confirmAddWorkoutBlock = async () => {
    if (!wbPicker || !wbForm.movements.trim()) return
    const { workoutId } = wbPicker
    const w = workouts.find(w => w.id === workoutId)
    const gid = 'wb_' + Date.now().toString()
    const meta = JSON.stringify({
      type: wbForm.type,
      rounds: wbForm.rounds,
      cap: wbForm.cap,
      rest: wbForm.rest,
      objective: wbForm.objective,
      coachNote: wbForm.coachNote
    })
    
    const lines = wbForm.movements.split('\n').map(l => l.trim()).filter(Boolean)
    const baseIdx = w?.exercises?.length || 0
    const rows = lines.map((line, i) => ({
      workout_id: workoutId,
      name: line,
      sets: parseInt(wbForm.rounds) || 1,
      reps: '',
      rest: i === lines.length - 1 ? wbForm.rest : '0s',
      note: i === 0 ? meta : '',
      target_weight: '',
      order_index: baseIdx + i,
      group_type: 'Workout Block',
      group_id: gid,
    }))
    
    const { data } = await supabase.from('exercises').insert(rows).select()
    if (data) {
      setWorkouts(prev => prev.map(w => {
        if (w.id === workoutId) {
          return { ...w, exercises: [...(w.exercises || []), ...data] }
        }
        return w
      }))
    }
    setWbPicker(null)
  }

  const syncImages = async (forceAll = false) => {
    setImageSyncing(true)
    try {
      const normalizedFiles = exerciseImageFiles.map(name => ({
        original: name,
        normalized: name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim(),
        url: `${SUPABASE_URL}/storage/v1/object/public/exercise-images/${encodeURIComponent(name)}`
      }))

      const toSync = []
      for (const workout of workouts) {
        for (const ex of (workout.exercises || [])) {
          if (!forceAll && ex.image_url) continue
          toSync.push(ex)
        }
      }

      if (!toSync.length) {
        alert('✅ Toutes les images sont déjà synchronisées')
        setImageSyncing(false)
        return
      }

      for (const ex of toSync) {
        const exNorm = ex.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
        
        let match = normalizedFiles.find(f => f.normalized === exNorm)
        if (!match) match = normalizedFiles.find(f => f.normalized.includes(exNorm) || exNorm.includes(f.normalized))
        
        if (match) {
          const sRes = await supabase.from('exercises').update({ image_url: match.url }).eq('id', ex.id)
          if (sRes.error?.message?.includes('image_url')) console.warn('ALTER TABLE exercises ADD COLUMN image_url text;')
        }
      }

      await reloadWorkouts()
      alert('✅ Images synchronisées !')
    } catch (e) {
      alert('Erreur sync images: ' + e.message)
    }
    setImageSyncing(false)
  }

  const exportPDF = async () => {
    setExporting(true)
    try {
      const imgToBase64 = async (url) => {
        try {
          const res = await fetch(url)
          const blob = await res.blob()
          return await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.readAsDataURL(blob)
          })
        } catch { return null }
      }

      const allExercises = workouts.flatMap(w => w.exercises || [])
      const imgCache = {}
      await Promise.all(allExercises.filter(e => e.image_url).map(async (e) => {
        if (!imgCache[e.image_url]) {
          imgCache[e.image_url] = await imgToBase64(e.image_url)
        }
      }))

      const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

      const workoutBlocks = workouts.map(workout => {
        const exercises = (workout.exercises || []).map((ex, idx) => {
          const img = ex.image_url && imgCache[ex.image_url]
            ? `<img src="${imgCache[ex.image_url]}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid #e0e6f0;" />`
            : `<div style="width:72px;height:72px;border-radius:8px;background:#EEF2FF;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">💪</div>`

          const details = [
            ex.sets && ex.reps ? `<span class="badge">${ex.sets} × ${ex.reps}</span>` : '',
            ex.rest ? `<span class="badge-outline">⏱ ${ex.rest}</span>` : '',
            ex.target_weight ? `<span class="badge-outline">🏋️ ${ex.target_weight}</span>` :
