import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// Helpers locaux (au cas où coachHelpers ne les exporte pas)
const ci = {
  padding: '10px 14px',
  border: '1.5px solid #E0E6F0',
  borderRadius: '8px',
  fontSize: '14px',
  fontFamily: "'DM Sans',sans-serif",
  outline: 'none',
  background: 'white',
  color: '#0D1B4E',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
}

const inp = { ...ci }

const lbl = {
  display: 'block',
  fontSize: '11px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#6B7A99',
  fontWeight: '600',
  marginBottom: '6px',
}

const btn = (bg, color, border) => ({
  padding: '8px 18px',
  background: bg || '#0D1B4E',
  color: color || 'white',
  border: border ? `1px solid ${border}` : 'none',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
  fontFamily: "'DM Sans',sans-serif",
  transition: 'all 0.15s',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
})

export default function OverviewTab({ client, sessionsThisWeek, lastWeight, coachId, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    coach_note: client?.coach_note || '',
    current_program: client?.current_program || '',
    session_target: client?.session_target || '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (client) {
      setForm({
        coach_note: client.coach_note || '',
        current_program: client.current_program || '',
        session_target: client.session_target || '',
      })
    }
  }, [client])

  const save = async () => {
    setSaving(true)
    const { data, error } = await supabase
      .from('profiles')
      .update({
        coach_note: form.coach_note,
        current_program: form.current_program,
        session_target: form.session_target,
      })
      .eq('id', client.id)
      .select()
      .single()

    if (!error && data) {
      if (onUpdate) onUpdate({ ...client, ...data })
      setEditing(false)
    }
    setSaving(false)
  }

  if (!client) {
    return <div style={{ color: '#6B7A99', textAlign: 'center', padding: '40px' }}>Client non trouvé</div>
  }

  const stats = [
    { label: 'Séances cette semaine', value: sessionsThisWeek || 0, icon: '🏋️' },
    { label: 'Dernier poids', value: lastWeight ? `${lastWeight} kg` : '—', icon: '⚖️' },
    { label: 'Programme actuel', value: client.current_program || 'Non défini', icon: '📋' },
  ]

  return (
    <div>
      {/* Statistiques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '16px 20px', border: '1px solid #EAEAEA', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
            <div style={{ fontSize: '13px', color: '#6B7A99' }}>{stat.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#0D1B4E' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Note coach */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #EAEAEA', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: '700', fontSize: '14px', color: '#0D1B4E' }}>📝 Note coach</div>
          <button onClick={() => setEditing(!editing)} style={btn(editing ? '#EEF2FF' : '#0D1B4E', editing ? '#0D1B4E' : 'white')}>
            {editing ? 'Annuler' : '✏️ Modifier'}
          </button>
        </div>

        {editing ? (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Note coach</label>
              <textarea
                value={form.coach_note}
                onChange={e => setForm(p => ({ ...p, coach_note: e.target.value }))}
                rows={4}
                placeholder="Objectifs, points d'attention, feedback..."
                style={{ ...inp, resize: 'vertical', minHeight: '80px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={lbl}>Programme actuel</label>
                <input
                  value={form.current_program}
                  onChange={e => setForm(p => ({ ...p, current_program: e.target.value }))}
                  placeholder="Ex: Cycle Force Hiver 2026"
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>Objectif séance</label>
                <input
                  value={form.session_target}
                  onChange={e => setForm(p => ({ ...p, session_target: e.target.value }))}
                  placeholder="Ex: 5x5, 3x10, Hyrox..."
                  style={inp}
                />
              </div>
            </div>
            <button onClick={save} disabled={saving} style={btn('#0D1B4E', 'white')}>
              {saving ? 'Sauvegarde...' : '✓ Enregistrer'}
            </button>
          </div>
        ) : (
          <div>
            {client.coach_note ? (
              <div style={{ background: '#F5F8FF', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #4A6FD4', color: '#333', fontSize: '14px', lineHeight: '1.6' }}>
                {client.coach_note}
              </div>
            ) : (
              <div style={{ color: '#999', fontSize: '13px', fontStyle: 'italic' }}>
                Aucune note pour ce client
              </div>
            )}
            {client.current_program && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#6B7A99' }}>
                📋 Programme: <strong>{client.current_program}</strong>
              </div>
            )}
            {client.session_target && (
              <div style={{ fontSize: '13px', color: '#6B7A99' }}>
                🎯 Objectif: <strong>{client.session_target}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Informations client */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #EAEAEA' }}>
          <div style={{ fontWeight: '700', fontSize: '14px', color: '#0D1B4E', marginBottom: '12px' }}>👤 Informations</div>
          <div style={{ fontSize: '13px', color: '#6B7A99', marginBottom: '4px' }}>Email</div>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#0D1B4E', marginBottom: '12px' }}>{client.email || '—'}</div>
          <div style={{ fontSize: '13px', color: '#6B7A99', marginBottom: '4px' }}>ID</div>
          <div style={{ fontSize: '12px', color: '#999', fontFamily: 'monospace' }}>{client.id}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #EAEAEA' }}>
          <div style={{ fontWeight: '700', fontSize: '14px', color: '#0D1B4E', marginBottom: '12px' }}>📊 Activité</div>
          <div style={{ fontSize: '13px', color: '#6B7A99', marginBottom: '4px' }}>Séances cette semaine</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#0D1B4E', marginBottom: '12px' }}>{sessionsThisWeek || 0}</div>
          <div style={{ fontSize: '13px', color: '#6B7A99', marginBottom: '4px' }}>Dernier poids</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#0D1B4E' }}>{lastWeight ? `${lastWeight} kg` : '—'}</div>
        </div>
      </div>
    </div>
  )
}
