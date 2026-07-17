import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { NOTE_COLORS, S, font, bebas } from '../../lib/coachDashboard/shared'

export default function PostItPanel({ clientId, notes, onUpdate }) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [color, setColor] = useState('yellow')
  const [saving, setSaving] = useState(false)

  const addNote = async () => {
    if (!text.trim()) return
    setSaving(true)
    const newNote = {
      id: Date.now(),
      text: text.trim(),
      color,
      createdAt: new Date().toISOString().split('T')[0],
    }
    const updated = [...(notes || []), newNote]
    try {
      await supabase.from('profiles').update({ coach_notes: updated }).eq('id', clientId)
      onUpdate(updated)
      setText('')
      setAdding(false)
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const deleteNote = async (id) => {
    const updated = (notes || []).filter((n) => n.id !== id)
    await supabase.from('profiles').update({ coach_notes: updated }).eq('id', clientId)
    onUpdate(updated)
  }

  const nc = NOTE_COLORS.find((c) => c.id === color) || NOTE_COLORS[0]

  return (
    <div
      style={{
        background: S.card,
        border: `1px solid ${S.border}`,
        borderRadius: 14,
        padding: '18px 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div style={{ fontFamily: bebas, fontSize: 14, color: S.navy, letterSpacing: 2 }}>
          📌 ANNOTATIONS
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            style={{
              padding: '5px 12px',
              background: S.navy,
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: font,
            }}
          >
            + Ajouter
          </button>
        )}
      </div>

      {adding && (
        <div
          style={{
            marginBottom: 14,
            background: nc.bg,
            border: `1.5px solid ${nc.border}`,
            borderRadius: 10,
            padding: '12px 14px',
          }}
        >
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex : vacances 10-24 juillet, allergie gluten, reprend après blessure…"
            rows={3}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontFamily: font,
              color: S.navy,
              resize: 'none',
              outline: 'none',
              marginBottom: 10,
              lineHeight: 1.5,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: c.bg,
                    border: `2.5px solid ${color === c.id ? S.navy : c.border}`,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button
                onClick={() => {
                  setAdding(false)
                  setText('')
                }}
                style={{
                  padding: '5px 12px',
                  background: 'transparent',
                  color: S.muted,
                  border: `1px solid ${S.border}`,
                  borderRadius: 7,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: font,
                }}
              >
                Annuler
              </button>
              <button
                onClick={addNote}
                disabled={saving || !text.trim()}
                style={{
                  padding: '5px 12px',
                  background: S.navy,
                  color: 'white',
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: font,
                  opacity: !text.trim() ? 0.5 : 1,
                }}
              >
                {saving ? '…' : '✓ Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(!notes || notes.length === 0) && !adding ? (
        <div
          style={{
            fontSize: 12,
            color: S.muted,
            textAlign: 'center',
            padding: '16px 0',
            fontStyle: 'italic',
          }}
        >
          Aucune annotation — ajoute des infos importantes ici (vacances, allergies, blessures…)
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(notes || []).map((note) => {
            const nc = NOTE_COLORS.find((c) => c.id === note.color) || NOTE_COLORS[0]
            return (
              <div
                key={note.id}
                style={{
                  background: nc.bg,
                  border: `1px solid ${nc.border}`,
                  borderRadius: 10,
                  padding: '10px 12px',
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: 13, color: S.navy, lineHeight: 1.5, paddingRight: 24 }}>
                  {note.text}
                </div>
                <div style={{ fontSize: 10, color: S.muted, marginTop: 6 }}>
                  📅 {note.createdAt}
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 20,
                    height: 20,
                    border: 'none',
                    background: 'rgba(0,0,0,0.08)',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: S.muted,
                  }}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
