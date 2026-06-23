/**
 * pages/training.js  —  1205 lignes → ~270 lignes
 *
 * Responsabilité unique : orchestrer les sous-composants et passer les props.
 * Plus aucun accès Supabase ici, plus aucune fonction utilitaire inline.
 *
 *   Data / actions   →  hooks/useTrainingData.js
 *   Helpers purs     →  lib/trainingUtils.js
 *   Notes calendrier →  lib/calendarNotes.js
 *   Blocs exercice   →  components/training/ExerciseBlock.jsx
 *   Historique       →  components/training/HistoryCalendar.jsx
 *   Atomes           →  CompactExerciseRow.jsx, ExerciseWorkspace.jsx
 */

import { useEffect, useMemo, useState } from 'react'
import AppShell    from '../components/ui/AppShell'
import SurfaceCard from '../components/ui/SurfaceCard'
import SectionHead from '../components/ui/SectionHead'
import StatusBadge from '../components/ui/StatusBadge'
import SegmentTabs from '../components/ui/SegmentTabs'
import EmptyPanel  from '../components/ui/EmptyPanel'

import { useTrainingData }  from '../hooks/useTrainingData'
import ExerciseBlock        from '../components/training/ExerciseBlock'
import HistoryCalendar      from '../components/training/HistoryCalendar'

import {
  buildExerciseGroups, dowToJS, getWeekDays, getTodayLocalString,
  getLocalDateString, getWorkoutDayLabel, workoutLogCount,
  latestPerfText, getLogNote, getLogDate, safeDateLabel,
  DAY_LABELS_SHORT, DAY_LABELS_FULL, weekLabel, getMaxFutureWeekOffset,
} from '../lib/trainingUtils'

const TRAINING_TABS = [
  { label: 'Séance',     value: 'session'  },
  { label: 'Historique', value: 'history'  },
]

