/**
 * components/coach/WorkoutBlockGroup.jsx
 *
 * Rendu dédié pour un groupe `group_type === 'Workout Block'` dans
 * ProgrammeTab.jsx. Remplace l'ancien comportement qui réutilisait
 * <ExRow> (générique Superset/Giant Set/Drop Set) pour les Workout
 * Blocks : ça affichait la config du bloc (type, rounds, cap, repos,
 * objectif, note coach) comme du JSON brut dans un champ "Notes /
 * consigne coach" éditable en texte libre — moche, et un edit
 * accidentel de ce champ cassait le bloc côté élève.
 *
 * FIX (race condition) : `updateMeta` reconstruisait auparavant tout
 * l'objet meta à partir de `parseMeta(first?.note)`, recalculé à
 * chaque rendu depuis les PROPS (donc depuis l'état renvoyé par le
 * parent après l'update Supabase précédent). Si le coach modifiait
 * deux champs à la suite plus vite que l'aller-retour optimistic
 * setState → re-render ne se faisait, la 2e écriture repartait d'un
 * snapshot périmé et écrasait silencieusement la 1re modif (ex: Format
 * → AMRAP puis Cap → 6, le Cap disparaissait si le re-render du Format
 * n'avait pas encore atteint les props au moment de la frappe du Cap).
 * Le meta vit maintenant dans un état local (source de vérité pendant
 * l'édition), initialisé une fois depuis `first?.note` ; chaque
 * `updateMeta` part de ce state local à jour, jamais des props.
 *
 * Mode édition : les mêmes champs structurés que la modale "Créer un
 * Workout Block" (Format / Rounds / Cap / Repos / Objectif / Note
 * coach), plus une liste compacte des mouvements (un input par ligne).
 * Mode lecture : rendu identique à ce que voit l'élève (WorkoutBlockV2
 * dans components/training/ExerciseBlock.jsx).
 */
import { useState } from 'react'
import { WORKOUT_BLOCK_COLORS } from '../../lib/trainingUtils'
import { lbl, inp, btnVariant } from '../../lib/coachShared'

const FORMATS = ['For Time', 'AMRAP', 'EMOM', 'Tabata', 'RFT', 'Death By']

function parseMeta(noteRaw) {
  try {
    const m = JSON.parse(noteRaw || '{}')
    return {
      type: m.type || 'For Time',
      rounds: m.rounds ?? '',
      cap: m.cap ?? '',
      rest: m.rest ?? '',
      objective: m.objective ?? '',
      coachNote: m.coachNote ?? '',
      uiVersion: 2,
    }
  } catch {
    return { type: 'For Time', rounds: '', cap: '', rest: '', objective: '', coachNote: '', uiVersion: 2 }
  }
}

