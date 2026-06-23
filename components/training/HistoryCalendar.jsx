/**
 * components/training/HistoryCalendar.jsx
 * Onglet Historique — calendrier, détail du jour, cycles archivés.
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <NavBtn onClick={() => setWeekOffset(w => w - 1)}>‹</NavBtn>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1B4E', textAlign: 'center' }}>
            {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {weekDays[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            {weekOffset === 0 && <div style={{ fontSize: 10, color: '#6B8ED6', marginTop: 2 }}>Semaine en cours</div>}
          </div>
          <NavBtn onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0}>›</NavBtn>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {weekDays.map(day => {
            const dateStr   = getLocalDateString(day)
            const isToday   = dateStr === todayStr
            const isSelected = dateStr === selectedDay
            const hasLogs   = daysWithLogs.has(dateStr)
            const jsDay     = day.getDay()
            const hasWorkout = (workoutByJsDay[jsDay] || []).length > 0
            const isFuture  = dateStr > todayStr
            return (
              <button key={dateStr} onClick={() => !isFuture && setSelectedDay(dateStr)} style={{
                border: isSelected ? '2px solid #2C64E5' : isToday ? '2px solid #B0C4F5' : '1px solid #E8F0FF',
                borderRadius: 10, padding: '8px 4px', textAlign: 'center',
                cursor: isFuture ? 'default' : 'pointer',
                background: isSelected ? '#2C64E5' : isToday ? '#EEF4FF' : hasLogs ? '#F0F7FF' : 'white',
                opacity: isFuture ? 0.35 : 1, transition: 'all 0.15s',
                fontFamily: "'DM Sans',sans-serif", position: 'relative',
              }}>
                <div style={{ fontSize: 9, color: isSelected ? 'rgba(255,255,255,0.8)' : '#6B8ED6', fontWeight: 600, marginBottom: 2, textTransform: 'uppercase' }}>
                  {['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][jsDay]}
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: isSelected ? 'white' : isToday ? '#2C64E5' : '#0D1B4E' }}>{day.getDate()}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 4, minHeight: 6 }}>
                  {hasLogs    && <Dot color={isSelected ? 'rgba(255,255,255,0.9)' : '#2C64E5'} />}
                  {hasWorkout && !hasLogs && <Dot color={isSelected ? 'rgba(255,255,255,0.5)' : '#C5D8F5'} />}
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 10, color: '#6B8ED6' }}>
          <Legend color="#2C64E5" label="Séance loggée" />
          <Legend color="#C5D8F5" label="Séance planifiée" />
        </div>
      </SurfaceCard>

      {/* ── Détail du jour ── */}
      <SurfaceCard padded>
        <SectionHead
          title={selectedDayLabel || 'Sélectionne un jour'}
          caption={Object.keys(logsForDay).length ? `${Object.keys(logsForDay).length} exercice(s) loggé(s)` : 'Aucune performance ce jour'}
        />
        {Object.keys(logsForDay).length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(logsForDay).map(([exName, logs]) => (
              <div key={exName} style={{ border: '1.5px solid #C5D8F5', borderRadius: 12, background: 'white', overflow: 'hidden' }}>
                <div style={{ background: '#EEF4FF', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, color: '#0D1B4E', fontSize: 13 }}>{exName}</div>
                  <StatusBadge tone="default">{logs.length} série(s)</StatusBadge>
                </div>
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
          <EmptyPanel title="Aucune perf ce jour" description={selectedDay && selectedDay <= todayStr ? "Tu n'as rien loggé ce jour-là." : "Sélectionne un jour passé pour voir tes performances."} />
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
          <div key={cycle.name} style={{ border: '1px solid #DCE5F3', borderRadius: 12, overflow: 'hidden' }}>
            <button onClick={() => setOpenCycle(openCycle === cycle.name ? null : cycle.name)} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: '#F8FAFF', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: '#0D1B4E' }}>{cycle.name}</span>
              <span>{openCycle === cycle.name ? '▲' : '▼'}</span>
            </button>
            {openCycle === cycle.name && (
              <div style={{ padding: '12px 16px', background: 'white', borderTop: '1px solid #E8ECF5' }}>
                {cycle.workouts.map(workout => (
                  <div key={workout.id} style={{ marginBottom: 12 }}>
                    <button onClick={() => setOpenWorkout(openWorkout === workout.id ? null : workout.id)} style={{ width: '100%', textAlign: 'left', background: '#FAFBFF', border: '1px solid #DCE5F3', borderRadius: 8, padding: '10px 12px', cursor: 'pointer' }}>
                      <div style={{ fontWeight: 700 }}>{workout.name}</div>
                      <div style={{ fontSize: 11, color: '#6B7A99' }}>{getWorkoutDayLabel(workout.day_of_week)} · {(workout.exercises || []).length} exos</div>
                    </button>
                    {openWorkout === workout.id && (
                      <div style={{ marginTop: 8, paddingLeft: 16, borderLeft: '2px solid #2C64E5' }}>
                        {(workout.exercises || []).map(ex => (
                          <div key={ex.id} style={{ padding: '8px 0', borderBottom: '1px solid #F0F5FF' }}>
                            <div style={{ fontWeight: 600 }}>{ex.name}</div>
                            <div style={{ fontSize: 12, color: '#6B7A99' }}>{ex.sets} × {ex.reps} · {ex.rest}</div>
                            {ex.note && <div style={{ fontSize: 11, color: '#4A6FB5' }}>📝 {ex.note}</div>}
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
    <button onClick={onClick} disabled={disabled} style={{ background: disabled ? '#F5F5F5' : '#EEF4FF', border: '1px solid #C5D8F5', borderRadius: 8, padding: '6px 12px', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700, color: disabled ? '#CCC' : '#2C64E5', fontSize: 16 }}>
      {children}
    </button>
  )
}
function Dot({ color }) { return <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} /> }
function Legend({ color, label }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Dot color={color} />{label}</div>
}
