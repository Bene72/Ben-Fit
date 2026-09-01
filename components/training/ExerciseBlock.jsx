/**
 * components/training/ExerciseBlock.jsx
 * Rendu d'un bloc exercice — Workout Block / groupe / single.
 *
 * HARMONISATION : ce fichier s'appuie maintenant sur les classes tp-wblock*
 * et tp-group* déjà déclarées dans <TrainingStyles /> (pages/training.js).
 * Avant, ce composant recréait sa propre feuille de style inline (couleurs
 * en dur #0D1B4E, #2C64E5…) qui ne suivait pas les tokens var(--navy) /
 * var(--accent) / var(--gold) posés lors du redesign de training.js — d'où
 * un rendu légèrement différent du reste de la page. Même logique, mêmes
 * props, juste l'habillage qui rejoint le système commun.
 *
 * Workout Block a 2 rendus coexistants :
 *  - v1 (historique) : liste statique, non loguable dans sa propre logique.
 *    Rendu pour tout block créé avant l'ajout de v2 (meta.uiVersion absent).
 *  - v2 (nouveau) : score adapté au Format (temps/rounds/reps) + journal
 *    libre. Rendu uniquement si meta.uiVersion === 2, posé à la création
 *    par ProgrammeTab.jsx — aucun block existant n'est donc affecté.
 */
import { WORKOUT_BLOCK_COLORS, GROUP_COLORS, scoreFieldsForFormat, findGroupMeta } from '../../lib/trainingUtils'
import CompactExerciseRow from './CompactExerciseRow'
import ExerciseWorkspace  from './ExerciseWorkspace'

