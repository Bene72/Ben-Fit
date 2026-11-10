/**
 * pages/training.js
 *
 * REDESIGN — même logique, même data, même hooks. Rien ne change côté
 * fonctionnel : useTrainingData, trainingUtils, ExerciseBlock,
 * HistoryCalendar, AppShell, SurfaceCard, SectionHead, StatusBadge,
 * SegmentTabs, EmptyPanel restent importés et utilisés EXACTEMENT comme
 * avant (mêmes props). Seul l'habillage visuel des parties gérées en local
 * dans ce fichier (badge de cycle, calendrier semaine, liste des séances,
 * KPIs, panneau historique mouvement) a été repris pour se rapprocher du
 * look de l'app perso (hero glass, tabs pilule, cartes arrondies, accent
 * dégradé). Design tokens conservés : var(--navy) / var(--accent) / var(--gold).
 *
 * Si tu veux le même traitement sur ExerciseBlock.jsx, HistoryCalendar.jsx,
 * AppShell.js, SurfaceCard.js, SegmentTabs.js — envoie-moi ces fichiers,
 * je fais un 2e passage dessus. Pour l'instant ils gardent leur rendu actuel.
 *
 *   Data / actions   →  hooks/useTrainingData.js       (inchangé)
 *   Helpers purs     →  lib/trainingUtils.js            (inchangé)
 *   Notes calendrier →  lib/calendarNotes.js            (inchangé)
 *   Blocs exercice   →  components/training/ExerciseBlock.jsx   (inchangé)
 *   Historique       →  components/training/HistoryCalendar.jsx (inchangé)
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import AppShell from '../components/ui/AppShell'
import { watchBreakpoint } from '../lib/breakpoints'
import SurfaceCard from '../components/ui/SurfaceCard'
import SectionHead from '../components/ui/SectionHead'
import StatusBadge from '../components/ui/StatusBadge'
import SegmentTabs from '../components/ui/SegmentTabs'
import EmptyPanel from '../components/ui/EmptyPanel'

import { useTrainingData } from '../hooks/useTrainingData'
import ExerciseBlock from '../components/training/ExerciseBlock'
import HistoryCalendar from '../components/training/HistoryCalendar'

import {
  buildExerciseGroups,
  dowToJS,
  getWeekDays,
  getTodayLocalString,
  getLocalDateString,
  getWorkoutDayLabel,
  workoutLogCount,
  latestPerfText,
  getLogNote,
  getLogDate,
  safeDateLabel,
  DAY_LABELS_SHORT,
  DAY_LABELS_FULL,
  weekLabel,
  getMaxFutureWeekOffset,
} from '../lib/trainingUtils'

const TRAINING_TABS = [
  { label: 'Séance', value: 'session' },
  { label: 'Historique', value: 'history' },
]

export default function TrainingPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState('session')
  const [weekOffset, setWeekOffset] = useState(0)
  const [openWorkout, setOpenWorkout] = useState(null)
  const [selectedExerciseId, setSelectedExerciseId] = useState(null)
  const [selectedCalDay, setSelectedCalDay] = useState(null)
  const [imageLightbox, setImageLightbox] = useState(null)

  const {
    loading,
    error,
    success,
    workouts,
    archivedWorkouts,
    logsByExerciseName,
    currentCycleName,
    userName,
    logInputs,
    loggingIds,
    logPerformance,
    onLogInput,
    blockInputs,
    loggingBlockIds,
    blockResults,
    logBlockResult,
    onBlockInput,
    calendarNotes,
    noteDraft,
    setNoteDraft,
    savingNote,
    saveNote,
    removeNote,
  } = useTrainingData()

  // ── Responsive ──────────────────────────────────────────────────────────────
  useEffect(() => watchBreakpoint('tablet', setIsMobile), [])

  // ── Calendrier ───────────────────────────────────────────────────────────────
  const maxWeekOffset = useMemo(() => getMaxFutureWeekOffset(), [])
  const clampedOffset = Math.min(weekOffset, maxWeekOffset)
  const weekDays = useMemo(() => getWeekDays(clampedOffset), [clampedOffset])
  const todayStr = useMemo(() => getTodayLocalString(), [])

  const workoutByJsDay = useMemo(() => {
    const map = {}
    workouts.forEach((w) => {
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
  const currentWorkout = useMemo(
    () => workouts.find((w) => w.id === openWorkout) || null,
    [workouts, openWorkout]
  )
  const exerciseBlocks = useMemo(
    () => (currentWorkout ? buildExerciseGroups(currentWorkout.exercises) : []),
    [currentWorkout]
  )
  const selectedExercise = useMemo(() => {
    if (!currentWorkout) return null
    return (
      currentWorkout.exercises?.find((e) => e.id === selectedExerciseId) ||
      currentWorkout.exercises?.[0] ||
      null
    )
  }, [currentWorkout, selectedExerciseId])

  // ── Auto-sélections ──────────────────────────────────────────────────────────
  const openSession = useCallback(
    (id) => {
      setOpenWorkout(id)
      const w = workouts.find((w) => w.id === id)
      setSelectedExerciseId(w?.exercises?.[0]?.id || null)
    },
    [workouts]
  )

  useEffect(() => {
    if (workouts.length && selectedCalDay === null) {
      const todayWorkouts = workoutByJsDay[new Date().getDay()] || []
      if (todayWorkouts.length) {
        setSelectedCalDay(todayStr)
        openSession(todayWorkouts[0].id)
      }
    }
  }, [workouts, workoutByJsDay, todayStr, openSession, selectedCalDay])

  useEffect(() => {
    if (workouts.length && !isMobile && !openWorkout) openSession(workouts[0].id)
  }, [workouts, isMobile, openWorkout, openSession])

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function selectCalDay(dateStr) {
    setSelectedCalDay((prev) => {
      const next = prev === dateStr ? null : dateStr
      setNoteDraft(next ? calendarNotes[next]?.note || '' : '')
      return next
    })
  }

  const blockProps = {
    logInputs,
    loggingIds,
    logsByName: logsByExerciseName,
    onLogInput,
    onLog: logPerformance,
    onImageOpen: setImageLightbox,
    blockInputs,
    loggingBlockIds,
    blockResults,
    onBlockInput,
    onLogBlock: logBlockResult,
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <AppShell
        title="Training"
        subtitle="Chargement..."
        actions={<SegmentTabs items={TRAINING_TABS} value={activeTab} onChange={setActiveTab} />}
      >
        <div className="tp-loading">
          <div className="tp-spinner" />
          <span>Chargement de ta séance…</span>
        </div>
      </AppShell>
    )

  return (
    <AppShell
      title="Training"
      subtitle="Un espace clair et lisible"
      actions={<SegmentTabs items={TRAINING_TABS} value={activeTab} onChange={setActiveTab} />}
      userName={userName}
      cycleName={currentCycleName}
      coachName="Ben"
      coachAvailable
    >
      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      {imageLightbox && (
        <div className="tp-lightbox" onClick={() => setImageLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ratio d'aspect variable/inconnu (photo libre), voir commentaire au-dessus */}
          <img src={imageLightbox} alt="Exercice" />
        </div>
      )}

      {activeTab === 'session' ? (
        isMobile ? (
          <SessionMobile
            workouts={workouts}
            openWorkout={openWorkout}
            setOpenWorkout={setOpenWorkout}
            currentWorkout={currentWorkout}
            exerciseBlocks={exerciseBlocks}
            currentCycleName={currentCycleName}
            weekDays={weekDays}
            weekOffset={weekOffset}
            setWeekOffset={setWeekOffset}
            maxWeekOffset={maxWeekOffset}
            todayStr={todayStr}
            selectedCalDay={selectedCalDay}
            selectCalDay={selectCalDay}
            calDayWorkouts={calDayWorkouts}
            workoutByJsDay={workoutByJsDay}
            logsByExerciseName={logsByExerciseName}
            selectedExerciseId={selectedExerciseId}
            setSelectedExerciseId={setSelectedExerciseId}
            calendarNotes={calendarNotes}
            noteDraft={noteDraft}
            setNoteDraft={setNoteDraft}
            savingNote={savingNote}
            saveNote={saveNote}
            removeNote={removeNote}
            openSession={openSession}
            blockProps={blockProps}
          />
        ) : (
          <SessionDesktop
            workouts={workouts}
            currentWorkout={currentWorkout}
            exerciseBlocks={exerciseBlocks}
            currentCycleName={currentCycleName}
            selectedExercise={selectedExercise}
            logsByExerciseName={logsByExerciseName}
            selectedExerciseId={selectedExerciseId}
            setSelectedExerciseId={setSelectedExerciseId}
            openSession={openSession}
            blockProps={blockProps}
            onImageOpen={setImageLightbox}
          />
        )
      ) : (
        <HistoryCalendar
          weekDays={weekDays}
          weekOffset={weekOffset}
          setWeekOffset={setWeekOffset}
          todayStr={todayStr}
          logsByExerciseName={logsByExerciseName}
          workoutByJsDay={workoutByJsDay}
          archivedWorkouts={archivedWorkouts}
        />
      )}
    </AppShell>
  )
}

