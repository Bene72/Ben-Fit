// components/coach/programme/ProgrammeToolbar.jsx
// Barre d'outils du programme (nouvelle séance, historique, dupliquer, images, PDF, logs).
// Extrait tel quel de ProgrammeTab.jsx le 10/11/2026 (aucune logique modifiée).
import { btnVariant } from '../../../lib/coachShared'

export default function ProgrammeToolbar({ ctx }) {
  const {
    cycleMode,
    displayedWorkouts,
    exportPDF,
    exporting,
    fetchAthleteLogs,
    imageSyncing,
    loadAllClients,
    loadHistory,
    setShowAdd,
    setShowDuplicate,
    setShowNextCycle,
    syncImages,
  } = ctx
  return (
    <>
      {/* ── Barre d'outils ── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 20,
          alignItems: 'center',
        }}
      >
        <button onClick={() => setShowAdd((s) => !s)} style={btnVariant('primary')}>
          + Séance
        </button>
        {cycleMode === 'current' && displayedWorkouts.length > 0 && (
          <button onClick={() => setShowNextCycle(true)} style={btnVariant('gold')}>
            ⏭ Préparer le cycle suivant
          </button>
        )}
        <button
          onClick={exportPDF}
          disabled={exporting || !displayedWorkouts.length}
          style={btnVariant('outline')}
        >
          {exporting ? '⏳ Export…' : '📄 PDF'}
        </button>
        <button
          onClick={() => syncImages(false)}
          disabled={imageSyncing}
          style={btnVariant('outline')}
        >
          {imageSyncing ? '⏳ Sync…' : '🖼 Images'}
        </button>
        <button
          onClick={() => {
            loadAllClients()
            setShowDuplicate(true)
          }}
          style={btnVariant('outline')}
        >
          📋 Dupliquer
        </button>
        {cycleMode === 'current' && (
          <button onClick={loadHistory} style={btnVariant('ghost')}>
            🗂 Historique
          </button>
        )}
        <button
          onClick={() => fetchAthleteLogs()}
          style={btnVariant('ghost')}
          title="Rafraîchir les logs athlète"
        >
          🔄
        </button>
      </div>
    </>
  )
}
