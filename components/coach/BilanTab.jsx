/**
 * BilanTab — bilans hebdomadaires du client côté coach
 * Extrait de coach.js — logique strictement identique.
 */
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { BILAN_ITEMS, getMondayOfWeek, getWeekLabel } from '../../lib/coachShared'

function BilanTab({ clientId, clientName, coachId }) {
  const [bilans, setBilans] = useState([])
  const [loading, setLoading] = useState(true)
  const [openBilan, setOpenBilan] = useState(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    load()
  }, [clientId])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('bilans')
      .select('*')
      .eq('client_id', clientId)
      .order('week_start', { ascending: false })
    setBilans(data || [])
    setLoading(false)
  }

  const createBilan = async () => {
    setCreating(true)
    const weekStart = getMondayOfWeek()
    const exists = bilans.find(b => b.week_start === weekStart)
    if (exists) { setOpenBilan(exists.id); setEditForm(exists); setCreating(false); return }
    const { data } = await supabase
      .from('bilans')
      .insert({ client_id: clientId, coach_id: coachId, week_start: weekStart })
      .select().single()
    if (data) { setBilans(prev => [data, ...prev]); setOpenBilan(data.id); setEditForm(data) }
    setCreating(false)
  }

  const saveBilan = async () => {
    setSaving(true)
    await supabase.from('bilans').update(editForm).eq('id', openBilan)
    setBilans(prev => prev.map(b => b.id === openBilan ? { ...b, ...editForm } : b))
    setSaving(false)
  }

  const toggleArchive = async (bilanId, archived, e) => {
    e.stopPropagation()
    await supabase.from('bilans').update({ archived }).eq('id', bilanId)
    setBilans(prev => prev.map(b => b.id === bilanId ? { ...b, archived } : b))
    if (archived && openBilan === bilanId) setOpenBilan(null)
  }

  if (loading) return <div style={{ color: 'var(--chalk-dim)', textAlign: 'center', padding: '40px' }}>Chargement…</div>

  const currentBilan = bilans.find(b => b.id === openBilan)
  const archivedCount = bilans.filter(b => b.archived).length
  const visibleBilans = bilans.filter(b => showArchived ? b.archived : !b.archived)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '20px', color: 'var(--chalk)', letterSpacing: '2px' }}>
          BILANS HEBDOMADAIRES — {clientName?.split(' ')[0]?.toUpperCase()}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => window.open('/agent-bilan?clientId=' + clientId + '&clientName=' + encodeURIComponent(clientName), '_blank')} style={{ padding: '8px 18px', background: 'var(--rx)', color: '#16110D', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            🤖 Aide IA bilan
          </button>
          <button onClick={createBilan} disabled={creating} style={{ padding: '8px 18px', background: 'var(--accent)', color: '#16110D', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            {creating ? '…' : '+ Bilan cette semaine'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: '16px', borderBottom: '2px solid var(--accent-brd)' }}>
        {[
          { id: 'actifs', label: `Actifs (${bilans.length - archivedCount})`, value: false },
          { id: 'archives', label: `Archivés (${archivedCount})`, value: true },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setShowArchived(tab.value)}
            style={{
              padding: '7px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '12.5px',
              fontWeight: showArchived === tab.value ? 700 : 500,
              cursor: 'pointer',
              color: showArchived === tab.value ? 'var(--chalk)' : 'var(--chalk-dim)',
              borderBottom: `2px solid ${showArchived === tab.value ? 'var(--accent)' : 'transparent'}`,
              marginBottom: '-2px',
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visibleBilans.length === 0 && (
        <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-brd)', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'var(--chalk-dim)' }}>
          {showArchived
            ? 'Aucun bilan archivé.'
            : `Aucun bilan pour l'instant. Crée le premier bilan de ${clientName?.split(' ')[0]} !`}
        </div>
      )}

      {visibleBilans.map(bilan => {
        const isOpen = openBilan === bilan.id
        const scores = BILAN_ITEMS.filter(i => !i.noteOnly).map(i => bilan[i.key + '_score']).filter(Boolean)
        const avg = scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length * 10) / 10 : null
        const avgColor = avg >= 7 ? 'var(--rx)' : avg >= 4 ? 'var(--accent)' : 'var(--danger)'

        return (
          <div key={bilan.id} style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-brd)', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
            <div onClick={() => { setOpenBilan(isOpen ? null : bilan.id); setEditForm(bilan) }}
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: isOpen ? '1px solid var(--accent-brd)' : 'none' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--chalk)' }}>{getWeekLabel(bilan.week_start)}</div>
                <div style={{ fontSize: '11px', color: 'var(--chalk-dim)', marginTop: '2px' }}>
                  {bilan.week_start === getMondayOfWeek() ? '📍 Semaine en cours' : ''}
                  {bilan.filled_by_client ? ' · ✅ Rempli par le client' : ' · ⏳ En attente client'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {avg && <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '22px', color: avgColor }}>{avg}<span style={{ fontSize: '12px', color: 'var(--chalk-dim)' }}>/10</span></div>}
                <button
                  onClick={(e) => toggleArchive(bilan.id, !bilan.archived, e)}
                  title={bilan.archived ? 'Désarchiver' : 'Archiver'}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '15px', opacity: 0.6, padding: '2px' }}
                >
                  {bilan.archived ? '📤' : '📦'}
                </button>
                <span style={{ color: 'var(--chalk-dim)', fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && (
              <div style={{ padding: '10px 6px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {BILAN_ITEMS.map(item => (
                    <div key={item.key} style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '14px 12px', border: '1px solid var(--accent-brd)' }}>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--chalk)', marginBottom: '10px' }}>{item.label}</div>
                      {!item.noteOnly && (
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--chalk-dim)', marginBottom: '6px' }}>Note /10</div>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {[1,2,3,4,5,6,7,8,9,10].map(n => {
                              const val = editForm[item.key + '_score']
                              return (
                                <button key={n} onClick={() => setEditForm(p => ({ ...p, [item.key + '_score']: n }))}
                                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: '700', cursor: 'pointer', background: val === n ? (n >= 7 ? 'var(--rx)' : n >= 4 ? 'var(--accent)' : 'var(--danger)') : 'var(--accent-dim)', color: val === n ? 'var(--chalk)' : 'var(--chalk-dim)' }}>
                                  {n}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--chalk-dim)', marginBottom: '4px' }}>Commentaire</div>
                        <textarea
                          value={editForm[item.key + '_note'] || ''}
                          onChange={e => setEditForm(p => ({ ...p, [item.key + '_note']: e.target.value }))}
                          placeholder="Détails, observations…"
                          rows={6}
                          style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--accent-brd)', borderRadius: '7px', fontSize: '14px', lineHeight: '1.65', fontFamily: "'DM Sans',sans-serif", background: 'var(--accent-dim)', resize: 'vertical', outline: 'none', boxSizing: 'border-box', minHeight: '130px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <button onClick={saveBilan} disabled={saving} style={{ padding: '9px 22px', background: 'var(--accent)', color: '#16110D', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                    {saving ? 'Sauvegarde…' : '✓ Enregistrer le bilan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}


export default BilanTab