export default function WorkoutBlockGroup({ group, wId, edit, onUpdate, onDelete, onMove, onAddExercise }) {
  const exercises = group.exercises || []
  const first = exercises[0]

  // Source de vérité pendant l'édition : état local, jamais re-dérivé
  // des props à chaque frappe (voir note ci-dessus). Remonte à chaque
  // fois que le coach ouvre un bloc différent (key={group.groupId} côté
  // ProgrammeTab force un remount, donc un nouvel useState initial).
  const [meta, setMeta] = useState(() => parseMeta(first?.note))
  const tc = WORKOUT_BLOCK_COLORS[meta.type] || '#0D1B4E'

  const updateMeta = (field, value) => {
    if (!first) return
    setMeta((prev) => {
      const next = { ...prev, [field]: value, uiVersion: 2 }
      onUpdate(wId, first.id, 'note', JSON.stringify(next))
      return next
    })
  }

  // ── Mode lecture : reproduit exactement le rendu élève ──
  if (!edit) {
    const readMeta = parseMeta(first?.note)
    return (
      <div style={{ borderRadius: 10, overflow: 'hidden', border: `2px solid ${tc}`, boxShadow: '0 4px 12px rgba(13,27,78,0.1)', margin: '8px 10px' }}>
        <div style={{ background: tc, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 11, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>🔥</span>
            {readMeta.type}{readMeta.cap ? ` — CAP ${readMeta.cap} min` : ''}
          </div>
          {readMeta.rounds && readMeta.rounds > 1 && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{readMeta.rounds} rounds</div>
          )}
        </div>
        <div style={{ background: '#0D1B4E', padding: '4px 12px 10px' }}>
          {exercises.map((e) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
              <span style={{ color: tc, fontWeight: 800 }}>•</span>
              <span style={{ flex: 1 }}>{e.name}</span>
            </div>
          ))}
        </div>
        {(readMeta.objective || readMeta.coachNote) && (
          <div style={{ background: '#F8FBFF', padding: '8px 12px', borderTop: '1px solid #DCE5F3', fontSize: 11, color: '#6B7A99' }}>
            {readMeta.objective && <div>🎯 {readMeta.objective}</div>}
            {readMeta.coachNote && <div style={{ marginTop: readMeta.objective ? 3 : 0 }}>📋 {readMeta.coachNote}</div>}
          </div>
        )}
      </div>
    )
  }

  // ── Mode édition ──
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${tc}55`, margin: '8px 10px', background: '#FAFBFF' }}>
      <div style={{ padding: '7px 12px', background: tc, color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>🔥 Workout Block</span>
        <button
          onClick={() => onAddExercise(wId, 'Workout Block', group.groupId)}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}
        >
          + Mouvement
        </button>
      </div>

      <div style={{ padding: '12px 14px 14px' }}>
        {/* ── Config du bloc ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={lbl}>Format</label>
            <select value={meta.type} onChange={(e) => updateMeta('type', e.target.value)} style={inp}>
              {FORMATS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Rounds / durée</label>
            <input value={meta.rounds} onChange={(e) => updateMeta('rounds', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Cap (min)</label>
            <input value={meta.cap} onChange={(e) => updateMeta('cap', e.target.value)} placeholder="ex: 20" style={inp} />
          </div>
          <div>
            <label style={lbl}>Repos entre rounds</label>
            <input value={meta.rest} onChange={(e) => updateMeta('rest', e.target.value)} style={inp} />
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={lbl}>Objectif athlète</label>
          <input value={meta.objective} onChange={(e) => updateMeta('objective', e.target.value)} placeholder="Ex: finir en moins de 15 min" style={inp} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Note coach</label>
          <input value={meta.coachNote} onChange={(e) => updateMeta('coachNote', e.target.value)} placeholder="Consigne technique…" style={inp} />
        </div>

        {/* ── Mouvements ── */}
        <label style={lbl}>Mouvements</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {exercises.map((ex, i) => (
            <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  onClick={() => i > 0 && onMove(wId, ex.id, -1)}
                  disabled={i === 0}
                  style={{ width: 20, height: 16, border: '1px solid #C5D0F0', borderRadius: 3, background: i === 0 ? '#F5F5F5' : 'white', color: i === 0 ? '#CCC' : '#0D1B4E', cursor: i === 0 ? 'default' : 'pointer', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >▲</button>
                <button
                  onClick={() => i < exercises.length - 1 && onMove(wId, ex.id, 1)}
                  disabled={i === exercises.length - 1}
                  style={{ width: 20, height: 16, border: '1px solid #C5D0F0', borderRadius: 3, background: i === exercises.length - 1 ? '#F5F5F5' : 'white', color: i === exercises.length - 1 ? '#CCC' : '#0D1B4E', cursor: i === exercises.length - 1 ? 'default' : 'pointer', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >▼</button>
              </div>
              <input
                value={ex.name}
                onChange={(e) => onUpdate(wId, ex.id, 'name', e.target.value)}
                placeholder="Ex: 21 Thrusters 43kg"
                style={{ ...inp, flex: 1 }}
              />
              <button
                onClick={() => onDelete(wId, ex.id)}
                style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'rgba(196,92,58,0.12)', color: '#C45C3A', cursor: 'pointer', fontSize: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
            </div>
          ))}
          {exercises.length === 0 && (
            <div style={{ fontSize: 12, color: '#9BA8C0', fontStyle: 'italic' }}>Aucun mouvement — clique "+ Mouvement".</div>
          )}
        </div>
      </div>
    </div>
  )
}
