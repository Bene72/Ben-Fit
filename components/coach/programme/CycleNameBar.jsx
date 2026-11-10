// components/coach/programme/CycleNameBar.jsx
// Nom du cycle actuel + archivage du cycle.
// Extrait tel quel de ProgrammeTab.jsx le 10/11/2026 (aucune logique modifiée).
import { btnVariant, inp } from '../../../lib/coachShared'

export default function CycleNameBar({ ctx }) {
  const {
    archiveCycle,
    archiving,
    currentCycleName,
    cycleMode,
    cycleName,
    saveCurrentCycleName,
    savingCycleName,
    setCurrentCycleName,
    setCycleName,
  } = ctx
  return (
    <>
      {/* ── Cycle name + archivage (actuel seulement) ── */}
      {cycleMode === 'current' && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          <input
            value={currentCycleName}
            onChange={(e) => setCurrentCycleName(e.target.value)}
            placeholder="Nom du cycle actuel (ex: Cycle Force #3)"
            style={{ ...inp, flex: 1, minWidth: 200 }}
          />
          <button
            onClick={saveCurrentCycleName}
            disabled={savingCycleName}
            style={btnVariant('outline')}
          >
            {savingCycleName ? '…' : '💾 Sauver nom'}
          </button>
          <input
            value={cycleName}
            onChange={(e) => setCycleName(e.target.value)}
            placeholder="Nom pour archiver…"
            style={{ ...inp, flex: 1, minWidth: 160 }}
          />
          <button onClick={archiveCycle} disabled={archiving} style={btnVariant('danger')}>
            {archiving ? '…' : '📦 Archiver'}
          </button>
        </div>
      )}
    </>
  )
}
