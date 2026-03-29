import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function AgentBilanPage() {
  const router = useRouter()
  const { clientId, clientName } = router.query

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bilans, setBilans] = useState([])
  const [generated, setGenerated] = useState('')

  useEffect(() => {
    if (!clientId) return
    let active = true

    async function load() {
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

    load()
    return () => {
      active = false
    }
  }, [clientId])

  const latest = bilans[0] || null

  const draft = useMemo(() => {
    if (!latest) return ''
    const notes = [
      latest.sommeil_note,
      latest.moral_note,
      latest.assiduite_diete_note,
      latest.assiduite_training_note,
      latest.neat_note,
      latest.autre_note,
      latest.problemes_diete_note,
      latest.problemes_training_note,
    ].filter(Boolean)

    const scores = [
      ['Sommeil', latest.sommeil_score],
      ['Moral', latest.moral_score],
      ['Diète', latest.assiduite_diete_score],
      ['Training', latest.assiduite_training_score],
      ['NEAT', latest.neat_score],
    ].filter(([, v]) => v)

    const good = scores.filter(([, v]) => Number(v) >= 7).map(([k]) => k.toLowerCase())
    const medium = scores.filter(([, v]) => Number(v) >= 4 && Number(v) < 7).map(([k]) => k.toLowerCase())
    const low = scores.filter(([, v]) => Number(v) < 4).map(([k]) => k.toLowerCase())

    let text = `Salut ${clientName || ''},\n\n`
    text += `Merci pour ton bilan.\n\n`

    if (good.length) {
      text += `Les points forts de la semaine : ${good.join(', ')}.\n`
    }
    if (medium.length) {
      text += `Les points à stabiliser : ${medium.join(', ')}.\n`
    }
    if (low.length) {
      text += `Les points prioritaires à corriger : ${low.join(', ')}.\n`
    }

    if (notes.length) {
      text += `\nCe que je retiens de ton retour :\n- ${notes.join('\n- ')}\n`
    }

    text += `\nPlan pour la suite :\n`
    text += `1. Garder ce qui fonctionne.\n`
    text += `2. Corriger un seul point faible prioritaire cette semaine.\n`
    text += `3. Me refaire un retour précis sur ton ressenti, ton énergie et ton adhérence.\n\n`
    text += `On continue comme ça.`
    return text
  }, [latest, clientName])

  useEffect(() => {
    setGenerated(draft)
  }, [draft])

  return (
    <div style={{ minHeight: '100vh', background: '#EEF2FF', padding: 24, fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: '2px', color: '#0D1B4E' }}>
              AGENT BILAN
            </div>
            <div style={{ color: '#6B7A99' }}>
              Assistant bilan pour {clientName || 'le client'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #C5D0F0', background: 'white', cursor: 'pointer' }}
          >
            Retour
          </button>
        </div>

        {error ? (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 24 }}>
            Chargement…
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(0, 1.1fr)', gap: 18 }}>
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 18 }}>
              <div style={{ fontWeight: 800, color: '#0D1B4E', marginBottom: 12 }}>Dernier bilan</div>
              {latest ? (
                <>
                  <div style={{ fontSize: 13, color: '#6B7A99', marginBottom: 10 }}>
                    Semaine du {latest.week_start || '—'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                    {[
                      ['Sommeil', latest.sommeil_score],
                      ['Moral', latest.moral_score],
                      ['Diète', latest.assiduite_diete_score],
                      ['Training', latest.assiduite_training_score],
                      ['NEAT', latest.neat_score],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: '#F8FAFF', border: '1px solid #DCE5FB', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 11, color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#0D1B4E' }}>{value || '—'}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ color: '#6B7A99' }}>Aucun bilan trouvé.</div>
              )}
            </div>

            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 800, color: '#0D1B4E' }}>Réponse coach suggérée</div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(generated)}
                  style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: '#0D1B4E', color: 'white', cursor: 'pointer' }}
                >
                  Copier
                </button>
              </div>
              <textarea
                value={generated}
                onChange={(e) => setGenerated(e.target.value)}
                rows={22}
                style={{
                  width: '100%',
                  borderRadius: 12,
                  border: '1.5px solid #C5D0F0',
                  padding: 14,
                  fontSize: 14,
                  fontFamily: "'DM Sans',sans-serif",
                  lineHeight: 1.6,
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ marginTop: 10, color: '#6B7A99', fontSize: 12 }}>
                Cette page rétablit la route de l’assistant bilan. Elle génère un brouillon exploitable immédiatement, sans erreur 404.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
