import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

function scoreColor(value) {
  const n = Number(value || 0)
  if (n >= 8) return '#4A6FD4'
  if (n >= 5) return '#8FA07A'
  return '#C45C3A'
}

function cardStyle() {
  return {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
  }
}

export default function AgentBilanPage() {
  const router = useRouter()
  const { clientId, clientName } = router.query

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bilans, setBilans] = useState([])
  const [generated, setGenerated] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!clientId) return
    let active = true

    async function load() {
      try {
        setLoading(true)
      } catch {}
    }

    load()
    return () => {
      active = false
    }
  }, [clientId])

  useEffect(() => {
    if (!clientId) return
    let active = true

    async function loadBilans() {
      try {
        setLoading(true)
        setError('')
        const { data, error: bilanError } = await supabase
          .from('bilans')
          .select('*')
          .eq('client_id', clientId)
          .order('week_start', { ascending: false })
          .limit(3)

        if (bilanError) throw bilanError
        if (!active) return
        setBilans(data || [])
      } catch (e) {
        if (!active) return
        setError(e.message || 'Impossible de charger les bilans')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadBilans()
    return () => {
      active = false
    }
  }, [clientId])

  const latest = bilans[0] || null

  const scoreItems = useMemo(() => {
    if (!latest) return []
    return [
      ['Sommeil', latest.sommeil_score],
      ['Moral', latest.moral_score],
      ['Diète', latest.assiduite_diete_score],
      ['Training', latest.assiduite_training_score],
      ['NEAT', latest.neat_score],
    ]
  }, [latest])

  const noteItems = useMemo(() => {
    if (!latest) return []
    return [
      ['Sommeil', latest.sommeil_note],
      ['Moral', latest.moral_note],
      ['Diète', latest.assiduite_diete_note],
      ['Training', latest.assiduite_training_note],
      ['NEAT', latest.neat_note],
      ['Autres infos', latest.autre_note],
      ['Problèmes diète', latest.problemes_diete_note],
      ['Problèmes training', latest.problemes_training_note],
    ].filter(([, value]) => value)
  }, [latest])

  const draft = useMemo(() => {
    if (!latest) return ''
    const good = scoreItems.filter(([, v]) => Number(v) >= 7).map(([k]) => k.toLowerCase())
    const medium = scoreItems.filter(([, v]) => Number(v) >= 4 && Number(v) < 7).map(([k]) => k.toLowerCase())
    const low = scoreItems.filter(([, v]) => Number(v) < 4).map(([k]) => k.toLowerCase())

    let text = `Salut ${clientName || ''},\n\n`
    text += `Merci pour ton bilan.\n\n`

    if (good.length) text += `Les points forts de la semaine : ${good.join(', ')}.\n`
    if (medium.length) text += `Les points à stabiliser : ${medium.join(', ')}.\n`
    if (low.length) text += `Les priorités à corriger : ${low.join(', ')}.\n`

    if (noteItems.length) {
      text += `\nCe que je retiens de ton retour :\n`
      noteItems.forEach(([label, value]) => {
        text += `- ${label} : ${value}\n`
      })
    }

    text += `\nPlan pour la suite :\n`
    text += `1. Garder les bons automatismes déjà en place.\n`
    text += `2. Corriger en priorité le point qui te freine le plus cette semaine.\n`
    text += `3. Me refaire un retour précis sur ton énergie, ton adhérence et ton ressenti.\n\n`
    text += `On continue comme ça.`
    return text
  }, [latest, clientName, noteItems, scoreItems])

  useEffect(() => {
    setGenerated(draft)
  }, [draft])

  async function copyText() {
    try {
      await navigator.clipboard.writeText(generated)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 900 : false

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #05070E 0%, #090E1B 100%)',
        color: 'white',
        padding: isMobile ? 16 : 28,
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div
          style={{
            ...cardStyle(),
            padding: isMobile ? 18 : 24,
            marginBottom: 18,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: 16,
            flexDirection: isMobile ? 'column' : 'row',
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: isMobile ? 58 : 66,
                height: isMobile ? 58 : 66,
                borderRadius: 18,
                background: 'linear-gradient(145deg, #6188FF 0%, #0D1B4E 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: isMobile ? 22 : 26,
                boxShadow: '0 10px 24px rgba(74,111,212,0.35)',
                flexShrink: 0,
              }}
            >
              BF
            </div>

            <div>
              <div
                style={{
                  fontFamily: "'Bebas Neue',sans-serif",
                  letterSpacing: '2px',
                  fontSize: isMobile ? 30 : 38,
                  lineHeight: 1,
                }}
              >
                AGENT BILAN
              </div>
              <div style={{ color: 'rgba(255,255,255,0.52)', marginTop: 6, fontSize: isMobile ? 14 : 16 }}>
                Coach feedback · lecture intelligente du bilan
              </div>
            </div>
          </div>

          <div
            style={{
              minWidth: isMobile ? '100%' : 190,
              padding: '14px 18px',
              borderRadius: 22,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(74,111,212,0.12)',
            }}
          >
            <div style={{ fontSize: 15, color: '#7EA0FF', fontWeight: 700 }}>
              {clientName || 'Client'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', marginTop: 4 }}>
              Assistant bilan
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: 'white',
              cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            Retour
          </button>

          <button
            type="button"
            onClick={copyText}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #5F84FF 0%, #0D1B4E 100%)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 700,
              fontFamily: "'DM Sans',sans-serif",
              boxShadow: '0 12px 28px rgba(74,111,212,0.24)',
            }}
          >
            {copied ? 'Copié' : 'Copier la réponse'}
          </button>
        </div>

        {error ? (
          <div
            style={{
              ...cardStyle(),
              padding: 16,
              marginBottom: 18,
              border: '1px solid rgba(196,92,58,0.4)',
              background: 'rgba(196,92,58,0.1)',
              color: '#FFB6A6',
            }}
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <div style={{ ...cardStyle(), padding: 22 }}>Chargement…</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'minmax(320px, 0.92fr) minmax(0, 1.08fr)',
              gap: 18,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ ...cardStyle(), padding: isMobile ? 16 : 20 }}>
                <div style={{ fontWeight: 800, fontSize: 24, color: 'white', marginBottom: 10 }}>
                  Dernier bilan
                </div>
                <div style={{ color: 'rgba(255,255,255,0.52)', marginBottom: 16 }}>
                  {latest?.week_start ? `Semaine du ${latest.week_start}` : 'Aucun bilan disponible'}
                </div>

                {latest ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 12,
                    }}
                  >
                    {scoreItems.map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 18,
                          padding: 14,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.44)',
                            textTransform: 'uppercase',
                            letterSpacing: '1.4px',
                            marginBottom: 10,
                          }}
                        >
                          {label}
                        </div>
                        <div style={{ fontSize: 34, fontWeight: 800, color: scoreColor(value) }}>
                          {value || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'rgba(255,255,255,0.56)' }}>Aucun bilan trouvé pour ce client.</div>
                )}
              </div>

              <div style={{ ...cardStyle(), padding: isMobile ? 16 : 20 }}>
                <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 12 }}>
                  Notes importantes
                </div>

                {noteItems.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {noteItems.map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 16,
                          padding: 14,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#7EA0FF', marginBottom: 6 }}>
                          {label}
                        </div>
                        <div style={{ lineHeight: 1.7, color: 'rgba(255,255,255,0.82)', fontSize: 14 }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'rgba(255,255,255,0.56)' }}>Pas de notes détaillées sur ce bilan.</div>
                )}
              </div>
            </div>

            <div style={{ ...cardStyle(), padding: isMobile ? 16 : 20 }}>
              <div style={{ fontWeight: 800, fontSize: 24, marginBottom: 12 }}>
                Réponse coach suggérée
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>
                Brouillon clair, modifiable et directement copiable.
              </div>

              <textarea
                value={generated}
                onChange={(e) => setGenerated(e.target.value)}
                rows={isMobile ? 18 : 24}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderRadius: 18,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'white',
                  padding: 16,
                  fontSize: isMobile ? 15 : 15,
                  lineHeight: 1.75,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: "'DM Sans',sans-serif",
                  minHeight: isMobile ? 360 : 520,
                }}
              />

              <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.44)', fontSize: 12, lineHeight: 1.6 }}>
                Astuce : adapte la réponse si tu veux durcir le ton, rassurer davantage, ou donner une consigne très concrète pour la semaine.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
