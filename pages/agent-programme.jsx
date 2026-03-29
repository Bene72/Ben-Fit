import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

function shellCardStyle() {
  return {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 22,
    boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
  }
}

function statCardStyle() {
  return {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: 18,
    minHeight: 128,
  }
}

function prettyScore(value) {
  if (value === null || value === undefined || value === '') return '—'
  return `${value}/10`
}

export default function AgentProgrammePage() {
  const router = useRouter()
  const { clientId, clientName } = router.query

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [lastBilan, setLastBilan] = useState(null)
  const [logCount, setLogCount] = useState(0)
  const [instructions, setInstructions] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!clientId) return
    let active = true

    async function loadData() {
      try {
        setLoading(true)
        setError('')

        const [
          { data: profileData, error: profileError },
          { data: bilanData, error: bilanError },
          { data: logsData, error: logsError },
        ] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', clientId).maybeSingle(),
          supabase
            .from('bilans')
            .select('*')
            .eq('client_id', clientId)
            .order('week_start', { ascending: false })
            .limit(1),
          supabase
            .from('workout_logs')
            .select('id')
            .eq('client_id', clientId),
        ])

        if (profileError) throw profileError
        if (bilanError) throw bilanError
        if (logsError) throw logsError

        if (!active) return
        setProfile(profileData || null)
        setLastBilan((bilanData || [])[0] || null)
        setLogCount((logsData || []).length)
      } catch (e) {
        if (!active) return
        setError(e.message || 'Impossible de charger les données client')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [clientId])

  const effectiveClientName = useMemo(() => {
    return clientName || profile?.full_name || 'Client'
  }, [clientName, profile])

  async function handleGenerate() {
    try {
      setSubmitting(true)
      setError('')
      setResult(null)

      const payload = {
        clientId,
        clientName: effectiveClientName,
        objective: profile?.objective || '',
        currentProgram: profile?.current_program || '',
        bilan: lastBilan || null,
        instructions,
      }

      const response = await fetch('/api/generate-programme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await response.json()
      if (!response.ok) throw new Error(json?.error || 'Impossible de générer le cycle')
      setResult(json)
    } catch (e) {
      setError(e.message || 'Impossible de générer le cycle')
    } finally {
      setSubmitting(false)
    }
  }

  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 920 : false

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #04060C 0%, #080C16 100%)',
        color: 'white',
        padding: isMobile ? 16 : 28,
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div
          style={{
            ...shellCardStyle(),
            padding: isMobile ? 18 : 24,
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: isMobile ? 58 : 68,
                height: isMobile ? 58 : 68,
                borderRadius: 18,
                background: 'linear-gradient(145deg, #5F84FF 0%, #0D1B4E 100%)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: isMobile ? 22 : 26,
                boxShadow: '0 12px 28px rgba(95,132,255,0.28)',
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
                  fontSize: isMobile ? 28 : 38,
                  lineHeight: 1,
                }}
              >
                AGENT PROGRAMME
              </div>
              <div style={{ color: 'rgba(255,255,255,0.46)', marginTop: 6, fontSize: isMobile ? 14 : 16 }}>
                Coach élite · Hypertrophie · Hybride
              </div>
            </div>
          </div>

          <div
            style={{
              minWidth: isMobile ? '100%' : 200,
              padding: '14px 18px',
              borderRadius: 22,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(95,132,255,0.1)',
            }}
          >
            <div style={{ fontSize: 16, color: '#7EA0FF', fontWeight: 700 }}>
              {effectiveClientName}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.46)', marginTop: 4 }}>
              {profile?.email || ''}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div style={statCardStyle()}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 10 }}>
              Objectif
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.35 }}>
              {profile?.objective || '—'}
            </div>
          </div>

          <div style={statCardStyle()}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 10 }}>
              Bilan training
            </div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {prettyScore(lastBilan?.assiduite_training_score)}
            </div>
          </div>

          <div style={statCardStyle()}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 10 }}>
              Bilan moral
            </div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {prettyScore(lastBilan?.moral_score)}
            </div>
          </div>

          <div style={statCardStyle()}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 10 }}>
              Charges loggées
            </div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {logCount} entrée{logCount > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div style={{ ...shellCardStyle(), padding: isMobile ? 18 : 22, marginBottom: 18 }}>
          <div
            style={{
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: isMobile ? 24 : 30,
              letterSpacing: '1.8px',
              marginBottom: 12,
            }}
          >
            Instructions spécifiques <span style={{ color: 'rgba(255,255,255,0.35)' }}>(optionnel)</span>
          </div>

          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={5}
            placeholder="Ex: Prioriser pectoraux ce cycle, éviter les squats lourds, ajouter du travail excentrique sur les ischios..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)',
              color: 'white',
              padding: 16,
              fontSize: 16,
              lineHeight: 1.7,
              resize: 'vertical',
              outline: 'none',
              fontFamily: "'DM Sans',sans-serif",
              minHeight: 130,
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={submitting}
          style={{
            width: '100%',
            padding: isMobile ? '20px 18px' : '22px 20px',
            borderRadius: 22,
            border: 'none',
            background: 'linear-gradient(135deg, #5F84FF 0%, #0D1B4E 100%)',
            color: 'white',
            fontSize: isMobile ? 18 : 20,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 18px 40px rgba(95,132,255,0.24)',
            marginBottom: result ? 18 : 0,
          }}
        >
          {submitting ? 'Analyse en cours…' : '🤖 Analyser et générer le prochain cycle'}
        </button>

        {error ? (
          <div
            style={{
              ...shellCardStyle(),
              padding: 16,
              marginTop: 18,
              border: '1px solid rgba(196,92,58,0.42)',
              background: 'rgba(196,92,58,0.1)',
              color: '#FFB6A6',
            }}
          >
            {error}
          </div>
        ) : null}

        {result ? (
          <div style={{ ...shellCardStyle(), padding: isMobile ? 18 : 22, marginTop: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 10 }}>
              Proposition générée
            </div>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0,
                color: 'rgba(255,255,255,0.88)',
                lineHeight: 1.7,
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  )
}
