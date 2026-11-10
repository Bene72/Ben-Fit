import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { must } from '../../lib/db'
import { printProgramme } from '../../lib/programme/exportPdf'
import { buildImageIndex, findExerciseImage } from '../../lib/exerciseImages'
import {
  duplicateWorkouts,
  syncExerciseImages,
  listExerciseImageFiles,
} from '../../lib/programme/duplicate'
import ExercisePicker from './ExercisePicker'
import { Toast, useToast } from '../Toast'
// CORRECTIF AUDIT 09/09/2026 (point 4 : découpage des gros fichiers, 2e
// passe) — les 3 modales ci-dessous étaient inline dans ce fichier
// (1993 lignes). Extraites tel quel, sans changement de comportement. Le
// reste du fichier (éditeur de cycle/workouts, ~30 états imbriqués) est
// resté en place : trop couplé pour être découpé sans risque de régression
// sans pouvoir retester contre un vrai Supabase.
import WorkoutBlockPickerModal from './programme/WorkoutBlockPickerModal'
import WorkoutCard from './programme/WorkoutCard'
import CycleToggle from './programme/CycleToggle'
import ProgrammeToolbar from './programme/ProgrammeToolbar'
import CycleNameBar from './programme/CycleNameBar'
import NewWorkoutForm from './programme/NewWorkoutForm'
import DuplicateCycleModal from './programme/DuplicateCycleModal'
import CycleHistoryModal from './programme/CycleHistoryModal'

