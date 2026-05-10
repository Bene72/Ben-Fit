import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { btn, lbl, inp, sessionsThisWeek, lastWeight } from '../../lib/coachUtils'

function OverviewTab({ client, sessionsThisWeek, lastWeight, coachId, onUpdate }) {
  const [note, setNote] = useState(client.coach_note || '')
  const [program, setProgram] = useState(client.current_program || '')
  const [sessionTarget, setSessionTarget] = useState(client.session_target || 5)
  const [newWeight, setNewWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [editStats, setEditStats] = useState(false)

  const saveAll = async () => {
    setSaving(true)
    const updates = { coach_note: note, current_program: program, session_target: +sessionTarget }
    await supabase.from('profiles').update(updates).eq('id', client.id)
    if (newWeight) {
      await supabase.from('measures').insert({ client_id: client.id, date: new Date().toISOString().split('T')[0], weight: +newWeight })
    }
    onUpdate({ ...client, ...updates, measures: newWeight ? [{ weight: +newWeight, date: new Date().toISOString().split('T')[0] }, ...(client.measures || [])] : client.measures })
    setNewWeight('')
    setEditStats(false)
    setSaving(false)
  }

  const currentWeight = lastWeight(client)
  const sessions = sessionsThisWeek(client)
  const target = client.session_target || 5

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px', borderTop: '3px solid #4A6FD4' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: '8px' }}>Séances cette semaine</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '32px', color: '#0D1B4E' }}>{sessions}<span style={{ fontSize: '16px', color: '#6B7A99' }}>/{target}</span></div>
          {editStats && (
            <div style={{ marginTop: '8px' }}>
              <label style={lbl}>Objectif / semaine</label>
              <input type="number" value={sessionTarget} onChange={e => setSessionTarget(e.target.value)} style={{ ...inp, width: '80px' }} />
            </div>
          )}
        </div>
        <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px', borderTop: '3px solid #C45C3A' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: '8px' }}>Dernier poids</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '32px', color: '#0D1B4E' }}>{currentWeight}<span style={{ fontSize: '16px', color: '#6B7A99' }}> kg</span></div>
          {editStats && (
            <div style={{ marginTop: '8px' }}>
              <label style={lbl}>Nouveau poids (kg)</label>
              <input type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="80.5" style={{ ...inp, width: '100px' }} />
            </div>
          )}
        </div>
        <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px', borderTop: '3px solid #0D1B4E' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: '8px' }}>Programme actuel</div>
          {editStats ? (
            <input value={program} onChange={e => setProgram(e.target.value)} placeholder="Phase 2 · Hypertrophie" style={{ ...inp, fontFamily: "'Bebas Neue',sans-serif", fontSize: '15px' }} />
          ) : (
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '24px', color: '#0D1B4E' }}>{program || '—'}</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {editStats ? (
          <>
            <button onClick={saveAll} disabled={saving} style={btn('#0D1B4E', 'white')}>{saving ? 'Sauvegarde…' : '✓ Enregistrer tout'}</button>
            <button onClick={() => { setEditStats(false); setProgram(client.current_program || ''); setSessionTarget(client.session_target || 5); setNewWeight('') }} style={btn('transparent', '#6B7A99', '#C5D0F0')}>Annuler</button>
          </>
        ) : (
          <button onClick={() => setEditStats(true)} style={btn('#EEF2FF', '#0D1B4E', '#4A6FD4')}>✏️ Modifier les stats</button>
        )}
      </div>

      <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>📌 Message / Note pour {client.full_name?.split(' ')[0]}</div>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Écris une note ou message pour le client…" rows={5} style={{ width: '100%', padding: '12px', border: '1.5px solid #C5D0F0', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: 'white', resize: 'vertical', outline: 'none', lineHeight: '1.6' }} />
        <button onClick={saveAll} disabled={saving} style={{ marginTop: '10px', padding: '8px 20px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
          {saving ? 'Sauvegarde…' : '✓ Enregistrer'}
        </button>
      </div>
    </div>
  )
}

