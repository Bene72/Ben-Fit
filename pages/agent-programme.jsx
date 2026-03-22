import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export const dynamic = 'force-dynamic'

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const callClaude = async (messages, maxTokens = 3000) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages
    })
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error('HTTP ' + response.status + ' — ' + err.slice(0, 200))
  }
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return (data.content || []).map(i => i.text || '').join('')
}

export default function AgentProgramme() {
  const router = useRouter()
  const { clientId, clientName } = router.query

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [inserting, setInserting] = useState(false)
  const [clientData, setClientData] = useState(null)
  const [proposal, setProposal] = useState(null)
  const [error, setError] = useState('')
  const [instructions, setInstructions] = useState('')
  const [step, setStep] = useState('idle') // idle | generating | done

  useEffect(() => {
    if (!clientId) return
    loadClientData()
  }, [clientId])

  const loadClientData = async () => {
    setLoading(true)
    try {
      // Profil
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', clientId).single()

      // Dernier bilan
      const { data: bilans } = await supabase
        .from('bilans').select('*')
        .eq('client_id', clientId)
        .order('week_start', { ascending: false })
        .limit(1)

      // Cycle actuel
      const { data: currentWorkouts } = await supabase
        .from('workouts').select('*, exercises(*)')
        .eq('client_id', clientId)
        .eq('is_archived', false)
        .order('day_of_week')

      // Dernier cycle archivé
      const { data: archived } = await supabase
        .from('workouts').select('*, exercises(*)')
        .eq('client_id', clientId)
        .eq('is_archived', true)
        .order('archived_at', { ascending: false })
        .limit(8)

      // Dernières charges (workout_logs)
      const { data: logs } = await supabase
        .from('workout_logs').select('*')
        .eq('client_id', clientId)
        .order('logged_at', { ascending: false })
        .limit(100)

      setClientData({
        profile,
        lastBilan: bilans?.[0] || null,
        currentWorkouts: (currentWorkouts || []).map(w => ({
          ...w,
          exercises: (w.exercises || []).sort((a, b) => a.order_index - b.order_index)
        })),
        archived: archived || [],
        logs: logs || []
      })
    } catch (e) {
      setError('Erreur chargement : ' + e.message)
    }
    setLoading(false)
  }

  const buildPrompt = () => {
    const { profile, lastBilan, currentWorkouts, archived, logs } = clientData

    // Bilan section
    const bilanSection = lastBilan
      ? [
          '- Sommeil: ' + (lastBilan.sommeil_score || '?') + '/10' + (lastBilan.sommeil_note ? ' (' + lastBilan.sommeil_note + ')' : ''),
          '- Moral: ' + (lastBilan.moral_score || '?') + '/10' + (lastBilan.moral_note ? ' (' + lastBilan.moral_note + ')' : ''),
          '- Assiduite training: ' + (lastBilan.assiduite_training_score || '?') + '/10' + (lastBilan.assiduite_training_note ? ' (' + lastBilan.assiduite_training_note + ')' : ''),
          '- Assiduite diete: ' + (lastBilan.assiduite_diete_score || '?') + '/10' + (lastBilan.assiduite_diete_note ? ' (' + lastBilan.assiduite_diete_note + ')' : ''),
          '- NEAT: ' + (lastBilan.neat_score || '?') + '/10' + (lastBilan.neat_note ? ' (' + lastBilan.neat_note + ')' : ''),
          '- Problemes training: ' + (lastBilan.problemes_training_note || 'Aucun'),
          '- Problemes diete: ' + (lastBilan.problemes_diete_note || 'Aucun'),
          '- Autre: ' + (lastBilan.autre_note || 'Aucun'),
        ].join('\n')
      : 'Aucun bilan disponible'

    // Cycle precedent
    const prevSection = archived.length > 0
      ? archived.map(function(w) {
          var exList = (w.exercises || []).map(function(e) {
            return e.name + ' ' + e.sets + 'x' + e.reps + (e.target_weight ? ' @' + e.target_weight : '')
          }).join(', ')
          return '- ' + w.name + ' (' + (DAYS_FR[(w.day_of_week || 1) - 1]) + '): ' + exList
        }).join('\n')
      : 'Aucun cycle precedent'

    // Programme actuel
    const currSection = currentWorkouts.length > 0
      ? currentWorkouts.map(function(w) {
          var exList = (w.exercises || []).map(function(e) {
            return e.name + ' ' + e.sets + 'x' + e.reps + (e.target_weight ? ' @' + e.target_weight : '')
          }).join(', ')
          return '- ' + w.name + ' (' + (DAYS_FR[(w.day_of_week || 1) - 1]) + '): ' + exList
        }).join('\n')
      : 'Aucun programme actuel'

    // Charges récentes
    const logsSection = logs.length > 0
      ? logs.slice(0, 30).map(function(l) {
          return '- ' + l.exercise_name + ': ' + (l.weight_used || '—') + ' x' + (l.reps_done || '—') + ' (' + new Date(l.logged_at).toLocaleDateString('fr-FR') + ')'
        }).join('\n')
      : 'Aucune charge enregistrée'

    const jsonSchema = '{"cycle_name":"Cycle X - Mois Annee","reasoning":"Explication detaillee de tes choix bases sur le bilan et lhistorique","adjustments":"Ce que tu as change par rapport au cycle precedent et pourquoi","workouts":[{"name":"Nom seance","type":"Push","day_of_week":1,"duration_min":75,"exercises":[{"name":"Exercice","sets":4,"reps":"8-10","rest":"2 min","note":"Consigne technique precise","target_weight":"","order_index":0,"group_type":"Normal","group_id":null}]}]}'

    return 'Tu es Bene, coach expert en musculation, hypertrophie et periodisation. Tu analyses les donnees de ton client et tu crees le prochain cycle d\'entrainement optimal.\n\n'
      + 'PROFIL CLIENT:\n'
      + '- Nom: ' + (profile?.full_name || '') + '\n'
      + '- Objectif: ' + (profile?.objective || 'Non precise') + '\n'
      + '- Programme label: ' + (profile?.current_program || 'Non precise') + '\n\n'
      + 'DERNIER BILAN HEBDOMADAIRE:\n' + bilanSection + '\n\n'
      + 'CYCLE PRECEDENT (' + ((archived[0]?.cycle_name) || 'dernier cycle') + '):\n' + prevSection + '\n\n'
      + 'PROGRAMME ACTUEL:\n' + currSection + '\n\n'
      + 'CHARGES RECENTES ENREGISTREES:\n' + logsSection + '\n\n'
      + (instructions ? 'INSTRUCTIONS SPECIFIQUES DU COACH:\n' + instructions + '\n\n' : '')
      + 'Analyse toutes ces donnees et genere le prochain cycle optimal. Prends en compte:\n'
      + '- Les scores du bilan pour ajuster le volume et l\'intensite\n'
      + '- Les charges reelles pour proposer des progressions realistes\n'
      + '- La logique de periodisation (si le client stagne, change l\'approche)\n'
      + '- Les problemes signales pour eviter les mouvements douloureux\n\n'
      + 'Reponds UNIQUEMENT en JSON valide sans markdown:\n' + jsonSchema
  }

  const generate = async () => {
    setGenerating(true)
    setError('')
    setProposal(null)
    setStep('generating')

    try {
      const prompt = buildPrompt()
      const text = await callClaude([{ role: 'user', content: prompt }], 4000)
      const clean = text.replace(/```json|```/g, '').trim()
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Réponse JSON invalide')
      const parsed = JSON.parse(jsonMatch[0])
      setProposal(parsed)
      setStep('done')
    } catch (e) {
      setError('Erreur : ' + e.message)
      setStep('idle')
    }
    setGenerating(false)
  }

  const insertProgram = async () => {
    if (!proposal) return
    setInserting(true)
    try {
      for (const workout of proposal.workouts) {
        const { data: newWorkout } = await supabase.from('workouts').insert({
          client_id: clientId,
          name: workout.name,
          type: workout.type,
          day_of_week: workout.day_of_week,
          duration_min: workout.duration_min,
          cycle_name: proposal.cycle_name,
          is_archived: false
        }).select().single()

        if (newWorkout && workout.exercises?.length) {
          await supabase.from('exercises').insert(
            workout.exercises.map((ex, i) => ({
              workout_id: newWorkout.id,
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              rest: ex.rest,
              note: ex.note || '',
              target_weight: ex.target_weight || '',
              order_index: i,
              group_type: ex.group_type || 'Normal',
              group_id: ex.group_id || null
            }))
          )
        }
      }
      alert('✅ Programme inséré pour ' + clientName + ' !')
      window.close()
    } catch (e) {
      setError('Erreur insertion : ' + e.message)
    }
    setInserting(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", color: '#F0F0F0' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
        <div>Chargement des données de {clientName}…</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', fontFamily: "'DM Sans', sans-serif", color: '#F0F0F0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .pulsing { animation: pulse 1.4s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1a1a22', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'linear-gradient(135deg,#4A6FD4,#0D1B4E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue', fontSize: '14px', letterSpacing: '1px' }}>BF</div>
        <div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '16px', letterSpacing: '2px' }}>AGENT PROGRAMME</div>
          <div style={{ fontSize: '11px', color: '#555' }}>Ben&Fit Coach AI</div>
        </div>
        <div style={{ marginLeft: 'auto', background: '#111118', border: '1px solid #1e1e28', borderRadius: '20px', padding: '5px 14px', fontSize: '13px', fontWeight: '600', color: '#4A6FD4' }}>
          {clientName}
        </div>
      </div>

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '28px 20px' }}>

        {/* Données client résumées */}
        {clientData && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: '#111118', border: '1px solid #1e1e28', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: '#444', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Objectif</div>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>{clientData.profile?.objective || '—'}</div>
            </div>
            <div style={{ background: '#111118', border: '1px solid #1e1e28', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: '#444', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Dernier bilan</div>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>
                {clientData.lastBilan
                  ? 'Training ' + (clientData.lastBilan.assiduite_training_score || '?') + '/10 · Moral ' + (clientData.lastBilan.moral_score || '?') + '/10'
                  : 'Aucun bilan'}
              </div>
            </div>
            <div style={{ background: '#111118', border: '1px solid #1e1e28', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: '#444', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Charges loggées</div>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>{clientData.logs.length} entrées</div>
            </div>
          </div>
        )}

        {/* Instructions optionnelles */}
        <div style={{ background: '#111118', border: '1px solid #1e1e28', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px', fontWeight: '700' }}>Instructions spécifiques (optionnel)</div>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="Ex: Augmenter le volume sur les pectoraux, éviter les squats cette semaine, ajouter plus de travail excentrique..."
            rows={3}
            style={{ width: '100%', background: '#0d0d14', border: '1px solid #2a2a35', borderRadius: '8px', padding: '10px 12px', color: '#F0F0F0', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: "'DM Sans', sans-serif", lineHeight: '1.6' }}
          />
        </div>

        {/* Bouton générer */}
        <button
          onClick={generate}
          disabled={generating}
          style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: generating ? '#1e1e28' : 'linear-gradient(135deg,#4A6FD4,#0D1B4E)', color: generating ? '#444' : 'white', fontSize: '15px', fontWeight: '700', cursor: generating ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.5px', marginBottom: '20px' }}>
          {generating
            ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <span style={{ width: '14px', height: '14px', border: '2px solid #333', borderTopColor: '#4A6FD4', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                <span className="pulsing">Analyse en cours… je lis le bilan, l'historique et les charges</span>
              </span>
            : '🤖 Générer le prochain cycle'}
        </button>

        {error && (
          <div style={{ background: '#1a0a0a', border: '1px solid #3a1515', borderRadius: '9px', padding: '12px 14px', marginBottom: '18px', color: '#f87171', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Résultat */}
        {proposal && (
          <div className="fade-up">
            {/* Raisonnement */}
            <div style={{ background: '#0d1520', border: '1px solid #1a2a40', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#4A6FD4', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '700', marginBottom: '10px' }}>💡 Analyse & Raisonnement</div>
              <div style={{ fontSize: '13px', color: '#B0C0D0', lineHeight: '1.7', marginBottom: '10px' }}>{proposal.reasoning}</div>
              {proposal.adjustments && (
                <div style={{ fontSize: '12px', color: '#6B7A99', lineHeight: '1.6', borderTop: '1px solid #1a2a40', paddingTop: '10px' }}>
                  <span style={{ color: '#4A6FD4', fontWeight: '600' }}>Ajustements vs cycle précédent : </span>{proposal.adjustments}
                </div>
              )}
              <div style={{ marginTop: '10px', fontWeight: '700', color: '#4A6FD4', fontSize: '13px' }}>📋 {proposal.cycle_name}</div>
            </div>

            {/* Séances */}
            {proposal.workouts?.map((workout, wi) => (
              <div key={wi} style={{ background: '#111118', border: '1px solid #1e1e28', borderRadius: '12px', marginBottom: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#0D1B4E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: '16px', letterSpacing: '2px' }}>{workout.name}</span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{DAYS_FR[(workout.day_of_week || 1) - 1]} · {workout.type} · {workout.duration_min}min</span>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px 80px', gap: '8px', padding: '4px 0 8px', borderBottom: '1px solid #1e1e28', marginBottom: '6px' }}>
                    {['Exercice', 'Séries', 'Reps', 'Repos'].map(h => (
                      <div key={h} style={{ fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase', color: '#444', fontWeight: '700' }}>{h}</div>
                    ))}
                  </div>
                  {workout.exercises?.map((ex, ei) => (
                    <div key={ei} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px 80px', gap: '8px', padding: '8px 0', borderBottom: '1px solid #1a1a22' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#E0E0E0' }}>{ex.name}</div>
                        {ex.note && <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{ex.note}</div>}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6B7A99', textAlign: 'center' }}>{ex.sets}</div>
                      <div style={{ fontSize: '13px', color: '#6B7A99', textAlign: 'center' }}>{ex.reps}</div>
                      <div style={{ fontSize: '12px', color: '#6B7A99', textAlign: 'center' }}>⏱ {ex.rest}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={insertProgram}
                disabled={inserting}
                style={{ flex: 1, padding: '13px', background: inserting ? '#1e1e28' : '#4A6FD4', color: inserting ? '#444' : 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: inserting ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {inserting ? 'Insertion…' : '✅ Valider et insérer ce programme'}
              </button>
              <button
                onClick={generate}
                disabled={generating}
                style={{ padding: '13px 20px', background: 'transparent', color: '#4A6FD4', border: '1px solid #4A6FD4', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                🔄 Regénérer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
