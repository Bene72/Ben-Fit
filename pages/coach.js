// pages/coach.js  — Ben&Fit Dashboard avec données Supabase réelles
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { Toast, useToast } from '../components/Toast'

// ─── OFFRES ───────────────────────────────────────────────────────────────────

const OFFERS = {
  essentia_plus: {
    id: 'essentia_plus', name: 'Essentia Plus', price: 249, color: '#C8A95A', badge: '⚡',
    features: ['Suivi nutrition personnalisé', 'Programme training sur mesure', 'Bilan hebdomadaire', 'Messages illimités', 'Accès app Ben&Fit'],
  },
  tutto_bene: {
    id: 'tutto_bene', name: 'Tutto Bene', price: 149, color: '#4A6FD4', badge: '🔥',
    features: ['Programme training sur mesure', 'Bilan mensuel', 'Messages inclus', 'Accès app Ben&Fit'],
  },
}

// ─── COULEURS POST-IT ─────────────────────────────────────────────────────────

const NOTE_COLORS = [
  { id: 'yellow', bg: '#FFF9C4', border: '#F9E64F' },
  { id: 'blue',   bg: '#DBEAFE', border: '#93C5FD' },
  { id: 'green',  bg: '#D1FAE5', border: '#6EE7B7' },
  { id: 'pink',   bg: '#FCE7F3', border: '#F9A8D4' },
  { id: 'orange', bg: '#FFEDD5', border: '#FED7AA' },
]

// ─── STYLES ───────────────────────────────────────────────────────────────────

const S = {
  navy: '#0D1B4E', gold: '#C8A95A', bg: '#F0F2F8', card: '#FFFFFF',
  border: '#E2E6F0', muted: '#6B7A99', green: '#3A8A5A', red: '#C45C3A',
  blue: '#2C64E5', gray: '#8B95A8', purple: '#7B6FAD',
}
const font  = "'DM Sans', system-ui, sans-serif"
const bebas = "'Bebas Neue', 'DM Sans', sans-serif"

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function complianceColor(v) {
  if (v >= 80) return S.green
  if (v >= 55) return '#C8A95A'
  return S.red
}

function daysAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Hier'
  return `Il y a ${diff}j`
}

function buildCalendar(year, month) {
  const first = new Date(year, month, 1).getDay()
  const days  = new Date(year, month + 1, 0).getDate()
  const start = first === 0 ? 6 : first - 1
  return Array.from({ length: start + days }, (_, i) => i < start ? null : i - start + 1)
}

function toClientModel(profile) {
  const nameRaw  = profile.full_name || profile.name || profile.email || 'Inconnu'
  const initials = nameRaw.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'
  return {
    id: profile.id, name: nameRaw, avatar: initials, email: profile.email || '',
    offer: profile.offer || 'tutto_bene', status: profile.status || 'actif',
    archived: profile.archived || false, archivedAt: profile.archived_at || null,
    since: profile.created_at ? profile.created_at.split('T')[0] : '',
    nextPayment: profile.next_payment || null, balance: profile.balance || 0,
    weight: profile.weight || null, weightGoal: profile.weight_goal || null,
    compliance: profile.compliance ?? 0, lastBilan: profile.last_bilan || null,
    program: profile.current_program || '—', messages: profile.unread_messages || 0,
    objective: profile.objective || '', height: profile.height || null,
    notes: profile.coach_notes || [],
    _raw: profile,
  }
}

// ─── BASE COMPONENTS ──────────────────────────────────────────────────────────

function Avatar({ initials, size = 36, color = S.navy, grayscale = false }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: grayscale ? '#AAB0BF' : color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: bebas, fontSize: size * 0.38, letterSpacing: 1, flexShrink: 0, opacity: grayscale ? 0.75 : 1 }}>
      {initials}
    </div>
  )
}

function KpiCard({ icon, label, value, sub, accent = S.navy, onClick }) {
  return (
    <div onClick={onClick} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: '16px 18px', cursor: onClick ? 'pointer' : 'default', flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: bebas, fontSize: 28, color: accent, letterSpacing: 1, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Badge({ text, color, bg }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: bg || `${color}18`, color, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
      {text}
    </span>
  )
}

function ProgressBar({ value, color, height = 5 }) {
  return (
    <div style={{ height, background: '#EEF0F8', borderRadius: 99, overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: '100%', background: color, borderRadius: 99 }} />
    </div>
  )
}

function NavBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ width: 26, height: 26, border: `1px solid ${S.border}`, borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.navy }}>
      {children}
    </button>
  )
}

// ─── POST-IT PANEL ────────────────────────────────────────────────────────────

