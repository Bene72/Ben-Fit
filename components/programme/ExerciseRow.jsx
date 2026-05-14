import { useState, useEffect, useRef } from 'react'
import { ci } from '../../lib/coachUtils'

// ── Chrono repos ──────────────────────────────────────────────
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

  const pct = remaining !== null ? Math.round(((seconds - remaining) / seconds) * 100) : 0
  const isRunning = remaining !== null && remaining > 0
  const isDone = remaining === 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <button onClick={start} style={{
        padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
        background: isRunning ? '#EEF4FF' : isDone ? '#D4E8CC' : '#F0F4FF',
        color: isRunning ? '#2C64E5' : isDone ? '#3A7A5A' : '#4A6FD4',
        fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {isDone ? '✅ Repos terminé' : isRunning ? `⏱ ${remaining}s` : `⏱ Chrono ${seconds}s`}
      </button>
      {isRunning && (
        <div style={{ flex: 1, height: 4, background: '#EEF4FF', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#2C64E5', width: `${pct}%`, transition: 'width 1s linear' }} />
        </div>
      )}
    </div>
  )
}

// ── ExRow ─────────────────────────────────────────────────────
// Props :
//   onUpdate(wId, exId, field, value)  → champs généraux (name, sets, reps, rest, target_weight)
//   onUpdateNote(exId, note)           → note coach uniquement (sauvegarde dédiée)
//   recentLog { note, weight, reps, date } → derniers logs athlète (lecture seule)
export default function ExRow({ ex, wId, edit, onUpdate, onUpdateNote, onDelete, onMove, isFirst, isLast, recentLog }) {
  const [showImg, setShowImg] = useState(false)

  // Valeur locale de la note coach pour éviter un re-render à chaque frappe
  const [localNote, setLocalNote] = useState(ex.coach_note ?? ex.note ?? '')

  // Sync si l'exercice change (changement de client, rechargement)
  useEffect(() => {
    setLocalNote(ex.coach_note ?? ex.note ?? '')
  }, [ex.id, ex.coach_note, ex.note])

  const restSeconds = (() => {
    const r = ex.rest || ''
    const mMatch = r.match(/(\d+)\s*min/)
    const sMatch = r.match(/^(\d+)s$/)
    if (mMatch) return parseInt(mMatch[1]) * 60
    if (sMatch) return parseInt(sMatch[1])
    return null
  })()

  const labelStyle = { fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6B7A99', fontWeight: '600' }

  // ── Mode édition ──────────────────────────────────────────
  if (edit) {
    return (
      <div style={{ background: '#FAFBFF', border: '1.5px solid #C5D0F0', borderRadius: '12px', padding: '14px 14px 12px', marginBottom: '10px' }}>

        {/* Nom + boutons ordre + supprimer */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0, paddingTop: '6px' }}>
            <button onClick={() => onMove && onMove(wId, ex.id, -1)} disabled={isFirst}
              style={{ width: '26px', height: '24px', border: '1px solid #C5D0F0', borderRadius: '5px', background: isFirst ? '#F5F5F5' : 'white', color: isFirst ? '#CCC' : '#0D1B4E', cursor: isFirst ? 'default' : 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>▲</button>
            <button onClick={() => onMove && onMove(wId, ex.id, 1)} disabled={isLast}
              style={{ width: '26px', height: '24px', border: '1px solid #C5D0F0', borderRadius: '5px', background: isLast ? '#F5F5F5' : 'white', color: isLast ? '#CCC' : '#0D1B4E', cursor: isLast ? 'default' : 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>▼</button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={labelStyle}>Exercice</label>
            <input value={ex.name} onChange={e => onUpdate(wId, ex.id, 'name', e.target.value)}
              style={{ ...ci, fontWeight: '700', fontSize: '15px', padding: '10px 12px' }} />
          </div>
          <button onClick={() => onDelete(wId, ex.id)}
            style={{ width: '30px', height: '30px', borderRadius: '7px', border: 'none', background: 'rgba(196,92,58,0.12)', color: '#C45C3A', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '18px' }}>×</button>
        </div>

        {/* Séries / Reps / Repos / Charge */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          {[
            { label: 'Séries', field: 'sets', type: 'number', val: ex.sets },
            { label: 'Reps',   field: 'reps', type: 'text',   val: ex.reps },
          ].map(f => (
            <div key={f.field} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={labelStyle}>{f.label}</label>
              <input type={f.type} value={f.val || ''} onChange={e => onUpdate(wId, ex.id, f.field, e.target.value)}
                style={{ ...ci, textAlign: 'center', fontSize: '14px', fontWeight: '700', padding: '8px 4px' }} />
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={labelStyle}>Repos</label>
            <select value={ex.rest || '90s'} onChange={e => onUpdate(wId, ex.id, 'rest', e.target.value)}
              style={{ ...ci, fontSize: '13px', padding: '8px 4px' }}>
              {['30s', '45s', '60s', '90s', '2 min', '3 min', '4 min', '5 min'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={labelStyle}>Charge</label>
            <input value={ex.target_weight || ''} onChange={e => onUpdate(wId, ex.id, 'target_weight', e.target.value)}
              placeholder="80kg" style={{ ...ci, textAlign: 'center', fontSize: '13px', padding: '8px 4px' }} />
          </div>
        </div>

        {/* Note coach → sauvegardée dans exercises.coach_note, visible par l'athlète */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label style={labelStyle}>
            📋 Note coach <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#4A6FD4' }}>(visible par l'athlète)</span>
          </label>
          <textarea
            value={localNote}
            onChange={e => setLocalNote(e.target.value)}
            onBlur={() => onUpdateNote && onUpdateNote(ex.id, localNote)}
            placeholder="Tempo, consigne, point d'attention…"
            rows={3}
            style={{ ...ci, resize: 'vertical', minHeight: '80px', lineHeight: '1.6', fontSize: '14px', padding: '10px 12px' }}
          />
        </div>

        {/* Derniers logs athlète – lecture seule pour le coach */}
        {recentLog && (recentLog.note || recentLog.weight) && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#F0F7FF', borderRadius: 8, borderLeft: '3px solid #4A6FD4', fontSize: 12 }}>
            <div style={{ fontSize: 10, color: '#6B7A99', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
              🏃 Dernier log athlète
              {recentLog.date && <span style={{ fontWeight: 400, marginLeft: 6 }}>· {new Date(recentLog.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', color: '#0D1B4E' }}>
              {recentLog.weight && <span style={{ fontWeight: 700, color: '#C45C3A' }}>{recentLog.weight} kg</span>}
              {recentLog.reps   && <span style={{ color: '#4A6FD4' }}>{recentLog.reps} reps</span>}
              {recentLog.note   && <span style={{ color: '#6B7A99', fontStyle: 'italic' }}>"{recentLog.note.length > 80 ? recentLog.note.slice(0, 80) + '…' : recentLog.note}"</span>}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Mode lecture ──────────────────────────────────────────
  // Affiche la note coach (champ coach_note ou note en fallback)
  const displayNote = ex.coach_note || ex.note || ''

  return (
    <>
      {showImg && ex.image_url && (
        <div onClick={() => setShowImg(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', maxWidth: '500px', width: '90%' }}>
            <img src={ex.image_url} alt={ex.name} style={{ width: '100%', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
            <div style={{ textAlign: 'center', color: 'white', marginTop: '12px', fontWeight: '600', fontSize: '16px' }}>{ex.name}</div>
            <button onClick={() => setShowImg(false)} style={{ position: 'absolute', top: '-12px', right: '-12px', width: '32px', height: '32px', borderRadius: '50%', background: 'white', border: 'none', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>
      )}

      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 80px 90px', gap: '6px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {ex.image_url
              ? <img src={ex.image_url} alt={ex.name} onClick={() => setShowImg(true)} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '7px', cursor: 'pointer', flexShrink: 0, border: '1px solid #C5D0F0' }} />
              : <div style={{ width: '60px', height: '60px', borderRadius: '7px', background: '#EEF2FF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>💪</div>
            }
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: '600', fontSize: '13px', color: '#0D1B4E' }}>{ex.name}</div>
              {/* Note coach visible en lecture */}
              {displayNote && (
                <div style={{ fontSize: '11px', color: '#4A6FD4', marginTop: 2 }}>📋 {displayNote}</div>
              )}
            </div>
          </div>
          <div style={{ fontSize: '13px', textAlign: 'center', fontWeight: 700 }}>{ex.sets}</div>
          <div style={{ fontSize: '13px', textAlign: 'center', fontWeight: 700 }}>{ex.reps}</div>
          <div style={{ fontSize: '12px', textAlign: 'center', color: '#6B7A99' }}>⏱ {ex.rest}</div>
          <div style={{ fontSize: '12px', textAlign: 'center', color: '#6B7A99' }}>{ex.target_weight ? `${ex.target_weight} kg` : '—'}</div>
        </div>

        {/* Chrono repos */}
        {restSeconds && <RestTimer seconds={restSeconds} />}

        {/* Dernier log athlète (affiché uniquement côté coach, pas en vue athlète) */}
        {recentLog && (recentLog.note || recentLog.weight) && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#F5F8FF', borderRadius: 8, borderLeft: '3px solid #4A6FD4' }}>
            <div style={{ fontSize: 10, color: '#6B7A99', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>
              🏃 Dernier log athlète
              {recentLog.date && <span style={{ fontWeight: 400, marginLeft: 6 }}>· {new Date(recentLog.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
            </div>
            <div style={{ fontSize: 12, color: '#0D1B4E', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {recentLog.weight && <span style={{ fontWeight: 700, color: '#C45C3A' }}>{recentLog.weight} kg</span>}
              {recentLog.reps   && <span style={{ color: '#4A6FD4' }}>{recentLog.reps} reps</span>}
              {recentLog.note   && <span style={{ color: '#6B7A99', fontStyle: 'italic' }}>"{recentLog.note.length > 60 ? recentLog.note.slice(0, 60) + '…' : recentLog.note}"</span>}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
