/**
 * components/training/ExerciseBlock.jsx
 * Rendu d'un bloc exercice — Workout Block / groupe / single.
 * Élimine la duplication mobile/desktop du fichier d'origine.
 */
import { WORKOUT_BLOCK_COLORS, GROUP_COLORS } from '../../lib/trainingUtils'
import CompactExerciseRow from './CompactExerciseRow'
import ExerciseWorkspace  from './ExerciseWorkspace'

export default function ExerciseBlock({ block, selectedId, onSelect, logInputs, loggingIds, logsByName, onLogInput, onLog, onImageOpen, isMobile }) {
  if (block.kind === 'group' && block.groupType === 'Workout Block') {
    let meta = {}
    try { meta = JSON.parse(block.exercises[0]?.note || '{}') } catch {}
    const tc = WORKOUT_BLOCK_COLORS[meta.type] || '#0D1B4E'
    return (
      <div style={{ borderRadius: 10, overflow: 'hidden', border: `2px solid ${tc}`, boxShadow: '0 4px 12px rgba(13,27,78,0.1)', marginBottom: 4 }}>
        <div style={{ background: tc, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>🔥</span>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 11, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {meta.type || 'Workout Block'}{meta.cap ? ` — CAP ${meta.cap} min` : ''}{meta.rounds && meta.rounds > 1 ? ` · ${meta.rounds} rounds` : ''}
          </div>
        </div>
        <div style={{ background: '#0D1B4E', padding: '8px 12px' }}>
          {block.exercises.map((e, i) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: i < block.exercises.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              <span style={{ color: tc, fontSize: 11, fontWeight: 800, minWidth: 12 }}>•</span>
              <span style={{ color: 'white', fontSize: 12, fontWeight: 500 }}>{e.name}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (block.kind === 'group') {
    const gc = GROUP_COLORS[block.groupType] || '#3A5FD4'
    return (
      <div style={{ borderRadius: 12, border: `2px solid ${gc}22`, overflow: 'hidden', background: 'white' }}>
        <div style={{ background: gc, color: 'white', padding: '6px 10px', fontWeight: 800, letterSpacing: '1px', fontSize: 10, textTransform: 'uppercase' }}>⚡ {block.groupType}</div>
        <div style={{ padding: isMobile ? 8 : 10 }}>
          {block.exercises.map((exercise) => (
            <ExerciseRow key={exercise.id} exercise={exercise} selectedId={selectedId} onSelect={onSelect} logInputs={logInputs} loggingIds={loggingIds} logsByName={logsByName} onLogInput={onLogInput} onLog={onLog} onImageOpen={onImageOpen} isMobile={isMobile} mb={8} />
          ))}
        </div>
      </div>
    )
  }

  return <ExerciseRow exercise={block.exercise} selectedId={selectedId} onSelect={onSelect} logInputs={logInputs} loggingIds={loggingIds} logsByName={logsByName} onLogInput={onLogInput} onLog={onLog} onImageOpen={onImageOpen} isMobile={isMobile} />
}

function ExerciseRow({ exercise, selectedId, onSelect, logInputs, loggingIds, logsByName, onLogInput, onLog, onImageOpen, isMobile, mb }) {
  const isSelected = selectedId === exercise.id
  return (
    <div style={mb ? { marginBottom: mb } : undefined}>
      <CompactExerciseRow exercise={exercise} selected={isSelected} latestLog={(logsByName[exercise.name] || [])[0]} onSelect={() => onSelect(isSelected ? null : exercise.id)} isMobile={isMobile} />
      {isSelected && (
        <div style={{ marginTop: 2 }}>
          <ExerciseWorkspace exercise={exercise} input={logInputs[exercise.id] || {}} onInput={(field, value) => onLogInput(exercise.id, field, value)} onLog={() => onLog(exercise)} logging={!!loggingIds[exercise.id]} onImageOpen={onImageOpen} latestLog={(logsByName[exercise.name] || [])[0]} recentLogs={logsByName[exercise.name] || []} isMobile={isMobile} />
        </div>
      )}
    </div>
  )
}