export default function TrainingPage() {
  const [isMobile,          setIsMobile]          = useState(false)
  const [activeTab,         setActiveTab]          = useState('session')
  const [weekOffset,        setWeekOffset]         = useState(0)
  const [openWorkout,       setOpenWorkout]        = useState(null)
  const [selectedExerciseId, setSelectedExerciseId] = useState(null)
  const [selectedCalDay,    setSelectedCalDay]     = useState(null)
  const [imageLightbox,     setImageLightbox]      = useState(null)

  const {
    loading, error, success,
    workouts, archivedWorkouts, logsByExerciseName,
    currentCycleName, userName,
    logInputs, loggingIds, logPerformance, onLogInput,
    calendarNotes, noteDraft, setNoteDraft, savingNote,
    saveNote, removeNote,
  } = useTrainingData()

  // ── Responsive ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 980)
    handle()
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  // ── Calendrier ───────────────────────────────────────────────────────────────
  const maxWeekOffset  = useMemo(() => getMaxFutureWeekOffset(), [])
  const clampedOffset  = Math.min(weekOffset, maxWeekOffset)
  const weekDays       = useMemo(() => getWeekDays(clampedOffset), [clampedOffset])
  const todayStr       = useMemo(() => getTodayLocalString(), [])

  const workoutByJsDay = useMemo(() => {
    const map = {}
    workouts.forEach(w => {
      const jsDay = dowToJS(w.day_of_week)
      if (!map[jsDay]) map[jsDay] = []
      map[jsDay].push(w)
    })
    return map
  }, [workouts])

  const calDayWorkouts = useMemo(() => {
    if (!selectedCalDay) return []
    const [y, m, d] = selectedCalDay.split('-')
    return workoutByJsDay[new Date(+y, +m - 1, +d).getDay()] || []
  }, [selectedCalDay, workoutByJsDay])

  // ── Dérivés séance ───────────────────────────────────────────────────────────
  const currentWorkout   = useMemo(() => workouts.find(w => w.id === openWorkout) || null, [workouts, openWorkout])
  const exerciseBlocks   = useMemo(() => currentWorkout ? buildExerciseGroups(currentWorkout.exercises) : [], [currentWorkout])
  const selectedExercise = useMemo(() => {
    if (!currentWorkout) return null
    return currentWorkout.exercises?.find(e => e.id === selectedExerciseId) || currentWorkout.exercises?.[0] || null
  }, [currentWorkout, selectedExerciseId])

  // ── Auto-sélections ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (workouts.length && selectedCalDay === null) {
      const todayWorkouts = workoutByJsDay[new Date().getDay()] || []
      if (todayWorkouts.length) { setSelectedCalDay(todayStr); openSession(todayWorkouts[0].id) }
    }
  }, [workouts, workoutByJsDay]) // eslint-disable-line

  useEffect(() => {
    if (workouts.length && !isMobile && !openWorkout) openSession(workouts[0].id)
  }, [workouts, isMobile]) // eslint-disable-line

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function openSession(id) {
    setOpenWorkout(id)
    const w = workouts.find(w => w.id === id)
    setSelectedExerciseId(w?.exercises?.[0]?.id || null)
  }

  function selectCalDay(dateStr) {
    setSelectedCalDay(prev => {
      const next = prev === dateStr ? null : dateStr
      setNoteDraft(next ? (calendarNotes[next]?.note || '') : '')
      return next
    })
  }

  const blockProps = { logInputs, loggingIds, logsByName: logsByExerciseName, onLogInput, onLog: logPerformance, onImageOpen: setImageLightbox }

  // ── Rendu ────────────────────────────────────────────────────────────────────
  if (loading) return (
    <AppShell title="Training" subtitle="Chargement..." actions={<SegmentTabs items={TRAINING_TABS} value={activeTab} onChange={setActiveTab} />}>
      <SurfaceCard padded><div style={{ color: '#6B7A99' }}>Chargement…</div></SurfaceCard>
    </AppShell>
  )

  return (
    <AppShell title="Training" subtitle="Un espace clair et lisible" actions={<SegmentTabs items={TRAINING_TABS} value={activeTab} onChange={setActiveTab} />} userName={userName} cycleName={currentCycleName} coachName="Ben" coachAvailable>

      {error   && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      {imageLightbox && (
        <div onClick={() => setImageLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <img src={imageLightbox} alt="Exercice" style={{ maxWidth: 'min(1000px, 100%)', maxHeight: '88vh', borderRadius: 16 }} />
        </div>
      )}

      {activeTab === 'session' ? (
        isMobile
          ? <SessionMobile
              workouts={workouts} openWorkout={openWorkout} setOpenWorkout={setOpenWorkout}
              currentWorkout={currentWorkout} exerciseBlocks={exerciseBlocks}
              currentCycleName={currentCycleName}
              weekDays={weekDays} weekOffset={weekOffset} setWeekOffset={setWeekOffset}
              maxWeekOffset={maxWeekOffset} todayStr={todayStr}
              selectedCalDay={selectedCalDay} selectCalDay={selectCalDay}
              calDayWorkouts={calDayWorkouts} workoutByJsDay={workoutByJsDay}
              logsByExerciseName={logsByExerciseName}
              selectedExerciseId={selectedExerciseId} setSelectedExerciseId={setSelectedExerciseId}
              calendarNotes={calendarNotes} noteDraft={noteDraft} setNoteDraft={setNoteDraft}
              savingNote={savingNote} saveNote={saveNote} removeNote={removeNote}
              openSession={openSession} blockProps={blockProps}
            />
          : <SessionDesktop
              workouts={workouts} currentWorkout={currentWorkout} exerciseBlocks={exerciseBlocks}
              currentCycleName={currentCycleName} selectedExercise={selectedExercise}
              logsByExerciseName={logsByExerciseName}
              selectedExerciseId={selectedExerciseId} setSelectedExerciseId={setSelectedExerciseId}
              openSession={openSession} blockProps={blockProps} onImageOpen={setImageLightbox}
            />
      ) : (
        <HistoryCalendar
          weekDays={weekDays} weekOffset={weekOffset} setWeekOffset={setWeekOffset}
          todayStr={todayStr} logsByExerciseName={logsByExerciseName}
          workoutByJsDay={workoutByJsDay} archivedWorkouts={archivedWorkouts}
        />
      )}
    </AppShell>
  )
}

// ─── Vue mobile ───────────────────────────────────────────────────────────────

function SessionMobile({ workouts, openWorkout, setOpenWorkout, currentWorkout, exerciseBlocks, currentCycleName, weekDays, weekOffset, setWeekOffset, maxWeekOffset, todayStr, selectedCalDay, selectCalDay, calDayWorkouts, workoutByJsDay, logsByExerciseName, selectedExerciseId, setSelectedExerciseId, calendarNotes, noteDraft, setNoteDraft, savingNote, saveNote, removeNote, openSession, blockProps }) {
  if (openWorkout) {
    return (
      <div>
        <button onClick={() => setOpenWorkout(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6B7A99', fontSize: 13, fontWeight: 700, padding: '4px 0 12px', cursor: 'pointer' }}>
          ← Retour aux séances
        </button>
        <SurfaceCard padded>
          <SectionHead title={currentWorkout?.name || 'Programme'} action={currentWorkout?.type ? <StatusBadge tone="default">{currentWorkout.type}</StatusBadge> : null} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {exerciseBlocks.map(block => <ExerciseBlock key={block.id} block={block} selectedId={selectedExerciseId} onSelect={setSelectedExerciseId} isMobile {...blockProps} />)}
          </div>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {currentCycleName && <CycleBadge name={currentCycleName} />}

      {/* ── Calendrier hebdo ── */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #DCE5F3', overflow: 'hidden', boxShadow: '0 2px 8px rgba(13,27,78,0.06)' }}>
        <div style={{ background: '#0D1B4E', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <CalNavBtn onClick={() => setWeekOffset(w => w - 1)}>‹</CalNavBtn>
          <div style={{ color: 'white', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
            {weekOffset === 0 ? '📍 Cette semaine' : weekOffset === -1 ? 'Semaine passée' : weekOffset === 1 ? 'Semaine prochaine' : weekLabel(weekDays)}
            <div style={{ fontSize: 10, opacity: 0.65, fontWeight: 400, marginTop: 1 }}>{weekLabel(weekDays)}</div>
          </div>
          <CalNavBtn onClick={() => setWeekOffset(w => Math.min(w + 1, maxWeekOffset))} disabled={weekOffset >= maxWeekOffset}>›</CalNavBtn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '10px 8px 12px', gap: 4 }}>
          {weekDays.map(day => {
            const dateStr    = getLocalDateString(day)
            const jsDay      = day.getDay()
            const isToday    = dateStr === todayStr
            const isSelected = dateStr === selectedCalDay
            const hasWorkout = !!(workoutByJsDay[jsDay]?.length)
            const hasLogs    = Object.values(logsByExerciseName).some(logs => logs.some(l => { const d = l.logged_at || l.created_at || l.date || null; return d && d.startsWith(dateStr) }))
            const hasNote    = !!calendarNotes[dateStr]
            const isPast     = day < new Date(todayStr)
            return (
              <button key={dateStr} onClick={() => { selectCalDay(dateStr); if (dateStr !== selectedCalDay && workoutByJsDay[jsDay]?.length) openSession(workoutByJsDay[jsDay][0].id) }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 2px', borderRadius: 10, border: 'none', cursor: 'pointer', background: isSelected ? '#2C64E5' : isToday ? '#EEF4FF' : 'transparent', transition: 'all 0.15s', fontFamily: "'DM Sans',sans-serif", position: 'relative' }}>
                {hasNote && <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 9, lineHeight: 1 }} title="Annotation">📌</span>}
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: isSelected ? 'rgba(255,255,255,0.75)' : '#6B7A99' }}>{DAY_LABELS_SHORT[jsDay]}</span>
                <span style={{ fontSize: 15, fontWeight: isToday || isSelected ? 900 : 600, color: isSelected ? 'white' : isToday ? '#2C64E5' : isPast ? '#B0B8CC' : '#0D1B4E', lineHeight: 1 }}>{day.getDate()}</span>
                <div style={{ display: 'flex', gap: 2, height: 6, alignItems: 'center' }}>
                  {hasWorkout && <Dot color={isSelected ? 'rgba(255,255,255,0.7)' : '#2C64E5'} />}
                  {hasLogs    && <Dot color={isSelected ? 'rgba(255,255,255,0.9)' : '#3A7A5A'} />}
                </div>
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 14, padding: '0 16px 12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Legend color="#2C64E5" label="Séance programmée" />
          <Legend color="#3A7A5A" label="Entraînement logué ✓" />
          <span style={{ fontSize: 10, color: '#6B7A99' }}>📌 Annotation</span>
        </div>
      </div>

      {/* ── Annotation du jour ── */}
      {selectedCalDay && (
        <div style={{ background: 'white', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #F0B848' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#B8860B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            📌 Annotation — {new Date(selectedCalDay + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </div>
          <textarea autoFocus value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Ex: Semaine de deload, bilan mensuel, départ en vacances…" rows={3}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: 8, border: '1px solid #DCE5F3', fontSize: 13, color: '#0D1B4E', fontFamily: "'DM Sans',sans-serif", resize: 'vertical', marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => saveNote(selectedCalDay)} disabled={savingNote} style={{ border: 'none', background: '#2C64E5', color: 'white', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: savingNote ? 'not-allowed' : 'pointer' }}>{savingNote ? '…' : '✓ Enregistrer'}</button>
            {calendarNotes[selectedCalDay] && <button onClick={() => removeNote(selectedCalDay)} disabled={savingNote} style={{ border: '1px solid #E3B0B0', background: 'white', color: '#B42318', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: savingNote ? 'not-allowed' : 'pointer' }}>🗑 Supprimer</button>}
            <button onClick={() => selectCalDay(selectedCalDay)} style={{ border: 'none', background: 'transparent', color: '#6B7A99', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Fermer</button>
          </div>
        </div>
      )}

      {/* ── Séances du jour ── */}
      {selectedCalDay && calDayWorkouts.length > 0 && (
        <div style={{ background: '#EEF4FF', borderRadius: 12, padding: '10px 12px', border: '1.5px solid #2C64E5' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#2C64E5', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            📅 {DAY_LABELS_FULL[new Date(selectedCalDay + 'T12:00:00').getDay()]} — {new Date(selectedCalDay + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {calDayWorkouts.map(workout => (
              <button key={workout.id} onClick={() => openSession(workout.id)} style={{ width: '100%', textAlign: 'left', background: openWorkout === workout.id ? '#2C64E5' : 'white', borderRadius: 10, border: openWorkout === workout.id ? 'none' : '1px solid #DCE5F3', padding: '10px 12px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: openWorkout === workout.id ? 'white' : '#0D1B4E', marginBottom: 2 }}>{workout.name}</div>
                <div style={{ fontSize: 11, color: openWorkout === workout.id ? 'rgba(255,255,255,0.7)' : '#6B7A99' }}>{(workout.exercises || []).length} exercices · {workout.duration || '—'} min</div>
              </button>
            ))}
          </div>
        </div>
      )}
      {selectedCalDay && calDayWorkouts.length === 0 && (
        <div style={{ background: '#F8F9FB', borderRadius: 12, padding: 14, border: '1px solid #E8ECF5', textAlign: 'center', color: '#6B7A99', fontSize: 13 }}>
          😴 Pas de séance programmée ce jour — repos ou cardio libre
        </div>
      )}

      {/* ── Programme complet ── */}
      <WorkoutList workouts={workouts} openWorkout={openWorkout} logsByExerciseName={logsByExerciseName} onOpen={openSession} />
    </div>
  )
}

// ─── Vue desktop 3 colonnes ───────────────────────────────────────────────────

function SessionDesktop({ workouts, currentWorkout, exerciseBlocks, currentCycleName, selectedExercise, logsByExerciseName, selectedExerciseId, setSelectedExerciseId, openSession, blockProps, onImageOpen }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 0.92fr) minmax(380px, 1.4fr) minmax(220px, 0.92fr)', gap: 14, alignItems: 'start' }}>
      <SurfaceCard padded sticky>
        {currentCycleName && <CycleBadge name={currentCycleName} style={{ marginBottom: 12 }} />}
        <SectionHead title="Séances" caption="Choisis la séance active puis navigue exercice par exercice." />
        {workouts.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {workouts.map(workout => {
              const active = workout.id === currentWorkout?.id
              return (
                <button key={workout.id} type="button" onClick={() => openSession(workout.id)} style={{ width: '100%', textAlign: 'left', borderRadius: 10, border: active ? '1.5px solid #2C64E5' : '1px solid #DCE5F3', background: active ? '#F5F8FF' : '#FFFFFF', padding: '10px 12px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#0D1B4E', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{workout.name}</div>
                      <div style={{ color: '#6B7A99', fontSize: 11 }}>{getWorkoutDayLabel(workout.day_of_week)} · {(workout.exercises || []).length} exos</div>
                    </div>
                    {active && <StatusBadge tone="accent">Active</StatusBadge>}
                  </div>
                </button>
              )
            })}
          </div>
        ) : <EmptyPanel title="Aucune séance" description="Ton coach n'a pas encore chargé de séance active." />}
        <div style={{ marginTop: 12 }}>
          <SectionHead title="Vue rapide" caption="Résumé de la séance sélectionnée." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
            <MiniKpi label="Exos"  value={currentWorkout?.exercises?.length || 0} />
            <MiniKpi label="Blocs" value={exerciseBlocks.length} />
            <MiniKpi label="Logs"  value={currentWorkout ? workoutLogCount(currentWorkout, logsByExerciseName) : 0} />
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard padded>
        <SectionHead title={currentWorkout?.name || 'Programme'} caption="Sélectionne un exercice depuis la liste." action={currentWorkout?.type ? <StatusBadge tone="default">{currentWorkout.type}</StatusBadge> : null} />
        {currentWorkout ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {exerciseBlocks.map(block => <ExerciseBlock key={block.id} block={block} selectedId={selectedExerciseId} onSelect={setSelectedExerciseId} isMobile={false} {...blockProps} />)}
          </div>
        ) : <EmptyPanel title="Aucune séance ouverte" description="Sélectionne une séance à gauche." />}
      </SurfaceCard>

      <SurfaceCard padded sticky>
        <SectionHead title="Historique mouvement" caption="" />
        {selectedExercise ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedExercise.image_url && (
              <button type="button" onClick={() => onImageOpen(selectedExercise.image_url)} style={{ padding: 0, border: '1px solid #DCE5F3', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: 'white' }}>
                <img src={selectedExercise.image_url} alt={selectedExercise.name} style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover' }} />
              </button>
            )}
            <InfoCard title="Exercice" value={selectedExercise.name} />
            <div style={{ border: '1px solid #DCE5F3', borderRadius: 10, background: '#FFFFFF', padding: 10 }}>
              <div style={{ fontWeight: 800, color: '#0D1B4E', marginBottom: 8, fontSize: 11, letterSpacing: '0.5px', textTransform: 'uppercase' }}>📊 Historique récent</div>
              {(logsByExerciseName[selectedExercise.name] || []).length === 0
                ? <div style={{ color: '#9AAAD4', fontSize: 12 }}>Aucun log pour cet exercice.</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(logsByExerciseName[selectedExercise.name] || []).slice(0, 5).map((log, i) => (
                      <div key={log.id || i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: i < 4 ? '1px solid #F0F5FF' : 'none' }}>
                        <Dot color={i === 0 ? '#2C64E5' : '#C5D8F5'} size={6} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: i === 0 ? 800 : 600, fontSize: i === 0 ? 13 : 12, color: i === 0 ? '#2C64E5' : '#4A6FB5' }}>{latestPerfText(log)}</span>
                          {getLogNote(log) && <span style={{ fontSize: 10, color: '#9AAAD4', marginLeft: 4 }}>· {getLogNote(log)}</span>}
                        </div>
                        <div style={{ fontSize: 10, color: '#9AAAD4', flexShrink: 0 }}>{safeDateLabel(getLogDate(log))}</div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        ) : <EmptyPanel title="Sélectionne un exercice" description="" />}
      </SurfaceCard>
    </div>
  )
}

// ─── Composants partagés ──────────────────────────────────────────────────────

function WorkoutList({ workouts, openWorkout, logsByExerciseName, onOpen }) {
  if (!workouts.length) return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #DCE5F3', overflow: 'hidden' }}>
      <EmptyPanel title="Aucune séance" description="Ton coach n'a pas encore chargé de séance active." />
    </div>
  )
  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #DCE5F3', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid #E8ECF5' }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: '#0D1B4E' }}>📋 Programme complet</div>
        <div style={{ fontSize: 11, color: '#6B7A99', marginTop: 2 }}>Toutes tes séances du cycle actuel</div>
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {workouts.map(workout => {
          const isActive = workout.id === openWorkout
          const jsDay    = dowToJS(workout.day_of_week)
          const hasLogs  = Object.values(logsByExerciseName).some(logs => logs.some(l => l.workout_id === workout.id))
          return (
            <button key={workout.id} type="button" onClick={() => onOpen(workout.id)} style={{ width: '100%', textAlign: 'left', borderRadius: 10, border: isActive ? '1.5px solid #2C64E5' : '1px solid #DCE5F3', background: isActive ? '#F5F8FF' : '#FAFBFF', padding: '10px 12px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: isActive ? '#2C64E5' : '#EEF4FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: isActive ? 'rgba(255,255,255,0.7)' : '#6B7A99', lineHeight: 1 }}>{DAY_LABELS_SHORT[jsDay]}</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: isActive ? 'white' : '#0D1B4E', lineHeight: 1.1 }}>{dowToJS(workout.day_of_week) === new Date().getDay() ? new Date().getDate() : ''}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#0D1B4E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{workout.name}</div>
                <div style={{ color: '#6B7A99', fontSize: 11, marginTop: 1 }}>{getWorkoutDayLabel(workout.day_of_week)} · {(workout.exercises || []).length} exos{workout.duration ? ` · ${workout.duration} min` : ''}</div>
              </div>
              {hasLogs  && <span style={{ fontSize: 12 }}>✅</span>}
              {isActive && <span style={{ fontSize: 10, background: '#2C64E5', color: 'white', padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>Actif</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CycleBadge({ name, style }) {
  return (
    <div style={{ background: '#EEF4FF', borderRadius: 10, padding: '8px 12px', border: '1px solid #2C64E5', ...style }}>
      <span style={{ fontSize: 11, color: '#2C64E5', fontWeight: 700 }}>🏆 Cycle actuel</span>
      <div style={{ fontWeight: 800, fontSize: 14, color: '#0D1B4E' }}>{name}</div>
    </div>
  )
}

function Alert({ tone, children }) {
  const s = tone === 'error'
    ? { borderColor: '#F3C4C4', background: '#FEF2F2', color: '#B42318', label: 'Erreur' }
    : { borderColor: '#C9E9D5', background: '#F0FBF4', color: '#16804A', label: 'OK' }
  return (
    <div style={{ marginBottom: 12 }}>
      <SurfaceCard padded style={{ borderColor: s.borderColor, background: s.background }}>
        <strong style={{ display: 'block', color: s.color, fontSize: 11 }}>{s.label}</strong>
        <div style={{ color: s.color, fontSize: 11 }}>{children}</div>
      </SurfaceCard>
    </div>
  )
}

function MiniKpi({ label, value }) {
  return (
    <div style={{ border: '1px solid #C5D8F5', borderRadius: 10, background: '#EEF4FF', padding: 10 }}>
      <div style={{ fontSize: 10, color: '#6B8ED6', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>{label}</div>
      <div style={{ fontWeight: 900, fontSize: 22, color: '#0D1B4E' }}>{value}</div>
    </div>
  )
}

function InfoCard({ title, value }) {
  return (
    <div style={{ border: '1px solid #C5D8F5', borderRadius: 10, background: 'white', padding: 12 }}>
      <div style={{ fontWeight: 800, color: '#0D1B4E', marginBottom: 6, fontSize: 10, textTransform: 'uppercase' }}>{title}</div>
      <div style={{ color: '#4A6FB5', fontSize: 13 }}>{value}</div>
    </div>
  )
}

function Dot({ color, size = 5 }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

function Legend({ color, label }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6B7A99' }}><Dot color={color} size={6} />{label}</div>
}

function CalNavBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: disabled ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)', border: 'none', color: disabled ? 'rgba(255,255,255,0.3)' : 'white', width: 30, height: 30, borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </button>
  )
}
