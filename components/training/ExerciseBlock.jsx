/**
 * components/training/ExerciseBlock.jsx
 * Rendu d'un bloc exercice — Workout Block / groupe / single.
 * Élimine la duplication mobile/desktop du fichier d'origine.
 *
 * Workout Block a 2 rendus coexistants :
 *  - v1 (historique) : liste statique, non loguable dans sa propre logique.
 *    Rendu pour tout block créé avant l'ajout de v2 (meta.uiVersion absent).
 *  - v2 (nouveau) : score adapté au Format (temps/rounds/reps) + journal
 *    libre. Rendu uniquement si meta.uiVersion === 2, posé à la création
 *    par ProgrammeTab.jsx — aucun block existant n'est donc affecté.
 */
import { WORKOUT_BLOCK_COLORS, GROUP_COLORS, scoreFieldsForFormat } from '../../lib/trainingUtils'
import CompactExerciseRow from './CompactExerciseRow'
import ExerciseWorkspace  from './ExerciseWorkspace'

export default function ExerciseBlock({ block, selectedId, onSelect, logInputs, loggingIds, logsByName, onLogInput, onLog, onImageOpen, isMobile, blockInputs, loggingBlockIds, blockResults, onBlockInput, onLogBlock }) {
  if (block.kind === 'group' && block.groupType === 'Workout Block') {
    let meta = {}
    try { meta = JSON.parse(block.exercises[0]?.note || '{}') } catch {}
    const tc = WORKOUT_BLOCK_COLORS[meta.type] || '#0D1B4E'

    if (meta.uiVersion === 2) {
      return (
        <WorkoutBlockV2
          block={block} meta={meta} tc={tc}
          groupId={block.exercises[0]?.group_id}
          workoutId={block.exercises[0]?.workout_id}
          blockInputs={blockInputs} loggingBlockIds={loggingBlockIds} blockResults={blockResults}
          onBlockInput={onBlockInput} onLogBlock={onLogBlock}
        />
      )
    }

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
              <span style={{ color: 'white', fontSize: 12, fontWeight: 500, flex: 1 }}>{e.name}</span>
              {(e.sets || e.reps) && (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'white', background: 'rgba(255,255,255,0.12)', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                  {e.sets}{e.sets && e.reps ? ' × ' : ''}{e.reps}
                </span>
              )}
              {e.rest && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
                  ⏱ {e.rest}
                </span>
              )}
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

// ─── Workout Block v2 ───────────────────────────────────────────────────────
function WorkoutBlockV2({ block, meta, tc, groupId, workoutId, blockInputs, loggingBlockIds, blockResults, onBlockInput, onLogBlock }) {
  const input = (blockInputs && blockInputs[groupId]) || {}
  const fields = scoreFieldsForFormat(meta.type)
  const logging = !!(loggingBlockIds && loggingBlockIds[groupId])
  const lastResult = ((blockResults && blockResults[groupId]) || [])[0]

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: `2px solid ${tc}`, boxShadow: '0 4px 12px rgba(13,27,78,0.1)', marginBottom: 4 }}>
      <div style={{ background: tc, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: 'white', fontWeight: 800, fontSize: 11, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>🔥</span>
          {meta.type || 'Workout Block'}{meta.cap ? ` — CAP ${meta.cap} min` : ''}
        </div>
        {meta.rounds && meta.rounds > 1 && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{meta.rounds} rounds</div>
        )}
      </div>

      <div style={{ background: '#0D1B4E', padding: '4px 12px 10px' }}>
        {block.exercises.map((e, i) => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
            <span style={{ color: tc, fontWeight: 800 }}>•</span>
            <span style={{ flex: 1 }}>{e.name}</span>
            {(e.sets || e.reps) && (
              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'white', background: 'rgba(255,255,255,0.1)', padding: '1px 7px', borderRadius: 6 }}>
                {e.sets}{e.sets && e.reps ? ' × ' : ''}{e.reps}
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={{ background: '#F8FBFF', padding: 16, borderTop: '1px solid #DCE5F3' }}>
        {lastResult && (
          <div style={{ fontSize: 11, color: '#6B7A99', marginBottom: 10 }}>
            Dernier résultat : {lastResult.time_result && `${lastResult.time_result}`}
            {lastResult.rounds_result != null && ` ${lastResult.rounds_result} rounds`}
            {lastResult.reps_result != null && ` +${lastResult.reps_result} reps`}
            {lastResult.level && ` · ${lastResult.level === 'rx' ? "RX'd" : 'Scaled'}`}
          </div>
        )}

        <div style={{ fontSize: 10, fontWeight: 800, color: '#0D1B4E', letterSpacing: '0.5px', marginBottom: 8 }}>
          SCORE DE LA SÉANCE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fields.length + 1}, 1fr)`, gap: 8, marginBottom: 12 }}>
          {fields.includes('time') && (
            <ScoreField label="Temps">
              <input value={input.time || ''} onChange={(e) => onBlockInput(groupId, 'time', e.target.value)} placeholder="12:34" style={scoreInputStyle()} />
            </ScoreField>
          )}
          {fields.includes('rounds') && (
            <ScoreField label="Rounds">
              <input value={input.rounds || ''} onChange={(e) => onBlockInput(groupId, 'rounds', e.target.value)} placeholder="5" style={scoreInputStyle()} />
            </ScoreField>
          )}
          {fields.includes('reps') && (
            <ScoreField label="Reps +">
              <input value={input.reps || ''} onChange={(e) => onBlockInput(groupId, 'reps', e.target.value)} placeholder="0" style={scoreInputStyle()} />
            </ScoreField>
          )}
          <ScoreField label="Niveau">
            <select value={input.level || 'rx'} onChange={(e) => onBlockInput(groupId, 'level', e.target.value)} style={scoreInputStyle()}>
              <option value="rx">RX'd</option>
              <option value="scaled">Scaled</option>
            </select>
          </ScoreField>
        </div>

        <div style={{ fontSize: 10, fontWeight: 800, color: '#0D1B4E', letterSpacing: '0.5px', marginBottom: 6 }}>
          JOURNAL DE SÉANCE
        </div>
        <textarea
          value={input.note || ''}
          onChange={(e) => onBlockInput(groupId, 'note', e.target.value)}
          placeholder="Écris comme tu réfléchis — sensations, douleur, ce qu'il faut tester la prochaine fois…"
          rows={3}
          style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #C5D8F5', background: 'white', fontSize: 13, color: '#0D1B4E', lineHeight: 1.6, resize: 'vertical', fontFamily: "'DM Sans',sans-serif", boxSizing: 'border-box' }}
        />

        <button
          type="button"
          onClick={() => onLogBlock(groupId, workoutId, meta)}
          disabled={logging}
          style={{ width: '100%', marginTop: 12, border: 'none', background: '#2C64E5', color: 'white', borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
        >
          {logging ? '...' : '✓ Enregistrer'}
        </button>
      </div>
    </div>
  )
}

function ScoreField({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 10, fontWeight: 800, color: '#6B7A99', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

function scoreInputStyle() {
  return { width: '100%', boxSizing: 'border-box', padding: '9px 10px', borderRadius: 8, border: '1px solid #C5D8F5', background: 'white', fontSize: 13, color: '#0D1B4E', fontFamily: "'DM Sans',sans-serif" }
}

