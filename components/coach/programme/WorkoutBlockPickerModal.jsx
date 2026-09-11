// components/coach/programme/WorkoutBlockPickerModal.jsx
// Extrait de components/coach/ProgrammeTab.jsx (découpage audit 09/09/2026,
// point 4 — 2e passe). Aucune logique modifiée, copié tel quel.
import { lbl, inp, btnVariant } from '../../../lib/coachShared'

const FORMATS = ['For Time', 'AMRAP', 'EMOM', 'Tabata', 'RFT', 'Death By']
const TIMED_FORMATS = ['AMRAP', 'EMOM', 'Tabata']

export default function WorkoutBlockPickerModal({ form, onChangeForm, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 480,
        }}
      >
        <h3 style={{ margin: '0 0 16px', color: 'var(--navy)' }}>Créer un Workout Block</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={lbl}>Format</label>
            <select
              value={form.type}
              onChange={(e) => onChangeForm((p) => ({ ...p, type: e.target.value }))}
              style={inp}
            >
              {FORMATS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          {TIMED_FORMATS.includes(form.type) ? (
            <div>
              <label style={lbl}>Durée (min)</label>
              <input
                value={form.cap}
                onChange={(e) => onChangeForm((p) => ({ ...p, cap: e.target.value }))}
                placeholder="ex: 6"
                style={inp}
              />
              <div style={{ fontSize: 10, color: '#9BA8C0', marginTop: 3 }}>
                C'est cette durée que l'athlète verra en gros sur son écran.
              </div>
            </div>
          ) : (
            <>
              <div>
                <label style={lbl}>Rounds / durée</label>
                <input
                  value={form.rounds}
                  onChange={(e) => onChangeForm((p) => ({ ...p, rounds: e.target.value }))}
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>CAP (min)</label>
                <input
                  value={form.cap}
                  onChange={(e) => onChangeForm((p) => ({ ...p, cap: e.target.value }))}
                  placeholder="ex: 20"
                  style={inp}
                />
              </div>
            </>
          )}
          <div>
            <label style={lbl}>Repos entre rounds</label>
            <input
              value={form.rest}
              onChange={(e) => onChangeForm((p) => ({ ...p, rest: e.target.value }))}
              style={inp}
            />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Objectif athlète</label>
          <input
            value={form.objective}
            onChange={(e) => onChangeForm((p) => ({ ...p, objective: e.target.value }))}
            placeholder="Ex: finir en moins de 15 min"
            style={inp}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Note coach</label>
          <input
            value={form.coachNote}
            onChange={(e) => onChangeForm((p) => ({ ...p, coachNote: e.target.value }))}
            placeholder="Consigne technique…"
            style={inp}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Mouvements (1 par ligne)</label>
          <textarea
            value={form.movements}
            onChange={(e) => onChangeForm((p) => ({ ...p, movements: e.target.value }))}
            placeholder={
              '21 Thrusters 43kg\n21 Pull-ups\n15 Thrusters\n15 Pull-ups\n9 Thrusters\n9 Pull-ups'
            }
            rows={6}
            style={{ ...inp, resize: 'vertical' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onConfirm} style={btnVariant('primary')}>
            ✓ Créer
          </button>
          <button onClick={onCancel} style={btnVariant('ghost')}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