export default function ProgrammeTab({ clientId, clientName, coachId }) {
  const { toast, showToast } = useToast()
  const [cycleMode, setCycleMode] = useState('current')
  const [workouts, setWorkouts] = useState([])
  const [futureWorkouts, setFutureWorkouts] = useState([])
  const [openWorkout, setOpenWorkout] = useState(null)
  const [editMode, setEditMode] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newW, setNewW] = useState({ name: '', type: 'Push', day_of_week: 1, duration_min: 60 })
  const [loading, setLoading] = useState(true)
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState('')
  const [resetWeights, setResetWeights] = useState(true)
  const [allClients, setAllClients] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [archivedWorkouts, setArchivedWorkouts] = useState([])
  const [openArchivedCycle, setOpenArchivedCycle] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [cycleName, setCycleName] = useState('')
  const [exporting, setExporting] = useState(false)
  const [imageSyncing, setImageSyncing] = useState(false)
  const [exerciseImageFiles, setExerciseImageFiles] = useState([])
  const [athleteLogs, setAthleteLogs] = useState({})
  const [activating, setActivating] = useState(false)
  const [currentCycleName, setCurrentCycleName] = useState('')
  const [savingCycleName, setSavingCycleName] = useState(false)
  const [renamingWorkout, setRenamingWorkout] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [reordering, setReordering] = useState(false)

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
    } catch (e) {
      console.warn('workout_logs fetch error:', e)
    }
    if (!data || !data.length) return
    const byName = {}
    data.forEach((log) => {
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

  useEffect(() => {
    fetchAthleteLogs()
  }, [clientId]) // eslint-disable-line

  // ── Chargement workouts ────────────────────────────────────
  async function reloadWorkouts() {
    const enrichWithExercises = async (list) => {
      if (!list?.length) return []
      const ids = list.map((w) => w.id)
      const { data: exData } = await supabase
        .from('exercises')
        .select('*')
        .in('workout_id', ids)
        .order('order_index')
      const exByWorkout = {}
      ;(exData || []).forEach((ex) => {
        if (!exByWorkout[ex.workout_id]) exByWorkout[ex.workout_id] = []
        exByWorkout[ex.workout_id].push(ex)
      })
      return list.map((w) => ({
        ...w,
        exercises: (exByWorkout[w.id] || []).sort(
          (a, b) => (a.order_index || 0) - (b.order_index || 0)
        ),
      }))
    }

    const { data: wData } = await supabase
      .from('workouts')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_archived', false)
      .eq('is_future', false)
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('day_of_week')

    const { data: fData } = await supabase
      .from('workouts')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_archived', false)
      .eq('is_future', true)
      .order('order_index', { ascending: true, nullsFirst: false })
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
    if (!futureWorkouts.length) {
      showToast('Aucune séance dans le cycle futur.', 'error')
      return
    }
    if (
      !confirm(
        'Activer le cycle futur ?\n\nLe cycle actuel sera archivé et le cycle futur deviendra actif pour le client.'
      )
    )
      return
    setActivating(true)
    try {
      if (workouts.length) {
        await must(
          supabase
            .from('workouts')
            .update({ is_archived: true, archived_at: new Date().toISOString() })
            .eq('client_id', clientId)
            .eq('is_archived', false)
            .eq('is_future', false)
        )
      }
      // Si cette 2e étape échoue, l'erreur s'affiche et un nouveau clic sur
      // "Activer" reprend là où ça s'est arrêté (aucune séance n'est perdue :
      // elles sont soit archivées, soit encore en "futur").
      await must(
        supabase
          .from('workouts')
          .update({ is_future: false })
          .eq('client_id', clientId)
          .eq('is_future', true)
      )
      await reloadWorkouts()
      setCycleMode('current')
      showToast('Cycle futur activé ! Le client voit maintenant son nouveau programme.', 'success')
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error')
    }
    setActivating(false)
  }

  // ── Images d'exercices (listing direct depuis Supabase Storage) ──
  // Renvoie aussi la liste (utilisée juste après par syncImages : l'état
  // React n'est pas encore à jour à ce moment-là — c'était un bug).
  const fetchImageFiles = async () => {
    try {
      const files = await listExerciseImageFiles()
      if (files.length) setExerciseImageFiles(files)
      return files
    } catch {
      return []
    }
  }

  useEffect(() => {
    fetchImageFiles()
  }, []) // eslint-disable-line

  // ── Picker d'exercice ──────────────────────────────────────
  const [exPicker, setExPicker] = useState(null)
  const [exPickerQuery, setExPickerQuery] = useState('')
  const [exPickerMode, setExPickerMode] = useState('search')
  const [exPickerFree, setExPickerFree] = useState('')
  const [exPickerAdded, setExPickerAdded] = useState([])

  const addExercise = (workoutId, groupType, groupId) => {
    setExPicker({ workoutId, groupType, groupId })
    setExPickerQuery('')
    setExPickerMode('search')
    setExPickerFree('')
    setExPickerAdded([])
  }

  const confirmAddExercise = async (name, imageUrl) => {
    if (!exPicker || !name.trim()) return
    const { workoutId, groupType, groupId } = exPicker
    const w = displayedWorkouts.find((w) => w.id === workoutId)
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
    if (error) {
      console.error('Erreur insertion:', error)
      showToast('Erreur : ' + error.message, 'error')
      return
    }
    if (data) {
      if (imageUrl) supabase.from('exercises').update({ image_url: imageUrl }).eq('id', data.id)
      const setter = cycleMode === 'future' ? setFutureWorkouts : setWorkouts
      setter((prev) =>
        prev.map((w) => {
          if (w.id !== workoutId) return w
          return {
            ...w,
            exercises: [...(w.exercises || []), { ...data, image_url: imageUrl || null }].sort(
              (a, b) => (a.order_index || 0) - (b.order_index || 0)
            ),
          }
        })
      )
      // Ajout en rafale : la modale reste ouverte, on efface juste la recherche
      // pour enchaîner directement sur l'exercice suivant sans la rouvrir.
      setExPickerAdded((prev) => [...prev, name.trim()])
      setExPickerQuery('')
      setExPickerFree('')
    }
  }

  // ── Workout Block ──────────────────────────────────────────
  const [wbPicker, setWbPicker] = useState(null)
  const [wbForm, setWbForm] = useState({
    type: 'For Time',
    rounds: '3',
    cap: '',
    rest: '90s',
    objective: '',
    coachNote: '',
    movements: '',
  })

  // ── updateExercise ─────────────────────────────────────────
  const updateExercise = async (workoutId, exId, field, value) => {
    const setter = cycleMode === 'future' ? setFutureWorkouts : setWorkouts
    setter((prev) =>
      prev.map((w) =>
        w.id !== workoutId
          ? w
          : {
              ...w,
              exercises: w.exercises.map((e) => (e.id === exId ? { ...e, [field]: value } : e)),
            }
      )
    )

    let payload = { [field]: value }
    if (field === 'name') {
      const imageUrl = findExerciseImage(value, buildImageIndex(exerciseImageFiles))
      if (imageUrl) payload.image_url = imageUrl
    }
    const { image_url: imgUrl, ...payloadCore } = payload
    const { error: upErr } = await supabase.from('exercises').update(payloadCore).eq('id', exId)
    if (upErr) console.error('Erreur update exercice:', upErr.message)
    if (imgUrl) {
      const { error: imgErr } = await supabase
        .from('exercises')
        .update({ image_url: imgUrl })
        .eq('id', exId)
      if (imgErr) {
        console.error('Erreur image exercice:', imgErr.message)
        return
      }
      setter((prev) =>
        prev.map((w) =>
          w.id !== workoutId
            ? w
            : {
                ...w,
                exercises: w.exercises.map((e) =>
                  e.id === exId ? { ...e, image_url: imgUrl } : e
                ),
              }
        )
      )
    }
  }

  const deleteExercise = async (workoutId, exId) => {
    try {
      await must(supabase.from('exercises').delete().eq('id', exId))
    } catch (e) {
      showToast('Suppression impossible : ' + e.message, 'error')
      return
    }
    const setter = cycleMode === 'future' ? setFutureWorkouts : setWorkouts
    setter((prev) =>
      prev.map((w) =>
        w.id !== workoutId ? w : { ...w, exercises: w.exercises.filter((e) => e.id !== exId) }
      )
    )
  }

  const moveExercise = async (workoutId, exId, direction) => {
    const list = cycleMode === 'future' ? futureWorkouts : workouts
    const setter = cycleMode === 'future' ? setFutureWorkouts : setWorkouts
    const w = list.find((w) => w.id === workoutId)
    if (!w) return
    const exs = [...w.exercises]
    const idx = exs.findIndex((e) => e.id === exId)
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= exs.length) return
    const ex1 = exs[idx],
      ex2 = exs[newIdx]
    const order1 = ex1.order_index ?? idx,
      order2 = ex2.order_index ?? newIdx
    const newExercises = [...exs]
    newExercises[idx] = { ...ex2, order_index: order1 }
    newExercises[newIdx] = { ...ex1, order_index: order2 }
    setter((prev) =>
      prev.map((ww) => (ww.id === workoutId ? { ...ww, exercises: newExercises } : ww))
    )
    await Promise.all([
      supabase.from('exercises').update({ order_index: order2 }).eq('id', ex1.id),
      supabase.from('exercises').update({ order_index: order1 }).eq('id', ex2.id),
    ])
  }

  // ── Workout CRUD ───────────────────────────────────────────
  const addWorkout = async () => {
    if (!newW.name.trim()) return
    const isFuture = cycleMode === 'future'
    const list = isFuture ? futureWorkouts : workouts
    const nextOrder = list.reduce((max, w) => Math.max(max, w.order_index ?? 0), 0) + 1
    const { data, error } = await supabase
      .from('workouts')
      .insert({ ...newW, client_id: clientId, is_future: isFuture, order_index: nextOrder })
      .select()
      .single()
    if (error) {
      showToast('Séance non créée : ' + error.message, 'error')
      return
    }
    if (data) {
      const setter = isFuture ? setFutureWorkouts : setWorkouts
      setter((prev) => [...prev, { ...data, exercises: [] }])
      setShowAdd(false)
      setNewW({ name: '', type: 'Push', day_of_week: 1, duration_min: 60 })
      setOpenWorkout(data.id)
      setEditMode(data.id)
    }
  }

  const deleteWorkout = async (id) => {
    if (!confirm('Supprimer cette séance ?')) return
    try {
      await must(supabase.from('workouts').delete().eq('id', id))
    } catch (e) {
      showToast('Suppression impossible : ' + e.message, 'error')
      return
    }
    const setter = cycleMode === 'future' ? setFutureWorkouts : setWorkouts
    setter((prev) => prev.filter((w) => w.id !== id))
    if (openWorkout === id) setOpenWorkout(null)
  }

  const updateWorkoutDay = async (workoutId, newDay) => {
    const dayValue = +newDay
    const { data, error } = await supabase
      .from('workouts')
      .update({ day_of_week: dayValue })
      .eq('id', workoutId)
      .select('id, day_of_week')
    if (error) {
      console.error('Erreur changement de jour:', error.message)
      alert("Le changement de jour n'a pas pu être enregistré : " + error.message)
      return
    }
    if (!data || data.length === 0) {
      // Supabase ne renvoie pas toujours une erreur quand une policy RLS bloque
      // silencieusement l'écriture : 0 ligne modifiée, error === null. Sans ce
      // check, l'UI affichait le nouveau jour localement alors que rien n'était
      // sauvegardé en base — d'où le retour à l'ancienne valeur au rechargement.
      console.error(
        'Changement de jour non appliqué (0 ligne modifiée) — vérifier les policies RLS sur la table workouts.'
      )
      alert(
        "Le changement de jour n'a pas été enregistré (probablement un blocage de permissions côté base). Préviens-moi si ça se reproduit."
      )
      return
    }
    const setter = cycleMode === 'future' ? setFutureWorkouts : setWorkouts
    setter((prev) => prev.map((w) => (w.id === workoutId ? { ...w, day_of_week: dayValue } : w)))
  }

  // ── Réordonnancement libre des séances ─────────────────────
  const moveWorkout = async (workoutId, direction) => {
    const list = cycleMode === 'future' ? futureWorkouts : workouts
    const setter = cycleMode === 'future' ? setFutureWorkouts : setWorkouts
    const idx = list.findIndex((w) => w.id === workoutId)
    const newIdx = idx + direction
    if (idx === -1 || newIdx < 0 || newIdx >= list.length) return
    const w1 = list[idx],
      w2 = list[newIdx]
    // S'assurer que chaque séance a un order_index défini (repli sur sa position actuelle)
    const order1 = w1.order_index ?? idx
    const order2 = w2.order_index ?? newIdx
    const newList = [...list]
    newList[idx] = { ...w2, order_index: order1 }
    newList[newIdx] = { ...w1, order_index: order2 }
    setter(newList)
    setReordering(true)
    try {
      await Promise.all([
        supabase.from('workouts').update({ order_index: order2 }).eq('id', w1.id),
        supabase.from('workouts').update({ order_index: order1 }).eq('id', w2.id),
      ])
    } catch (e) {
      console.error('Erreur réordonnancement séance:', e)
    }
    setReordering(false)
  }

  // ── Renommage inline des séances (double-clic) ─────────────
  const startRenameWorkout = (workoutId, currentName) => {
    setRenamingWorkout(workoutId)
    setRenameValue(currentName || '')
  }

  const confirmRenameWorkout = async (workoutId) => {
    const trimmed = renameValue.trim()
    setRenamingWorkout(null)
    if (!trimmed) return
    const setter = cycleMode === 'future' ? setFutureWorkouts : setWorkouts
    const current = (cycleMode === 'future' ? futureWorkouts : workouts).find(
      (w) => w.id === workoutId
    )
    if (current && current.name === trimmed) return
    const previousName = current?.name
    setter((prev) => prev.map((w) => (w.id === workoutId ? { ...w, name: trimmed } : w)))
    const { data, error } = await supabase
      .from('workouts')
      .update({ name: trimmed })
      .eq('id', workoutId)
      .select('id, name')
    if (error || !data || data.length === 0) {
      console.error('Erreur renommage séance:', error?.message || '0 ligne modifiée (RLS ?)')
      alert("Le renommage n'a pas pu être enregistré. Le nom va revenir à l'ancienne valeur.")
      setter((prev) => prev.map((w) => (w.id === workoutId ? { ...w, name: previousName } : w)))
    }
  }

  const cancelRenameWorkout = () => setRenamingWorkout(null)

  // ── Cycle (actuel seulement) ───────────────────────────────
  const saveCurrentCycleName = async () => {
    if (!currentCycleName.trim()) return
    setSavingCycleName(true)
    try {
      await must(
        supabase
          .from('workouts')
          .update({ cycle_name: currentCycleName.trim() })
          .eq('client_id', clientId)
          .eq('is_archived', false)
          .eq('is_future', false)
      )
      showToast('Nom du cycle sauvegardé !', 'success')
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error')
    }
    setSavingCycleName(false)
  }

  const archiveCycle = async () => {
    if (!cycleName.trim()) {
      showToast("Donne un nom à ce cycle avant de l'archiver", 'error')
      return
    }
    if (!confirm('Archiver ce cycle ? Les séances seront archivées et le programme sera vide.'))
      return
    setArchiving(true)
    try {
      await must(
        supabase
          .from('workouts')
          .update({
            is_archived: true,
            cycle_name: cycleName.trim(),
            archived_at: new Date().toISOString(),
          })
          .eq('client_id', clientId)
          .eq('is_archived', false)
          .eq('is_future', false)
      )
      setWorkouts([])
      setCycleName('')
      setCurrentCycleName('')
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error')
    }
    setArchiving(false)
  }

  const loadHistory = async () => {
    const { data } = await supabase
      .from('workouts')
      .select('*, exercises(*)')
      .eq('client_id', clientId)
      .eq('is_archived', true)
      .order('archived_at', { ascending: false })
    setArchivedWorkouts(data || [])
    setShowHistory(true)
    setOpenArchivedCycle(null)
  }

  // ── Groupement des séances archivées par cycle ──────────────
  const archivedCycles = (() => {
    const groups = {}
    const order = []
    archivedWorkouts.forEach((w) => {
      const key =
        w.cycle_name && w.cycle_name.trim()
          ? w.cycle_name.trim()
          : `__sans_nom_${w.archived_at ? w.archived_at.slice(0, 10) : 'inconnu'}`
      if (!groups[key]) {
        groups[key] = {
          key,
          name: w.cycle_name && w.cycle_name.trim() ? w.cycle_name.trim() : 'Cycle sans nom',
          archivedAt: w.archived_at || null,
          workouts: [],
        }
        order.push(key)
      }
      groups[key].workouts.push(w)
      // Garder la date d'archivage la plus récente du groupe pour le tri/affichage
      if (w.archived_at && (!groups[key].archivedAt || w.archived_at > groups[key].archivedAt)) {
        groups[key].archivedAt = w.archived_at
      }
    })
    return order.map((k) => groups[k])
  })()

  // ── Duplication ────────────────────────────────────────────
  // Scopé par coach_id en plus de la RLS (défense en profondeur) : sans ce
  // filtre applicatif, la RLS bloque déjà l'accès aux clients d'un autre
  // coach depuis le 10/07/2026, mais autant ne pas en dépendre seule ici.
  const loadAllClients = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'client')
      .eq('coach_id', coachId)
      .neq('id', clientId)
      .order('full_name')
    setAllClients(data || [])
  }

  const duplicateProgram = async (targetClientId) => {
    if (!targetClientId) return
    setDuplicating(true)
    try {
      const sourceWorkouts = cycleMode === 'future' ? futureWorkouts : workouts
      if (!sourceWorkouts?.length) {
        showToast('Aucune séance à dupliquer.', 'error')
        setDuplicating(false)
        return
      }
      const { exercises: totalExInserted } = await duplicateWorkouts({
        sourceWorkouts,
        targetClientId,
        isFuture: cycleMode === 'future',
        resetWeights,
        imageFiles: exerciseImageFiles,
      })
      setShowDuplicate(false)
      setDuplicateTarget('')
      if (targetClientId === clientId) await reloadWorkouts()
      showToast(
        `Programme dupliqué ! (${sourceWorkouts.length} séances · ${totalExInserted} exercices)`,
        'success'
      )
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error')
    }
    setDuplicating(false)
  }

  // ── Workout Block ──────────────────────────────────────────
  const groupColors = {
    Superset: 'var(--danger)',
    'Giant Set': 'var(--rx)',
    'Drop Set': 'var(--accent)',
    'Workout Block': 'var(--chalk)',
  }

  const addWorkoutBlock = (workoutId) => {
    setWbPicker({ workoutId })
    setWbForm({
      type: 'For Time',
      rounds: '3',
      cap: '',
      rest: '90s',
      objective: '',
      coachNote: '',
      movements: '',
    })
  }

  const confirmAddWorkoutBlock = async () => {
    if (!wbPicker || !wbForm.movements.trim()) return
    const { workoutId } = wbPicker
    const w = displayedWorkouts.find((w) => w.id === workoutId)
    const gid = 'wb_' + Date.now().toString()
    const meta = JSON.stringify({
      type: wbForm.type,
      rounds: wbForm.rounds,
      cap: wbForm.cap,
      rest: wbForm.rest,
      objective: wbForm.objective,
      coachNote: wbForm.coachNote,
      uiVersion: 2, // active le nouveau design de logging (score + journal) — absent sur les blocks déjà créés, qui gardent l'ancien rendu
    })
    const lines = wbForm.movements
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
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
    const { data, error } = await supabase.from('exercises').insert(rows).select()
    if (error) {
      showToast('Bloc non créé : ' + error.message, 'error')
      return
    }
    if (data) {
      const setter = cycleMode === 'future' ? setFutureWorkouts : setWorkouts
      setter((prev) =>
        prev.map((w) =>
          w.id !== workoutId ? w : { ...w, exercises: [...(w.exercises || []), ...data] }
        )
      )
    }
    setWbPicker(null)
  }

  // ── Sync images ────────────────────────────────────────────
  const syncImages = async (forceAll = false) => {
    setImageSyncing(true)
    try {
      // Recharger la liste d'images si elle est vide (ex: 401 au mount)
      const files = exerciseImageFiles.length ? exerciseImageFiles : await fetchImageFiles()
      if (!files.length) {
        showToast('Aucune image trouvée dans la bibliothèque', 'error')
        setImageSyncing(false)
        return
      }
      const { candidates } = await syncExerciseImages({
        workouts: displayedWorkouts,
        imageFiles: files,
        forceAll,
      })
      if (!candidates) {
        showToast('Toutes les images sont déjà synchronisées', 'info')
        setImageSyncing(false)
        return
      }
      await reloadWorkouts()
      showToast('Images synchronisées !', 'success')
    } catch (e) {
      showToast('Erreur sync images : ' + e.message, 'error')
    }
    setImageSyncing(false)
  }

  // ── Export PDF ─────────────────────────────────────────────
  const exportPDF = async () => {
    setExporting(true)
    try {
      await printProgramme({
        workouts: displayedWorkouts,
        clientName,
        isFuture: cycleMode === 'future',
      })
    } catch (e) {
      showToast('Erreur export PDF : ' + e.message, 'error')
    }
    setExporting(false)
  }

  // État et actions partagés avec les sous-composants du programme
  const programmeCtx = {
    addWorkout,
    archiveCycle,
    archiving,
    currentCycleName,
    cycleMode,
    cycleName,
    displayedWorkouts,
    exportPDF,
    exporting,
    fetchAthleteLogs,
    imageSyncing,
    loadAllClients,
    loadHistory,
    newW,
    saveCurrentCycleName,
    savingCycleName,
    setCurrentCycleName,
    setCycleName,
    setNewW,
    setShowAdd,
    setShowDuplicate,
    showAdd,
    syncImages,
  }

  // Actions et état passés à chaque carte séance (components/coach/programme/WorkoutCard)
  const workoutCtx = {
    addExercise,
    addWorkoutBlock,
    athleteLogs,
    cancelRenameWorkout,
    confirmRenameWorkout,
    cycleMode,
    deleteExercise,
    deleteWorkout,
    editMode,
    groupColors,
    moveExercise,
    moveWorkout,
    openWorkout,
    renameValue,
    renamingWorkout,
    reordering,
    setEditMode,
    setOpenWorkout,
    setRenameValue,
    startRenameWorkout,
    updateExercise,
    updateWorkoutDay,
  }

  // ── Render ─────────────────────────────────────────────────
  if (loading)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 0',
          color: 'var(--chalk-dim)',
        }}
      >
        Chargement du programme…
      </div>
    )

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 0 80px' }}>
      {toast && <Toast toast={toast} />}

      {/* ── Toggle + bouton Activer ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <CycleToggle mode={cycleMode} onChange={setCycleMode} />
        {cycleMode === 'future' && futureWorkouts.length > 0 && (
          <button
            onClick={activateFutureCycle}
            disabled={activating}
            style={{
              padding: '8px 18px',
              background: activating ? 'var(--surface-2)' : 'var(--accent)',
              color: 'var(--chalk)',
              border: 'none',
              borderRadius: 9,
              fontWeight: 700,
              fontSize: 13,
              cursor: activating ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans',sans-serif",
              boxShadow: '0 2px 8px rgba(255,91,46,0.3)',
            }}
          >
            {activating ? '⏳ Activation…' : '🚀 Activer ce cycle'}
          </button>
        )}
      </div>

      {/* ── Bandeau info mode futur ── */}
      {cycleMode === 'future' && (
        <div
          style={{
            background: 'var(--accent-dim)',
            border: '1.5px solid var(--accent)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>🔵</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--chalk)' }}>
              Mode cycle futur
            </div>
            <div style={{ fontSize: 12, color: 'var(--accent)' }}>
              {futureWorkouts.length === 0
                ? 'Aucune séance encore. Crée le programme ici — le client ne le verra pas avant activation.'
                : `${futureWorkouts.length} séance(s) prête(s). Clique "🚀 Activer" quand tu veux le basculer.`}
            </div>
          </div>
        </div>
      )}

      <ProgrammeToolbar ctx={programmeCtx} />

      <CycleNameBar ctx={programmeCtx} />

      <NewWorkoutForm ctx={programmeCtx} />

      {/* ── Liste vide ── */}
      {displayedWorkouts.length === 0 && !showAdd && (
        <div
          style={{
            textAlign: 'center',
            color: 'var(--chalk-dim)',
            padding: '40px 0',
            fontSize: 15,
          }}
        >
          {cycleMode === 'future'
            ? 'Aucune séance dans le cycle futur — clique sur "+ Séance" pour commencer'
            : 'Aucune séance — clique sur "+ Séance" pour commencer'}
        </div>
      )}

      {/* ── Liste des séances ── */}
      {displayedWorkouts.map((workout, wIdx) => (
        <WorkoutCard
          key={workout.id}
          workout={workout}
          wIdx={wIdx}
          workoutCount={displayedWorkouts.length}
          ctx={workoutCtx}
        />
      ))}

      {/* ── Modal picker exercice ── */}
      {exPicker && (
        <ExercisePicker
          query={exPickerQuery}
          setQuery={setExPickerQuery}
          mode={exPickerMode}
          setMode={setExPickerMode}
          freeText={exPickerFree}
          setFreeText={setExPickerFree}
          imageFiles={exerciseImageFiles || []}
          addedNames={exPickerAdded}
          onConfirm={confirmAddExercise}
          onClose={() => {
            setExPicker(null)
            setExPickerAdded([])
          }}
        />
      )}

      {/* ── Modal Workout Block ── */}
      {wbPicker && (
        <WorkoutBlockPickerModal
          form={wbForm}
          onChangeForm={setWbForm}
          onConfirm={confirmAddWorkoutBlock}
          onCancel={() => setWbPicker(null)}
        />
      )}

      {showDuplicate && (
        <DuplicateCycleModal
          cycleMode={cycleMode}
          allClients={allClients}
          duplicateTarget={duplicateTarget}
          onChangeTarget={setDuplicateTarget}
          resetWeights={resetWeights}
          onChangeResetWeights={setResetWeights}
          duplicating={duplicating}
          onConfirm={duplicateProgram}
          onCancel={() => setShowDuplicate(false)}
        />
      )}

      {showHistory && (
        <CycleHistoryModal
          archivedCycles={archivedCycles}
          openArchivedCycle={openArchivedCycle}
          onOpenCycle={setOpenArchivedCycle}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}
