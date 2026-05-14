import { useState, useEffect, useRef } from 'react'
import { ci } from '../../lib/coachUtils'

// ── Chrono repos ─────────────────────────────────────────────
function RestTimer({ seconds }) {
  const [remaining, setRemaining] = useState(null)
  const ref = useRef(null)

  const start = () => {
    if (ref.current) clearInterval(ref.current)
    setRemaining(seconds)
    ref.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(ref.current); return 0 }
        return r - 1
      })
    }, 1000)
  }

  useEffect(() => () => clearInterval(ref.current), [])

  const isRunning = remaining !== null && remaining > 0
  const isDone    = remaining === 0
  const pct       = remaining !== null ? Math.round(((seconds - remaining) / seconds) * 100) : 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <button onClick={start} style={{
        padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
        background: isDone ? '#D4E8CC' : isRunning ? '#EEF4FF' : '#F0F4FF',
        color:  isDone ? '#3A7A5A' : isRunning ? '#2C64E5' : '#4A6FD4',
        fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
      }}>
        {isDone ? '✅ Repos terminé' : isRunning ? `⏱ ${remaining}s` : `⏱ Lancer chrono (${seconds}s)`}
      </button>
      {isRunning && (
        <div style={{ flex: 1, height: 4, background: '#EEF4FF', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#2C64E5', width: `${pct}%`, transition: 'width 1s linear' }} />
        </div>
      )}
    </div>
  )
}

