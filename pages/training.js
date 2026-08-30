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
  const openSession = useCallback((id) => {
    setOpenWorkout(id)
    const w = workouts.find((w) => w.id === id)
    setSelectedExerciseId(w?.exercises?.[0]?.id || null)
  }, [workouts])

  useEffect(() => {
    if (workouts.length && selectedCalDay === null) {
      const todayWorkouts = workoutByJsDay[new Date().getDay()] || []
      if (todayWorkouts.length) {
        setSelectedCalDay(todayStr)
        openSession(todayWorkouts[0].id)
      }
    }
  }, [workouts, workoutByJsDay, todayStr, openSession])

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
        <TrainingStyles />
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
      <TrainingStyles />

      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      {imageLightbox && (
        <div className="tp-lightbox" onClick={() => setImageLightbox(null)}>
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

// ─── Styles partagés (scoped via styled-jsx global, préfixe tp-) ──────────────
// N'affecte que les classNames tp-*, ne touche à aucun composant partagé.

function TrainingStyles() {
  return (
    <style jsx global>{`
      .tp-loading {
        min-height: 200px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: #6b7a99;
        font-size: 13px;
      }
      .tp-spinner {
        width: 26px;
        height: 26px;
        border: 2px solid #e8ecf5;
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: tp-spin 0.75s linear infinite;
      }
      @keyframes tp-spin {
        to { transform: rotate(360deg); }
      }

      .tp-lightbox {
        position: fixed;
        inset: 0;
        background: rgba(10, 16, 32, 0.82);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
      }
      .tp-lightbox img {
        max-width: min(1000px, 100%);
        max-height: 88vh;
        border-radius: 16px;
      }

      /* Alert */
      .tp-alert { display: flex; align-items: flex-start; gap: 10px; }
      .tp-alert .icon {
        width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center; font-size: 12px;
      }
      .tp-alert.error .icon { background: rgba(180,35,24,0.12); }
      .tp-alert.success .icon { background: rgba(22,128,74,0.12); }
      .tp-alert .label { display: block; font-size: 11.5px; font-weight: 800; margin-bottom: 1px; }
      .tp-alert .msg { font-size: 12px; }

      /* Cycle badge — chip dégradé */
      .tp-cycle {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border-radius: 14px;
        background: linear-gradient(135deg, var(--navy), #24365E);
        box-shadow: 0 8px 20px rgba(20,33,61,0.18);
      }
      .tp-cycle .emoji {
        width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
        background: rgba(240,184,72,0.18);
        display: flex; align-items: center; justify-content: center; font-size: 14px;
      }
      .tp-cycle .lbl { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #F0B848; }
      .tp-cycle .name { font-size: 13.5px; font-weight: 800; color: #fff; margin-top: 1px; }

      /* Calendrier semaine — carte + rail de progression */
      .tp-week-card {
        background: #fff;
        border-radius: 18px;
        border: 1px solid #E8ECF5;
        overflow: hidden;
        box-shadow: 0 4px 16px rgba(13,27,78,0.06);
      }
      .tp-week-head {
        background: linear-gradient(135deg, var(--navy), #1D2E52);
        padding: 12px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .tp-week-head .center { color: #fff; font-size: 12px; font-weight: 800; text-align: center; }
      .tp-week-head .sub { font-size: 10px; opacity: 0.6; font-weight: 500; margin-top: 1px; }
      .tp-navbtn {
        width: 28px; height: 28px; border-radius: 9px; border: none;
        background: rgba(255,255,255,0.12); color: #fff; font-size: 15px;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
        transition: background 0.15s;
      }
      .tp-navbtn:hover:not(:disabled) { background: rgba(255,255,255,0.22); }
      .tp-navbtn:disabled { opacity: 0.35; cursor: not-allowed; }

      .tp-week-rail { position: relative; padding: 14px 10px 6px; }
      .tp-week-line {
        position: absolute; left: 9%; right: 9%; top: 33px; height: 3px; border-radius: 3px;
        background: #E8ECF5; z-index: 0;
      }
      .tp-week-line-fill {
        position: absolute; left: 9%; top: 33px; height: 3px; border-radius: 3px; z-index: 1;
        background: linear-gradient(90deg, #3A7A5A, var(--accent));
        transition: width 0.3s ease;
      }
      .tp-week-grid { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
      .tp-day {
        display: flex; flex-direction: column; align-items: center; gap: 5px;
        background: none; border: none; cursor: pointer; padding: 0 0 4px; position: relative;
        font-family: inherit;
      }
      .tp-day .note-flag { position: absolute; top: -4px; right: 8px; font-size: 9px; }
      .tp-day .dow { font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #9AAAD4; }
      .tp-day .chip {
        width: 32px; height: 32px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 13px; font-weight: 700; color: var(--navy);
        background: #fff; border: 2px solid #E8ECF5; transition: 0.15s ease;
      }
      .tp-day.today .chip { border-color: var(--accent); color: var(--accent); font-weight: 800; }
      .tp-day.done .chip { background: linear-gradient(135deg, #3A7A5A, #4E9A76); border-color: transparent; color: #fff; }
      .tp-day.selected .chip {
        background: linear-gradient(135deg, var(--accent), #1E4FC4); border-color: transparent; color: #fff;
        box-shadow: 0 6px 14px rgba(47,111,237,0.35);
      }
      .tp-day.past:not(.done):not(.selected) .chip { color: #B0B8CC; }
      .tp-day .marker { height: 6px; display: flex; gap: 2px; align-items: center; }

      .tp-legend { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; padding: 10px 14px 12px; }
      .tp-legend .item { display: flex; align-items: center; gap: 5px; font-size: 10px; color: #6B7A99; }
      .tp-legend .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

      /* Annotation coach */
      .tp-note-card {
        background: #fff;
        border-radius: 14px;
        padding: 13px 15px;
        border: 1.5px solid var(--gold);
        box-shadow: 0 4px 14px rgba(240,184,72,0.12);
      }
      .tp-note-card .title {
        font-size: 11px; font-weight: 800; color: var(--gold);
        text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;
      }
      .tp-note-card textarea {
        width: 100%; box-sizing: border-box; padding: 10px; border-radius: 10px;
        border: 1px solid #DCE5F3; font-size: 13px; color: var(--navy);
        font-family: inherit; resize: vertical; margin-bottom: 8px; background: #FBFCFE;
      }
      .tp-note-card textarea:focus { outline: none; border-color: var(--gold); background: #fff; }
      .tp-btn {
        border: none; border-radius: 9px; padding: 8px 14px; font-size: 12px; font-weight: 800;
        cursor: pointer; font-family: inherit;
      }
      .tp-btn.primary { background: linear-gradient(135deg, var(--accent), #1E4FC4); color: #fff; box-shadow: 0 6px 14px rgba(47,111,237,0.25); }
      .tp-btn.danger { background: #fff; border: 1px solid #E3B0B0; color: #B42318; }
      .tp-btn.ghost { background: transparent; color: #6B7A99; }
      .tp-btn:disabled { opacity: 0.55; cursor: not-allowed; }

      /* Séances du jour */
      .tp-day-sessions {
        background: linear-gradient(135deg, #EEF4FF, #F7FAFF);
        border: 1px solid #D7E4FF; border-radius: 14px; padding: 12px 14px;
      }
      .tp-day-sessions .title {
        font-size: 11px; font-weight: 800; color: var(--accent);
        text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;
      }
      .tp-workout-pill {
        width: 100%; text-align: left; border-radius: 12px; padding: 11px 13px;
        cursor: pointer; font-family: inherit; border: 1px solid #DCE5F3; background: #fff;
        margin-top: 7px; transition: 0.15s ease;
      }
      .tp-workout-pill:first-of-type { margin-top: 0; }
      .tp-workout-pill.active { background: linear-gradient(135deg, var(--accent), #1E4FC4); border-color: transparent; }
      .tp-workout-pill .name { font-weight: 800; font-size: 14px; color: var(--navy); }
      .tp-workout-pill.active .name { color: #fff; }
      .tp-workout-pill .meta { font-size: 11px; color: #6B7A99; margin-top: 2px; }
      .tp-workout-pill.active .meta { color: rgba(255,255,255,0.75); }

      .tp-rest-card {
        background: #F8F9FB; border: 1px solid #E8ECF5; border-radius: 14px; padding: 16px;
        text-align: center; color: #6B7A99; font-size: 13px;
      }

      /* Programme complet / liste des séances */
      .tp-list-card { background: #fff; border-radius: 16px; border: 1px solid #E8ECF5; overflow: hidden; }
      .tp-list-head { padding: 13px 14px 9px; border-bottom: 1px solid #E8ECF5; }
      .tp-list-head .t { font-weight: 800; font-size: 13px; color: var(--navy); }
      .tp-list-head .s { font-size: 11px; color: #6B7A99; margin-top: 2px; }
      .tp-list-body { padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; }
      .tp-wk-row {
        width: 100%; display: flex; align-items: center; gap: 11px; text-align: left;
        border-radius: 12px; padding: 10px 12px; cursor: pointer; font-family: inherit;
        border: 1px solid #E8ECF5; background: #FBFCFE; transition: 0.15s ease;
      }
      .tp-wk-row:hover { border-color: #C5D8F5; }
      .tp-wk-row.active { border-color: transparent; background: linear-gradient(135deg, var(--accent), #1E4FC4); box-shadow: 0 6px 16px rgba(47,111,237,0.22); }
      .tp-wk-row .avatar {
        width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: #EEF4FF; color: var(--navy);
      }
      .tp-wk-row.active .avatar { background: rgba(255,255,255,0.18); color: #fff; }
      .tp-wk-row .avatar .d { font-size: 8.5px; font-weight: 800; text-transform: uppercase; line-height: 1; }
      .tp-wk-row .avatar .n { font-size: 14px; font-weight: 900; line-height: 1.2; }
      .tp-wk-row .body { flex: 1; min-width: 0; }
      .tp-wk-row .name { font-weight: 800; font-size: 13px; color: var(--navy); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .tp-wk-row.active .name { color: #fff; }
      .tp-wk-row .meta { font-size: 11px; color: #6B7A99; margin-top: 1px; }
      .tp-wk-row.active .meta { color: rgba(255,255,255,0.75); }
      .tp-wk-row .flag { font-size: 12px; flex-shrink: 0; }
      .tp-pill-active {
        font-size: 10px; font-weight: 800; background: rgba(255,255,255,0.2); color: #fff;
        padding: 3px 8px; border-radius: 20px; flex-shrink: 0;
      }

      /* KPIs */
      .tp-kpi-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
      .tp-kpi { border: 1px solid #DCEBFF; border-radius: 13px; background: linear-gradient(135deg, #EEF4FF, #F7FAFF); padding: 11px; }
      .tp-kpi .l { font-size: 9.5px; color: #6B8ED6; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 800; }
      .tp-kpi .v { font-weight: 900; font-size: 21px; color: var(--navy); margin-top: 2px; }

      /* Historique mouvement (panneau droit desktop) */
      .tp-info-card { border: 1px solid #DCEBFF; border-radius: 13px; background: #fff; padding: 12px; }
      .tp-info-card .t { font-weight: 800; color: var(--navy); margin-bottom: 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
      .tp-info-card .v { color: #4A6FB5; font-size: 13px; }
      .tp-hist-card { border: 1px solid #DCEBFF; border-radius: 13px; background: #fff; padding: 12px; }
      .tp-hist-card .head { font-weight: 800; color: var(--navy); margin-bottom: 8px; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; }
      .tp-hist-row { display: flex; align-items: center; gap: 7px; padding: 5px 0; }
      .tp-hist-row + .tp-hist-row { border-top: 1px solid #F0F5FF; }
      .tp-hist-row .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
      .tp-hist-row .txt { flex: 1; }
      .tp-hist-row .date { font-size: 10px; color: #9AAAD4; flex-shrink: 0; }
      .tp-image-btn { padding: 0; border: 1px solid #DCE5F3; border-radius: 13px; overflow: hidden; cursor: pointer; background: #fff; }
      .tp-image-btn img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; display: block; }

      /* ── Historique (HistoryCalendar.jsx) — même rail de calendrier ── */
      .tp-cal-nav-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 10px; }
      .tp-cal-navbtn {
        width: 32px; height: 32px; border-radius: 10px; border: 1px solid #DCE5F3;
        background: #EEF4FF; color: var(--accent); font-weight: 800; font-size: 16px;
        cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.15s;
      }
      .tp-cal-navbtn:hover:not(:disabled) { background: #E0EAFE; }
      .tp-cal-navbtn:disabled { opacity: 0.4; cursor: not-allowed; background: #F5F5F5; color: #CCC; }
      .tp-cal-label { font-size: 13px; font-weight: 800; color: var(--navy); text-align: center; }
      .tp-cal-sub { font-size: 10px; color: #6B8ED6; margin-top: 2px; font-weight: 600; }
      .tp-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
      .tp-cal-day {
        border-radius: 12px; padding: 8px 4px; text-align: center; cursor: pointer;
        border: 1.5px solid #E8F0FF; background: #fff; transition: 0.15s; font-family: inherit;
      }
      .tp-cal-day .dow { font-size: 9px; color: #6B8ED6; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
      .tp-cal-day .num { font-size: 15px; font-weight: 900; color: var(--navy); }
      .tp-cal-day.today { border-color: #B0C4F5; background: #EEF4FF; }
      .tp-cal-day.haslogs:not(.selected) { background: #F0F7FF; }
      .tp-cal-day.future { opacity: 0.35; cursor: default; }
      .tp-cal-day.selected { border-color: transparent; background: linear-gradient(135deg, var(--accent), #1E4FC4); box-shadow: 0 6px 14px rgba(47,111,237,0.3); }
      .tp-cal-day.selected .num, .tp-cal-day.selected .dow { color: #fff; }
      .tp-cal-day.today .num { color: var(--accent); }
      .tp-cal-day .marker { display: flex; justify-content: center; gap: 2px; margin-top: 4px; min-height: 6px; }

      .tp-log-card { border: 1.5px solid #DCEBFF; border-radius: 14px; background: #fff; overflow: hidden; }
      .tp-log-card .head { background: #EEF4FF; padding: 9px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
      .tp-log-card .head .name { font-weight: 800; color: var(--navy); font-size: 13px; }
      .tp-log-card .body { padding: 9px 14px; display: flex; flex-direction: column; gap: 2px; }
      .tp-log-entry { display: flex; align-items: baseline; gap: 10px; padding: 6px 0; }
      .tp-log-entry + .tp-log-entry { border-top: 1px solid #F0F5FF; }
      .tp-log-num {
        width: 20px; height: 20px; border-radius: 50%; background: var(--accent); color: #fff;
        font-size: 9px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .tp-log-perf { font-weight: 700; font-size: 14px; color: var(--navy); }
      .tp-log-note { font-size: 11px; color: #6B8ED6; margin-top: 2px; }
      .tp-log-time { font-size: 10px; color: #9AAAD4; flex-shrink: 0; }

      .tp-accordion { border: 1px solid #E8ECF5; border-radius: 14px; overflow: hidden; }
      .tp-accordion-head {
        width: 100%; text-align: left; padding: 12px 16px; background: #F8FAFF; border: none;
        cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-family: inherit;
      }
      .tp-accordion-head .t { font-weight: 800; color: var(--navy); }
      .tp-accordion-body { padding: 12px 16px; background: #fff; border-top: 1px solid #E8ECF5; }
      .tp-wk-mini {
        width: 100%; text-align: left; background: #FAFBFF; border: 1px solid #DCE5F3; border-radius: 10px;
        padding: 10px 12px; cursor: pointer; font-family: inherit; margin-bottom: 10px;
      }
      .tp-wk-mini .t { font-weight: 700; color: var(--navy); }
      .tp-wk-mini .m { font-size: 11px; color: #6B7A99; }
      .tp-ex-sub { padding: 8px 0; border-bottom: 1px solid #F0F5FF; }
      .tp-ex-sub .n { font-weight: 600; color: var(--navy); }
      .tp-ex-sub .m { font-size: 12px; color: #6B7A99; }
      .tp-ex-sub .note { font-size: 11px; color: #4A6FB5; }

      /* ── Blocs exercice (ExerciseBlock.jsx) ── */
      .tp-wblock { border-radius: 14px; overflow: hidden; box-shadow: 0 6px 18px rgba(13,27,78,0.12); margin-bottom: 6px; }
      .tp-wblock-head { padding: 10px 14px; display: flex; align-items: center; gap: 8px; }
      .tp-wblock-head .label { color: #fff; font-weight: 800; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; }
      .tp-wblock-head .rounds { font-size: 10px; color: rgba(255,255,255,0.65); font-weight: 600; margin-left: auto; }
      .tp-wblock-body { background: var(--navy); padding: 8px 14px 10px; }
      .tp-wblock-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; color: rgba(255,255,255,0.85); font-size: 12px; }
      .tp-wblock-row + .tp-wblock-row { border-top: 1px solid rgba(255,255,255,0.07); }
      .tp-wblock-rest { font-size: 11px; color: rgba(255,255,255,0.55); white-space: nowrap; margin-left: auto; }
      .tp-wblock-score { background: #F8FBFF; padding: 16px; border-top: 1px solid #DCE5F3; }
      .tp-wblock-last { font-size: 11px; color: #6B7A99; margin-bottom: 10px; }
      .tp-wblock-sectlabel { font-size: 10px; font-weight: 800; color: var(--navy); letter-spacing: 0.04em; margin-bottom: 8px; text-transform: uppercase; }
      .tp-score-grid { display: grid; gap: 8px; margin-bottom: 12px; }
      .tp-score-field label { font-size: 10px; font-weight: 800; color: #6B7A99; display: block; margin-bottom: 4px; }
      .tp-score-input {
        width: 100%; box-sizing: border-box; padding: 9px 10px; border-radius: 9px; border: 1px solid #C5D8F5;
        background: #fff; font-size: 13px; color: var(--navy); font-family: inherit;
      }
      .tp-score-input:focus { outline: none; border-color: var(--accent); }
      .tp-wblock-note {
        width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #C5D8F5; background: #fff;
        font-size: 13px; color: var(--navy); line-height: 1.6; resize: vertical; font-family: inherit; box-sizing: border-box;
      }
      .tp-wblock-submit {
        width: 100%; margin-top: 12px; border: none; background: linear-gradient(135deg, var(--accent), #1E4FC4);
        color: #fff; border-radius: 10px; padding: 11px; font-size: 13px; font-weight: 800; cursor: pointer;
        box-shadow: 0 6px 14px rgba(47,111,237,0.28);
      }
      .tp-wblock-submit:disabled { opacity: 0.6; cursor: not-allowed; }

      .tp-group { border-radius: 14px; border: 2px solid; overflow: hidden; background: #fff; }
      .tp-group-head { color: #fff; padding: 7px 12px; font-weight: 800; letter-spacing: 0.05em; font-size: 10px; text-transform: uppercase; }
    `}</style>
  )
}

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
        <button onClick={() => setOpenWorkout(null)} className="tp-btn ghost" style={{ padding: '4px 0 12px' }}>
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
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  selectCalDay(m.dateStr)
                  if (m.dateStr !== selectedCalDay && workoutByJsDay[m.jsDay]?.length)
                    openSession(workoutByJsDay[m.jsDay][0].id)
                }}
              >
                {m.hasNote && <span className="note-flag" title="Annotation">📌</span>}
                <span className="dow">{DAY_LABELS_SHORT[m.jsDay]}</span>
                <span className="chip">{m.day.getDate()}</span>
                <span className="marker">
                  {m.hasWorkout && !m.hasLogs && <Dot color={m.isSelected ? 'rgba(255,255,255,0.85)' : 'var(--accent)'} />}
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
            <button onClick={() => saveNote(selectedCalDay)} disabled={savingNote} className="tp-btn primary">
              {savingNote ? '…' : '✓ Enregistrer'}
            </button>
            {calendarNotes[selectedCalDay] && (
              <button onClick={() => removeNote(selectedCalDay)} disabled={savingNote} className="tp-btn danger">
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
              <div className="meta">{(workout.exercises || []).length} exercices · {workout.duration || '—'} min</div>
            </button>
          ))}
        </div>
      )}
      {selectedCalDay && calDayWorkouts.length === 0 && (
        <div className="tp-rest-card">😴 Pas de séance programmée ce jour — repos ou cardio libre</div>
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
                      {getWorkoutDayLabel(workout.day_of_week)} ·{' '}
                      {(workout.exercises || []).length} exos
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
              <button type="button" onClick={() => onImageOpen(selectedExercise.image_url)} className="tp-image-btn">
                <img src={selectedExercise.image_url} alt={selectedExercise.name} />
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
                        <span style={{ fontWeight: i === 0 ? 800 : 600, fontSize: i === 0 ? 13 : 12, color: i === 0 ? 'var(--accent)' : '#4A6FB5' }}>
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
            <button key={workout.id} type="button" onClick={() => onOpen(workout.id)} className={`tp-wk-row ${isActive ? 'active' : ''}`}>
              <div className="avatar">
                <span className="d">{DAY_LABELS_SHORT[jsDay]}</span>
                <span className="n">
                  {dowToJS(workout.day_of_week) === new Date().getDay() ? new Date().getDate() : ''}
                </span>
              </div>
              <div className="body">
                <div className="name">{workout.name}</div>
                <div className="meta">
                  {getWorkoutDayLabel(workout.day_of_week)} · {(workout.exercises || []).length} exos
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
      ? { borderColor: '#F3C4C4', background: '#FEF2F2', color: '#B42318', label: 'Erreur', icon: '⚠️' }
      : { borderColor: '#C9E9D5', background: '#F0FBF4', color: '#16804A', label: 'OK', icon: '✓' }
  return (
    <div style={{ marginBottom: 12 }}>
      <SurfaceCard padded style={{ borderColor: s.borderColor, background: s.background }}>
        <div className={`tp-alert ${tone}`}>
          <div className="icon" style={{ color: s.color }}>{s.icon}</div>
          <div>
            <strong className="label" style={{ color: s.color }}>{s.label}</strong>
            <div className="msg" style={{ color: s.color }}>{children}</div>
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
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }} />
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
