import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { OFFERS, S, font, bebas, toClientModel } from '../../lib/coachDashboard/shared'

export default function CreateClientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    objective: '',
    height: '',
    current_program: '',
    offer: 'tutto_bene',
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const inpC = {
    width: '100%',
    padding: '10px 12px',
    border: `1.5px solid ${S.border}`,
    borderRadius: 9,
    fontSize: 14,
    fontFamily: font,
    background: 'var(--bg)',
    outline: 'none',
    color: S.navy,
    boxSizing: 'border-box',
  }
  const lblC = {
    display: 'block',
    fontSize: 11,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    color: S.muted,
    marginBottom: 5,
    fontWeight: 700,
  }

  const createClient = async () => {
    setError('')
    if (!form.email || !form.password) {
      setError('Email et mot de passe obligatoires.')
      return
    }
    if (form.password.length < 10) {
      setError('Mot de passe : 10 caractères minimum.')
      return
    }
    setCreating(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const res = await fetch('/api/create-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erreur lors de la création')
      onCreated(toClientModel(result.profile))
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && !creating && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(13,27,78,0.55)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 20,
          padding: '28px 32px',
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 24px 60px rgba(13,27,78,0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            fontFamily: bebas,
            fontSize: 22,
            color: S.navy,
            letterSpacing: 2,
            marginBottom: 20,
          }}
        >
          + NOUVEL ÉLÈVE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={lblC}>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="eleve@exemple.com"
              style={inpC}
            />
          </div>
          <div>
            <label style={lblC}>Mot de passe provisoire *</label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="6 caractères minimum"
              style={inpC}
            />
          </div>
          <div>
            <label style={lblC}>Prénom / Nom</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Camille Dupont"
              style={inpC}
            />
          </div>
          <div>
            <label style={lblC}>Offre</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.values(OFFERS).map((o) => (
                <button
                  key={o.id}
                  onClick={() => setForm((p) => ({ ...p, offer: o.id }))}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: `2px solid ${form.offer === o.id ? o.color : S.border}`,
                    borderRadius: 10,
                    background: form.offer === o.id ? `${o.color}12` : 'white',
                    cursor: 'pointer',
                    fontFamily: font,
                  }}
                >
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{o.badge}</div>
                  <div style={{ fontWeight: 800, color: S.navy, fontSize: 13 }}>{o.name}</div>
                  <div style={{ fontSize: 12, color: S.muted }}>{o.price} €/m</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lblC}>Taille (cm)</label>
              <input
                type="number"
                value={form.height}
                onChange={(e) => setForm((p) => ({ ...p, height: e.target.value }))}
                placeholder="170"
                style={inpC}
              />
            </div>
            <div>
              <label style={lblC}>Programme</label>
              <input
                value={form.current_program}
                onChange={(e) => setForm((p) => ({ ...p, current_program: e.target.value }))}
                placeholder="Phase 1"
                style={inpC}
              />
            </div>
          </div>
          <div>
            <label style={lblC}>Objectif</label>
            <input
              value={form.objective}
              onChange={(e) => setForm((p) => ({ ...p, objective: e.target.value }))}
              placeholder="Prise de masse…"
              style={inpC}
            />
          </div>
          {error && (
            <div
              style={{
                background: '#FFF5F5',
                border: '1px solid #FECACA',
                borderRadius: 9,
                padding: '10px 12px',
                color: S.red,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button
              onClick={createClient}
              disabled={creating}
              style={{
                flex: 1,
                padding: '11px 20px',
                background: S.navy,
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: creating ? 'default' : 'pointer',
                fontFamily: font,
                opacity: creating ? 0.7 : 1,
              }}
            >
              {creating ? 'Création…' : '✓ Créer le compte'}
            </button>
            <button
              onClick={() => !creating && onClose()}
              style={{
                padding: '11px 20px',
                background: 'transparent',
                color: S.muted,
                border: `1.5px solid ${S.border}`,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: font,
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