// ── Workspace (identique à l'athlète) ─────────────────────────
function CoachExerciseWorkspace({ ex, recentLog }) {
  const restSeconds = (() => {
    const r = ex.rest || ''
    const m = r.match(/(\d+)\s*min/); if (m) return parseInt(m[1]) * 60
    const s = r.match(/^(\d+)s$/);   if (s) return parseInt(s[1])
    return null
  })()

  return (
    <div style={{ borderRadius: 10, border: '1.5px solid #2C64E5', background: '#F8FBFF', padding: 14, marginBottom: 4 }}>
      {/* Note coach */}
      {ex.note && (
        <div style={{ marginBottom: 10, padding: '7px 12px', background: 'white', borderRadius: 8, borderLeft: '3px solid #2C64E5', fontSize: 13, color: '#0D1B4E', lineHeight: 1.6 }}>
          📋 <span style={{ fontWeight: 700 }}>Consigne :</span> {ex.note}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', background: '#2C64E5', color: 'white', borderRadius: 20 }}>
            {ex.sets} × {ex.reps}
          </span>
          <span style={{ fontSize: 12, padding: '4px 10px', background: '#EEF4FF', color: '#2C64E5', borderRadius: 20 }}>
            ⏱ {ex.rest}
          </span>
          {ex.target_weight && (
            <span style={{ fontSize: 12, padding: '4px 10px', background: '#FFF0E8', color: '#C45C3A', borderRadius: 20 }}>
              🏋️ {ex.target_weight}
            </span>
          )}
        </div>
      </div>

      {/* Chrono repos */}
      {restSeconds && <RestTimer seconds={restSeconds} />}

      {/* Dernier log athlète */}
      {recentLog && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid #DCE5F3' }}>
          <div style={{ fontSize: 10, color: '#6B7A99', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
            📝 Dernier log athlète
            {recentLog.date && (
              <span style={{ fontWeight: 400, marginLeft: 6 }}>
                · {new Date(recentLog.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
            {recentLog.weight && <span style={{ fontWeight: 800, color: '#C45C3A' }}>{recentLog.weight} kg</span>}
            {recentLog.reps   && <span style={{ color: '#4A6FD4' }}>{recentLog.reps} reps</span>}
            {recentLog.note   && (
              <span style={{ color: '#6B7A99', fontStyle: 'italic' }}>
                "{recentLog.note.length > 70 ? recentLog.note.slice(0, 70) + '…' : recentLog.note}"
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────
export default function ExRow({ ex, wId, edit, onUpdate, onDelete, onMove, isFirst, isLast, recentLog }) {
  const [showImg,      setShowImg]      = useState(false)
  const [showWorkspace, setShowWorkspace] = useState(false)

  // ── MODE ÉDITION ─────────────────────────────────────────────
  if (edit) {
    return (
      <div style={{ background: '#FAFBFF', border: '1.5px solid #C5D0F0', borderRadius: '12px', padding: '14px 14px 12px', marginBottom: '10px' }}>
        {/* Nom + flèches + supprimer */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0, paddingTop: '6px' }}>
            <button onClick={() => onMove && onMove(wId, ex.id, -1)} disabled={isFirst}
              style={{ width: '26px', height: '24px', border: '1px solid #C5D0F0', borderRadius: '5px', background: isFirst ? '#F5F5F5' : 'white', color: isFirst ? '#CCC' : '#0D1B4E', cursor: isFirst ? 'default' : 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>▲</button>
            <button onClick={() => onMove && onMove(wId, ex.id, 1)} disabled={isLast}
              style={{ width: '26px', height: '24px', border: '1px solid #C5D0F0', borderRadius: '5px', background: isLast ? '#F5F5F5' : 'white', color: isLast ? '#CCC' : '#0D1B4E', cursor: isLast ? 'default' : 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>▼</button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6B7A99', fontWeight: '600' }}>Exercice</label>
            <input value={ex.name} onChange={e => onUpdate(wId, ex.id, 'name', e.target.value)}
              style={{ ...ci, fontWeight: '700', fontSize: '15px', padding: '10px 12px' }} />
          </div>
          <button onClick={() => onDelete(wId, ex.id)}
            style={{ width: '30px', height: '30px', borderRadius: '7px', border: 'none', background: 'rgba(196,92,58,0.12)', color: '#C45C3A', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '18px' }}>×</button>
        </div>

        {/* Séries / Reps / Repos / Charge */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6B7A99', fontWeight: '600' }}>Séries</label>
            <input type="number" value={ex.sets || ''} onChange={e => onUpdate(wId, ex.id, 'sets', e.target.value)}
              style={{ ...ci, textAlign: 'center', fontSize: '14px', fontWeight: '700', padding: '8px 4px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6B7A99', fontWeight: '600' }}>Reps</label>
            <input value={ex.reps || ''} onChange={e => onUpdate(wId, ex.id, 'reps', e.target.value)}
              style={{ ...ci, textAlign: 'center', fontSize: '14px', fontWeight: '700', padding: '8px 4px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6B7A99', fontWeight: '600' }}>Repos</label>
            <select value={ex.rest || '90s'} onChange={e => onUpdate(wId, ex.id, 'rest', e.target.value)}
              style={{ ...ci, fontSize: '13px', padding: '8px 4px' }}>
              {['30s','45s','60s','90s','2 min','3 min','4 min','5 min'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6B7A99', fontWeight: '600' }}>Charge</label>
            <input value={ex.target_weight || ''} onChange={e => onUpdate(wId, ex.id, 'target_weight', e.target.value)}
              placeholder="80kg" style={{ ...ci, textAlign: 'center', fontSize: '13px', padding: '8px 4px' }} />
          </div>
        </div>

        {/* Notes coach */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6B7A99', fontWeight: '600' }}>Notes / consigne coach</label>
          <textarea value={ex.note || ''} onChange={e => onUpdate(wId, ex.id, 'note', e.target.value)}
            placeholder="Tempo, consigne, point d'attention…" rows={3}
            style={{ ...ci, resize: 'vertical', minHeight: '80px', lineHeight: '1.6', fontSize: '14px', padding: '10px 12px' }} />
        </div>

        {/* Dernier log athlète (contexte coach en édition) */}
        {recentLog?.note && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#F0F7FF', borderRadius: 8, borderLeft: '3px solid #4A6FD4', fontSize: 12 }}>
            <div style={{ fontSize: 10, color: '#6B7A99', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>📝 Dernière note athlète</div>
            <div style={{ color: '#0D1B4E' }}>{recentLog.note}</div>
          </div>
        )}
      </div>
    )
  }

  // ── MODE LECTURE — identique à l'interface athlète ────────────
  return (
    <>
      {/* Lightbox image */}
      {showImg && ex.image_url && (
        <div onClick={() => setShowImg(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', maxWidth: '500px', width: '90%' }}>
            <img src={ex.image_url} alt={ex.name} style={{ width: '100%', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
            <div style={{ textAlign: 'center', color: 'white', marginTop: '12px', fontWeight: '600', fontSize: '16px' }}>{ex.name}</div>
            <button onClick={() => setShowImg(false)} style={{ position: 'absolute', top: '-12px', right: '-12px', width: '32px', height: '32px', borderRadius: '50%', background: 'white', border: 'none', fontSize: '18px', cursor: 'pointer' }}>×</button>
          </div>
        </div>
      )}

      {/* Carte compacte cliquable — style athlète */}
      <button
        type="button"
        onClick={() => setShowWorkspace(s => !s)}
        style={{
          width: '100%', textAlign: 'left',
          background: showWorkspace ? '#EEF4FF' : '#FFFFFF',
          border: showWorkspace ? '1.5px solid #2C64E5' : '1px solid #DCE5F3',
          borderRadius: 12, padding: '10px 12px',
          cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
          marginBottom: 6,
          boxShadow: showWorkspace ? '0 0 0 2px rgba(44,100,229,0.1)' : 'none',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        {/* Image */}
        <div style={{ width: 54, height: 54, borderRadius: 8, overflow: 'hidden', background: '#F0F5FF', border: '1px solid #E0E8F5', flexShrink: 0 }}>
          {ex.image_url ? (
            <img src={ex.image_url} alt={ex.name}
              onClick={e => { e.stopPropagation(); setShowImg(true) }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} />
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 18 }}>💪</div>
          )}
        </div>

        {/* Nom + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#0D1B4E', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ex.name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', background: '#2C64E5', color: 'white', borderRadius: 6 }}>
              {ex.sets} × {ex.reps}
            </span>
            <span style={{ fontSize: 11, padding: '3px 8px', background: '#EEF4FF', color: '#2C64E5', borderRadius: 6, border: '1px solid #DCE5F3' }}>
              {ex.rest || '—'}
            </span>
            {ex.target_weight && (
              <span style={{ fontSize: 11, padding: '3px 8px', background: '#FFF0E8', color: '#C45C3A', borderRadius: 6 }}>
                🏋️ {ex.target_weight}
              </span>
            )}
            {recentLog?.weight && (
              <span style={{ fontSize: 11, padding: '3px 8px', background: '#F0F7FF', color: '#4A6FD4', borderRadius: 6 }}>
                📊 Dernier : {recentLog.weight}kg
              </span>
            )}
          </div>
        </div>

        {/* Indicateur ouvert/fermé */}
        <div style={{ color: showWorkspace ? '#2C64E5' : '#E0E0E0', fontSize: 20, flexShrink: 0 }}>
          {showWorkspace ? '●' : '○'}
        </div>
      </button>

      {/* Workspace détail (s'ouvre au tap, identique athlète) */}
      {showWorkspace && (
        <div style={{ marginBottom: 8 }}>
          <CoachExerciseWorkspace ex={ex} recentLog={recentLog} />
        </div>
      )}
    </>
  )
}
