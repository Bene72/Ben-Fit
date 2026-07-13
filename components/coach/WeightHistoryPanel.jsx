import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { btn, inp, lbl } from '../../lib/coachShared'
import WeightHistoryChart from '../ui/WeightHistoryChart'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

/**
 * Sous-menu "historique du poids" affiché sous la carte Dernier poids de
 * OverviewTab. Permet au coach d'ajouter/modifier/supprimer une pesée pour
 * le client affiché, et affiche la courbe + la liste complète.
 *
 * Nécessite la policy RLS "measures_coach_manage" (voir
 * supabase/migrations/2026-07-12_coach-weight-management.sql) — sans elle,
 * les écritures échoueront silencieusement (RLS refuse, Supabase renvoie une
 * erreur récupérée dans `error` ci-dessous).
 */
export default function WeightHistoryPanel({ clientId, measures, onChange }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: todayStr(), weight: '' })
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState({ date: '', weight: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  const sorted = [...measures].sort((a, b) => new Date(b.date) - new Date(a.date))

  const addMeasure = async () => {
    if (!form.weight || Number.isNaN(Number(form.weight))) {
      setError('Poids invalide')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('measures')
        .insert({ client_id: clientId, date: form.date, weight: Number(form.weight) })
        .select()
        .single()
      if (err) throw err
      onChange([...measures, data])
      setForm({ date: todayStr(), weight: '' })
      setShowForm(false)
    } catch (e) {
      setError(e.message || "Impossible d'ajouter la pesée")
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (m) => {
    setEditingId(m.id)
    setEditValue({ date: m.date, weight: String(m.weight) })
  }

  const saveEdit = async (id) => {
    if (!editValue.weight || Number.isNaN(Number(editValue.weight))) {
      setError('Poids invalide')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('measures')
        .update({ date: editValue.date, weight: Number(editValue.weight) })
        .eq('id', id)
        .select()
        .single()
      if (err) throw err
      onChange(measures.map((m) => (m.id === id ? data : m)))
      setEditingId(null)
    } catch (e) {
      setError(e.message || 'Impossible de modifier cette pesée')
    } finally {
      setSaving(false)
    }
  }

  const deleteMeasure = async (id) => {
    setDeletingId(id)
    setError('')
    try {
      const { error: err } = await supabase.from('measures').delete().eq('id', id)
      if (err) throw err
      onChange(measures.filter((m) => m.id !== id))
    } catch (e) {
      setError(e.message || 'Impossible de supprimer cette pesée')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid var(--border)',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
        }}
      >
        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--navy)' }}>
          ⚖️ Historique du poids
        </div>
        <button onClick={() => setShowForm(!showForm)} style={btn('var(--navy)', 'white')}>
          {showForm ? 'Annuler' : '+ Ajouter une pesée'}
        </button>
      </div>

      {error && (
        <div
          style={{
            background: 'var(--danger-bg, #FEF0EB)',
            color: 'var(--danger)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '12px',
          }}
        >
          {error}
        </div>
      )}

      {showForm && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: '10px',
            alignItems: 'end',
            marginBottom: '16px',
            padding: '12px',
            background: 'var(--bg, #FAF9F7)',
            borderRadius: '8px',
          }}
        >
          <div>
            <label style={lbl}>Date</label>
            <input
              type="date"
              value={form.date}
              max={todayStr()}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              style={inp}
            />
          </div>
          <div>
            <label style={lbl}>Poids (kg)</label>
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={form.weight}
              onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
              placeholder="Ex: 71.2"
              style={inp}
            />
          </div>
          <button
            onClick={addMeasure}
            disabled={saving}
            style={btn(saving ? '#CCCCCC' : 'var(--success)', 'white')}
          >
            {saving ? '...' : '✓ Enregistrer'}
          </button>
        </div>
      )}

      <WeightHistoryChart measures={measures} />

      {sorted.length > 0 && (
        <div style={{ marginTop: '16px', maxHeight: '260px', overflowY: 'auto' }}>
          {sorted.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 4px',
                borderBottom: '1px solid var(--border-soft, #F0EDE6)',
                fontSize: '13px',
              }}
            >
              {editingId === m.id ? (
                <>
                  <input
                    type="date"
                    value={editValue.date}
                    max={todayStr()}
                    onChange={(e) => setEditValue((p) => ({ ...p, date: e.target.value }))}
                    style={{ ...inp, width: '130px' }}
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={editValue.weight}
                    onChange={(e) => setEditValue((p) => ({ ...p, weight: e.target.value }))}
                    style={{ ...inp, width: '80px' }}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => saveEdit(m.id)}
                      disabled={saving}
                      style={btn('var(--success)', 'white', null, '12px')}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={btn('transparent', 'var(--text-soft)', 'var(--border)', '12px')}
                    >
                      ✕
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span style={{ color: 'var(--text-soft)' }}>
                    {new Date(m.date).toLocaleDateString('fr-FR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span style={{ fontWeight: '700', color: 'var(--navy)' }}>{m.weight} kg</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => startEdit(m)}
                      style={btn('transparent', 'var(--navy)', 'var(--border)', '12px')}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteMeasure(m.id)}
                      disabled={deletingId === m.id}
                      style={btn('transparent', 'var(--danger)', 'var(--border)', '12px')}
                    >
                      {deletingId === m.id ? '...' : '🗑️'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {sorted.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: 'var(--text-faint)',
            fontSize: '13px',
            padding: '16px',
          }}
        >
          Aucune pesée enregistrée pour ce client.
        </div>
      )}
    </div>
  )
}
