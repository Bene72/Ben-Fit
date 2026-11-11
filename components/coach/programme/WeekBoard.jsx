// components/coach/programme/WeekBoard.jsx
// Vue Semaine du programme : une colonne par jour (lundi → dimanche), une
// carte compacte par séance avec ses exercices en résumé.
//   - clic sur une carte → ouverture dans le panneau latéral (onOpen)
//   - glisser-déposer une carte sur un autre jour → changement de jour (onMoveToDay)
//   - « + » en haut d'une colonne → nouvelle séance ce jour-là (onAddForDay)
// Les séances sans jour attribué apparaissent dans une colonne « Sans jour ».
import { useState } from 'react'

const DAYS = [
  { n: 1, short: 'Lun', long: 'Lundi' },
  { n: 2, short: 'Mar', long: 'Mardi' },
  { n: 3, short: 'Mer', long: 'Mercredi' },
  { n: 4, short: 'Jeu', long: 'Jeudi' },
  { n: 5, short: 'Ven', long: 'Vendredi' },
  { n: 6, short: 'Sam', long: 'Samedi' },
  { n: 7, short: 'Dim', long: 'Dimanche' },
]

function exerciseSummary(ex) {
  const parts = []
  if (ex.sets && ex.reps) parts.push(`${ex.sets}×${ex.reps}`)
  else if (ex.reps) parts.push(String(ex.reps))
  return `${parts.length ? parts[0] + ' ' : ''}${ex.name || 'Exercice'}`
}

function WorkoutMiniCard({ workout, future, selected, onOpen, onDragStart }) {
  const exs = [...(workout.exercises || [])].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  )
  return (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/workout-id', workout.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.(workout.id)
      }}
      onClick={() => onOpen(workout.id)}
      title="Cliquer pour modifier · glisser pour changer de jour"
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: selected ? 'var(--accent-dim)' : 'var(--bg-card)',
        border: `1.5px solid ${selected ? 'var(--accent)' : future ? 'var(--accent-brd)' : 'var(--border)'}`,
        borderRadius: 12,
        padding: '10px 11px',
        marginBottom: 8,
        cursor: 'grab',
        color: 'var(--chalk)',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.25 }}>
        {workout.name || 'Séance'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--chalk-dim)', marginTop: 2 }}>
        {[
          workout.type,
          workout.duration_min ? `${workout.duration_min} min` : null,
          `${exs.length} exo${exs.length > 1 ? 's' : ''}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </div>
      {exs.length > 0 && (
        <div style={{ marginTop: 7, display: 'grid', gap: 2 }}>
          {exs.slice(0, 4).map((ex) => (
            <div
              key={ex.id}
              style={{
                fontSize: 11.5,
                color: 'var(--chalk-dim)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {exerciseSummary(ex)}
            </div>
          ))}
          {exs.length > 4 && (
            <div style={{ fontSize: 11, color: 'var(--chalk-muted)' }}>
              + {exs.length - 4} autres
            </div>
          )}
        </div>
      )}
    </button>
  )
}

export default function WeekBoard({
  workouts,
  future,
  selectedId,
  onOpen,
  onMoveToDay,
  onAddForDay,
}) {
  const [overDay, setOverDay] = useState(null)
  const byDay = (n) => workouts.filter((w) => Number(w.day_of_week) === n)
  const unassigned = workouts.filter(
    (w) => !(Number(w.day_of_week) >= 1 && Number(w.day_of_week) <= 7)
  )

  const column = (key, label, list, dayNumber) => (
    <div
      key={key}
      onDragOver={(e) => {
        if (!dayNumber) return
        e.preventDefault()
        setOverDay(dayNumber)
      }}
      onDragLeave={() => setOverDay((d) => (d === dayNumber ? null : d))}
      onDrop={(e) => {
        e.preventDefault()
        setOverDay(null)
        const id = e.dataTransfer.getData('text/workout-id')
        const w = workouts.find((x) => x.id === id)
        if (dayNumber && w && Number(w.day_of_week) !== dayNumber) onMoveToDay(id, dayNumber)
      }}
      style={{
        background: overDay === dayNumber && dayNumber ? 'var(--accent-dim)' : 'var(--bg-card-2)',
        border: `1px dashed ${overDay === dayNumber && dayNumber ? 'var(--accent)' : 'transparent'}`,
        borderRadius: 14,
        padding: 8,
        minHeight: 160,
        transition: 'background .12s',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '2px 4px 8px',
          fontSize: 11.5,
          fontWeight: 800,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: list.length ? 'var(--chalk)' : 'var(--chalk-muted)',
        }}
      >
        <span>{label}</span>
        {dayNumber && (
          <button
            onClick={() => onAddForDay(dayNumber)}
            aria-label={`Nouvelle séance ${label}`}
            title="Nouvelle séance ce jour-là"
            style={{
              background: 'none',
              border: 0,
              color: 'var(--chalk-dim)',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              padding: '0 2px',
            }}
          >
            +
          </button>
        )}
      </div>
      {list.map((w) => (
        <WorkoutMiniCard
          key={w.id}
          workout={w}
          future={future}
          selected={selectedId === w.id}
          onOpen={onOpen}
        />
      ))}
      {!list.length && dayNumber && (
        <div
          style={{
            fontSize: 11.5,
            color: 'var(--chalk-muted)',
            textAlign: 'center',
            padding: '18px 4px',
          }}
        >
          Repos
        </div>
      )}
    </div>
  )

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 6, marginBottom: 16 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${7 + (unassigned.length ? 1 : 0)}, minmax(150px, 1fr))`,
          gap: 8,
          minWidth: (7 + (unassigned.length ? 1 : 0)) * 158,
        }}
      >
        {DAYS.map((d) => column(d.n, d.short, byDay(d.n), d.n))}
        {unassigned.length > 0 && column('none', 'Sans jour', unassigned, null)}
      </div>
    </div>
  )
}
