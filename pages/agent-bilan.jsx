import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export const dynamic = 'force-dynamic'

const BILAN_ITEMS = [
  { key: 'sommeil', label: 'Sommeil' },
  { key: 'moral', label: 'Moral' },
  { key: 'assiduite_diete', label: 'Assiduité diète' },
  { key: 'assiduite_training', label: 'Assiduité training' },
  { key: 'neat', label: 'NEAT' },
]

const SYSTEM_PROMPT = `Tu es un coach sportif expert en recomposition corporelle, hypertrophie et performance hybride (musculation / HYROX / endurance).

Tu as 15+ ans d'expérience terrain avec une approche scientifique, pragmatique et humaine. Tu es spécialisé dans les profils avec charge mentale élevée, relation complexe à la nourriture, besoin de structure sans rigidité extrême.

TON OBJECTIF : Aider les athlètes à optimiser leur physique, améliorer leurs performances, construire une relation saine avec l'entraînement et la nutrition, tenir sur le long terme.

TON STYLE :
- Direct mais jamais agressif
- Bienveillant mais exigeant
- Zéro bullshit motivationnel
- Tu cherches le "pourquoi" derrière les comportements
- Tu adaptes ton discours à l'état émotionnel de la personne
- Tu ne juges jamais. Tu analyses, tu recadres, tu proposes.

FORMAT DE RÉPONSE (TRÈS IMPORTANT) :
Tu réponds en format WhatsApp / discussion fluide :
- phrases courtes
- ton naturel, proche
- questions intégrées dans le texte
- pas de gros blocs rigides
- pas de listes formelles sauf si vraiment nécessaire
- ton premium français : mélange de rigueur, proximité et intelligence émotionnelle
- le but est que l'athlète ait envie de te répondre et de progresser

TA MÉTHODE D'ANALYSE DU BILAN :
1. Identifier les points clés (sommeil, diet, entraînement, mental, NEAT)
2. Détecter les incohérences
3. Repérer les signaux faibles (fatigue, stress, surcharge)
4. Prioriser — tu ne corriges pas tout d'un coup
5. Ajuster intelligemment

TES PRINCIPES : Sommeil > tout. Régularité > perfection. Structure > motivation. Long terme > résultats rapides.

TU POSES DES QUESTIONS COMME : "C'était physique ou mental ?", "Tu le vis comment toi ?", "Tu es prêt à faire quoi concrètement ?"

QUAND UN ATHLÈTE : doute → rassures + recadres | dérape → expliques sans juger | performe → valorises sans le laisser s'emballer

À chaque réponse, demande-toi : "Est-ce que ça aide vraiment la personne à progresser ?" Si non, recommence.`

