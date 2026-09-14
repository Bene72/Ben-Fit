// components/coach/programme/CycleHistoryModal.jsx
// Extrait de components/coach/ProgrammeTab.jsx (découpage audit 09/09/2026,
// point 4 — 2e passe). Aucune logique modifiée, copié tel quel.
import { btnVariant, DAYS_FR } from '../../../lib/coachShared'

export default function CycleHistoryModal({
  archivedCycles,
  openArchivedCycle,
  onOpenCycle,
  onClose,
}) {
  const openCycle = openArchivedCycle
    ? archivedCycles.find((c) => c.key === openArchivedCycle)
    : null

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
          background: 'var(--bg-card)',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 600,
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0, color: 'var(--chalk)' }}>
            {openArchivedCycle ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => onOpenCycle(null)}
                  style={{ ...btnVariant('ghost'), fontSize: 13, padding: '4px 8px' }}
                >
                  ← Cycles
                </button>
                <span>{openCycle?.name}</span>
              </span>
            ) : (
              'Historique des cycles'
            )}
          </h3>
          <button onClick={onClose} style={btnVariant('ghost')}>
            ✕ Fermer
          </button>
        </div>

        {archivedCycles.length === 0 ? (
          <div style={{ color: 'var(--chalk-dim)', textAlign: 'center', padding: '20px 0' }}>
            Aucun cycle archivé
          </div>
        ) : !openArchivedCycle ? (
          // ── Vue liste des cycles ──
          archivedCycles.map((cycle) => (
            <button
              key={cycle.key}
              onClick={() => onOpenCycle(cycle.key)}
              style={{
                width: '100%',
                textAlign: 'left',
                marginBottom: 10,
                padding: '12px 14px',
                background: 'var(--accent-dim)',
                borderRadius: 10,
                border: '1px solid var(--border)',
                cursor: 'pointer',
                fontFamily: "'DM Sans',sans-serif",
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--chalk)' }}>
                  🗂 {cycle.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--chalk-dim)', marginTop: 2 }}>
                  {cycle.workouts.length} séance{cycle.workouts.length > 1 ? 's' : ''}
                  {cycle.archivedAt && (
                    <span>
                      {' '}
                      · archivé le {new Date(cycle.archivedAt).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: 16, color: 'var(--chalk-dim)' }}>›</span>
            </button>
          ))
        ) : (
          // ── Vue détail des séances d'un cycle ──
          openCycle?.workouts
            .slice()
            .sort((a, b) => (a.day_of_week || 0) - (b.day_of_week || 0))
            .map((w) => (
              <div
                key={w.id}
                style={{
                  marginBottom: 10,
                  padding: '10px 14px',
                  background: 'var(--accent-dim)',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--chalk)' }}>{w.name}</div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--chalk-dim)',
                    marginBottom: (w.exercises || []).length ? 8 : 0,
                  }}
                >
                  {DAYS_FR[(w.day_of_week || 1) - 1]} · {(w.exercises || []).length} exercice
                  {(w.exercises || []).length > 1 ? 's' : ''}
                </div>
                {(w.exercises || [])
                  .slice()
                  .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                  .map((ex) => (
                    <div
                      key={ex.id}
                      style={{
                        fontSize: 12,
                        color: 'var(--chalk)',
                        padding: '4px 0',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <span>{ex.name}</span>
                      <span style={{ color: 'var(--chalk-dim)', flexShrink: 0 }}>
                        {ex.sets} × {ex.reps}
                      </span>
                    </div>
                  ))}
              </div>
            ))
        )}
      </div>
    </div>
  )
}
