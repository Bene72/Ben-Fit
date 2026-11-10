// components/coach/programme/NewWorkoutForm.jsx
// Formulaire « nouvelle séance ».
// Extrait tel quel de ProgrammeTab.jsx le 10/11/2026 (aucune logique modifiée).
import { DAYS_FR, btnVariant, inp, lbl } from '../../../lib/coachShared'

export default function NewWorkoutForm({ ctx }) {
  const { addWorkout, cycleMode, newW, setNewW, setShowAdd, showAdd } = ctx
  return (
    <>
      {/* ── Formulaire nouvelle séance ── */}
      {showAdd && (
        <div
          style={{
            background: cycleMode === 'future' ? 'var(--accent-dim)' : 'var(--bg-card-2)',
            borderRadius: 'var(--radius-lg)',
            padding: 18,
            marginBottom: 20,
            border: `1.5px solid ${cycleMode === 'future' ? 'var(--accent)' : 'var(--accent-brd)'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display, "Bebas Neue", sans-serif)',
              fontSize: 16,
              letterSpacing: 1,
              color: 'var(--chalk)',
              marginBottom: 4,
            }}
          >
            NOUVELLE SÉANCE
          </div>
          {cycleMode === 'future' && (
            <div
              style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, marginBottom: 10 }}
            >
              🔵 Cette séance sera ajoutée au cycle futur
            </div>
          )}
          {cycleMode !== 'future' && <div style={{ marginBottom: 10 }} />}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Nom de la séance</label>
              <input
                value={newW.name}
                onChange={(e) => setNewW((p) => ({ ...p, name: e.target.value }))}
                placeholder="Push Day A, Full Body…"
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Type</label>
              <select
                value={newW.type}
                onChange={(e) => setNewW((p) => ({ ...p, type: e.target.value }))}
                style={inp}
              >
                {[
                  'Push',
                  'Pull',
                  'Legs',
                  'Full Body',
                  'Upper',
                  'Lower',
                  'Core',
                  'Cardio',
                  'WOD',
                  'Autre',
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Jour</label>
              <select
                value={newW.day_of_week}
                onChange={(e) => setNewW((p) => ({ ...p, day_of_week: +e.target.value }))}
                style={inp}
              >
                {DAYS_FR.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Durée (min)</label>
              <input
                type="number"
                value={newW.duration_min}
                onChange={(e) => setNewW((p) => ({ ...p, duration_min: +e.target.value }))}
                style={inp}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addWorkout} style={btnVariant('gold')}>
              ✓ Créer
            </button>
            <button onClick={() => setShowAdd(false)} style={btnVariant('ghost')}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </>
  )
}
