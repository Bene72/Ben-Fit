// components/coach/programme/DuplicateCycleModal.jsx
// Extrait de components/coach/ProgrammeTab.jsx (découpage audit 09/09/2026,
// point 4 — 2e passe). Aucune logique modifiée, copié tel quel.
import { lbl, inp, btnVariant } from '../../../lib/coachShared'

export default function DuplicateCycleModal({
  cycleMode,
  allClients,
  duplicateTarget,
  onChangeTarget,
  resetWeights,
  onChangeResetWeights,
  duplicating,
  onConfirm,
  onCancel,
}) {
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
          maxWidth: 400,
        }}
      >
        <h3 style={{ margin: '0 0 16px', color: 'var(--navy)' }}>
          Dupliquer le cycle {cycleMode === 'future' ? 'futur' : 'actuel'}
        </h3>
        <label style={lbl}>Choisir un client</label>
        <select
          value={duplicateTarget}
          onChange={(e) => onChangeTarget(e.target.value)}
          style={{ ...inp, marginBottom: 16 }}
        >
          <option value="">-- Sélectionner --</option>
          {allClients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--navy)',
          }}
        >
          <input
            type="checkbox"
            checked={resetWeights}
            onChange={(e) => onChangeResetWeights(e.target.checked)}
          />
          Remettre les charges à zéro{' '}
          <span style={{ color: '#6B7A99', fontSize: 11 }}>
            (recommandé pour un nouveau client)
          </span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onConfirm(duplicateTarget)}
            disabled={!duplicateTarget || duplicating}
            style={btnVariant('primary')}
          >
            {duplicating ? '⏳ Duplication…' : '📋 Dupliquer'}
          </button>
          <button onClick={onCancel} style={btnVariant('ghost')}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
