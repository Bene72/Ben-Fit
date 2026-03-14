import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

const BILAN_ITEMS = [
  { key: 'sommeil',            label: '😴 Sommeil',                              hasNote: true },
  { key: 'moral',              label: '🧠 Moral',                                hasNote: true },
  { key: 'assiduite_diete',    label: '🥗 Assiduité de la diète',               hasNote: true },
  { key: 'problemes_diete',    label: '⚠️ Problèmes rencontrés (diète)',        hasNote: false, noteOnly: true },
  { key: 'assiduite_training', label: '🏋️ Assiduité de l\'entraînement',        hasNote: true },
  { key: 'problemes_training', label: '⚠️ Problèmes rencontrés (entraînement)', hasNote: false, noteOnly: true },
  { key: 'neat',               label: '🚶 NEAT (activité quotidienne)',          hasNote: true },
  { key: 'autre',              label: '📝 Autre point',                          hasNote: false, noteOnly: true },
]

function getMondayOfWeek(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().split('T')[0]
}

function getWeekLabel(dateStr) {
  const d = new Date(dateStr)
  const end = new Date(d); end.setDate(end.getDate() + 6)
  return `Semaine du ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
}

export default function BilanPage() {
  const [user, setUser] = useState(null)
  const [bilans, setBilans] = useState([])
  const [loading, setLoading] = useState(true)
  const [openBilan, setOpenBilan] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      const { data } = await supabase
        .from('bilans')
        .select('*')
        .eq('client_id', user.id)
        .order('week_start', { ascending: false })

      setBilans(data || [])

      // Ouvrir automatiquement le bilan de la semaine en cours s'il existe
      const thisWeek = getMondayOfWeek()
      const current = (data || []).find(b => b.week_start === thisWeek)
      if (current) { setOpenBilan(current.id); setEditForm(current) }

      // Realtime — nouveau bilan créé par le coach
      const channel = supabase
        .channel(`bilans-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'bilans',
          filter: `client_id=eq.${user.id}`
        }, payload => {
          setBilans(prev => [payload.new, ...prev])
          // Ouvrir automatiquement si c'est la semaine en cours
          if (payload.new.week_start === getMondayOfWeek()) {
            setOpenBilan(payload.new.id)
            setEditForm(payload.new)
          }
        })
        .subscribe()

      setLoading(false)
    }
    load()
  }, [])

  const createBilan = async () => {
    setCreating(true)
    const weekStart = getMondayOfWeek()
    const exists = bilans.find(b => b.week_start === weekStart)
    if (exists) { setOpenBilan(exists.id); setEditForm(exists); setCreating(false); return }

    // Récupérer le coach_id du client
    const { data: profile } = await supabase
      .from('profiles')
      .select('coach_id')
      .eq('id', user.id)
      .single()

    const { data } = await supabase
      .from('bilans')
      .insert({ client_id: user.id, coach_id: profile?.coach_id, week_start: weekStart })
      .select().single()

    if (data) { setBilans(prev => [data, ...prev]); setOpenBilan(data.id); setEditForm(data) }
    setCreating(false)
  }

  const saveBilan = async () => {
    setSaving(true)
    await supabase
      .from('bilans')
      .update({ ...editForm, filled_by_client: true })
      .eq('id', openBilan)
    setBilans(prev => prev.map(b => b.id === openBilan ? { ...b, ...editForm, filled_by_client: true } : b))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EEF2FF', fontFamily: "'DM Sans',sans-serif", fontSize: '16px', color: '#6B7A99' }}>
      Chargement…
    </div>
  )

  return (
    <Layout title="Mon Bilan" user={user}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '22px', fontWeight: '700', color: '#0D1B4E', marginBottom: '4px' }}>
              📋 Mes bilans hebdomadaires
            </div>
            <div style={{ fontSize: '13px', color: '#6B7A99' }}>
              Remplis ton bilan chaque semaine pour que ton coach puisse suivre ta progression
            </div>
          </div>
          <button onClick={createBilan} disabled={creating} style={{ padding: '9px 18px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}>
            {creating ? '…' : '+ Bilan cette semaine'}
          </button>
        </div>

        {bilans.length === 0 && (
          <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#6B7A99' }}>
            Clique sur "+ Bilan cette semaine" pour créer ton premier bilan ! 💪
          </div>
        )}

        {bilans.map(bilan => {
          const isOpen = openBilan === bilan.id
          const isCurrent = bilan.week_start === getMondayOfWeek()
          const scores = BILAN_ITEMS.filter(i => !i.noteOnly).map(i => bilan[i.key + '_score']).filter(Boolean)
          const avg = scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length * 10) / 10 : null
          const avgColor = avg >= 7 ? '#8FA07A' : avg >= 4 ? '#4A6FD4' : '#C45C3A'

          return (
            <div key={bilan.id} style={{ background: '#F0F4FF', border: `1px solid ${isCurrent ? '#4A6FD4' : '#C5D0F0'}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '12px', boxShadow: isCurrent ? '0 0 0 2px rgba(74,111,212,0.15)' : 'none' }}>
              <div onClick={() => { setOpenBilan(isOpen ? null : bilan.id); setEditForm(bilan) }}
                style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: isOpen ? '1px solid #C5D0F0' : 'none' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#0D1B4E' }}>{getWeekLabel(bilan.week_start)}</div>
                  <div style={{ fontSize: '11px', color: '#6B7A99', marginTop: '3px' }}>
                    {isCurrent && <span style={{ background: '#4A6FD4', color: 'white', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontWeight: '700', marginRight: '6px' }}>CETTE SEMAINE</span>}
                    {bilan.filled_by_client ? '✅ Bilan complété' : '⏳ À remplir'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {avg && <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '20px', fontWeight: '700', color: avgColor }}>{avg}<span style={{ fontSize: '11px', color: '#6B7A99' }}>/10</span></div>}
                  <span style={{ color: '#6B7A99' }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {BILAN_ITEMS.map(item => (
                      <div key={item.key} style={{ background: 'white', borderRadius: '10px', padding: '14px 16px', border: '1px solid #E8ECFA' }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#0D1B4E', marginBottom: '12px' }}>{item.label}</div>

                        {!item.noteOnly && (
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '11px', color: '#6B7A99', marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>Note /10</div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {[1,2,3,4,5,6,7,8,9,10].map(n => {
                                const val = editForm[item.key + '_score']
                                return (
                                  <button key={n} onClick={() => setEditForm(p => ({ ...p, [item.key + '_score']: n }))}
                                    style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', background: val === n ? (n >= 7 ? '#8FA07A' : n >= 4 ? '#4A6FD4' : '#C45C3A') : '#EEF2FF', color: val === n ? 'white' : '#6B7A99', transform: val === n ? 'scale(1.1)' : 'scale(1)' }}>
                                    {n}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        <div>
                          <div style={{ fontSize: '11px', color: '#6B7A99', marginBottom: '6px', letterSpacing: '1px', textTransform: 'uppercase' }}>Commentaire</div>
                          <textarea
                            value={editForm[item.key + '_note'] || ''}
                            onChange={e => setEditForm(p => ({ ...p, [item.key + '_note']: e.target.value }))}
                            placeholder="Décris en quelques mots…"
                            rows={3}
                            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #C5D0F0', borderRadius: '8px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: '#FAFBFF', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: '1.5' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    {saved ? (
                      <div style={{ background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: '8px', padding: '12px 16px', color: '#2E7D32', fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>
                        ✅ Bilan enregistré ! Ton coach peut maintenant le consulter.
                      </div>
                    ) : (
                      <button onClick={saveBilan} disabled={saving} style={{ width: '100%', padding: '12px', background: saving ? 'rgba(13,27,78,0.5)' : '#0D1B4E', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                        {saving ? 'Enregistrement…' : '✓ Envoyer mon bilan au coach'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