// Styles : styles/training.css (importé dans pages/_app.js, classes .tp-*)

// ─── Vue mobile ───────────────────────────────────────────────────────────────

function SessionMobile({
  workouts,
  openWorkout,
  setOpenWorkout,
  currentWorkout,
  exerciseBlocks,
  currentCycleName,
  weekDays,
  weekOffset,
  setWeekOffset,
  maxWeekOffset,
  todayStr,
  selectedCalDay,
  selectCalDay,
  calDayWorkouts,
  workoutByJsDay,
  logsByExerciseName,
  selectedExerciseId,
  setSelectedExerciseId,
  calendarNotes,
  noteDraft,
  setNoteDraft,
  savingNote,
  saveNote,
  removeNote,
  openSession,
  blockProps,
}) {
  if (openWorkout) {
    return (
      <div>
        <button
          onClick={() => setOpenWorkout(null)}
          className="tp-btn ghost"
          style={{ padding: '4px 0 12px' }}
        >
          ← Retour aux séances
        </button>
        <SurfaceCard padded>
          <SectionHead
            title={currentWorkout?.name || 'Programme'}
            action={
              currentWorkout?.type ? (
                <StatusBadge tone="default">{currentWorkout.type}</StatusBadge>
              ) : null
            }
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {exerciseBlocks.map((block) => (
              <ExerciseBlock
                key={block.id}
                block={block}
                selectedId={selectedExerciseId}
                onSelect={setSelectedExerciseId}
                isMobile
                {...blockProps}
              />
            ))}
          </div>
        </SurfaceCard>
      </div>
    )
  }

  // Métadonnées par jour, calculées une fois pour le rail + la grille.
  const dayMeta = weekDays.map((day) => {
    const dateStr = getLocalDateString(day)
    const jsDay = day.getDay()
    const hasLogs = Object.values(logsByExerciseName).some((logs) =>
      logs.some((l) => {
        const d = l.logged_at || l.created_at || l.date || null
        return d && d.startsWith(dateStr)
      })
    )
    return {
      day,
      dateStr,
      jsDay,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedCalDay,
      hasWorkout: !!workoutByJsDay[jsDay]?.length,
      hasLogs,
      hasNote: !!calendarNotes[dateStr],
      isPast: day < new Date(todayStr),
    }
  })
  const doneCount = dayMeta.filter((d) => d.hasLogs).length
  const fillPct = Math.round((doneCount / 7) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {currentCycleName && <CycleBadge name={currentCycleName} />}

      {/* ── Calendrier hebdo ── */}
      <div className="tp-week-card">
        <div className="tp-week-head">
          <CalNavBtn onClick={() => setWeekOffset((w) => w - 1)}>‹</CalNavBtn>
          <div className="center">
            {weekOffset === 0
              ? '📍 Cette semaine'
              : weekOffset === -1
                ? 'Semaine passée'
                : weekOffset === 1
                  ? 'Semaine prochaine'
                  : weekLabel(weekDays)}
            <div className="sub">{weekLabel(weekDays)}</div>
          </div>
          <CalNavBtn
            onClick={() => setWeekOffset((w) => Math.min(w + 1, maxWeekOffset))}
            disabled={weekOffset >= maxWeekOffset}
          >
            ›
          </CalNavBtn>
        </div>

        <div className="tp-week-rail">
          <div className="tp-week-line" />
          <div className="tp-week-line-fill" style={{ width: `${fillPct}%` }} />
          <div className="tp-week-grid">
            {dayMeta.map((m) => (
              <button
                key={m.dateStr}
                className={[
                  'tp-day',
                  m.isToday && 'today',
                  m.hasLogs && 'done',
                  m.isSelected && 'selected',
                  m.isPast && 'past',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  selectCalDay(m.dateStr)
                  if (m.dateStr !== selectedCalDay && workoutByJsDay[m.jsDay]?.length)
                    openSession(workoutByJsDay[m.jsDay][0].id)
                }}
              >
                {m.hasNote && (
                  <span className="note-flag" title="Annotation">
                    📌
                  </span>
                )}
                <span className="dow">{DAY_LABELS_SHORT[m.jsDay]}</span>
                <span className="chip">{m.day.getDate()}</span>
                <span className="marker">
                  {m.hasWorkout && !m.hasLogs && (
                    <Dot color={m.isSelected ? 'rgba(255,255,255,0.85)' : 'var(--accent)'} />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="tp-legend">
          <Legend color="var(--accent)" label="Séance programmée" />
          <Legend color="#3A7A5A" label="Entraînement logué ✓" />
          <span style={{ fontSize: 10, color: '#6B7A99' }}>📌 Annotation</span>
        </div>
      </div>

      {/* ── Annotation du jour ── */}
      {selectedCalDay && (
        <div className="tp-note-card">
          <div className="title">
            📌 Annotation —{' '}
            {new Date(selectedCalDay + 'T12:00:00').toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
            })}
          </div>
          <textarea
            autoFocus
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Ex: Semaine de deload, bilan mensuel, départ en vacances…"
            rows={3}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => saveNote(selectedCalDay)}
              disabled={savingNote}
              className="tp-btn primary"
            >
              {savingNote ? '…' : '✓ Enregistrer'}
            </button>
            {calendarNotes[selectedCalDay] && (
              <button
                onClick={() => removeNote(selectedCalDay)}
                disabled={savingNote}
                className="tp-btn danger"
              >
                🗑 Supprimer
              </button>
            )}
            <button onClick={() => selectCalDay(selectedCalDay)} className="tp-btn ghost">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ── Séances du jour ── */}
      {selectedCalDay && calDayWorkouts.length > 0 && (
        <div className="tp-day-sessions">
          <div className="title">
            📅 {DAY_LABELS_FULL[new Date(selectedCalDay + 'T12:00:00').getDay()]} —{' '}
            {new Date(selectedCalDay + 'T12:00:00').toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
            })}
          </div>
          {calDayWorkouts.map((workout) => (
            <button
              key={workout.id}
              onClick={() => openSession(workout.id)}
              className={`tp-workout-pill ${openWorkout === workout.id ? 'active' : ''}`}
            >
              <div className="name">{workout.name}</div>
              <div className="meta">
                {(workout.exercises || []).length} exercices · {workout.duration || '—'} min
              </div>
            </button>
          ))}
        </div>
      )}
      {selectedCalDay && calDayWorkouts.length === 0 && (
        <div className="tp-rest-card">
          😴 Pas de séance programmée ce jour — repos ou cardio libre
        </div>
      )}

      {/* ── Programme complet ── */}
      <WorkoutList
        workouts={workouts}
        openWorkout={openWorkout}
        logsByExerciseName={logsByExerciseName}
        onOpen={openSession}
      />
    </div>
  )
}

// ─── Vue desktop 3 colonnes ───────────────────────────────────────────────────

function SessionDesktop({
  workouts,
  currentWorkout,
  exerciseBlocks,
  currentCycleName,
  selectedExercise,
  logsByExerciseName,
  selectedExerciseId,
  setSelectedExerciseId,
  openSession,
  blockProps,
  onImageOpen,
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(200px, 0.92fr) minmax(380px, 1.4fr) minmax(220px, 0.92fr)',
        gap: 14,
        alignItems: 'start',
      }}
    >
      <SurfaceCard padded sticky>
        {currentCycleName && <CycleBadge name={currentCycleName} style={{ marginBottom: 12 }} />}
        <SectionHead
          title="Séances"
          caption="Choisis la séance active puis navigue exercice par exercice."
        />
        {workouts.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {workouts.map((workout) => {
              const active = workout.id === currentWorkout?.id
              return (
                <button
                  key={workout.id}
                  type="button"
                  onClick={() => openSession(workout.id)}
                  className={`tp-wk-row ${active ? 'active' : ''}`}
                >
                  <div className="body">
                    <div className="name">{workout.name}</div>
                    <div className="meta">
                      {getWorkoutDayLabel(workout.day_of_week)} · {(workout.exercises || []).length}{' '}
                      exos
                    </div>
                  </div>
                  {active && <span className="tp-pill-active">Active</span>}
                </button>
              )
            })}
          </div>
        ) : (
          <EmptyPanel
            title="Aucune séance"
            description="Ton coach n'a pas encore chargé de séance active."
          />
        )}
        <div style={{ marginTop: 12 }}>
          <SectionHead title="Vue rapide" caption="Résumé de la séance sélectionnée." />
          <div className="tp-kpi-grid">
            <MiniKpi label="Exos" value={currentWorkout?.exercises?.length || 0} />
            <MiniKpi label="Blocs" value={exerciseBlocks.length} />
            <MiniKpi
              label="Logs"
              value={currentWorkout ? workoutLogCount(currentWorkout, logsByExerciseName) : 0}
            />
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard padded>
        <SectionHead
          title={currentWorkout?.name || 'Programme'}
          caption="Sélectionne un exercice depuis la liste."
          action={
            currentWorkout?.type ? (
              <StatusBadge tone="default">{currentWorkout.type}</StatusBadge>
            ) : null
          }
        />
        {currentWorkout ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {exerciseBlocks.map((block) => (
              <ExerciseBlock
                key={block.id}
                block={block}
                selectedId={selectedExerciseId}
                onSelect={setSelectedExerciseId}
                isMobile={false}
                {...blockProps}
              />
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="Aucune séance ouverte"
            description="Sélectionne une séance à gauche."
          />
        )}
      </SurfaceCard>

      <SurfaceCard padded sticky>
        <SectionHead title="Historique mouvement" caption="" />
        {selectedExercise ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedExercise.image_url && (
              <button
                type="button"
                onClick={() => onImageOpen(selectedExercise.image_url)}
                className="tp-image-btn"
              >
                <Image
                  src={selectedExercise.image_url}
                  alt={selectedExercise.name}
                  fill
                  sizes="400px"
                  style={{ objectFit: 'cover' }}
                />
              </button>
            )}
            <InfoCard title="Exercice" value={selectedExercise.name} />
            <div className="tp-hist-card">
              <div className="head">📊 Historique récent</div>
              {(logsByExerciseName[selectedExercise.name] || []).length === 0 ? (
                <div style={{ color: '#9AAAD4', fontSize: 12 }}>Aucun log pour cet exercice.</div>
              ) : (
                <div>
                  {(logsByExerciseName[selectedExercise.name] || []).slice(0, 5).map((log, i) => (
                    <div key={log.id || i} className="tp-hist-row">
                      <Dot color={i === 0 ? 'var(--accent)' : '#C5D8F5'} size={6} />
                      <div className="txt">
                        <span
                          style={{
                            fontWeight: i === 0 ? 800 : 600,
                            fontSize: i === 0 ? 13 : 12,
                            color: i === 0 ? 'var(--accent)' : '#4A6FB5',
                          }}
                        >
                          {latestPerfText(log)}
                        </span>
                        {getLogNote(log) && (
                          <span style={{ fontSize: 10, color: '#9AAAD4', marginLeft: 4 }}>
                            · {getLogNote(log)}
                          </span>
                        )}
                      </div>
                      <div className="date">{safeDateLabel(getLogDate(log))}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyPanel title="Sélectionne un exercice" description="" />
        )}
      </SurfaceCard>
    </div>
  )
}

// ─── Composants partagés (locaux à ce fichier) ────────────────────────────────

function WorkoutList({ workouts, openWorkout, logsByExerciseName, onOpen }) {
  if (!workouts.length)
    return (
      <div className="tp-list-card">
        <EmptyPanel
          title="Aucune séance"
          description="Ton coach n'a pas encore chargé de séance active."
        />
      </div>
    )
  return (
    <div className="tp-list-card">
      <div className="tp-list-head">
        <div className="t">📋 Programme complet</div>
        <div className="s">Toutes tes séances du cycle actuel</div>
      </div>
      <div className="tp-list-body">
        {workouts.map((workout) => {
          const isActive = workout.id === openWorkout
          const jsDay = dowToJS(workout.day_of_week)
          const hasLogs = Object.values(logsByExerciseName).some((logs) =>
            logs.some((l) => l.workout_id === workout.id)
          )
          return (
            <button
              key={workout.id}
              type="button"
              onClick={() => onOpen(workout.id)}
              className={`tp-wk-row ${isActive ? 'active' : ''}`}
            >
              <div className="avatar">
                <span className="d">{DAY_LABELS_SHORT[jsDay]}</span>
                <span className="n">
                  {dowToJS(workout.day_of_week) === new Date().getDay() ? new Date().getDate() : ''}
                </span>
              </div>
              <div className="body">
                <div className="name">{workout.name}</div>
                <div className="meta">
                  {getWorkoutDayLabel(workout.day_of_week)} · {(workout.exercises || []).length}{' '}
                  exos
                  {workout.duration ? ` · ${workout.duration} min` : ''}
                </div>
              </div>
              {hasLogs && <span className="flag">✅</span>}
              {isActive && <span className="tp-pill-active">Actif</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CycleBadge({ name, style }) {
  return (
    <div className="tp-cycle" style={style}>
      <div className="emoji">🏆</div>
      <div>
        <div className="lbl">Cycle actuel</div>
        <div className="name">{name}</div>
      </div>
    </div>
  )
}

function Alert({ tone, children }) {
  const s =
    tone === 'error'
      ? {
          borderColor: '#F3C4C4',
          background: '#FEF2F2',
          color: '#B42318',
          label: 'Erreur',
          icon: '⚠️',
        }
      : { borderColor: '#C9E9D5', background: '#F0FBF4', color: '#16804A', label: 'OK', icon: '✓' }
  return (
    <div style={{ marginBottom: 12 }}>
      <SurfaceCard padded style={{ borderColor: s.borderColor, background: s.background }}>
        <div className={`tp-alert ${tone}`}>
          <div className="icon" style={{ color: s.color }}>
            {s.icon}
          </div>
          <div>
            <strong className="label" style={{ color: s.color }}>
              {s.label}
            </strong>
            <div className="msg" style={{ color: s.color }}>
              {children}
            </div>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}

function MiniKpi({ label, value }) {
  return (
    <div className="tp-kpi">
      <div className="l">{label}</div>
      <div className="v">{value}</div>
    </div>
  )
}

function InfoCard({ title, value }) {
  return (
    <div className="tp-info-card">
      <div className="t">{title}</div>
      <div className="v">{value}</div>
    </div>
  )
}

function Dot({ color, size = 5 }) {
  return (
    <div
      style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }}
    />
  )
}

function Legend({ color, label }) {
  return (
    <div className="item">
      <Dot color={color} size={6} />
      {label}
    </div>
  )
}

function CalNavBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} className="tp-navbtn">
      {children}
    </button>
  )
}
