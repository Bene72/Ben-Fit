import { useEffect, useMemo, useRef, useState } from 'react'
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

function formatLocalDate(date = new Date()) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseLocalDate(dateStr) {
  const [year, month, day] = String(dateStr).split('-').map(Number)
  return new Date(year, month - 1, day)
}
function getMondayOfWeek(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - day + 1)
  return formatLocalDate(d)
}

function getWeekLabel(dateStr) {
  if (!dateStr) return 'Semaine'
  const d = parseLocalDate(dateStr)
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
  const selectedBilanIdRef = useRef(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    selectedBilanIdRef.current = selectedBilanId
  }, [selectedBilanId])

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

              const activeBilanId = selectedBilanIdRef.current
              if (activeBilanId) {
                const updated = refreshed.find((b) => b.id === activeBilanId)
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
  }, [router])

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

      const { id, created_at, updated_at, ...editableFields } = editForm
      const payload = { ...editableFields, filled_by_client: true }

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
      setError(e.message || 'Impossible d’enregistrer le bilan')
    } finally {
      setSaving(false)
    }
  }

  async function deleteBilan(bilanId) {
    if (!confirm('Supprimer ce bilan ? Cette action est irréversible.')) return
    try {
      const { error: deleteError } = await supabase.from('bilans').delete().eq('id', bilanId)
      if (deleteError) throw deleteError
      setBilans(prev => prev.filter(b => b.id !== bilanId))
      setSelectedBilanId(null)
      setEditForm({})
    } catch(e) {
      setError(e.message || 'Impossible de supprimer le bilan')
    }
  }

  async function updateWeekStart(bilanId, newDate) {
    try {
      const { error: updateError } = await supabase.from('bilans').update({ week_start: newDate }).eq('id', bilanId)
      if (updateError) throw updateError
      setBilans(prev => prev.map(b => b.id === bilanId ? { ...b, week_start: newDate } : b))
      setEditForm(prev => ({ ...prev, week_start: newDate }))
    } catch(e) {
      setError(e.message || 'Impossible de modifier la date')
    }
  }

  if (loading) {
    return (
      <AppShell title="Bilan" subtitle="Chargement de tes bilans...">
        <SurfaceCard padded>
          <div className="ui-muted">Chargement…</div>
        </SurfaceCard>
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
          <SurfaceCard padded style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>Erreur</strong>
            <div className="ui-muted" style={{ color: 'var(--danger)' }}>{error}</div>
          </SurfaceCard>
        </div>
      ) : null}

      {success ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard padded style={{ borderColor: 'var(--success)', background: 'var(--success-soft)' }}>
            <strong style={{ display: 'block', marginBottom: 6, color: 'var(--success)' }}>OK</strong>
            <div className="ui-muted" style={{ color: 'var(--success)' }}>{success}</div>
          </SurfaceCard>
        </div>
      ) : null}

      <div className="ui-grid-3">
        <div className="ui-stack">
          <SurfaceCard padded sticky>
            <SectionHead
              title="Historique"
              caption="Sélectionne une semaine pour ouvrir le bilan."
              action={<StatusBadge tone="default">{bilans.length} semaine(s)</StatusBadge>}
            />
            {bilans.length ? (
              <div className="ui-list">
                {bilans.map((bilan) => {
                  const active = bilan.id === selectedBilanId
                  const avg = computeAverage(bilan)
                  const isCurrent = bilan.week_start === currentWeek

                  return (
                    <button
                      key={bilan.id}
                      type="button"
                      className={`ui-list-item ${active ? 'is-active' : ''}`}
                      onClick={() => {
                        setSelectedBilanId(bilan.id)
                        setEditForm(bilan)
                      }}
                      style={{ textAlign: 'left', cursor: 'pointer' }}
                    >
                      <div>
                        <div style={{ fontWeight: 800 }}>{getWeekLabel(bilan.week_start)}</div>
                        <div className="ui-muted" style={{ fontSize: 12 }}>
                          {bilan.filled_by_client ? 'Complété' : 'À remplir'}
                        </div>
                      </div>
                      <div className="ui-cluster">
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
            <SectionHead title="Vue rapide" caption="Ce qui compte en un coup d’œil." />
            <div className="ui-kpi-row">
              <div className="ui-kpi">
                <p className="ui-kpi-label">Bilans</p>
                <p className="ui-kpi-value">{bilans.length}</p>
              </div>
              <div className="ui-kpi">
                <p className="ui-kpi-label">Complétés</p>
                <p className="ui-kpi-value">{completedCount}</p>
              </div>
              <div className="ui-kpi">
                <p className="ui-kpi-label">Moyenne</p>
                <p className="ui-kpi-value">{average || '—'}</p>
              </div>
            </div>
          </SurfaceCard>
        </div>

        <div className="ui-stack">
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

                <div className="ui-stack">
                  {BILAN_ITEMS.map((item) => (
                    <div key={item.key} className="ui-card ui-card--padded">
                      <div style={{ fontWeight: 800, marginBottom: 12 }}>{item.label}</div>

                      {!item.noteOnly ? (
                        <div style={{ marginBottom: 14 }}>
                          <div className="ui-label">Note /10</div>
                          <div className="ui-cluster">
                            {[1,2,3,4,5,6,7,8,9,10].map((n) => {
                              const active = editForm?.[`${item.key}_score`] === n
                              return (
                                <button
                                  key={n}
                                  type="button"
                                  className={`ui-button ${active ? 'ui-button--primary' : 'ui-button--secondary'}`}
                                  onClick={() =>
                                    setEditForm((prev) => ({ ...prev, [`${item.key}_score`]: n }))
                                  }
                                  style={{ minWidth: 42, padding: '0 10px' }}
                                >
                                  {n}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}

                      <div>
                        <label className="ui-label">Commentaire</label>
                        <textarea
                          className="ui-textarea"
                          value={editForm?.[`${item.key}_note`] || ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              [`${item.key}_note`]: e.target.value,
                            }))
                          }
                          placeholder="Ajoute un retour utile, précis et honnête…"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="ui-toolbar">
                    <div className="ui-muted">
                      Plus ton retour est précis, plus ton coach peut t’aider efficacement.
                    </div>
                    <button
                      type="button"
                      className="ui-button ui-button--primary"
                      onClick={saveBilan}
                      disabled={saving}
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
                        onChange={e => updateWeekStart(selectedBilanId, e.target.value)}
                        style={{ padding: '6px 10px', border: '1.5px solid #E8E8E8', borderRadius: '7px', fontSize: '13px', outline: 'none', color: '#0D1B4E' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteBilan(selectedBilanId)}
                      style={{ marginLeft: 'auto', padding: '7px 14px', background: 'rgba(196,92,58,0.08)', color: '#C45C3A', border: '1.5px solid #C45C3A', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      🗑 Supprimer ce bilan
                    </button>
                  </div>
                </div>
              </SurfaceCard>
            </>
          )}
        </div>

        <div className="ui-stack">
          <SurfaceCard padded sticky>
            <SectionHead title="Contexte" caption="Une lecture rapide de ta semaine sélectionnée." />
            {!selectedBilan ? (
              <EmptyPanel
                title="Aucun contexte"
                description="Choisis une semaine pour voir les repères utiles."
              />
            ) : (
              <div className="ui-stack">
                <div className="ui-card ui-card--soft ui-card--padded">
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Semaine active</div>
                  <div className="ui-muted">{getWeekLabel(selectedBilan.week_start)}</div>
                </div>

                <div className="ui-card ui-card--padded">
                  <div style={{ fontWeight: 800, marginBottom: 10 }}>Lecture rapide</div>
                  <div className="ui-stack" style={{ gap: 10 }}>
                    {BILAN_ITEMS.filter((item) => !item.noteOnly).map((item) => {
                      const score = selectedBilan?.[`${item.key}_score`]
                      const tone = score >= 7 ? 'success' : score >= 4 ? 'warning' : score ? 'danger' : 'default'
                      return (
                        <div key={item.key} className="ui-list-item" style={{ padding: '10px 12px' }}>
                          <span>{item.label}</span>
                          <StatusBadge tone={tone}>{score ? `${score}/10` : '—'}</StatusBadge>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="ui-card ui-card--padded">
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Conseil</div>
                  <div className="ui-muted" style={{ lineHeight: 1.65 }}>
                    Utilise les commentaires pour donner du contexte : sommeil réel, écarts alimentaires, douleurs,
                    difficultés sur certaines séances, fatigue mentale, contraintes perso.
                  </div>
                </div>
              </div>
            )}
          </SurfaceCard>
        </div>
      </div>
    </AppShell>
  )
}