export default function ExerciseBlock({ block, selectedId, onSelect, logInputs, loggingIds, logsByName, onLogInput, onLog, onImageOpen, isMobile, blockInputs, loggingBlockIds, blockResults, onBlockInput, onLogBlock }) {
  if (block.kind === 'group' && block.groupType === 'Workout Block') {
    const meta = findGroupMeta(block.exercises)
    const tc = WORKOUT_BLOCK_COLORS[meta.type] || 'var(--navy, #0D1B4E)'

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
      <div className="tp-wblock" style={{ border: `2px solid ${tc}` }}>
        <div className="tp-wblock-head" style={{ background: tc }}>
          <span style={{ fontSize: 14 }}>🔥</span>
          <div className="label">
            {meta.type || 'Workout Block'}{meta.cap ? ` — CAP ${meta.cap} min` : ''}{meta.rounds && meta.rounds > 1 ? ` · ${meta.rounds} rounds` : ''}
          </div>
        </div>
        <div className="tp-wblock-body">
          {block.exercises.map((e) => (
            <div key={e.id} className="tp-wblock-row">
              <span style={{ color: tc, fontSize: 11, fontWeight: 800, minWidth: 12 }}>•</span>
              <span style={{ flex: 1 }}>{e.name}</span>
              {e.rest && <span className="tp-wblock-rest">⏱ {e.rest}</span>}
            </div>
          ))}
        </div>
        {(meta.objective || meta.coachNote) && (
          <div style={{ background: 'var(--surface-muted, #F8FBFF)', padding: '8px 12px', borderTop: '1px solid var(--border-strong, #DCE5F3)', fontSize: 11, color: 'var(--text-soft, #6B7A99)' }}>
            {meta.objective && <div>🎯 {meta.objective}</div>}
            {meta.coachNote && <div style={{ marginTop: meta.objective ? 3 : 0 }}>📋 {meta.coachNote}</div>}
          </div>
        )}
      </div>
    )
  }

  if (block.kind === 'group') {
    const gc = GROUP_COLORS[block.groupType] || 'var(--accent, #3A5FD4)'
    return (
      <div className="tp-group" style={{ borderColor: `${gc}22` }}>
        <div className="tp-group-head" style={{ background: gc }}>⚡ {block.groupType}</div>
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
    <div className="tp-wblock" style={{ border: `2px solid ${tc}` }}>
      <div className="tp-wblock-head" style={{ background: tc, justifyContent: 'space-between' }}>
        <div className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>🔥</span>
          {meta.type || 'Workout Block'}{meta.cap ? ` — CAP ${meta.cap} min` : ''}
        </div>
        {meta.rounds && meta.rounds > 1 && (
          <div className="rounds">{meta.rounds} rounds</div>
        )}
      </div>

      <div className="tp-wblock-body" style={{ paddingTop: 4, paddingBottom: 10 }}>
        {block.exercises.map((e) => (
          <div key={e.id} className="tp-wblock-row">
            <span style={{ color: tc, fontWeight: 800 }}>•</span>
            <span style={{ flex: 1 }}>{e.name}</span>
          </div>
        ))}
      </div>

      {(meta.objective || meta.coachNote) && (
        <div style={{ background: 'var(--surface-muted, #F8FBFF)', padding: '8px 12px', borderTop: '1px solid var(--border-strong, #DCE5F3)', fontSize: 11, color: 'var(--text-soft, #6B7A99)' }}>
          {meta.objective && <div>🎯 {meta.objective}</div>}
          {meta.coachNote && <div style={{ marginTop: meta.objective ? 3 : 0 }}>📋 {meta.coachNote}</div>}
        </div>
      )}

      <div className="tp-wblock-score">
        {lastResult && (
          <div className="tp-wblock-last">
            Dernier résultat : {lastResult.time_result && `${lastResult.time_result}`}
            {lastResult.rounds_result != null && ` ${lastResult.rounds_result} rounds`}
            {lastResult.reps_result != null && ` +${lastResult.reps_result} reps`}
            {lastResult.level && ` · ${lastResult.level === 'rx' ? "RX'd" : 'Scaled'}`}
          </div>
        )}

        <div className="tp-wblock-sectlabel">SCORE DE LA SÉANCE</div>
        <div className="tp-score-grid" style={{ gridTemplateColumns: `repeat(${fields.length + 1}, 1fr)` }}>
          {fields.includes('time') && (
            <ScoreField label="Temps">
              <input className="tp-score-input" value={input.time || ''} onChange={(e) => onBlockInput(groupId, 'time', e.target.value)} placeholder="12:34" />
            </ScoreField>
          )}
          {fields.includes('rounds') && (
            <ScoreField label="Rounds">
              <input className="tp-score-input" value={input.rounds || ''} onChange={(e) => onBlockInput(groupId, 'rounds', e.target.value)} placeholder="5" />
            </ScoreField>
          )}
          {fields.includes('reps') && (
            <ScoreField label="Reps +">
              <input className="tp-score-input" value={input.reps || ''} onChange={(e) => onBlockInput(groupId, 'reps', e.target.value)} placeholder="0" />
            </ScoreField>
          )}
          <ScoreField label="Niveau">
            <select className="tp-score-input" value={input.level || 'rx'} onChange={(e) => onBlockInput(groupId, 'level', e.target.value)}>
              <option value="rx">RX'd</option>
              <option value="scaled">Scaled</option>
            </select>
          </ScoreField>
        </div>

        <div className="tp-wblock-sectlabel" style={{ marginBottom: 6 }}>JOURNAL DE SÉANCE</div>
        <textarea
          className="tp-wblock-note"
          value={input.note || ''}
          onChange={(e) => onBlockInput(groupId, 'note', e.target.value)}
          placeholder="Écris comme tu réfléchis — sensations, douleur, ce qu'il faut tester la prochaine fois…"
          rows={3}
        />

        <button type="button" className="tp-wblock-submit" onClick={() => onLogBlock(groupId, workoutId, meta)} disabled={logging}>
          {logging ? '...' : '✓ Enregistrer'}
        </button>
      </div>
    </div>
  )
}

function ScoreField({ label, children }) {
  return (
    <div className="tp-score-field">
      <label>{label}</label>
      {children}
    </div>
  )
}
