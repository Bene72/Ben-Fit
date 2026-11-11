// components/coach/programme/WorkoutCard.jsx
// Une séance du programme (en-tête repliable, renommage, jour, réordonnancement,
// liste d'exercices et blocs). Extrait tel quel de ProgrammeTab.jsx le
// 10/11/2026 — aucune logique modifiée : l'état et les actions restent dans
// ProgrammeTab et arrivent ici via `ctx`.
import { btnVariant, lbl, inp, DAYS_FR } from '../../../lib/coachShared'
import ExRow from '../ExerciseRow'
import WorkoutBlockGroup from '../WorkoutBlockGroup'

export default function WorkoutCard({ workout, wIdx, workoutCount, ctx }) {
  const {
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
    reorderExercise,
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
  } = ctx
  const isOpen = openWorkout === workout.id
  const isEdit = editMode === workout.id
  const isRenaming = renamingWorkout === workout.id
  return (
    <div
      key={workout.id}
      style={{
        marginBottom: 12,
        background: 'var(--bg-card)',
        borderRadius: 14,
        border: `1.5px solid ${cycleMode === 'future' ? 'var(--accent-brd)' : 'var(--border)'}`,
        overflow: 'hidden',
        boxShadow: isOpen ? '0 4px 20px rgba(255,91,46,0.08)' : 'none',
      }}
    >
      <div
        onClick={() => {
          if (!isRenaming) setOpenWorkout(isOpen ? null : workout.id)
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 16px',
          cursor: isRenaming ? 'default' : 'pointer',
          background: isOpen
            ? cycleMode === 'future'
              ? 'var(--accent-dim)'
              : 'var(--accent-dim)'
            : 'var(--bg-card)',
          transition: 'background 0.15s',
        }}
      >
        {/* ── Flèches réordonnancement ── */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => moveWorkout(workout.id, -1)}
            disabled={wIdx === 0 || reordering}
            title="Monter la séance"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: wIdx === 0 ? 'default' : 'pointer',
              color: wIdx === 0 ? 'var(--accent)' : 'var(--chalk-dim)',
              fontSize: 12,
              padding: 2,
              lineHeight: 1,
            }}
          >
            ▲
          </button>
          <button
            onClick={() => moveWorkout(workout.id, 1)}
            disabled={wIdx === workoutCount - 1 || reordering}
            title="Descendre la séance"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: wIdx === workoutCount - 1 ? 'default' : 'pointer',
              color: wIdx === workoutCount - 1 ? 'var(--accent)' : 'var(--chalk-dim)',
              fontSize: 12,
              padding: 2,
              lineHeight: 1,
            }}
          >
            ▼
          </button>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--chalk)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {isRenaming ? (
              <input
                autoFocus
                value={renameValue}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => confirmRenameWorkout(workout.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    confirmRenameWorkout(workout.id)
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    cancelRenameWorkout()
                  }
                }}
                style={{
                  ...inp,
                  padding: '4px 8px',
                  fontSize: 15,
                  fontWeight: 700,
                  maxWidth: 280,
                }}
              />
            ) : (
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  startRenameWorkout(workout.id, workout.name)
                }}
                title="Double-clic pour renommer"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {workout.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    startRenameWorkout(workout.id, workout.name)
                  }}
                  title="Renommer la séance"
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: 2,
                    color: 'var(--chalk-dim)',
                    lineHeight: 1,
                  }}
                >
                  ✏️
                </button>
              </span>
            )}
            {cycleMode === 'future' && (
              <span
                style={{
                  fontSize: 10,
                  background: 'var(--accent)',
                  color: '#16110D',
                  padding: '2px 7px',
                  borderRadius: 20,
                  fontWeight: 700,
                }}
              >
                FUTUR
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--chalk-dim)', marginTop: 2 }}>
            {DAYS_FR[(workout.day_of_week || 1) - 1]} · {workout.duration_min || 60} min ·{' '}
            {workout.exercises?.length || 0} exercice
            {(workout.exercises?.length || 0) > 1 ? 's' : ''}
            {workout.cycle_name && (
              <span style={{ marginLeft: 8, color: 'var(--accent)' }}>· {workout.cycle_name}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditMode(isEdit ? null : workout.id)
              if (!isOpen) setOpenWorkout(workout.id)
            }}
            style={{
              ...btnVariant(isEdit ? 'primary' : 'outline'),
              fontSize: 12,
              padding: '5px 10px',
            }}
          >
            {isEdit ? '✓ Fin édition' : '✏️ Éditer'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              deleteWorkout(workout.id)
            }}
            style={{
              ...btnVariant('ghost'),
              fontSize: 12,
              color: 'var(--danger)',
              padding: '5px 10px',
            }}
          >
            🗑
          </button>
          <span style={{ fontSize: 12, color: 'var(--chalk-dim)' }}>{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>

      {isOpen && (
        <div>
          {isEdit && (
            <div
              style={{
                padding: '10px 16px',
                background: 'var(--accent-dim)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <label style={lbl}>Jour :</label>
              <select
                value={workout.day_of_week || 1}
                onChange={(e) => updateWorkoutDay(workout.id, e.target.value)}
                style={{ ...inp, width: 120 }}
              >
                {DAYS_FR.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isEdit && workout.exercises?.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 48px 56px 80px',
                gap: 4,
                padding: '8px 12px 4px',
                borderBottom: '1px solid var(--accent-brd)',
              }}
            >
              {['Exercice', 'Séries', 'Reps', 'Repos'].map((h) => (
                <div
                  key={h}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    color: 'var(--chalk-dim)',
                    textAlign: h === 'Exercice' ? 'left' : 'center',
                  }}
                >
                  {h}
                </div>
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
                const groupExs = exercises.filter((e) => e.group_id === ex.group_id)
                if (!grouped.find((g) => g.groupId === ex.group_id))
                  grouped.push({
                    type: 'group',
                    groupId: ex.group_id,
                    groupType: ex.group_type,
                    exercises: groupExs,
                  })
              } else {
                grouped.push({ type: 'single', exercise: ex })
              }
              i++
            }
            return grouped.map((item) => {
              if (item.type === 'single') {
                const ex = item.exercise
                const allExs = workout.exercises || []
                const exIdx = allExs.findIndex((e) => e.id === ex.id)
                return (
                  <ExRow
                    key={ex.id}
                    ex={ex}
                    wId={workout.id}
                    edit={isEdit}
                    onUpdate={updateExercise}
                    onDelete={deleteExercise}
                    onMove={moveExercise}
                    onReorder={reorderExercise}
                    isFirst={exIdx === 0}
                    isLast={exIdx === allExs.length - 1}
                    recentLog={athleteLogs[ex.name] || null}
                  />
                )
              }
              if (item.groupType === 'Workout Block') {
                return (
                  <WorkoutBlockGroup
                    key={item.groupId}
                    group={item}
                    wId={workout.id}
                    edit={isEdit}
                    onUpdate={updateExercise}
                    onDelete={deleteExercise}
                    onMove={moveExercise}
                    onAddExercise={addExercise}
                  />
                )
              }
              const color = groupColors[item.groupType] || 'var(--accent)'
              const allExs = workout.exercises || []
              return (
                <div
                  key={item.groupId}
                  style={{
                    borderLeft: `4px solid ${color}`,
                    margin: '8px 10px',
                    borderRadius: '0 10px 10px 0',
                    background: 'var(--accent-dim)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '6px 12px',
                      background: color,
                      color: 'var(--chalk)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{item.groupType}</span>
                    {isEdit && (
                      <button
                        onClick={() => addExercise(workout.id, item.groupType, item.groupId)}
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          border: 'none',
                          color: 'var(--chalk)',
                          borderRadius: 5,
                          padding: '2px 8px',
                          cursor: 'pointer',
                          fontSize: 11,
                        }}
                      >
                        + Exercice
                      </button>
                    )}
                  </div>
                  {item.exercises.map((ex) => {
                    const exIdx = allExs.findIndex((e) => e.id === ex.id)
                    return (
                      <ExRow
                        key={ex.id}
                        ex={ex}
                        wId={workout.id}
                        edit={isEdit}
                        onUpdate={updateExercise}
                        onDelete={deleteExercise}
                        onMove={moveExercise}
                        onReorder={reorderExercise}
                        isFirst={exIdx === 0}
                        isLast={exIdx === allExs.length - 1}
                        recentLog={athleteLogs[ex.name] || null}
                      />
                    )
                  })}
                </div>
              )
            })
          })()}

          {isEdit && (
            <div
              style={{
                padding: '12px 16px',
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                borderTop: '1px solid var(--accent-brd)',
              }}
            >
              <button
                onClick={() => addExercise(workout.id, 'Normal', null)}
                style={btnVariant('outline')}
              >
                + Exercice
              </button>
              <button
                onClick={() => addExercise(workout.id, 'Superset', null)}
                style={{
                  ...btnVariant('outline'),
                  borderColor: 'var(--danger)',
                  color: 'var(--danger)',
                }}
              >
                + Superset
              </button>
              <button
                onClick={() => addExercise(workout.id, 'Giant Set', null)}
                style={{
                  ...btnVariant('outline'),
                  borderColor: 'var(--rx)',
                  color: 'var(--rx)',
                }}
              >
                + Giant Set
              </button>
              <button
                onClick={() => addExercise(workout.id, 'Drop Set', null)}
                style={{
                  ...btnVariant('outline'),
                  borderColor: 'var(--accent)',
                  color: 'var(--accent)',
                }}
              >
                + Drop Set
              </button>
              <button
                onClick={() => addWorkoutBlock(workout.id)}
                style={{
                  ...btnVariant('outline'),
                  borderColor: 'var(--border)',
                  color: 'var(--chalk)',
                }}
              >
                + WOD Block
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