function PostItPanel({ clientId, notes, onUpdate }) {
  const [adding, setAdding] = useState(false)
  const [text,   setText]   = useState('')
  const [color,  setColor]  = useState('yellow')
  const [saving, setSaving] = useState(false)

  const addNote = async () => {
    if (!text.trim()) return
    setSaving(true)
    const newNote = { id: Date.now(), text: text.trim(), color, createdAt: new Date().toISOString().split('T')[0] }
    const updated = [...(notes || []), newNote]
    try {
      await supabase.from('profiles').update({ coach_notes: updated }).eq('id', clientId)
      onUpdate(updated)
      setText(''); setAdding(false)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const deleteNote = async (id) => {
    const updated = (notes || []).filter(n => n.id !== id)
    await supabase.from('profiles').update({ coach_notes: updated }).eq('id', clientId)
    onUpdate(updated)
  }

  const nc = NOTE_COLORS.find(c => c.id === color) || NOTE_COLORS[0]

  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: bebas, fontSize: 14, color: S.navy, letterSpacing: 2 }}>📌 ANNOTATIONS</div>
        {!adding && (
          <button onClick={() => setAdding(true)} style={{ padding: '5px 12px', background: S.navy, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font }}>
            + Ajouter
          </button>
        )}
      </div>

      {adding && (
        <div style={{ marginBottom: 14, background: nc.bg, border: `1.5px solid ${nc.border}`, borderRadius: 10, padding: '12px 14px' }}>
          <textarea
            autoFocus value={text} onChange={e => setText(e.target.value)}
            placeholder="Ex : vacances 10-24 juillet, allergie gluten, reprend après blessure…"
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', border: 'none', background: 'transparent', fontSize: 13, fontFamily: font, color: S.navy, resize: 'none', outline: 'none', marginBottom: 10, lineHeight: 1.5 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {NOTE_COLORS.map(c => (
                <button key={c.id} onClick={() => setColor(c.id)}
                  style={{ width: 20, height: 20, borderRadius: '50%', background: c.bg, border: `2.5px solid ${color === c.id ? S.navy : c.border}`, cursor: 'pointer', padding: 0 }} />
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button onClick={() => { setAdding(false); setText('') }} style={{ padding: '5px 12px', background: 'transparent', color: S.muted, border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: font }}>Annuler</button>
              <button onClick={addNote} disabled={saving || !text.trim()} style={{ padding: '5px 12px', background: S.navy, color: 'white', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font, opacity: !text.trim() ? 0.5 : 1 }}>
                {saving ? '…' : '✓ Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(!notes || notes.length === 0) && !adding ? (
        <div style={{ fontSize: 12, color: S.muted, textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>
          Aucune annotation — ajoute des infos importantes ici (vacances, allergies, blessures…)
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(notes || []).map(note => {
            const nc = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0]
            return (
              <div key={note.id} style={{ background: nc.bg, border: `1px solid ${nc.border}`, borderRadius: 10, padding: '10px 12px', position: 'relative' }}>
                <div style={{ fontSize: 13, color: S.navy, lineHeight: 1.5, paddingRight: 24 }}>{note.text}</div>
                <div style={{ fontSize: 10, color: S.muted, marginTop: 6 }}>📅 {note.createdAt}</div>
                <button onClick={() => deleteNote(note.id)}
                  style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, border: 'none', background: 'rgba(0,0,0,0.08)', borderRadius: '50%', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.muted }}>
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

// ─── MODAL CRÉATION CLIENT ────────────────────────────────────────────────────

function CreateClientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', objective: '', height: '', current_program: '', offer: 'tutto_bene' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const inpC = { width: '100%', padding: '10px 12px', border: `1.5px solid ${S.border}`, borderRadius: 9, fontSize: 14, fontFamily: font, background: '#FAF9F7', outline: 'none', color: S.navy, boxSizing: 'border-box' }
  const lblC = { display: 'block', fontSize: 11, letterSpacing: '0.8px', textTransform: 'uppercase', color: S.muted, marginBottom: 5, fontWeight: 700 }

  const createClient = async () => {
    setError('')
    if (!form.email || !form.password) { setError('Email et mot de passe obligatoires.'); return }
    if (form.password.length < 6) { setError('Mot de passe : 6 caractères minimum.'); return }
    setCreating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(form),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erreur lors de la création')
      onCreated(toClientModel(result.profile))
      onClose()
    } catch (err) { setError(err.message) }
    finally { setCreating(false) }
  }

  return (
    <div onClick={(e) => e.target === e.currentTarget && !creating && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,78,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(13,27,78,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: bebas, fontSize: 22, color: S.navy, letterSpacing: 2, marginBottom: 20 }}>+ NOUVEL ÉLÈVE</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={lblC}>Email *</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="eleve@exemple.com" style={inpC} /></div>
          <div><label style={lblC}>Mot de passe provisoire *</label><input type="password" autoComplete="new-password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="6 caractères minimum" style={inpC} /></div>
          <div><label style={lblC}>Prénom / Nom</label><input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Camille Dupont" style={inpC} /></div>
          <div>
            <label style={lblC}>Offre</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.values(OFFERS).map(o => (
                <button key={o.id} onClick={() => setForm(p => ({ ...p, offer: o.id }))}
                  style={{ flex: 1, padding: '10px', border: `2px solid ${form.offer === o.id ? o.color : S.border}`, borderRadius: 10, background: form.offer === o.id ? `${o.color}12` : 'white', cursor: 'pointer', fontFamily: font }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{o.badge}</div>
                  <div style={{ fontWeight: 800, color: S.navy, fontSize: 13 }}>{o.name}</div>
                  <div style={{ fontSize: 12, color: S.muted }}>{o.price} €/m</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lblC}>Taille (cm)</label><input type="number" value={form.height} onChange={e => setForm(p => ({ ...p, height: e.target.value }))} placeholder="170" style={inpC} /></div>
            <div><label style={lblC}>Programme</label><input value={form.current_program} onChange={e => setForm(p => ({ ...p, current_program: e.target.value }))} placeholder="Phase 1" style={inpC} /></div>
          </div>
          <div><label style={lblC}>Objectif</label><input value={form.objective} onChange={e => setForm(p => ({ ...p, objective: e.target.value }))} placeholder="Prise de masse…" style={inpC} /></div>
          {error && <div style={{ background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 9, padding: '10px 12px', color: S.red, fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={createClient} disabled={creating} style={{ flex: 1, padding: '11px 20px', background: S.navy, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: creating ? 'default' : 'pointer', fontFamily: font, opacity: creating ? 0.7 : 1 }}>
              {creating ? 'Création…' : '✓ Créer le compte'}
            </button>
            <button onClick={() => !creating && onClose()} style={{ padding: '11px 20px', background: 'transparent', color: S.muted, border: `1.5px solid ${S.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>Annuler</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MODAL OFFRE ──────────────────────────────────────────────────────────────

function OfferModal({ client, onClose, onSave }) {
  const [form, setForm] = useState({ offer: client.offer, price: OFFERS[client.offer]?.price || 149, startDate: client.since, nextPayment: client.nextPayment || '', note: '' })
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,78,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'white', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 500, boxShadow: '0 24px 60px rgba(13,27,78,0.2)' }}>
        <div style={{ fontFamily: bebas, fontSize: 22, color: S.navy, letterSpacing: 2, marginBottom: 20 }}>MODIFIER L'OFFRE — {client.name.toUpperCase()}</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {Object.values(OFFERS).map((o) => (
            <button key={o.id} onClick={() => setForm((p) => ({ ...p, offer: o.id, price: o.price }))}
              style={{ flex: 1, padding: '12px 10px', border: `2px solid ${form.offer === o.id ? o.color : S.border}`, borderRadius: 12, background: form.offer === o.id ? `${o.color}12` : 'white', cursor: 'pointer', fontFamily: font }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{o.badge}</div>
              <div style={{ fontWeight: 800, color: S.navy, fontSize: 14 }}>{o.name}</div>
              <div style={{ fontSize: 13, color: S.muted }}>{o.price} €/mois</div>
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {[['Tarif mensuel (€)', 'price', 'number'], ['Début contrat', 'startDate', 'date'], ['Prochain paiement', 'nextPayment', 'date']].map(([lbl, key, type]) => (
            <div key={key}>
              <label style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: 4 }}>{lbl}</label>
              <input type={type} value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, fontFamily: font, outline: 'none' }} />
            </div>
          ))}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: 4 }}>Note interne</label>
            <textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} rows={2} placeholder="Ex : tarif fidélité, promo…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, fontFamily: font, outline: 'none', resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', border: `1px solid ${S.border}`, borderRadius: 9, background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: font }}>Annuler</button>
          <button onClick={() => { onSave(client.id, form); onClose() }}
            style={{ padding: '9px 18px', border: 'none', borderRadius: 9, background: S.navy, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: font }}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

// ─── MODAL ARCHIVAGE ──────────────────────────────────────────────────────────

function ArchiveModal({ client, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false)
  const confirm = async () => {
    setLoading(true)
    await onConfirm(client.id)
    setLoading(false)
    onClose()
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,27,78,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'white', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(13,27,78,0.2)' }}>
        <div style={{ fontFamily: bebas, fontSize: 22, color: S.navy, letterSpacing: 2, marginBottom: 12 }}>📦 ARCHIVER {client.name.toUpperCase()}</div>
        <div style={{ fontSize: 13, color: S.muted, lineHeight: 1.7, marginBottom: 24 }}>
          Le profil de <strong>{client.name}</strong> sera déplacé dans l'onglet <strong>Anciens clients</strong>.<br />
          Toutes ses données (programme, nutrition, bilans) sont <strong>conservées</strong>.<br />
          Tu pourras le réactiver à tout moment.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', border: `1px solid ${S.border}`, borderRadius: 9, background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: font }}>Annuler</button>
          <button onClick={confirm} disabled={loading}
            style={{ padding: '9px 20px', border: 'none', borderRadius: 9, background: S.purple, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: font, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Archivage…' : '📦 Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── VUE DÉTAIL CLIENT ────────────────────────────────────────────────────────

// ─── SUIVI POIDS / MENSURATIONS & DIÈTE (vue coach) ───────────────────────────

const COACH_MEASURE_FIELDS = [
  { key: 'weight', label: 'Poids',            unit: 'kg', icon: '⚖️', color: S.red,    required: true },
  { key: 'waist',  label: 'Tour de taille',   unit: 'cm', icon: '📏', color: S.blue },
  { key: 'hips',   label: 'Tour de hanches',  unit: 'cm', icon: '📏', color: S.green },
  { key: 'glutes', label: 'Tour de fesses',   unit: 'cm', icon: '📏', color: S.purple },
  { key: 'chest',  label: 'Tour de poitrine', unit: 'cm', icon: '📏', color: S.gold },
  { key: 'arm',    label: 'Tour de bras',     unit: 'cm', icon: '💪', color: S.green },
  { key: 'thigh',  label: 'Tour de cuisse',   unit: 'cm', icon: '📏', color: S.red },
  { key: 'calf',   label: 'Tour de mollet',   unit: 'cm', icon: '📏', color: S.blue },
]

const COACH_NUTRI_FIELDS = [
  { key: 'calories', label: 'Calories',  unit: 'kcal', icon: '🔥', color: S.red },
  { key: 'protein',  label: 'Protéines', unit: 'g',    icon: '🥩', color: S.green },
  { key: 'carbs',    label: 'Glucides',  unit: 'g',    icon: '🌾', color: S.gold },
  { key: 'fat',      label: 'Lipides',   unit: 'g',    icon: '🥑', color: S.blue },
]

function CoachMiniChart({ entries, field, fieldsMeta }) {
  const data = [...entries].filter(e => e[field] != null && e[field] !== 0).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-30)
  const meta = fieldsMeta.find(f => f.key === field)
  const color = meta?.color || S.blue
  if (data.length < 2) return (
    <div style={{ height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: S.border, gap: 8 }}>
      <div style={{ fontSize: 32 }}>📉</div>
      <div style={{ fontSize: 12, color: S.muted }}>Pas assez de données pour tracer une courbe (2 valeurs minimum)</div>
    </div>
  )
  const vals  = data.map(e => +e[field])
  const min   = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const W = 400, H = 140, PX = 12, PY = 14
  const pts      = data.map((e, i) => [PX + (i / (data.length - 1)) * (W - PX * 2), PY + ((max - +e[field]) / range) * (H - PY * 2 - 14)])
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const area     = `M${pts[0][0]},${H - 14} ` + pts.map(([x, y]) => `L${x},${y}`).join(' ') + ` L${pts[pts.length - 1][0]},${H - 14} Z`
  const delta    = (vals[vals.length - 1] - vals[0]).toFixed(field === 'weight' || field === 'waist' || field === 'hips' || field === 'chest' || field === 'arm' || field === 'thigh' || field === 'calf' || field === 'glutes' ? 1 : 0)
  const isPos    = parseFloat(delta) > 0
  const dColor   = field === 'weight' ? (isPos ? S.red : S.green) : (isPos ? S.gold : S.red)
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 140, overflow: 'visible' }}>
        <defs>
          <linearGradient id={`cg-${field}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0"    />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line key={i} x1={PX} y1={PY + t * (H - PY * 2 - 14)} x2={W - PX} y2={PY + t * (H - PY * 2 - 14)} stroke={S.border} strokeWidth="1" strokeDasharray="3,3" />
        ))}
        <path d={area} fill={`url(#cg-${field})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 5 : 3.5} fill="white" stroke={color} strokeWidth="2.5" />)}
        <text x={pts[0][0]}            y={H - 1} textAnchor="middle" fontSize="9" fill={S.muted}>{new Date(data[0].date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</text>
        <text x={pts[pts.length-1][0]} y={H - 1} textAnchor="middle" fontSize="9" fill={S.muted}>{new Date(data[data.length-1].date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</text>
        <text x={W - PX + 3} y={PY + 3}      fontSize="9" fill={color}  fontWeight="700">{max}</text>
        <text x={W - PX + 3} y={H - PY - 12} fontSize="9" fill={S.muted}>{min}</text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={{ fontSize: 11, color: S.muted }}>{data.length} valeurs · du {new Date(data[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au {new Date(data[data.length-1].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: dColor }}>{isPos ? '+' : ''}{delta} {meta?.unit} sur la période</div>
      </div>
    </div>
  )
}

function TrackerPanel({ title, icon, subtitle, entries, fields, defaultField, emptyLabel }) {
  const [subTab, setSubTab] = useState('list')
  const [field,  setField]  = useState(defaultField)
  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date))
  const availableFields = fields.filter(f => entries.some(e => e[f.key] != null))
  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: '18px 20px', gridColumn: '1/-1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontFamily: bebas, fontSize: 14, color: S.navy, letterSpacing: 2, marginBottom: 4 }}>{icon} {title}</div>
          <div style={{ fontSize: 12, color: S.muted }}>{subtitle}</div>
        </div>
      </div>
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', color: S.muted, padding: '24px 0', fontSize: 13 }}>{emptyLabel}</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 2, marginBottom: 14, borderBottom: `1px solid ${S.border}` }}>
            {[{ id: 'list', label: '📋 Historique' }, { id: 'curve', label: '📈 Courbe' }].map(t => (
              <button key={t.id} onClick={() => setSubTab(t.id)} style={{ padding: '7px 14px', border: 'none', background: 'transparent', fontFamily: font, fontSize: 12, fontWeight: subTab === t.id ? 700 : 500, cursor: 'pointer', color: subTab === t.id ? S.navy : S.muted, borderBottom: `2px solid ${subTab === t.id ? S.gold : 'transparent'}`, marginBottom: -1 }}>{t.label}</button>
            ))}
          </div>
          {subTab === 'list' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
              {sorted.map((e, i) => (
                <div key={e.id || e.date} style={{ background: i === 0 ? '#F8FAFF' : 'white', borderRadius: 11, padding: '10px 13px', border: i === 0 ? `1.5px solid ${S.border}` : `1px solid ${S.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: S.muted, fontFamily: "'DM Mono',monospace" }}>{new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {i === 0 && <span style={{ fontSize: 9, background: '#E8F0E8', color: S.green, padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>DERNIER</span>}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px' }}>
                    {fields.filter(f => e[f.key] != null).map(f => (
                      <div key={f.key} style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 10, color: S.muted }}>{f.icon} {f.label}</span>
                        <span style={{ fontWeight: 900, fontSize: 14, color: f.color }}>{e[f.key]}<span style={{ fontSize: 10, fontWeight: 400, color: S.muted }}> {f.unit}</span></span>
                      </div>
                    ))}
                    {(e.notes || e.note || e.comment) && <div style={{ width: '100%', fontSize: 11, color: S.muted, marginTop: 3, fontStyle: 'italic' }}>💬 {e.notes || e.note || e.comment}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {availableFields.map(f => (
                  <button key={f.key} onClick={() => setField(f.key)} style={{ padding: '5px 13px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: font, fontSize: 12, fontWeight: 700, background: field === f.key ? f.color : '#F0F2F8', color: field === f.key ? 'white' : S.muted }}>{f.icon} {f.label}</button>
                ))}
              </div>
              <div style={{ background: '#F8FAFF', borderRadius: 12, padding: '16px 14px' }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: S.navy, marginBottom: 12 }}>
                  {fields.find(f => f.key === field)?.icon} {fields.find(f => f.key === field)?.label} <span style={{ fontSize: 11, color: S.muted, fontWeight: 400 }}>({fields.find(f => f.key === field)?.unit})</span>
                </div>
                <CoachMiniChart entries={entries} field={field} fieldsMeta={fields} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ClientDetail({ client, onBack, onEditOffer, onNavigate, onArchive, onUnarchive, onNotesUpdate, measures = [], nutritionLogs = [], historyLoading = false }) {
  const offer = OFFERS[client.offer] || OFFERS['tutto_bene']
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ border: 'none', background: 'transparent', color: S.muted, cursor: 'pointer', fontSize: 20, padding: 0, display: 'flex' }}>←</button>
        <Avatar initials={client.avatar} size={48} color={offer.color} grayscale={client.archived} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: bebas, fontSize: 22, color: client.archived ? S.muted : S.navy, letterSpacing: 1 }}>{client.name.toUpperCase()}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge text={offer.name} color={client.archived ? S.gray : offer.color} />
            {client.archived
              ? <Badge text="Archivé" color={S.purple} bg="#EDE9F8" />
              : <Badge text={client.status} color={client.status === 'actif' ? S.green : S.red} />
            }
            {client.archivedAt && <span style={{ fontSize: 11, color: S.muted }}>le {new Date(client.archivedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
            {client.messages > 0 && <Badge text={`${client.messages} msg`} color={S.blue} />}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {client.archived ? (
            <button onClick={() => onUnarchive(client.id)}
              style={{ padding: '8px 16px', border: 'none', borderRadius: 9, background: S.green, color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: font }}>
              ♻️ Réactiver
            </button>
          ) : (
            <>
              <button onClick={() => onArchive(client)}
                style={{ padding: '8px 16px', border: `1px solid #C4B8E8`, borderRadius: 9, background: '#F3F0FC', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: S.purple, fontFamily: font }}>
                📦 Archiver
              </button>
              <button onClick={onEditOffer}
                style={{ padding: '8px 16px', border: `1px solid ${S.border}`, borderRadius: 9, background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: S.navy, fontFamily: font }}>
                ✏️ Modifier l'offre
              </button>
              <button onClick={() => onNavigate(client.id)}
                style={{ padding: '8px 16px', border: 'none', borderRadius: 9, background: S.navy, color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: font }}>
                Voir profil complet →
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <KpiCard icon="⚖️" label="Poids actuel" value={client.weight ? `${client.weight} kg` : '—'} sub={client.weightGoal ? `Objectif : ${client.weightGoal} kg` : 'Non renseigné'} accent={S.navy} />
        <KpiCard icon="📊" label="Compliance" value={`${client.compliance}%`} sub="7 derniers jours" accent={complianceColor(client.compliance)} />
        <KpiCard icon="📋" label="Dernier bilan" value={daysAgo(client.lastBilan)} sub={client.lastBilan || 'Jamais'} accent={S.navy} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* Financier */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontFamily: bebas, fontSize: 14, color: S.navy, letterSpacing: 2, marginBottom: 14 }}>FINANCIER</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[['Tarif', `${offer.price} €/m`], ['Solde', `${client.balance} €`], ['Prochain', client.nextPayment ? new Date(client.nextPayment).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—']].map(([lbl, val]) => (
              <div key={lbl} style={{ textAlign: 'center', background: '#F8FAFF', borderRadius: 10, padding: '10px 6px' }}>
                <div style={{ fontFamily: bebas, fontSize: 20, color: client.balance < 0 && lbl === 'Solde' ? S.red : S.navy }}>{val}</div>
                <div style={{ fontSize: 10, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{lbl}</div>
              </div>
            ))}
          </div>
          {client.balance < 0 && (
            <div style={{ padding: '8px 12px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #F3C4C4', fontSize: 12, color: S.red, fontWeight: 600 }}>
              ⚠️ Retard de paiement : {Math.abs(client.balance)} €
            </div>
          )}
        </div>
        {/* Programme */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontFamily: bebas, fontSize: 14, color: S.navy, letterSpacing: 2, marginBottom: 14 }}>PROGRAMME ACTIF</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: S.navy, marginBottom: 8 }}>{client.program}</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: S.muted }}>Compliance semaine</span>
              <span style={{ fontWeight: 700, color: complianceColor(client.compliance) }}>{client.compliance}%</span>
            </div>
            <ProgressBar value={client.compliance} color={complianceColor(client.compliance)} height={7} />
          </div>
          {client.since && <div style={{ fontSize: 12, color: S.muted }}>Depuis le {new Date(client.since).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
          {client.objective && <div style={{ fontSize: 12, color: S.muted, marginTop: 4 }}>🎯 {client.objective}</div>}
        </div>
        {/* Offre */}
        <div style={{ background: `${offer.color}0E`, border: `1.5px solid ${offer.color}44`, borderRadius: 14, padding: '18px 20px', gridColumn: '1/-1' }}>
          <div style={{ fontFamily: bebas, fontSize: 14, color: S.navy, letterSpacing: 2, marginBottom: 14 }}>OFFRE SOUSCRITE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>{offer.badge}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: S.navy }}>{offer.name}</div>
              <div style={{ fontFamily: bebas, fontSize: 20, color: offer.color }}>{offer.price} €<span style={{ fontSize: 12, fontWeight: 400, color: S.muted }}>/mois</span></div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 20px' }}>
            {offer.features.map((f) => (
              <div key={f} style={{ fontSize: 12, color: S.navy, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: offer.color, fontWeight: 800 }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Suivi poids / mensurations & diète */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 12 }}>
        {historyLoading ? (
          <div style={{ textAlign: 'center', color: S.muted, padding: '20px 0', fontSize: 13 }}>Chargement de l'historique…</div>
        ) : (
          <>
            <TrackerPanel
              title="Suivi poids & mensurations" icon="⚖️"
              subtitle="Historique des valeurs entrées par le client, avec date, et courbe d'évolution."
              entries={measures} fields={COACH_MEASURE_FIELDS} defaultField="weight"
              emptyLabel="Aucune mesure enregistrée par ce client pour le moment."
            />
            <TrackerPanel
              title="Suivi diète" icon="🥗"
              subtitle="Historique des macros renseignées par le client, avec date, et courbe d'évolution."
              entries={nutritionLogs} fields={COACH_NUTRI_FIELDS} defaultField="calories"
              emptyLabel="Aucune valeur de diète enregistrée par ce client pour le moment."
            />
          </>
        )}
      </div>

      {/* Post-it */}
      <PostItPanel clientId={client.id} notes={client.notes} onUpdate={(updated) => onNotesUpdate(client.id, updated)} />
    </div>
  )
}

// ─── CALENDRIER ───────────────────────────────────────────────────────────────

function CalendarPanel({ sessions }) {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year,  setYear]  = useState(today.getFullYear())
  const days = buildCalendar(year, month)
  const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  const DAYS_FR   = ['L','M','M','J','V','S','D']
  const sessionMap = {}
  sessions.forEach((s) => { if (!sessionMap[s.date]) sessionMap[s.date] = []; sessionMap[s.date].push(s) })
  const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: bebas, fontSize: 16, color: S.navy, letterSpacing: 2 }}>{MONTHS_FR[month].toUpperCase()} {year}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <NavBtn onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }}>‹</NavBtn>
          <NavBtn onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }}>›</NavBtn>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS_FR.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: '0.5px', padding: '2px 0', textTransform: 'uppercase' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {days.map((d, i) => {
          if (!d) return <div key={i} />
          const ds  = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          const ses = sessionMap[ds] || []
          const isT = ds === todayStr
          return (
            <div key={i} style={{ borderRadius: 7, padding: '4px 2px', minHeight: 36, background: isT ? S.navy : 'transparent' }}>
              <div style={{ textAlign: 'center', fontSize: 11, fontWeight: isT ? 700 : 500, color: isT ? 'white' : S.navy, marginBottom: 2 }}>{d}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {ses.map((s, j) => <div key={j} title={`${s.client} — ${s.type}`} style={{ width: 6, height: 6, borderRadius: '50%', background: isT ? 'white' : s.color }} />)}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ borderTop: `1px solid ${S.border}`, marginTop: 14, paddingTop: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Prochains suivis</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {sessions.filter(s => s.date >= todayStr).slice(0, 3).map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#F8FAFF', borderRadius: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: S.navy }}>{s.client}</div>
              <Badge text={s.type} color={s.color} />
              <div style={{ fontSize: 10, color: S.muted }}>{new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</div>
            </div>
          ))}
          {sessions.filter(s => s.date >= todayStr).length === 0 && (
            <div style={{ fontSize: 12, color: S.muted, textAlign: 'center', padding: '8px 0' }}>Aucun suivi à venir</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────

export default function CoachDashboard() {
  const router = useRouter()
  const { toast, showToast } = useToast()
  const [user,            setUser]            = useState(null)
  const [clients,         setClients]         = useState([])
  const [sessions,        setSessions]        = useState([])
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState(null)
  const [selected,        setSelected]        = useState(null)
  const [editingOffer,    setEditingOffer]    = useState(null)
  const [archivingClient, setArchivingClient] = useState(null)
  const [activeTab,       setActiveTab]       = useState('clients')
  const [clientSubTab,    setClientSubTab]    = useState('actifs')
  const [showCreate,      setShowCreate]      = useState(false)
  const [isMobile,        setIsMobile]        = useState(false)
  const [clientMeasures,  setClientMeasures]  = useState([])
  const [clientNutrition, setClientNutrition] = useState([])
  const [historyLoading,  setHistoryLoading]  = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 980)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const currentUser = data.session?.user
        if (!currentUser) { router.push('/login'); return }
        setUser(currentUser)
        await loadData(currentUser.id)
      } catch (err) { setError(err.message) }
      finally { setLoading(false) }
    }
    init()
  }, [])

  const loadData = async (coachId) => {
    try {
      const { data: profiles, error: profErr } = await supabase.from('profiles').select('*').eq('role', 'client').eq('coach_id', coachId)
      if (profErr) {
        const { data: fallback, error: err2 } = await supabase.from('profiles').select('*').eq('role', 'client')
        if (err2) throw err2
        setClients((fallback || []).map(toClientModel))
      } else {
        setClients((profiles || []).map(toClientModel))
      }
      const { data: sess } = await supabase.from('workout_sessions').select('*')
        .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
      if (sess && sess.length > 0) {
        setSessions(sess.map(s => ({ date: s.date, client: s.client_name || s.client_id, type: s.type || 'Suivi', color: S.gold })))
      }
    } catch (err) { setError(err.message) }
  }

  useEffect(() => {
    const loadHistory = async () => {
      if (!selected) { setClientMeasures([]); setClientNutrition([]); return }
      setHistoryLoading(true)
      try {
        const [{ data: m }, { data: n }] = await Promise.all([
          supabase.from('measures').select('*').eq('client_id', selected).order('date', { ascending: false }).limit(200),
          supabase.from('nutrition_logs').select('*').eq('client_id', selected).order('date', { ascending: false }).limit(200),
        ])
        setClientMeasures(m || [])
        setClientNutrition(n || [])
      } catch (err) {
        console.error('Erreur chargement historique client:', err)
        setClientMeasures([]); setClientNutrition([])
      } finally {
        setHistoryLoading(false)
      }
    }
    loadHistory()
  }, [selected])

  const archiveClient = async (clientId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/archive-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ client_id: clientId, archived: true }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      const archivedAt = new Date().toISOString()
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, archived: true, archivedAt } : c))
      setSelected(null)
      showToast('Client archivé', 'success')
    } catch (err) {
      console.error('Erreur archivage:', err)
      showToast('Erreur archivage : ' + err.message, 'error')
    }
  }

  const unarchiveClient = async (clientId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/archive-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ client_id: clientId, archived: false }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, archived: false, archivedAt: null } : c))
      setSelected(null); setClientSubTab('actifs')
      showToast('Client réactivé', 'success')
    } catch (err) {
      console.error('Erreur réactivation:', err)
      showToast('Erreur réactivation : ' + err.message, 'error')
    }
  }

  const handleNotesUpdate = (clientId, updatedNotes) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, notes: updatedNotes } : c))
  }

  const handleSaveOffer = async (clientId, form) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, offer: form.offer, since: form.startDate, nextPayment: form.nextPayment } : c))
    try { await supabase.from('profiles').update({ offer: form.offer, next_payment: form.nextPayment || null }).eq('id', clientId) }
    catch (err) { console.error('Erreur mise à jour offre:', err) }
  }

  const activeClients   = clients.filter(c => !c.archived && c.status === 'actif')
  const archivedClients = clients.filter(c => c.archived)
  const mrr             = activeClients.reduce((s, c) => s + (OFFERS[c.offer]?.price || 0), 0)
  const avgCompliance   = Math.round(activeClients.reduce((s, c) => s + c.compliance, 0) / (activeClients.length || 1))
  const pendingPayment  = clients.filter(c => !c.archived && c.balance < 0).length
  const pendingMsg      = clients.reduce((s, c) => s + c.messages, 0)
  const selectedClient  = selected ? clients.find(c => c.id === selected) : null
  const displayedClients = clientSubTab === 'archives' ? archivedClients : clients.filter(c => !c.archived)

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: S.bg, fontFamily: font }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${S.border}`, borderTopColor: S.gold, animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ fontSize: 13, color: S.muted, letterSpacing: '1px', textTransform: 'uppercase' }}>Chargement</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: S.bg, fontFamily: font }}>
      <div style={{ textAlign: 'center', padding: 40, background: 'white', borderRadius: 20, border: '1px solid #FECACA', maxWidth: 500 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontFamily: bebas, fontSize: 20, color: S.navy, marginBottom: 8 }}>ERREUR DE CHARGEMENT</div>
        <div style={{ fontSize: 13, color: S.muted, marginBottom: 16 }}>{error}</div>
        <button onClick={() => user && loadData(user.id)} style={{ padding: '10px 24px', background: S.navy, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontFamily: font, fontWeight: 700 }}>🔄 Réessayer</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: font, color: S.navy }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>
      {toast && <Toast toast={toast} />}
      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* ── SIDEBAR ── */}
        {!isMobile && (
          <div style={{ width: 220, background: S.navy, display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
            <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontFamily: bebas, fontSize: 26, color: S.gold, letterSpacing: 3 }}>BEN&FIT</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '1px', textTransform: 'uppercase' }}>Dashboard Coach</div>
            </div>
            <nav style={{ padding: '16px 10px', flex: 1 }}>
              {[
                { id: 'clients',  icon: '👥', label: 'Clients' },
                { id: 'offres',   icon: '📦', label: 'Offres' },
                { id: 'calendar', icon: '📅', label: 'Calendrier' },
                { id: 'finances', icon: '💳', label: 'Finances' },
              ].map((item) => (
                <button key={item.id} onClick={() => { setActiveTab(item.id); setSelected(null) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: activeTab === item.id ? 'rgba(200,169,90,0.15)' : 'transparent', color: activeTab === item.id ? S.gold : 'rgba(255,255,255,0.6)', fontFamily: font, fontSize: 13, fontWeight: activeTab === item.id ? 700 : 500, marginBottom: 2, transition: 'all 0.15s' }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
                </button>
              ))}
              <button onClick={() => setShowCreate(true)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${S.gold}44`, cursor: 'pointer', background: `${S.gold}15`, color: S.gold, fontFamily: font, fontSize: 13, fontWeight: 700, marginTop: 12 }}>
                + Nouvel élève
              </button>
            </nav>
            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar initials={user?.email?.[0]?.toUpperCase() + (user?.email?.[1]?.toUpperCase() || '') || 'CO'} size={34} color={S.gold} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Coach</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{user?.email}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MAIN ── */}
        <div style={{ flex: 1, padding: isMobile ? '16px' : '28px', overflowY: 'auto' }}>

          {/* Nav mobile */}
          {isMobile && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
              {[{ id: 'clients', icon: '👥' }, { id: 'offres', icon: '📦' }, { id: 'calendar', icon: '📅' }, { id: 'finances', icon: '💳' }].map(item => (
                <button key={item.id} onClick={() => { setActiveTab(item.id); setSelected(null) }}
                  style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: activeTab === item.id ? S.navy : S.card, color: activeTab === item.id ? S.gold : S.muted, fontFamily: font, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {item.icon}
                </button>
              ))}
            </div>
          )}

          {/* KPI Row */}
          {!selectedClient && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
              <KpiCard icon="👥" label="Clients actifs"       value={activeClients.length}   sub={`${archivedClients.length} archivé(s)`} />
              <KpiCard icon="💰" label="MRR"                  value={`${mrr} €`}             sub="Revenus mensuels" accent={S.gold} />
              <KpiCard icon="📊" label="Compliance moy."      value={`${avgCompliance}%`}    sub="7 derniers jours" accent={complianceColor(avgCompliance)} />
              <KpiCard icon="⚠️" label="Paiements en attente" value={pendingPayment}          sub="clients en retard" accent={pendingPayment > 0 ? S.red : S.green} />
              {pendingMsg > 0 && <KpiCard icon="💬" label="Messages" value={pendingMsg} sub="non lus" accent={S.blue} />}
            </div>
          )}

          {/* ── VUE DÉTAIL CLIENT ── */}
          {(activeTab === 'clients' || activeTab === 'calendar') && selectedClient ? (
            <ClientDetail
              client={selectedClient}
              onBack={() => setSelected(null)}
              onEditOffer={() => setEditingOffer(selectedClient)}
              onNavigate={(id) => router.push(`/coach/${id}?tab=overview`)}
              onArchive={(c) => setArchivingClient(c)}
              onUnarchive={unarchiveClient}
              onNotesUpdate={handleNotesUpdate}
              measures={clientMeasures}
              nutritionLogs={clientNutrition}
              historyLoading={historyLoading}
            />

          /* ── VUE CLIENTS ── */
          ) : activeTab === 'clients' ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: 16 }}>
              <div>
                {/* Sous-onglets Actifs / Anciens clients */}
                <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: `2px solid ${S.border}` }}>
                  {[
                    { id: 'actifs',   label: `Actifs (${clients.filter(c => !c.archived).length})`,      color: S.navy },
                    { id: 'archives', label: `Anciens clients (${archivedClients.length})`,               color: S.purple },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => { setClientSubTab(tab.id); setSelected(null) }}
                      style={{ padding: '8px 18px', border: 'none', background: 'transparent', fontFamily: font, fontSize: 13, fontWeight: clientSubTab === tab.id ? 700 : 500, cursor: 'pointer', color: clientSubTab === tab.id ? tab.color : S.muted, borderBottom: `2px solid ${clientSubTab === tab.id ? tab.color : 'transparent'}`, marginBottom: -2, transition: 'all 0.15s' }}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Bandeau info archives */}
                {clientSubTab === 'archives' && archivedClients.length > 0 && (
                  <div style={{ background: '#F3F0FC', border: `1px solid #C4B8E8`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: S.purple }}>
                    📦 Ces clients sont archivés. Leurs données sont conservées. Clique sur un client pour le réactiver.
                  </div>
                )}

                {displayedClients.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 20, border: `2px dashed ${S.border}` }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>{clientSubTab === 'archives' ? '📦' : '🏋️'}</div>
                    <div style={{ fontFamily: bebas, fontSize: 20, color: S.navy, marginBottom: 8 }}>
                      {clientSubTab === 'archives' ? 'AUCUN ANCIEN CLIENT' : 'AUCUN ÉLÈVE'}
                    </div>
                    <div style={{ fontSize: 13, color: S.muted, marginBottom: 16 }}>
                      {clientSubTab === 'archives' ? 'Les clients archivés apparaîtront ici.' : 'Crée ton premier élève pour commencer.'}
                    </div>
                    {clientSubTab === 'actifs' && (
                      <button onClick={() => setShowCreate(true)} style={{ padding: '10px 22px', background: S.navy, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font }}>+ Nouvel élève</button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {displayedClients.map((c) => {
                      const offer    = OFFERS[c.offer] || OFFERS['tutto_bene']
                      const archived = c.archived
                      return (
                        <div key={c.id} onClick={() => setSelected(c.id)}
                          style={{ background: archived ? '#F7F6FB' : S.card, border: `1px solid ${archived ? '#D8D2EE' : S.border}`, borderRadius: 14, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'box-shadow 0.15s', opacity: archived ? 0.85 : 1 }}
                          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(13,27,78,0.1)')}
                          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}>
                          <Avatar initials={c.avatar} size={42} color={offer.color} grayscale={archived} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                              <div style={{ fontWeight: 800, fontSize: 14, color: archived ? S.muted : S.navy }}>{c.name}</div>
                              <Badge text={offer.name} color={archived ? S.gray : offer.color} />
                              {archived
                                ? <Badge text="Archivé" color={S.purple} bg="#EDE9F8" />
                                : c.status !== 'actif' && <Badge text="inactif" color={S.red} />
                              }
                              {c.messages > 0 && <Badge text={`${c.messages} msg`} color={S.blue} />}
                              {c.notes && c.notes.length > 0 && <span title={`${c.notes.length} annotation(s)`} style={{ fontSize: 12 }}>📌</span>}
                            </div>
                            {archived && c.archivedAt ? (
                              <div style={{ fontSize: 11, color: S.purple }}>
                                Archivé le {new Date(c.archivedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ flex: 1, maxWidth: 120 }}><ProgressBar value={c.compliance} color={complianceColor(c.compliance)} height={4} /></div>
                                <span style={{ fontSize: 11, color: complianceColor(c.compliance), fontWeight: 700 }}>{c.compliance}%</span>
                                <span style={{ fontSize: 11, color: S.muted }}>· {c.program}</span>
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: bebas, fontSize: 18, color: c.balance < 0 ? S.red : archived ? S.muted : S.navy }}>{c.balance === 0 ? (archived ? '—' : '✓') : `${c.balance} €`}</div>
                            <div style={{ fontSize: 10, color: S.muted }}>{daysAgo(c.lastBilan)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <CalendarPanel sessions={sessions} />
            </div>

          /* ── VUE OFFRES ── */
          ) : activeTab === 'offres' ? (
            <div>
              <div style={{ fontFamily: bebas, fontSize: 18, color: S.navy, letterSpacing: 2, marginBottom: 20 }}>MES OFFRES</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 28 }}>
                {Object.values(OFFERS).map((offer) => {
                  const count = clients.filter(c => !c.archived && c.offer === offer.id && c.status === 'actif').length
                  return (
                    <div key={offer.id} style={{ background: S.card, border: `2px solid ${offer.color}44`, borderRadius: 18, padding: '24px 28px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                          <div style={{ fontSize: 24, marginBottom: 6 }}>{offer.badge}</div>
                          <div style={{ fontFamily: bebas, fontSize: 24, color: S.navy, letterSpacing: 2 }}>{offer.name.toUpperCase()}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: bebas, fontSize: 32, color: offer.color, letterSpacing: 1 }}>{offer.price} €</div>
                          <div style={{ fontSize: 11, color: S.muted }}>par mois</div>
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        {offer.features.map(f => (
                          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${S.border}`, fontSize: 13 }}>
                            <span style={{ color: offer.color, fontWeight: 800 }}>✓</span>{f}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: `${offer.color}10`, borderRadius: 10 }}>
                        <span style={{ fontSize: 12, color: S.muted }}>Clients actifs sur cette offre</span>
                        <span style={{ fontFamily: bebas, fontSize: 22, color: offer.color }}>{count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ fontFamily: bebas, fontSize: 14, color: S.navy, letterSpacing: 2, marginBottom: 12 }}>RÉPARTITION</div>
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', background: '#F8FAFF', padding: '10px 18px', fontSize: 10, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: `1px solid ${S.border}` }}>
                  <span>Client</span><span>Offre</span><span>Tarif</span><span>Statut</span>
                </div>
                {clients.filter(c => !c.archived).map(c => {
                  const offer = OFFERS[c.offer] || OFFERS['tutto_bene']
                  return (
                    <div key={c.id} onClick={() => { setSelected(c.id); setActiveTab('clients') }}
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '12px 18px', borderBottom: `1px solid ${S.border}`, alignItems: 'center', cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFF')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar initials={c.avatar} size={28} color={offer.color} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                      </div>
                      <Badge text={offer.name} color={offer.color} />
                      <div style={{ fontFamily: bebas, fontSize: 16, color: S.navy }}>{offer.price} €</div>
                      <Badge text={c.status} color={c.status === 'actif' ? S.green : S.red} />
                    </div>
                  )
                })}
              </div>
            </div>

          /* ── VUE CALENDRIER ── */
          ) : activeTab === 'calendar' ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '320px 1fr', gap: 16 }}>
              <CalendarPanel sessions={sessions} />
              <div>
                <div style={{ fontFamily: bebas, fontSize: 18, color: S.navy, letterSpacing: 2, marginBottom: 14 }}>TOUS LES SUIVIS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sessions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: 14, border: `1px solid ${S.border}`, color: S.muted, fontSize: 13 }}>
                      Aucune session enregistrée ce mois-ci.
                    </div>
                  ) : sessions.map((s, i) => (
                    <div key={i} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 4, height: 36, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: S.navy }}>{s.client}</div>
                        <Badge text={s.type} color={s.color} />
                      </div>
                      <div style={{ fontSize: 12, color: S.muted }}>{new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          /* ── VUE FINANCES ── */
          ) : activeTab === 'finances' ? (
            <div>
              <div style={{ fontFamily: bebas, fontSize: 18, color: S.navy, letterSpacing: 2, marginBottom: 20 }}>FINANCES</div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <KpiCard icon="💰" label="MRR total"          value={`${mrr} €`}                                                          sub="Clients actifs"  accent={S.gold} />
                <KpiCard icon="✅" label="Paiements à jour"    value={clients.filter(c => !c.archived && c.balance === 0).length}          sub="clients"         accent={S.green} />
                <KpiCard icon="⚠️" label="Retards"             value={clients.filter(c => !c.archived && c.balance < 0).length}           sub="clients"         accent={pendingPayment > 0 ? S.red : S.green} />
                <KpiCard icon="📈" label="ARR estimé"          value={`${mrr * 12} €`}                                                    sub="Revenus annuels" accent={S.navy} />
              </div>
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', background: '#F8FAFF', padding: '10px 18px', fontSize: 10, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: `1px solid ${S.border}` }}>
                  <span>Client</span><span>Offre</span><span>Tarif / mois</span><span>Solde</span><span>Prochain paiement</span>
                </div>
                {clients.filter(c => !c.archived).map(c => {
                  const offer = OFFERS[c.offer] || OFFERS['tutto_bene']
                  return (
                    <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', padding: '13px 18px', borderBottom: `1px solid ${S.border}`, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar initials={c.avatar} size={30} color={c.status === 'actif' ? offer.color : '#CCC'} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                          <Badge text={c.status} color={c.status === 'actif' ? S.green : S.red} />
                        </div>
                      </div>
                      <Badge text={offer.name} color={offer.color} />
                      <div style={{ fontFamily: bebas, fontSize: 18, color: S.navy }}>{c.status === 'actif' ? `${offer.price} €` : '—'}</div>
                      <div style={{ fontFamily: bebas, fontSize: 18, color: c.balance < 0 ? S.red : S.green }}>{c.balance < 0 ? `${c.balance} €` : '✓'}</div>
                      <div style={{ fontSize: 12, color: S.muted }}>{c.nextPayment ? new Date(c.nextPayment).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}</div>
                    </div>
                  )
                })}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', padding: '13px 18px', background: '#F8FAFF', borderTop: `2px solid ${S.border}` }}>
                  <div style={{ fontWeight: 700, color: S.navy }}>Total</div>
                  <div /><div style={{ fontFamily: bebas, fontSize: 20, color: S.gold }}>{mrr} €</div>
                  <div style={{ fontFamily: bebas, fontSize: 20, color: S.red }}>{clients.filter(c => !c.archived && c.balance < 0).reduce((s, c) => s + c.balance, 0)} €</div>
                  <div />
                </div>
              </div>
            </div>
          ) : null}

        </div>
      </div>

      {/* ── MODALS ── */}
      {showCreate && (
        <CreateClientModal onClose={() => setShowCreate(false)} onCreated={(nc) => setClients(prev => [nc, ...prev])} />
      )}
      {editingOffer && (
        <OfferModal client={editingOffer} onClose={() => setEditingOffer(null)} onSave={handleSaveOffer} />
      )}
      {archivingClient && (
        <ArchiveModal client={archivingClient} onClose={() => setArchivingClient(null)} onConfirm={archiveClient} />
      )}
    </div>
  )
}