export default function AgentBilan() {
  const router = useRouter()
  const { clientId, clientName } = router.query

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [clientData, setClientData] = useState(null)
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [context, setContext] = useState('')

  useEffect(() => {
    if (!clientId) return
    loadData()
  }, [clientId])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', clientId).single()
      const { data: bilans } = await supabase.from('bilans').select('*').eq('client_id', clientId).order('week_start', { ascending: false }).limit(3)
      const { data: measures } = await supabase.from('measures').select('*').eq('client_id', clientId).order('date', { ascending: false }).limit(3)

      setClientData({ profile, bilans: bilans || [], measures: measures || [] })
    } catch (e) {
      setError('Erreur chargement : ' + e.message)
    }
    setLoading(false)
  }

  const buildPrompt = () => {
    const { profile, bilans, measures } = clientData
    const lastBilan = bilans[0]
    const prevBilan = bilans[1]

    if (!lastBilan) return null

    // Scores du bilan
    const bilanSection = BILAN_ITEMS.map(item => {
      const score = lastBilan[item.key + '_score']
      const note = lastBilan[item.key + '_note']
      const prevScore = prevBilan?.[item.key + '_score']
      const diff = score && prevScore ? (score - prevScore > 0 ? ' (+' + (score - prevScore) + ' vs semaine dernière)' : ' (' + (score - prevScore) + ' vs semaine dernière)') : ''
      return '- ' + item.label + ': ' + (score || '?') + '/10' + diff + (note ? ' → "' + note + '"' : '')
    }).join('\n')

    const problemesSection = [
      lastBilan.problemes_diete_note ? '- Problèmes diète: ' + lastBilan.problemes_diete_note : '',
      lastBilan.problemes_training_note ? '- Problèmes training: ' + lastBilan.problemes_training_note : '',
      lastBilan.autre_note ? '- Autre: ' + lastBilan.autre_note : '',
    ].filter(Boolean).join('\n') || 'Aucun problème signalé'

    // Poids
    const weightSection = measures.length > 0
      ? measures.map(m => m.date + ': ' + m.weight + 'kg').join(' → ')
      : 'Aucune mesure'

    // Évolution vs semaine précédente
    const evolutionSection = prevBilan ? [
      'Sommeil: ' + (prevBilan.sommeil_score || '?') + ' → ' + (lastBilan.sommeil_score || '?'),
      'Moral: ' + (prevBilan.moral_score || '?') + ' → ' + (lastBilan.moral_score || '?'),
      'Training: ' + (prevBilan.assiduite_training_score || '?') + ' → ' + (lastBilan.assiduite_training_score || '?'),
    ].join(' | ') : 'Pas de bilan précédent'

    return 'BILAN HEBDOMADAIRE À ANALYSER\n\n'
      + '=== CLIENT ===\n'
      + 'Nom: ' + (profile?.full_name || '') + '\n'
      + 'Objectif: ' + (profile?.objective || 'Non défini') + '\n'
      + 'Programme: ' + (profile?.current_program || 'Non défini') + '\n\n'
      + '=== BILAN SEMAINE DU ' + lastBilan.week_start + ' ===\n'
      + bilanSection + '\n\n'
      + '=== PROBLÈMES SIGNALÉS ===\n'
      + problemesSection + '\n\n'
      + '=== ÉVOLUTION ===\n'
      + evolutionSection + '\n\n'
      + '=== POIDS RÉCENT ===\n'
      + weightSection + '\n\n'
      + (context ? '=== CONTEXTE COACH ===\n' + context + '\n\n' : '')
      + 'Analyse ce bilan et rédige ta réponse au client en format WhatsApp. '
      + 'Commence par reconnaître ce qu\'il a vécu cette semaine, identifie le point le plus important à adresser, '
      + 'et termine par une ou deux questions concrètes pour la semaine qui vient. '
      + 'Ton naturel, direct, premium français. Pas trop long.'
  }

  const generate = async () => {
    setGenerating(true)
    setError('')
    setResponse('')

    try {
      const prompt = buildPrompt()
      if (!prompt) throw new Error('Aucun bilan disponible pour ce client')

      const res = await fetch('/api/generate-programme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: SYSTEM_PROMPT, userMessage: prompt })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur API')
      setResponse(data.text)
    } catch (e) {
      setError('Erreur : ' + e.message)
    }
    setGenerating(false)
  }

  const copyResponse = () => {
    navigator.clipboard.writeText(response)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", color: '#F0F0F0' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📋</div>
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '3px', marginBottom: '8px' }}>CHARGEMENT</div>
        <div style={{ color: '#555', fontSize: '13px' }}>Lecture des bilans de {clientName}…</div>
      </div>
    </div>
  )

  const lastBilan = clientData?.bilans?.[0]

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', fontFamily: "'DM Sans', sans-serif", color: '#F0F0F0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        .pulsing { animation: pulse 1.5s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1a1a22', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: '14px', background: '#0d0d14' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg,#8FA07A,#4A6FD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue, sans-serif', fontSize: '14px', letterSpacing: '1px' }}>BF</div>
        <div>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '17px', letterSpacing: '3px', color: '#E0E0F0' }}>AGENT BILAN</div>
          <div style={{ fontSize: '11px', color: '#444' }}>Coach premium · Analyse hebdomadaire</div>
        </div>
        <div style={{ marginLeft: 'auto', background: '#8FA07A20', border: '1px solid #8FA07A40', borderRadius: '20px', padding: '5px 14px', fontSize: '13px', fontWeight: '600', color: '#8FA07A' }}>
          {clientName}
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '28px 20px' }}>

        {/* Résumé du dernier bilan */}
        {lastBilan ? (
          <div style={{ background: '#111118', border: '1px solid #1e1e28', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '700', marginBottom: '14px' }}>
              📋 Dernier bilan — semaine du {lastBilan.week_start}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px', marginBottom: '14px' }}>
              {BILAN_ITEMS.map(item => {
                const score = lastBilan[item.key + '_score']
                const color = score >= 7 ? '#8FA07A' : score >= 4 ? '#4A6FD4' : '#C45C3A'
                return (
                  <div key={item.key} style={{ textAlign: 'center', background: '#0d0d14', borderRadius: '8px', padding: '10px 6px' }}>
                    <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', color: score ? color : '#333' }}>{score || '—'}</div>
                    <div style={{ fontSize: '9px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>{item.label}</div>
                  </div>
                )
              })}
            </div>
            {/* Notes signalées */}
            {(lastBilan.problemes_training_note || lastBilan.problemes_diete_note || lastBilan.autre_note) && (
              <div style={{ background: '#1a0d0d', border: '1px solid #3a1a1a', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#f87171' }}>
                {lastBilan.problemes_training_note && <div>⚠️ Training : {lastBilan.problemes_training_note}</div>}
                {lastBilan.problemes_diete_note && <div>⚠️ Diète : {lastBilan.problemes_diete_note}</div>}
                {lastBilan.autre_note && <div>📝 Autre : {lastBilan.autre_note}</div>}
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: '#111118', border: '1px solid #1e1e28', borderRadius: '14px', padding: '32px', textAlign: 'center', color: '#444', marginBottom: '20px' }}>
            Aucun bilan disponible pour {clientName}
          </div>
        )}

        {/* Contexte optionnel */}
        <div style={{ background: '#111118', border: '1px solid #1e1e28', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px', fontWeight: '700' }}>
            Contexte coach <span style={{ color: '#333', fontWeight: '400' }}>(optionnel)</span>
          </div>
          <textarea
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="Ex: Le client était malade cette semaine, a eu une compétition, traverse une période de stress pro..."
            rows={2}
            style={{ width: '100%', background: '#0d0d14', border: '1px solid #2a2a35', borderRadius: '8px', padding: '10px 13px', color: '#F0F0F0', fontSize: '13px', resize: 'vertical', fontFamily: "'DM Sans', sans-serif", lineHeight: '1.6', outline: 'none' }}
          />
        </div>

        {/* Bouton */}
        <button onClick={generate} disabled={generating || !lastBilan}
          style={{ width: '100%', padding: '15px', borderRadius: '11px', border: 'none', background: generating || !lastBilan ? '#1e1e28' : 'linear-gradient(135deg,#8FA07A,#4A6FD4)', color: generating || !lastBilan ? '#555' : 'white', fontSize: '15px', fontWeight: '700', cursor: generating || !lastBilan ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: '20px' }}>
          {generating
            ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <span style={{ width: '15px', height: '15px', border: '2px solid #333', borderTopColor: '#8FA07A', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                <span className="pulsing" style={{ fontSize: '13px' }}>Analyse du bilan en cours…</span>
              </span>
            : '💬 Analyser et générer la réponse coach'}
        </button>

        {error && (
          <div style={{ background: '#1a0a0a', border: '1px solid #3a1515', borderRadius: '10px', padding: '14px 16px', marginBottom: '18px', color: '#f87171', fontSize: '13px' }}>
            <strong>Erreur :</strong> {error}
          </div>
        )}

        {/* Réponse générée */}
        {response && (
          <div className="fade-up">
            <div style={{ background: '#0a1a12', border: '1px solid #1a3a22', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#8FA07A', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: '700' }}>
                  💬 Réponse coach générée
                </div>
                <button onClick={copyResponse}
                  style={{ padding: '6px 14px', background: copied ? '#8FA07A' : 'transparent', color: copied ? 'white' : '#8FA07A', border: '1px solid #8FA07A40', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s' }}>
                  {copied ? '✓ Copié !' : '📋 Copier'}
                </button>
              </div>
              <div style={{ fontSize: '14px', color: '#C8D8C0', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {response}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', paddingBottom: '40px' }}>
              <button onClick={generate} disabled={generating}
                style={{ flex: 1, padding: '12px', background: 'transparent', color: '#8FA07A', border: '1.5px solid #8FA07A40', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                🔄 Regénérer
              </button>
              <button onClick={copyResponse}
                style={{ flex: 2, padding: '12px', background: '#8FA07A', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {copied ? '✓ Copié dans le presse-papiers !' : '📋 Copier la réponse'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
