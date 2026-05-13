import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { btn, lbl, inp, SUPABASE_URL, DAYS_FR, DAYS } from '../../lib/coachUtils'  // ← AJOUT DAYS
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

  // État pour les notes récentes des athlètes (optionnel)
  const [recentLogs, setRecentLogs] = useState({})

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

  // Charger les notes récentes des athlètes (optionnel)
  useEffect(() => {
    const loadRecentLogs = async () => {
      const { data } = await supabase
        .from('workout_logs')
        .select('exercise_name, notes, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      
      const latest = {}
      data?.forEach(log => {
        if (!latest[log.exercise_name] && log.notes) {
          latest[log.exercise_name] = log.notes
        }
      })
      setRecentLogs(latest)
    }
    loadRecentLogs()
  }, [clientId])

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

  const deleteExercise = async (workoutId, exId) => {
    await supabase.from('exercises').delete().eq('id', exId)
    setWorkouts(prev => prev.map(w => {
      if (w.id === workoutId) {
        return { ...w, exercises: w.exercises.filter(e => e.id !== exId) }
      }
      return w
    }))
  }

  // ✅ FONCTION MOVE EXERCICE CORRIGÉE
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
            ex.target_weight ? `<span class="badge-outline">🏋️ ${ex.target_weight}</span>` : '',
          ].filter(Boolean).join(' ')

          return `
            <div style="display:flex;gap:14px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #F0F4FF;">
              ${img}
              <div style="flex:1;min-width:0;">
                <div style="font-weight:800;font-size:14px;color:#0D1B4E;margin-bottom:5px;">${idx + 1}. ${ex.name || '—'}</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">${details}</div>
                ${ex.note ? `<div style="font-size:12px;color:#6B7A99;background:#F8FAFF;border-left:3px solid #4A6FD4;padding:6px 10px;border-radius:0 6px 6px 0;line-height:1.5;">${ex.note}</div>` : ''}
              </div>
            </div>`
        }).join('')

        const dayLabel = dayNames[(workout.day_of_week || 1) - 1] || ''
        const tag = workout.type ? `<span style="background:#EEF2FF;color:#4A6FD4;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:700;">${workout.type}</span>` : ''

        return `
          <div class="workout-block" style="page-break-inside:avoid;margin-bottom:28px;background:white;border-radius:14px;border:1px solid #E0E6F5;overflow:hidden;box-shadow:0 2px 8px rgba(13,27,78,0.06);">
            <div style="background:linear-gradient(135deg,#0D1B4E,#2C4A9E);padding:14px 20px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:2px;">${dayLabel}</div>
                <div style="font-size:18px;font-weight:900;color:white;">${workout.name}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:3px;">${(workout.exercises || []).length} exercices${workout.duration_min ? ' · ' + workout.duration_min + ' min' : ''}</div>
              </div>
              ${tag}
            </div>
            <div style="padding:4px 20px 8px;">${exercises}</div>
          </div>`
      }).join('')

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Programme — ${clientName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; background: #F5F7FF; color: #0D1B4E; }
    .page { max-width: 800px; margin: 0 auto; padding: 32px 28px; }
    .badge { display:inline-block; background:#0D1B4E; color:white; border-radius:20px; padding:3px 11px; font-size:12px; font-weight:800; }
    .badge-outline { display:inline-block; background:#EEF2FF; color:#4A6FD4; border-radius:20px; padding:3px 11px; font-size:12px; font-weight:700; }
    @media print {
      body { background: white; }
      .page { padding: 16px; }
      .workout-block { page-break-inside: avoid; }
      @page { margin: 1.5cm; size: A4; }
    }
  </style>
</head>
<body>
<div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #E0E6F5;">
    <div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#9BA8C0;margin-bottom:4px;">Programme d'entraînement</div>
      <div style="font-size:32px;font-weight:900;color:#0D1B4E;line-height:1;">${clientName}</div>
      <div style="font-size:13px;color:#6B7A99;margin-top:6px;">Exporté le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${workouts.length} séance${workouts.length > 1 ? 's' : ''}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:22px;font-weight:900;color:#0D1B4E;letter-spacing:1px;">BEN&FIT</div>
      <div style="font-size:9px;color:#9BA8C0;letter-spacing:2px;text-transform:uppercase;">Only Benefit · since 2021</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:28px;">
    ${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((d, i) => {
      const w = workouts.find(x => x.day_of_week === i + 1)
      return `<div style="background:${w ? '#0D1B4E' : '#F0F4FF'};border-radius:8px;padding:8px 4px;text-align:center;">
        <div style="font-size:9px;text-transform:uppercase;color:${w ? 'rgba(255,255,255,0.5)' : '#9BA8C0'};letter-spacing:1px;">${d}</div>
        <div style="font-size:10px;font-weight:700;color:${w ? 'white' : '#C5D0F0'};margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${w ? (w.name.length > 10 ? w.name.substring(0, 10) + '…' : w.name) : '—'}</div>
      </div>`
    }).join('')}
  </div>

  ${workoutBlocks}

  <div style="margin-top:24px;padding-top:16px;border-top:1px solid #E0E6F5;text-align:center;font-size:11px;color:#C5D0F0;">
    BEN&FIT Coach · Programme confidentiel · ${clientName}
  </div>
</div>
<script>window.onload = () => { window.print() }</script>
</body>
</html>`

      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (!win) alert('Autorise les popups pour télécharger le PDF')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch(e) {
      alert('Erreur export : ' + e.message)
    }
    setExporting(false)
  }

  if (loading) return <div style={{ color: '#6B7A99', textAlign: 'center', padding: '40px' }}>Chargement…</div>

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px', marginBottom: '20px' }}>
        {DAYS.map((day, i) => {
          const workout = workouts.find(w => w.day_of_week === i + 1)
          return (
            <div key={day} onClick={() => workout && setOpenWorkout(openWorkout === workout.id ? null : workout.id)} 
              style={{ background: workout ? '#0D1B4E' : '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '8px', padding: '10px 6px', textAlign: 'center', cursor: workout ? 'pointer' : 'default', opacity: workout ? 1 : 0.5 }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: workout ? '#D4E0CC' : '#6B7A99' }}>{day}</div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: workout ? 'white' : '#9A9A8A', marginTop: '4px' }}>{workout ? workout.name : '—'}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '18px', color: '#0D1B4E', letterSpacing: '2px' }}>
            PROGRAMME DE {clientName?.split(' ')[0]?.toUpperCase()}
          </div>
          {workouts[0]?.cycle_name && <div style={{ fontSize: '11px', color: '#4A6FD4', fontWeight: '700', marginTop: '2px' }}>📌 {workouts[0].cycle_name}</div>}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={loadHistory} style={btn('#EEF2FF', '#6B7A99', '#C5D0F0')}>📂 Historique</button>
          <button onClick={() => { setShowDuplicate(!showDuplicate); if (!showDuplicate) loadAllClients() }} style={btn('#EEF2FF', '#0D1B4E', '#4A6FD4')}>📋 Dupliquer</button>
          {workouts.length > 0 && <button onClick={exportPDF} disabled={exporting} style={btn('#C45C3A', 'white')}>{exporting ? '...' : 'Export PDF'}</button>}
          <button onClick={() => setShowAdd(true)} style={btn('#0D1B4E', 'white')}>+ Nouvelle seance</button>
        </div>
      </div>

      {/* Cycle actuel */}
      <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '10px', padding: '10px 14px', marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: '#4A6FD4', fontWeight: '700' }}>📌 Cycle actuel :</span>
        <input value={currentCycleName} onChange={e => setCurrentCycleName(e.target.value)}
          placeholder={workouts[0]?.cycle_name || 'Ex: Cycle Force Mai 2026'}
          style={{ padding: '5px 10px', border: '1.5px solid #C5D0F0', borderRadius: '7px', fontSize: '12px', fontFamily: "'DM Sans',sans-serif", outline: 'none', minWidth: '200px', flex: 1 }} />
        <button onClick={saveCurrentCycleName} disabled={savingCycleName || !currentCycleName.trim()}
          style={btn(!currentCycleName.trim() ? '#E0E0E0' : '#4A6FD4', 'white')}>
          {savingCycleName ? '...' : 'Sauvegarder'}
        </button>
      </div>

      {/* Archiver */}
      {workouts.length > 0 && (
        <div style={{ background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: '10px', padding: '10px 14px', marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#7B6000', fontWeight: '700' }}>📦 Archiver ce cycle :</span>
          <input value={cycleName} onChange={e => setCycleName(e.target.value)}
            placeholder={workouts[0]?.cycle_name || 'Ex: Cycle 13 Mars 2026'}
            style={{ padding: '5px 10px', border: '1.5px solid #FFD54F', borderRadius: '7px', fontSize: '12px', fontFamily: "'DM Sans',sans-serif", outline: 'none', minWidth: '200px', flex: 1 }} />
          <button onClick={archiveCycle} disabled={archiving || !cycleName.trim()}
            style={btn(!cycleName.trim() || archiving ? '#CCC' : '#FF8F00', 'white')}>
            {archiving ? 'Archivage...' : 'Archiver'}
          </button>
        </div>
      )}

      {/* Historique */}
      {showHistory && (
        <div style={{ background: '#F0F4FF', border: '2px solid #4A6FD4', borderRadius: '12px', padding: '16px 20px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#0D1B4E' }}>📂 Historique des cycles</div>
            <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9BA8C0', fontSize: '20px' }}>×</button>
          </div>
          {archivedWorkouts.length === 0 ? (
            <div style={{ color: '#9BA8C0', fontSize: '13px', textAlign: 'center', padding: '12px' }}>Aucun cycle archive.</div>
          ) : (() => {
            const grp = {}
            archivedWorkouts.forEach(w => {
              const k = w.cycle_name || 'Sans nom'
              if (!grp[k]) grp[k] = { ws: [], dt: w.archived_at }
              grp[k].ws.push(w)
            })
            return Object.entries(grp).map(([name, { ws, dt }]) => (
              <details key={name} style={{ marginBottom: '8px', background: 'white', borderRadius: '9px', border: '1px solid #C5D0F0' }}>
                <summary style={{ padding: '10px 14px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', color: '#0D1B4E', listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
                  <span>📌 {name}</span>
                  <span style={{ fontSize: '11px', color: '#9BA8C0', fontWeight: '400' }}>{ws.length} seance{ws.length > 1 ? 's' : ''} · {dt ? new Date(dt).toLocaleDateString('fr-FR') : ''}</span>
                </summary>
                <div style={{ padding: '8px 14px 12px', borderTop: '1px solid #E8ECFA' }}>
                  {ws.map(w => (
                    <div key={w.id} style={{ marginBottom: '6px' }}>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: '#0D1B4E' }}>{w.name}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px' }}>
                        {(w.exercises || []).slice(0, 8).map(e => <span key={e.id} style={{ fontSize: '11px', background: '#EEF2FF', color: '#4A6FD4', padding: '2px 8px', borderRadius: '20px' }}>{e.name}</span>)}
                        {(w.exercises || []).length > 8 && <span style={{ fontSize: '11px', color: '#9BA8C0' }}>+{(w.exercises || []).length - 8} autres</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))
          })()}
        </div>
      )}

      {/* Panneau Dupliquer */}
      {showDuplicate && (
        <div style={{ background: '#F0F4FF', border: '2px solid #4A6FD4', borderRadius: '12px', padding: '16px 20px', marginBottom: '14px' }}>
          <div style={{ fontWeight: '800', fontSize: '14px', color: '#0D1B4E', marginBottom: '12px' }}>
            📋 Dupliquer le programme de {clientName?.split(' ')[0]} vers :
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={duplicateTarget} onChange={e => setDuplicateTarget(e.target.value)}
              style={{ flex: 1, minWidth: '200px', padding: '8px 12px', border: '1.5px solid #C5D0F0', borderRadius: '8px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", outline: 'none' }}>
              <option value=''>— Choisir un client —</option>
              {allClients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            <button onClick={() => duplicateProgram(duplicateTarget)} disabled={!duplicateTarget || duplicating}
              style={btn(!duplicateTarget || duplicating ? '#CCC' : '#4A6FD4', 'white')}>
              {duplicating ? '⏳ Duplication…' : '✓ Dupliquer'}
            </button>
            <button onClick={() => { setShowDuplicate(false); setDuplicateTarget('') }} style={btn('transparent', '#9BA8C0', '#C5D0F0')}>Annuler</button>
          </div>
          {allClients.length === 0 && <div style={{ fontSize: '12px', color: '#9BA8C0', marginTop: '8px' }}>Chargement des clients…</div>}
        </div>
      )}

      {showAdd && (
        <div style={{ background: '#F0F4FF', border: '2px solid #4A6FD4', borderRadius: '12px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '12px' }}>
            <div><label style={lbl}>Nom</label><input value={newW.name} onChange={e => setNewW(p => ({ ...p, name: e.target.value }))} placeholder="Push A" style={inp} /></div>
            <div><label style={lbl}>Type</label>
              <select value={newW.type} onChange={e => setNewW(p => ({ ...p, type: e.target.value }))} style={inp}>
                {['Push','Pull','Legs','Full Body','Upper','Lower','Cardio','Autre'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Jour</label>
              <select value={newW.day_of_week} onChange={e => setNewW(p => ({ ...p, day_of_week: +e.target.value }))} style={inp}>
                {DAYS_FR.map((d, i) => <option key={d} value={i+1}>{d}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Durée (min)</label><input type="number" value={newW.duration_min} onChange={e => setNewW(p => ({ ...p, duration_min: +e.target.value }))} style={inp} /></div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={addWorkout} style={btn('#0D1B4E', 'white')}>✓ Créer</button>
            <button onClick={() => setShowAdd(false)} style={btn('transparent', '#6B7A99', '#C5D0F0')}>Annuler</button>
          </div>
        </div>
      )}

      {workouts.length === 0 && !showAdd && (
        <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#6B7A99' }}>
          Aucune séance pour {clientName?.split(' ')[0]}. Clique sur "+ Nouvelle séance" pour commencer 💪
        </div>
      )}

      {workouts.map(workout => {
        const isOpen = openWorkout === workout.id
        const isEdit = editMode === workout.id
        return (
          <div key={workout.id} style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: isOpen ? '1px solid #C5D0F0' : 'none' }}>
              <div onClick={() => setOpenWorkout(isOpen ? null : workout.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
                <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '20px', background: '#D4E0CC', color: '#0D1B4E' }}>{workout.type}</span>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>{workout.name}</div>
                  <div style={{ fontSize: '12px', color: '#6B7A99' }}>{workout.exercises?.length||0} exercices · {workout.duration_min} min</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select value={workout.day_of_week || 1} onChange={e => { e.stopPropagation(); updateWorkoutDay(workout.id, e.target.value) }}
                  style={{ padding: '4px 8px', border: '1.5px solid #C5D0F0', borderRadius: '6px', fontSize: '12px', fontFamily: "'DM Sans',sans-serif", background: 'white', outline: 'none', color: '#0D1B4E', cursor: 'pointer' }}>
                  {DAYS_FR.map((d, i) => <option key={d} value={i+1}>{d}</option>)}
                </select>
                <span onClick={() => setOpenWorkout(isOpen ? null : workout.id)} style={{ color: '#6B7A99', fontSize: '12px', cursor: 'pointer' }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && (
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button
                    onClick={async () => {
                      if (isEdit) {
                        await syncImages(false)
                        setEditMode(null)
                      } else {
                        setEditMode(workout.id)
                      }
                    }}
                    style={btn(isEdit ? '#0D1B4E' : 'white', isEdit ? 'white' : '#6B7A99', '#C5D0F0')}
                  >
                    {isEdit ? '✓ Terminer édition' : '✏️ Modifier'}
                  </button>
                  {isEdit && <button onClick={() => deleteWorkout(workout.id)} style={{ ...btn('rgba(196,92,58,0.1)', '#C45C3A'), marginLeft: 'auto' }}>🗑 Supprimer</button>}
                </div>

                {workout.exercises?.length > 0 && !isEdit && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 80px 90px 1fr', gap: '6px', padding: '8px 14px', marginBottom: '4px' }}>
                    {['Exercice','Séries','Reps','Repos','Charge','Notes'].map((h,i) => (
                      <div key={i} style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6B7A99' }}>{h}</div>
                    ))}
                  </div>
                )}

                {(() => {
                  const exs = workout.exercises || []
                  const rendered = new Set()
                  return exs.map(ex => {
                    if (rendered.has(ex.id)) return null
                    
                    // Ajout de la note récente pour affichage (optionnel)
                    const recentNote = recentLogs[ex.name]
                    
                    if (ex.group_id && ex.group_type === 'Workout Block') {
                      const group = exs.filter(e => e.group_id === ex.group_id)
                      group.forEach(e => rendered.add(e.id))
                      let meta = {}
                      try { meta = JSON.parse(group[0]?.note || '{}') } catch {}
                      const typeColors = {
                        'For Time': '#C45C3A', 'AMRAP': '#4A6FD4', 'EMOM': '#8FA07A',
                        'Hyrox': '#0D1B4E', 'Interval': '#6B4FD4', 'Zone 2': '#3A7A5A', 'Cap Time': '#B8860B'
                      }
                      const tc = typeColors[meta.type] || '#1A1A2E'
                      return (
                        <div key={ex.group_id} style={{ borderRadius: '12px', marginBottom: '14px', overflow: 'hidden', border: `2px solid ${tc}`, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                          <div style={{ background: tc, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '16px' }}>🔥</span>
                              <div>
                                <div style={{ color: 'white', fontWeight: '800', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                  {meta.type || 'Workout Block'}
                                  {meta.cap ? ` — CAP ${meta.cap} min` : ''}
                                  {meta.rounds && meta.rounds > 1 ? ` · ${meta.rounds} rounds` : ''}
                                </div>
                                {meta.objective && <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', marginTop: '2px' }}>🎯 {meta.objective}</div>}
                              </div>
                            </div>
                            {isEdit && (
                              <button onClick={() => {
                                if (confirm('Supprimer ce Workout Block ?')) {
                                  group.forEach(e => deleteExercise(workout.id, e.id))
                                }
                              }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                                🗑
                              </button>
                            )}
                          </div>
                          <div style={{ background: '#1A1A2E', padding: '12px 16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {group.map((e, i) => (
                                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', borderBottom: i < group.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                                  <span style={{ color: tc, fontSize: '12px', fontWeight: '800', minWidth: '16px' }}>•</span>
                                  <span style={{ color: 'white', fontSize: '13px', fontWeight: '500', flex: 1 }}>{e.name}</span>
                                </div>
                              ))}
                            </div>
                            {meta.coachNote && (
                              <div style={{ marginTop: '10px', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '7px', borderLeft: `3px solid ${tc}` }}>
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>🧠 Note coach </span>
                                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px' }}>{meta.coachNote}</span>
                              </div>
                            )}
                            {meta.rest && meta.rest !== '0s' && (
                              <div style={{ marginTop: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>⏱ Repos entre rounds : {meta.rest}</div>
                            )}
                          </div>
                        </div>
                      )
                    }
                    if (ex.group_id && ex.group_type !== 'Normal') {
                      const group = exs.filter(e => e.group_id === ex.group_id)
                      group.forEach(e => rendered.add(e.id))
                      return (
                        <div key={ex.group_id} style={{ border: `2px solid ${groupColors[ex.group_type]||'#C5D0F0'}`, borderRadius: '10px', marginBottom: '10px', overflow: 'hidden' }}>
                          <div style={{ background: groupColors[ex.group_type]||'#C5D0F0', color: 'white', padding: '4px 12px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                            <span>⚡ {ex.group_type}</span>
                            {isEdit && <button onClick={() => addExercise(workout.id, ex.group_type, ex.group_id)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>+ Exercice</button>}
                          </div>
                          {group.map((e, ei) => <ExRow key={e.id} ex={e} wId={workout.id} edit={isEdit} onUpdate={updateExercise} onDelete={deleteExercise} onMove={moveExercise} isFirst={ei===0} isLast={ei===group.length-1} recentNote={recentNote} />)}
                        </div>
                      )
                    }
                    rendered.add(ex.id)
                    return <ExRow key={ex.id} ex={ex} wId={workout.id} edit={isEdit} onUpdate={updateExercise} onDelete={deleteExercise} onMove={moveExercise} isFirst={exs.indexOf(ex)===0} isLast={exs.indexOf(ex)===exs.length-1} recentNote={recentNote} />
                  })
                })()}

                {workout.exercises?.length === 0 && !isEdit && (
                  <div style={{ textAlign: 'center', color: '#6B7A99', fontSize: '13px', padding: '16px' }}>Passe en mode édition pour ajouter des exercices</div>
                )}

                {isEdit && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <button onClick={() => addExercise(workout.id, 'Normal', null)} style={btn('#0D1B4E', 'white')}>+ Exercice</button>
                    <button onClick={() => addExercise(workout.id, 'Superset', null)} style={btn('#C45C3A', 'white')}>⚡ Superset</button>
                    <button onClick={() => addExercise(workout.id, 'Giant Set', null)} style={btn('#8FA07A', 'white')}>🔗 Giant Set</button>
                    <button onClick={() => addExercise(workout.id, 'Drop Set', null)} style={btn('#4A6FD4', 'white')}>📉 Drop Set</button>
                    <button onClick={() => addWorkoutBlock(workout.id)} style={{ ...btn('#1A1A2E', 'white'), border: '2px solid #C45C3A' }}>🔥 Workout Block</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {wbPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1A1A2E', borderRadius: '16px', padding: '24px', width: '480px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: '800', fontSize: '17px', color: 'white', marginBottom: '4px' }}>🔥 Workout Block</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>WOD · HYROX · Circuit · Finisher</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Type</label>
                <select value={wbForm.type} onChange={e => setWbForm(p => ({ ...p, type: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", background: 'rgba(255,255,255,0.07)', color: 'white', outline: 'none' }}>
                  {['For Time','AMRAP','EMOM','Hyrox','Interval','Zone 2','Cap Time'].map(t => <option key={t} value={t} style={{ background: '#1A1A2E' }}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Rounds</label>
                <input type="number" value={wbForm.rounds} onChange={e => setWbForm(p => ({ ...p, rounds: e.target.value }))} placeholder="3"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", background: 'rgba(255,255,255,0.07)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Cap (min)</label>
                <input value={wbForm.cap} onChange={e => setWbForm(p => ({ ...p, cap: e.target.value }))} placeholder="18"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", background: 'rgba(255,255,255,0.07)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>Repos entre rounds</label>
                <input value={wbForm.rest} onChange={e => setWbForm(p => ({ ...p, rest: e.target.value }))} placeholder="90s"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", background: 'rgba(255,255,255,0.07)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>🎯 Objectif séance</label>
              <input value={wbForm.objective} onChange={e => setWbForm(p => ({ ...p, objective: e.target.value }))} placeholder="Ex: tenir allure stable, ne pas exploser au round 1…"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", background: 'rgba(255,255,255,0.07)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>🧠 Note coach</label>
              <input value={wbForm.coachNote} onChange={e => setWbForm(p => ({ ...p, coachNote: e.target.value }))} placeholder="Ex: ne pas exploser au round 1, garder 80% allure"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", background: 'rgba(255,255,255,0.07)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>
                Mouvements <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>(1 par ligne)</span>
              </label>
              <textarea value={wbForm.movements} onChange={e => setWbForm(p => ({ ...p, movements: e.target.value }))}
                placeholder="500m Run&#10;15 Wall Balls&#10;15m Sled Push&#10;12 Burpees Broad Jump"
                rows={6}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", background: 'rgba(255,255,255,0.07)', color: 'white', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: '1.7' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={confirmAddWorkoutBlock} disabled={!wbForm.movements.trim()}
                style={{ flex: 1, padding: '11px', background: wbForm.movements.trim() ? '#C45C3A' : '#444', color: 'white', border: 'none', borderRadius: '9px', fontSize: '14px', fontWeight: '700', cursor: wbForm.movements.trim() ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans',sans-serif" }}>
                🔥 Créer le Workout Block
              </button>
              <button onClick={() => setWbPicker(null)}
                style={{ padding: '11px 16px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '9px', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {exPicker && (
        <ExercisePicker
          picker={exPicker}
          query={exPickerQuery}
          setQuery={setExPickerQuery}
          mode={exPickerMode}
          setMode={setExPickerMode}
          freeVal={exPickerFree}
          setFreeVal={setExPickerFree}
          onConfirm={confirmAddExercise}
          onClose={() => setExPicker(null)}
          exerciseFiles={exerciseImageFiles}
          supabaseUrl={SUPABASE_URL}
          loading={imageFilesLoading}
        />
      )}
    </div>
  )
}
