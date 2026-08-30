/**
 * components/training/HistoryCalendar.jsx
 * Onglet Historique — calendrier, détail du jour, cycles archivés.
 *
 * HARMONISATION : reprend les classes tp-cal-*, tp-log-*, tp-accordion déjà
 * posées dans <TrainingStyles /> (pages/training.js) au lieu des styles
 * inline précédents, pour matcher exactement le rail de calendrier et les
 * cartes de log utilisés ailleurs dans la page (même dégradés accent,
 * mêmes rayons, mêmes tokens var(--navy)/var(--accent)).
 */
import { useEffect, useMemo, useState } from 'react'
import SurfaceCard from '../ui/SurfaceCard'
import SectionHead from '../ui/SectionHead'
import StatusBadge from '../ui/StatusBadge'
import EmptyPanel  from '../ui/EmptyPanel'
import { getLocalDateString, getWorkoutDayLabel, latestPerfText, getLogNote } from '../../lib/trainingUtils'

export default function HistoryCalendar({ weekDays, weekOffset, setWeekOffset, todayStr, logsByExerciseName, workoutByJsDay, archivedWorkouts }) {
  const [selectedDay, setSelectedDay] = useState(todayStr)
  useEffect(() => { setSelectedDay(todayStr) }, [todayStr])

  const logsForDay = useMemo(() => {
    if (!selectedDay) return {}
    const result = {}
    Object.entries(logsByExerciseName).forEach(([exName, logs]) => {
      const dayLogs = logs.filter(log => {
        const d = log.logged_at || log.created_at || log.date || null
        return d && getLocalDateString(new Date(d)) === selectedDay
      })
      if (dayLogs.length > 0) result[exName] = dayLogs
    })
    return result
  }, [selectedDay, logsByExerciseName])

  const daysWithLogs = useMemo(() => {
    const days = new Set()
    Object.values(logsByExerciseName).forEach(logs => {
      logs.forEach(log => {
        const d = log.logged_at || log.created_at || log.date || null
        if (d) days.add(getLocalDateString(new Date(d)))
      })
    })
    return days
  }, [logsByExerciseName])

  const selectedDayLabel = selectedDay
    ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Calendrier ── */}
      <SurfaceCard padded>
        <div className="tp-cal-nav-row">
          <NavBtn onClick={() => setWeekOffset(w => w - 1)}>‹</NavBtn>
          <div>
            <div className="tp-cal-label">
              {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {weekDays[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </div>
            {weekOffset === 0 && <div className="tp-cal-sub">Semaine en cours</div>}
          </div>
          <NavBtn onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0}>›</NavBtn>
        </div>

        <div className="tp-cal-grid">
          {weekDays.map(day => {
            const dateStr   = getLocalDateString(day)
            const isToday   = dateStr === todayStr
            const isSelected = dateStr === selectedDay
            const hasLogs   = daysWithLogs.has(dateStr)
            const jsDay     = day.getDay()
            const hasWorkout = (workoutByJsDay[jsDay] || []).length > 0
            const isFuture  = dateStr > todayStr
            return (
              <button
                key={dateStr}
                onClick={() => !isFuture && setSelectedDay(dateStr)}
                className={[
                  'tp-cal-day',
                  isToday && 'today',
                  isSelected && 'selected',
                  hasLogs && 'haslogs',
                  isFuture && 'future',
                ].filter(Boolean).join(' ')}
              >
                <div className="dow">{['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][jsDay]}</div>
                <div className="num">{day.getDate()}</div>
                <div className="marker">
                  {hasLogs    && <Dot color={isSelected ? 'rgba(255,255,255,0.9)' : 'var(--accent, #2C64E5)'} />}
                  {hasWorkout && !hasLogs && <Dot color={isSelected ? 'rgba(255,255,255,0.5)' : '#C5D8F5'} />}
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 10, color: 'var(--muted, #6B8ED6)' }}>
          <Legend color="var(--accent, #2C64E5)" label="Séance loguée" />
          <Legend color="#C5D8F5" label="Séance planifiée" />
        </div>
      </SurfaceCard>

      {/* ── Détail du jour ── */}
      <SurfaceCard padded>
        <SectionHead
          title={selectedDayLabel || 'Sélectionne un jour'}
          caption={Object.keys(logsForDay).length ? `${Object.keys(logsForDay).length} exercice(s) logué(s)` : 'Aucune performance ce jour'}
        />
        {Object.keys(logsForDay).length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(logsForDay).map(([exName, logs]) => (
              <div key={exName} className="tp-log-card">
                <div className="head">
                  <div className="name">{exName}</div>
                  <StatusBadge tone="default">{logs.length} série(s)</StatusBadge>
                </div>
                <div className="body">
                  {logs.map((log, i) => {
                    const perf = latestPerfText(log)
                    const note = getLogNote(log)
                    const time = log.logged_at ? new Date(log.logged_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null
                    return (
                      <div key={log.id || i} className="tp-log-entry">
                        <div className="tp-log-num">{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div className="tp-log-perf">{perf}</div>
                          {note && <div className="tp-log-note">{note}</div>}
                        </div>
                        {time && <div className="tp-log-time">{time}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel title="Aucune perf ce jour" description={selectedDay && selectedDay <= todayStr ? "Tu n'as rien logué ce jour-là." : "Sélectionne un jour passé pour voir tes performances."} />
        )}
      </SurfaceCard>

      <ArchivedCyclesView archivedWorkouts={archivedWorkouts} />
    </div>
  )
}

function ArchivedCyclesView({ archivedWorkouts }) {
  const [openCycle,   setOpenCycle]   = useState(null)
  const [openWorkout, setOpenWorkout] = useState(null)

  const cycles = useMemo(() => {
    const groups = {}
    archivedWorkouts.forEach(w => {
      const key = w.cycle_name || `Archivé le ${new Date(w.archived_at).toLocaleDateString('fr-FR')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(w)
    })
    return Object.entries(groups).map(([name, workouts]) => ({ name, workouts }))
  }, [archivedWorkouts])

  if (!archivedWorkouts.length) return null

  return (
    <SurfaceCard padded>
      <SectionHead title="📚 Cycles précédents" caption="Tes anciens programmes d'entraînement" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {cycles.map(cycle => (
          <div key={cycle.name} className="tp-accordion">
            <button onClick={() => setOpenCycle(openCycle === cycle.name ? null : cycle.name)} className="tp-accordion-head">
              <span className="t">{cycle.name}</span>
              <span>{openCycle === cycle.name ? '▲' : '▼'}</span>
            </button>
            {openCycle === cycle.name && (
              <div className="tp-accordion-body">
                {cycle.workouts.map(workout => (
                  <div key={workout.id} style={{ marginBottom: 12 }}>
                    <button onClick={() => setOpenWorkout(openWorkout === workout.id ? null : workout.id)} className="tp-wk-mini">
                      <div className="t">{workout.name}</div>
                      <div className="m">{getWorkoutDayLabel(workout.day_of_week)} · {(workout.exercises || []).length} exos</div>
                    </button>
                    {openWorkout === workout.id && (
                      <div style={{ marginTop: 8, paddingLeft: 16, borderLeft: '2px solid var(--accent, #2C64E5)' }}>
                        {(workout.exercises || []).map(ex => (
                          <div key={ex.id} className="tp-ex-sub">
                            <div className="n">{ex.name}</div>
                            <div className="m">{ex.sets} × {ex.reps} · {ex.rest}</div>
                            {ex.note && <div className="note">📝 {ex.note}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </SurfaceCard>
  )
}

function NavBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} className="tp-cal-navbtn">
      {children}
    </button>
  )
}
function Dot({ color }) { return <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} /> }
function Legend({ color, label }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Dot color={color} />{label}</div>
}
