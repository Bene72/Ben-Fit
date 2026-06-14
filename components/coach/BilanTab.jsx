import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { btn, lbl, inp } from '../../lib/coachUtils'

function BilanTab({ clientId, clientName, coachId }) {
  const [bilans, setBilans] = useState([])
  const [loading, setLoading] = useState(true)
  const [openBilan, setOpenBilan] = useState(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({})

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

  if (loading) return <div style={{ color: '#6B7A99', textAlign: 'center', padding: '40px' }}>Chargement…</div>

  const currentBilan = bilans.find(b => b.id === openBilan)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '20px', color: '#0D1B4E', letterSpacing: '2px' }}>
          BILANS HEBDOMADAIRES — {clientName?.split(' ')[0]?.toUpperCase()}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => window.open('/agent-bilan?clientId=' + clientId + '&clientName=' + encodeURIComponent(clientName), '_blank')} style={{ padding: '8px 18px', background: '#8FA07A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            🤖 Aide IA bilan
          </button>
          <button onClick={createBilan} disabled={creating} style={{ padding: '8px 18px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            {creating ? '…' : '+ Bilan cette semaine'}
          </button>
        </div>
      </div>

      {bilans.length === 0 && (
        <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#6B7A99' }}>
          Aucun bilan pour l'instant. Crée le premier bilan de {clientName?.split(' ')[0]} !
        </div>
      )}

      {bilans.map(bilan => {
        const isOpen = openBilan === bilan.id
        const scores = BILAN_ITEMS.filter(i => !i.noteOnly).map(i => bilan[i.key + '_score']).filter(Boolean)
        const avg = scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length * 10) / 10 : null
        const avgColor = avg >= 7 ? '#8FA07A' : avg >= 4 ? '#4A6FD4' : '#C45C3A'

        return (
          <div key={bilan.id} style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
            <div onClick={() => { setOpenBilan(isOpen ? null : bilan.id); setEditForm(bilan) }}
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: isOpen ? '1px solid #C5D0F0' : 'none' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#0D1B4E' }}>{getWeekLabel(bilan.week_start)}</div>
                <div style={{ fontSize: '11px', color: '#6B7A99', marginTop: '2px' }}>
                  {bilan.week_start === getMondayOfWeek() ? '📍 Semaine en cours' : ''}
                  {bilan.filled_by_client ? ' · ✅ Rempli par le client' : ' · ⏳ En attente client'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {avg && <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '22px', color: avgColor }}>{avg}<span style={{ fontSize: '12px', color: '#6B7A99' }}>/10</span></div>}
                <span style={{ color: '#6B7A99', fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && (
              <div style={{ padding: '10px 6px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {BILAN_ITEMS.map(item => (
                    <div key={item.key} style={{ background: 'white', borderRadius: '10px', padding: '14px 12px', border: '1px solid #E8ECFA' }}>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: '#0D1B4E', marginBottom: '10px' }}>{item.label}</div>
                      {!item.noteOnly && (
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '11px', color: '#6B7A99', marginBottom: '6px' }}>Note /10</div>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {[1,2,3,4,5,6,7,8,9,10].map(n => {
                              const val = editForm[item.key + '_score']
                              return (
                                <button key={n} onClick={() => setEditForm(p => ({ ...p, [item.key + '_score']: n }))}
                                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: '700', cursor: 'pointer', background: val === n ? (n >= 7 ? '#8FA07A' : n >= 4 ? '#4A6FD4' : '#C45C3A') : '#EEF2FF', color: val === n ? 'white' : '#6B7A99' }}>
                                  {n}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7A99', marginBottom: '4px' }}>Commentaire</div>
                        <textarea
                          value={editForm[item.key + '_note'] || ''}
                          onChange={e => setEditForm(p => ({ ...p, [item.key + '_note']: e.target.value }))}
                          placeholder="Détails, observations…"
                          rows={6}
                          style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #C5D0F0', borderRadius: '7px', fontSize: '14px', lineHeight: '1.65', fontFamily: "'DM Sans',sans-serif", background: '#FAFBFF', resize: 'vertical', outline: 'none', boxSizing: 'border-box', minHeight: '130px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <button onClick={saveBilan} disabled={saving} style={{ padding: '9px 22px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
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

