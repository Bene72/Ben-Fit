import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ci } from '../../lib/coachUtils'

export default function ExRow({ ex, wId, edit, onUpdate, onDelete, onMove, isFirst, isLast, recentNote }) {
  const [showImg, setShowImg] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [tempNote, setTempNote] = useState(ex.note || '')
  const [updatingNote, setUpdatingNote] = useState(false)

  const saveNote = async () => {
    setUpdatingNote(true)
    const { error } = await supabase
      .from('exercises')
      .update({ note: tempNote })
      .eq('id', ex.id)
    
    if (error) {
      console.error('Erreur mise à jour note:', error)
      alert('Erreur: ' + error.message)
    } else {
      onUpdate(wId, ex.id, 'note', tempNote)
      setEditingNote(false)
    }
    setUpdatingNote(false)
  }

  if (edit) {
    return (
      <div style={{ background: '#FAFBFF', border: '1.5px solid #C5D0F0', borderRadius: '12px', padding: '14px 14px 12px', marginBottom: '10px' }}>
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
              style={{ ...ci, fontWeight: '700', fontSize: '15px', padding: '15px 20px' }} />
          </div>
          <button onClick={() => onDelete(wId, ex.id)}
            style={{ width: '30px', height: '30px', borderRadius: '7px', border: 'none', background: 'rgba(196,92,58,0.12)', color: '#C45C3A', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '18px' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6B7A99', fontWeight: '600' }}>Séries</label>
            <input type="number" value={ex.sets} onChange={e => onUpdate(wId, ex.id, 'sets', e.target.value)}
              style={{ ...ci, textAlign: 'center', fontSize: '14px', fontWeight: '700', padding: '8px 4px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6B7A99', fontWeight: '600' }}>Reps</label>
            <input value={ex.reps} onChange={e => onUpdate(wId, ex.id, 'reps', e.target.value)}
              style={{ ...ci, textAlign: 'center', fontSize: '14px', fontWeight: '700', padding: '8px 4px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6B7A99', fontWeight: '600' }}>Repos</label>
            <select value={ex.rest || '90s'} onChange={e => onUpdate(wId, ex.id, 'rest', e.target.value)}
              style={{ ...ci, fontSize: '13px', padding: '8px 4px', textAlign: 'center' }}>
              {['30s', '45s', '60s', '90s', '2 min', '3 min', '4 min', '5 min'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6B7A99', fontWeight: '600' }}>Charge</label>
            <input value={ex.target_weight || ''} onChange={e => onUpdate(wId, ex.id, 'target_weight', e.target.value)}
              placeholder="80kg" style={{ ...ci, textAlign: 'center', fontSize: '13px', padding: '8px 4px' }} />
          </div>
        </div>

        {/* Note coach - modifiable */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6B7A99', fontWeight: '600' }}>Notes / consigne coach</label>
          
          {!editingNote ? (
            <div onClick={() => setEditingNote(true)} style={{ cursor: 'pointer', background: 'white', border: '1.5px solid #C5D0F0', borderRadius: '8px', padding: '10px 12px', minHeight: '80px' }}>
              <span style={{ color: ex.note ? '#0D1B4E' : '#9BA8C0' }}>
                {ex.note || 'Clique pour ajouter une note...'}
              </span>
            </div>
          ) : (
            <div>
              <textarea 
                value={tempNote} 
                onChange={(e) => setTempNote(e.target.value)}
                placeholder="Tempo, consigne, point d'attention…"
                rows={3}
                autoFocus
                style={{ ...ci, resize: 'vertical', minHeight: '80px', lineHeight: '1.6', fontSize: '14px', padding: '10px 12px' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={saveNote} disabled={updatingNote} style={{ padding: '6px 12px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  {updatingNote ? 'Sauvegarde...' : '✓ Enregistrer'}
                </button>
                <button onClick={() => setEditingNote(false)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #C5D0F0', borderRadius: 6, cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {showImg && ex.image_url && (
        <div onClick={() => setShowImg(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', maxWidth: '500px', width: '90%' }}>
            <img src={ex.image_url} alt={ex.name} style={{ width: '100%', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
            <div style={{ textAlign: 'center', color: 'white', marginTop: '12px', fontWeight: '600', fontSize: '16px' }}>{ex.name}</div>
            <button onClick={() => setShowImg(false)} style={{ position: 'absolute', top: '-12px', right: '-12px', width: '32px', height: '32px', borderRadius: '50%', background: 'white', border: 'none', fontSize: '18px', cursor: 'pointer' }}>×</button>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 80px 90px 1fr', gap: '6px', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {ex.image_url
            ? <img src={ex.image_url} alt={ex.name} onClick={() => setShowImg(true)} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '7px', cursor: 'pointer', flexShrink: 0, border: '1px solid #C5D0F0' }} />
            : <div style={{ width: '60px', height: '60px', borderRadius: '7px', background: '#EEF2FF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>💪</div>
          }
          <div>
            <div style={{ fontWeight: '500', fontSize: '13px' }}>{ex.name}</div>
            {ex.note && <div style={{ fontSize: '11px', color: '#4A6FD4' }}>📋 {ex.note}</div>}
            {recentNote && (
              <div style={{ fontSize: '10px', color: '#8FA07A', marginTop: 2 }}>
                📝 Athlète: {recentNote.length > 50 ? recentNote.substring(0, 50) + '…' : recentNote}
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: '13px', textAlign: 'center' }}>{ex.sets}</div>
        <div style={{ fontSize: '13px', textAlign: 'center' }}>{ex.reps}</div>
        <div style={{ fontSize: '12px', textAlign: 'center', color: '#6B7A99' }}>⏱ {ex.rest}</div>
        <div style={{ fontSize: '12px', textAlign: 'center', color: '#6B7A99' }}>{ex.target_weight ? `${ex.target_weight} kg` : '—'}</div>
        <div style={{ fontSize: '11px', color: '#6B7A99' }}>{ex.note}</div>
      </div>
    </>
  )
              }
