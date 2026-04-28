import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import AppShell from '../components/ui/AppShell'
import SurfaceCard from '../components/ui/SurfaceCard'
import SectionHead from '../components/ui/SectionHead'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyPanel from '../components/ui/EmptyPanel'

const BILAN_ITEMS = [
  { key: 'sommeil', label: 'Sommeil', hasScore: true },
  { key: 'moral', label: 'Moral', hasScore: true },
  { key: 'assiduite_diete', label: 'Assiduité diète', hasScore: true },
  { key: 'problemes_diete', label: 'Problèmes diète', noteOnly: true },
  { key: 'assiduite_training', label: "Assiduité entraînement", hasScore: true },
  { key: 'problemes_training', label: "Problèmes entraînement", noteOnly: true },
  { key: 'neat', label: 'NEAT / activité quotidienne', hasScore: true },
  { key: 'autre', label: 'Autre point', noteOnly: true },
]

function getMondayOfWeek(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().split('T')[0]
}

function getWeekLabel(dateStr) {
  if (!dateStr) return 'Semaine'
  const d = new Date(dateStr)
  const end = new Date(d)
  end.setDate(end.getDate() + 6)
  return `Semaine du ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
}

function computeAverage(bilan) {
  const scores = BILAN_ITEMS.filter((item) => !item.noteOnly)
    .map((item) => Number(bilan?.[`${item.key}_score`] || 0))
    .filter(Boolean)
  if (!scores.length) return null
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
}

export default function BilanPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [bilans, setBilans] = useState([])
  const [selectedBilanId, setSelectedBilanId] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    let active = true
    let channel = null

    async function boot() {
      try {
        setLoading(true)
        setError('')
        setSuccess('')

        const { data: authData } = await supabase.auth.getUser()
        const currentUser = authData?.user

        if (!currentUser) {
          router.push('/')
          return
        }

        if (!active) return
        setUser(currentUser)

        const { data, error: bilansError } = await supabase
          .from('bilans')
          .select('*')
          .eq('client_id', currentUser.id)
          .order('week_start', { ascending: false })

        if (bilansError) throw bilansError

        if (!active) return
        const safe = data || []
        setBilans(safe)

        const thisWeek = getMondayOfWeek()
        const current = safe.find((b) => b.week_start === thisWeek)
        const first = current || safe[0] || null

        if (first) {
          setSelectedBilanId(first.id)
          setEditForm(first)
        }

        channel = supabase
          .channel(`bilans-client-${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'bilans',
              filter: `client_id=eq.${currentUser.id}`,
            },
            async () => {
              const { data: refreshData } = await supabase
                .from('bilans')
                .select('*')
                .eq('client_id', currentUser.id)
                .order('week_start', { ascending: false })

              if (!active) return
              const refreshed = refreshData || []
              setBilans(refreshed)

              if (selectedBilanId) {
                const updated = refreshed.find((b) => b.id === selectedBilanId)
                if (updated) setEditForm(updated)
              }
            }
          )
          .subscribe()
      } catch (e) {
        if (!active) return
        setError(e.message || 'Impossible de charger les bilans')
      } finally {
        if (active) setLoading(false)
      }
    }

    boot()

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [router, selectedBilanId])

  const selectedBilan = useMemo(
    () => bilans.find((b) => b.id === selectedBilanId) || null,
    [bilans, selectedBilanId]
  )

  const currentWeek = getMondayOfWeek()
  const currentWeekExists = bilans.find((b) => b.week_start === currentWeek)
  const average = computeAverage(selectedBilan)
  const completedCount = bilans.filter((b) => b.filled_by_client).length

  async function createCurrentWeekBilan() {
    try {
      setCreating(true)
      setError('')
      setSuccess('')

      if (currentWeekExists) {
        setSelectedBilanId(currentWeekExists.id)
        setEditForm(currentWeekExists)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('coach_id')
        .eq('id', user.id)
        .single()

      const { data, error: insertError } = await supabase
        .from('bilans')
        .insert({
          client_id: user.id,
          coach_id: profile?.coach_id || null,
          week_start: currentWeek,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setBilans((prev) => [data, ...prev])
      setSelectedBilanId(data.id)
      setEditForm(data)
      setSuccess('Bilan de la semaine créé.')
    } catch (e) {
      setError(e.message || 'Impossible de créer le bilan')
    } finally {
      setCreating(false)
    }
  }

  async function saveBilan() {
    if (!selectedBilanId) return
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const payload = { ...editForm, filled_by_client: true }

      const { error: updateError } = await supabase
        .from('bilans')
        .update(payload)
        .eq('id', selectedBilanId)

      if (updateError) throw updateError

      setBilans((prev) =>
        prev.map((b) => (b.id === selectedBilanId ? { ...b, ...payload } : b))
      )
      setSuccess('Bilan enregistré.')
    } catch (e) {
      setError(e.message || 'Impossible d'enregistrer le bilan')
    } finally {
      setSaving(false)
    }
  }

  async function deleteBilan(bilanId) {
    if (!confirm('Supprimer ce bilan ? Cette action est irréversible.')) return
    try {
      await supabase.from('bilans').delete().eq('id', bilanId)
      setBilans(prev => prev.filter(b => b.id !== bilanId))
      setSelectedBilanId(null)
      setEditForm({})
    } catch(e) {
      setError(e.message || 'Impossible de supprimer le bilan')
    }
  }

  async function updateWeekStart(bilanId, newDate) {
    try {
      await supabase.from('bilans').update({ week_start: newDate }).eq('id', bilanId)
      setBilans(prev => prev.map(b => b.id === bilanId ? { ...b, week_start: newDate } : b))
      setEditForm(prev => ({ ...prev, week_start: newDate }))
    } catch(e) {
      setError(e.message || 'Impossible de modifier la date')
    }
  }

  if (loading) {
    return (
      <AppShell title="Bilan" subtitle="Chargement...">
        <div style={{ color: '#6B7A99', textAlign: 'center', padding: '40px' }}>Chargement…</div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Bilan"
      subtitle="Un espace plus clair pour remplir ton check-in hebdomadaire et garder un historique propre."
      actions={
        <button
          type="button"
          className="ui-button ui-button--primary"
          onClick={createCurrentWeekBilan}
          disabled={creating}
        >
          {creating ? 'Création…' : '+ Bilan cette semaine'}
        </button>
      }
    >
      {error ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard padded style={{ borderColor: '#F3C4C4', background: '#FEF2F2' }}>
            <strong style={{ display: 'block', marginBottom: 6, color: '#B42318' }}>Erreur</strong>
            <div style={{ color: '#B42318' }}>{error}</div>
          </SurfaceCard>
        </div>
      ) : null}

      {success ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard padded style={{ borderColor: '#C9E9D5', background: '#F0FBF4' }}>
            <strong style={{ display: 'block', marginBottom: 6, color: '#16804A' }}>OK</strong>
            <div style={{ color: '#16804A' }}>{success}</div>
          </SurfaceCard>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <SurfaceCard padded sticky>
            <SectionHead
              title="Historique"
              caption="Sélectionne une semaine pour ouvrir le bilan."
              action={<StatusBadge tone="default">{bilans.length} semaine(s)</StatusBadge>}
            />
            {bilans.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {bilans.map((bilan) => {
                  const active = bilan.id === selectedBilanId
                  const avg = computeAverage(bilan)
                  const isCurrent = bilan.week_start === currentWeek

                  return (
                    <button
                      key={bilan.id}
                      type="button"
                      onClick={() => {
                        setSelectedBilanId(bilan.id)
                        setEditForm(bilan)
                      }}
                      style={{
                        padding: '12px 14px',
                        background: active ? '#EEF2FF' : 'transparent',
                        border: '1px solid #DCE5F3',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: '#0D1B4E' }}>{getWeekLabel(bilan.week_start)}</div>
                        <div style={{ fontSize: 12, color: '#6B7A99' }}>
                          {bilan.filled_by_client ? 'Complété' : 'À remplir'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {isCurrent ? <StatusBadge tone="accent">Semaine</StatusBadge> : null}
                        {avg ? <StatusBadge tone={avg >= 7 ? 'success' : avg >= 4 ? 'warning' : 'danger'}>{avg}/10</StatusBadge> : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <EmptyPanel
                title="Aucun bilan"
                description="Crée ton premier bilan hebdomadaire pour commencer."
              />
            )}
          </SurfaceCard>

          <SurfaceCard padded>
            <SectionHead title="Vue rapide" caption="Ce qui compte en un coup d'œil." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ padding: '14px', background: '#F8FBFF', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#6B7A99', marginBottom: '4px' }}>Bilans</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#0D1B4E' }}>{bilans.length}</div>
              </div>
              <div style={{ padding: '14px', background: '#F8FBFF', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#6B7A99', marginBottom: '4px' }}>Complétés</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#0D1B4E' }}>{completedCount}</div>
              </div>
              <div style={{ padding: '14px', background: '#F8FBFF', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#6B7A99', marginBottom: '4px' }}>Moyenne</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#0D1B4E' }}>{average || '—'}</div>
              </div>
            </div>
          </SurfaceCard>
        </div>

        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {!selectedBilan ? (
            <SurfaceCard padded>
              <EmptyPanel
                title="Aucun bilan sélectionné"
                description="Choisis une semaine dans la colonne de gauche."
              />
            </SurfaceCard>
          ) : (
            <>
              <SurfaceCard padded>
                <SectionHead
                  title={getWeekLabel(selectedBilan.week_start)}
                  caption="Remplis chaque bloc avec une note et un commentaire utile pour ton coach."
                  action={
                    <StatusBadge tone={selectedBilan.filled_by_client ? 'success' : 'warning'}>
                      {selectedBilan.filled_by_client ? 'Complété' : 'À remplir'}
                    </StatusBadge>
                  }
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {BILAN_ITEMS.map((item) => (
                    <div key={item.key} style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #DCE5F3' }}>
                      <div style={{ fontWeight: 800, marginBottom: 12, color: '#0D1B4E' }}>{item.label}</div>

                      {!item.noteOnly ? (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, color: '#6B7A99', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Note /10</div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {[1,2,3,4,5,6,7,8,9,10].map((n) => {
                              const active = editForm?.[`${item.key}_score`] === n
                              return (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() =>
                                    setEditForm((prev) => ({ ...prev, [`${item.key}_score`]: n }))
                                  }
                                  style={{
                                    minWidth: 42,
                                    padding: '8px 12px',
                                    background: active ? (n >= 7 ? '#8FA07A' : n >= 4 ? '#4A6FD4' : '#C45C3A') : '#EEF2FF',
                                    color: active ? 'white' : '#0D1B4E',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontFamily: "'DM Sans', sans-serif",
                                  }}
                                >
                                  {n}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}

                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: '#6B7A99', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Commentaire</label>
                        <textarea
                          value={editForm?.[`${item.key}_note`] || ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              [`${item.key}_note`]: e.target.value,
                            }))
                          }
                          placeholder="Ajoute un retour utile, précis et honnête…"
                          rows={2}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1.5px solid #DCE5F3',
                            borderRadius: '10px',
                            fontSize: 13,
                            fontFamily: "'DM Sans', sans-serif",
                            background: '#FAFBFF',
                            resize: 'vertical',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', paddingTop: '12px', borderTop: '1px solid #EAEAEA', flexWrap: 'wrap' }}>
                    <div style={{ color: '#6B7A99', fontSize: 13 }}>
                      Plus ton retour est précis, plus ton coach peut t'aider efficacement.
                    </div>
                    <button
                      type="button"
                      onClick={saveBilan}
                      disabled={saving}
                      style={{
                        padding: '10px 24px',
                        background: saving ? '#CCC' : '#0D1B4E',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {saving ? 'Enregistrement…' : 'Enregistrer le bilan'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid #EAEAEA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#999', fontWeight: '600' }}>Corriger la semaine :</label>
                      <input
                        type="date"
                        value={editForm.week_start || ''}
                        onChange={(e) => updateWeekStart(selectedBilanId, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          border: '1.5px solid #DCE5F3',
                          borderRadius: '7px',
                          fontSize: '13px',
                          outline: 'none',
                          color: '#0D1B4E',
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteBilan(selectedBilanId)}
                      style={{
                        marginLeft: 'auto',
                        padding: '7px 14px',
                        background: 'rgba(196,92,58,0.08)',
                        color: '#C45C3A',
                        border: '1.5px solid #C45C3A',
                        borderRadius: '7px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      🗑 Supprimer ce bilan
                    </button>
                  </div>
                </div>
              </SurfaceCard>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}