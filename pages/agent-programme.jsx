import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export const dynamic = 'force-dynamic'

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const SYSTEM_PROMPT = `Tu es un coach de très haut niveau spécialisé dans la performance hybride.

Tu accompagnes des athlètes visant : Hyrox (niveau compétitif/élite), CrossFit/conditioning, Hypertrophie avancée, Force, Running performance.

Tu raisonnes comme un préparateur physique élite + programmateur avancé + coach terrain expérimenté.

TON IDENTITÉ :
- Structuré, analytique, exigeant, orienté performance réelle
- Tu refuses les réponses génériques, les programmes "fitness basique", le bullshit motivationnel

TON MODE DE RAISONNEMENT :
1. Tu analyses le contexte client (bilan, historique, charges réelles)
2. Tu identifies l'objectif réel et les blocages
3. Tu choisis les meilleures méthodes de périodisation
4. Tu construis une réponse cohérente et applicable terrain
Tu expliques toujours le quoi, le pourquoi, le comment.

DOMAINES DE MAÎTRISE :
- Hypertrophie avancée : tension mécanique, stress métabolique, stretch-mediated hypertrophy, volume optimal, rest-pause, drop set, myo reps
- Force : progression squat/bench/deadlift, travail neural, maintien en contexte hybride
- HYROX/Conditioning : compromised running, pacing, sled strategy, enchaînements run + stations
- Running : Z2, seuil, VO2, économie de course
- Programmation : périodisation par blocs, gestion fatigue, planification compétition

SYSTÈME DE PRIORISATION MUSCULAIRE :
- Prioritaire : 12-16 séries/semaine
- Modéré : 8-12 séries
- Maintenance : 3-5 séries

STRUCTURE DES SÉANCES :
- Lisible, organisée par groupes musculaires, 4 à 6 exercices minimum
- Inclure reps, temps de repos, tempo si pertinent
- Techniques d'intensification intelligentes (rest-pause, drop sets, iso holds, stretch)
- Éviter les supersets inutiles

PRINCIPES FONDAMENTAUX :
1. Stimulus > fatigue
2. Progression mesurable
3. Spécificité > variété inutile
4. Lisibilité du programme
5. Efficacité terrain

PHILOSOPHIE : Le progrès vient de la capacité à encaisser un bon stimulus, récupérer, et le répéter.

TON TON : Direct, honnête, précis, jamais complaisant. Tu challenges les idées si elles ne sont pas optimales.

LECTURE DES DONNÉES :
- Tu analyses le bilan (scores, ressentis, problèmes signalés)
- Tu lis les charges réelles loggées pour proposer des progressions réalistes
- Tu ajustes le volume selon les scores de récupération et d'assiduité
- Tu tiens compte des douleurs ou limitations signalées
- Si bilan fatigue élevée → réduis volume. Si assiduité faible → simplifie.`

const JSON_SCHEMA = '{"cycle_name":"Cycle X - Mois Annee","reasoning":"Analyse detaillee : lecture du bilan, points forts, blocages identifies, logique de periodisation choisie et pourquoi","adjustments":"Ajustements precis vs cycle precedent et justification","volume_notes":"Repartition du volume par groupe musculaire ce cycle","workouts":[{"name":"Nom seance","type":"Push","day_of_week":1,"duration_min":75,"exercises":[{"name":"Exercice","sets":4,"reps":"8-10","rest":"2 min","note":"Consigne technique precise et pourquoi ce choix","target_weight":"","order_index":0,"group_type":"Normal","group_id":null}]}]}'

const GEMINI_API_KEY = 'AIzaSyBrkE1UBcuvJ4U5zq-KLDKuzIYmNGVQpac'

const callGemini = async (systemPrompt, userMessage) => {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 4000, temperature: 0.7 }
      })
    }
  )
  if (!response.ok) {
    const err = await response.text()
    throw new Error('HTTP ' + response.status + ' — ' + err.slice(0, 300))
  }
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
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
  const [generatingStep, setGeneratingStep] = useState('')

  useEffect(() => {
    if (!clientId) return
    loadClientData()
  }, [clientId])

  const loadClientData = async () => {
    setLoading(true)
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', clientId).single()
      const { data: bilans } = await supabase.from('bilans').select('*').eq('client_id', clientId).order('week_start', { ascending: false }).limit(1)
      const { data: currentWorkouts } = await supabase.from('workouts').select('*, exercises(*)').eq('client_id', clientId).eq('is_archived', false).order('day_of_week')
      const { data: archived } = await supabase.from('workouts').select('*, exercises(*)').eq('client_id', clientId).eq('is_archived', true).order('archived_at', { ascending: false }).limit(10)
      const { data: logs } = await supabase.from('workout_logs').select('*').eq('client_id', clientId).order('logged_at', { ascending: false }).limit(150)

      setClientData({
        profile,
        lastBilan: bilans?.[0] || null,
        currentWorkouts: (currentWorkouts || []).map(w => ({ ...w, exercises: (w.exercises || []).sort((a, b) => a.order_index - b.order_index) })),
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

    const bilanSection = lastBilan ? [
      'Semaine du ' + lastBilan.week_start,
      '- Sommeil: ' + (lastBilan.sommeil_score || '?') + '/10' + (lastBilan.sommeil_note ? ' → ' + lastBilan.sommeil_note : ''),
      '- Moral: ' + (lastBilan.moral_score || '?') + '/10' + (lastBilan.moral_note ? ' → ' + lastBilan.moral_note : ''),
      '- Assiduite training: ' + (lastBilan.assiduite_training_score || '?') + '/10' + (lastBilan.assiduite_training_note ? ' → ' + lastBilan.assiduite_training_note : ''),
      '- Assiduite diete: ' + (lastBilan.assiduite_diete_score || '?') + '/10' + (lastBilan.assiduite_diete_note ? ' → ' + lastBilan.assiduite_diete_note : ''),
      '- NEAT: ' + (lastBilan.neat_score || '?') + '/10' + (lastBilan.neat_note ? ' → ' + lastBilan.neat_note : ''),
      '- Problemes training: ' + (lastBilan.problemes_training_note || 'RAS'),
      '- Problemes diete: ' + (lastBilan.problemes_diete_note || 'RAS'),
      '- Autre: ' + (lastBilan.autre_note || 'RAS'),
    ].join('\n') : 'Aucun bilan disponible'

    const prevSection = archived.length > 0
      ? archived.map(function(w) {
          var exList = (w.exercises || []).map(function(e) {
            return e.name + ' ' + e.sets + 'x' + e.reps + (e.target_weight ? ' @' + e.target_weight : '')
          }).join(', ')
          return '[' + (DAYS_FR[(w.day_of_week || 1) - 1]) + '] ' + w.name + ': ' + exList
        }).join('\n')
      : 'Premier cycle — pas d\'historique'

    const currSection = currentWorkouts.length > 0
      ? currentWorkouts.map(function(w) {
          var exList = (w.exercises || []).map(function(e) {
            return e.name + ' ' + e.sets + 'x' + e.reps + (e.target_weight ? ' @' + e.target_weight : '')
          }).join(', ')
          return '[' + (DAYS_FR[(w.day_of_week || 1) - 1]) + '] ' + w.name + ': ' + exList
        }).join('\n')
      : 'Aucun programme actuel'

    const logsByExercise = {}
    logs.forEach(function(l) {
      if (!logsByExercise[l.exercise_name]) logsByExercise[l.exercise_name] = []
      logsByExercise[l.exercise_name].push(l)
    })
    const logsSection = Object.keys(logsByExercise).length > 0
      ? Object.entries(logsByExercise).map(function(entry) {
          var name = entry[0], exLogs = entry[1]
          var recent = exLogs.slice(0, 3).map(function(l) {
            return (l.weight_used || '—') + 'x' + (l.reps_done || '—') + ' (' + new Date(l.logged_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ')'
          }).join(' → ')
          return '- ' + name + ': ' + recent
        }).join('\n')
      : 'Aucune charge enregistrée'

    return '=== PROFIL CLIENT ===\n'
      + 'Nom: ' + (profile?.full_name || '') + '\n'
      + 'Objectif: ' + (profile?.objective || 'Non défini') + '\n'
      + 'Programme label: ' + (profile?.current_program || 'Non défini') + '\n\n'
      + '=== DERNIER BILAN ===\n' + bilanSection + '\n\n'
      + '=== CYCLE PRÉCÉDENT (' + ((archived[0]?.cycle_name) || 'aucun') + ') ===\n' + prevSection + '\n\n'
      + '=== PROGRAMME ACTUEL ===\n' + currSection + '\n\n'
      + '=== PROGRESSION DES CHARGES ===\n' + logsSection + '\n\n'
      + (instructions ? '=== INSTRUCTIONS DU COACH ===\n' + instructions + '\n\n' : '')
      + '=== MISSION ===\n'
      + 'Analyse ces données avec ton expertise élite. Génère le prochain cycle optimal.\n'
      + 'Justifie chaque choix (volume, intensité, exercices, progressions) de manière factuelle.\n'
      + 'Utilise les charges loggées comme référence de progression.\n\n'
      + 'Réponds UNIQUEMENT en JSON valide sans markdown:\n' + JSON_SCHEMA
  }

  const generate = async () => {
    setGenerating(true)
    setError('')
    setProposal(null)

    const steps = ['Lecture du bilan hebdomadaire…', 'Analyse des charges et progressions…', 'Identification des blocages…', 'Calcul du volume optimal…', 'Construction du programme…']
    let stepIdx = 0
    setGeneratingStep(steps[0])
    const interval = setInterval(() => { stepIdx = (stepIdx + 1) % steps.length; setGeneratingStep(steps[stepIdx]) }, 2200)

    try {
      const text = await callGemini(SYSTEM_PROMPT, buildPrompt())
      const clean = text.replace(/```json|```/g, '').trim()
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Réponse JSON invalide')
      setProposal(JSON.parse(jsonMatch[0]))
    } catch (e) {
      setError('Erreur : ' + e.message)
    }

    clearInterval(interval)
    setGeneratingStep('')
    setGenerating(false)
  }

  const insertProgram = async () => {
    if (!proposal) return
    setInserting(true)
    try {
      for (const workout of proposal.workouts) {
        const { data: newWorkout } = await supabase.from('workouts').insert({
          client_id: clientId, name: workout.name, type: workout.type,
          day_of_week: workout.day_of_week, duration_min: workout.duration_min,
          cycle_name: proposal.cycle_name, is_archived: false
        }).select().single()

        if (newWorkout && workout.exercises?.length) {
          await supabase.from('exercises').insert(
            workout.exercises.map((ex, i) => ({
              workout_id: newWorkout.id, name: ex.name, sets: ex.sets, reps: ex.reps,
              rest: ex.rest, note: ex.note || '', target_weight: ex.target_weight || '',
              order_index: i, group_type: ex.group_type || 'Normal', group_id: ex.group_id || null
            }))
          )
        }
      }
      alert('✅ "' + proposal.cycle_name + '" inséré pour ' + clientName + ' !')
      window.close()
    } catch (e) {
      setError('Erreur insertion : ' + e.message)
    }
    setInserting(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", color: '#F0F0F0' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '3px', marginBottom: '8px' }}>CHARGEMENT</div>
        <div style={{ color: '#555', fontSize: '13px' }}>Lecture des données de {clientName}…</div>
      </div>
    </div>
  )

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

      <div style={{ borderBottom: '1px solid #1a1a22', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: '14px', background: '#0d0d14' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg,#4A6FD4,#0D1B4E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue, sans-serif', fontSize: '14px', letterSpacing: '1px' }}>BF</div>
        <div>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '17px', letterSpacing: '3px', color: '#E0E0F0' }}>AGENT PROGRAMME</div>
          <div style={{ fontSize: '11px', color: '#444' }}>Coach élite · Hypertrophie · Hybride</div>
        </div>
        <div style={{ marginLeft: 'auto', background: '#4A6FD420', border: '1px solid #4A6FD440', borderRadius: '20px', padding: '5px 14px', fontSize: '13px', fontWeight: '600', color: '#4A6FD4' }}>
          {clientName}
        </div>
      </div>

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '28px 20px' }}>

        {clientData && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Objectif', value: clientData.profile?.objective || '—' },
              { label: 'Bilan training', value: clientData.lastBilan ? (clientData.lastBilan.assiduite_training_score || '?') + '/10' : 'Aucun' },
              { label: 'Bilan moral', value: clientData.lastBilan ? (clientData.lastBilan.moral_score || '?') + '/10' : '—' },
              { label: 'Charges loggées', value: clientData.logs.length + ' entrées' },
            ].map(s => (
              <div key={s.label} style={{ background: '#111118', border: '1px solid #1e1e28', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontSize: '9px', color: '#444', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '5px', fontWeight: '700' }}>{s.label}</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#D0D0E0' }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {clientData?.lastBilan?.problemes_training_note && (
          <div style={{ background: '#1a0d0d', border: '1px solid #3a1a1a', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#f87171' }}>
            ⚠️ <strong>Problème signalé :</strong> {clientData.lastBilan.problemes_training_note}
          </div>
        )}

        <div style={{ background: '#111118', border: '1px solid #1e1e28', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px', fontWeight: '700' }}>
            Instructions spécifiques <span style={{ color: '#333', fontWeight: '400' }}>(optionnel)</span>
          </div>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="Ex: Prioriser pectoraux ce cycle, éviter les squats lourds, ajouter du travail excentrique sur les ischios..."
            rows={3}
            style={{ width: '100%', background: '#0d0d14', border: '1px solid #2a2a35', borderRadius: '8px', padding: '10px 13px', color: '#F0F0F0', fontSize: '13px', resize: 'vertical', fontFamily: "'DM Sans', sans-serif", lineHeight: '1.6', outline: 'none' }}
          />
        </div>

        <button onClick={generate} disabled={generating}
          style={{ width: '100%', padding: '15px', borderRadius: '11px', border: 'none', background: generating ? '#1e1e28' : 'linear-gradient(135deg,#4A6FD4,#0D1B4E)', color: generating ? '#555' : 'white', fontSize: '15px', fontWeight: '700', cursor: generating ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: '20px' }}>
          {generating
            ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <span style={{ width: '15px', height: '15px', border: '2px solid #333', borderTopColor: '#4A6FD4', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                <span className="pulsing" style={{ fontSize: '13px' }}>{generatingStep}</span>
              </span>
            : '🤖 Analyser et générer le prochain cycle'}
        </button>

        {error && (
          <div style={{ background: '#1a0a0a', border: '1px solid #3a1515', borderRadius: '10px', padding: '14px 16px', marginBottom: '18px', color: '#f87171', fontSize: '13px' }}>
            <strong>Erreur :</strong> {error}
          </div>
        )}

        {proposal && (
          <div className="fade-up">
            <div style={{ background: '#0a1220', border: '1px solid #1a2a45', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#4A6FD4', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: '700', marginBottom: '14px' }}>🧠 Analyse & Raisonnement</div>
              <div style={{ fontSize: '14px', color: '#B8C8E0', lineHeight: '1.75', marginBottom: '14px' }}>{proposal.reasoning}</div>
              {proposal.adjustments && (
                <div style={{ fontSize: '13px', color: '#7090B0', lineHeight: '1.65', borderTop: '1px solid #1a2a45', paddingTop: '12px', marginBottom: '12px' }}>
                  <span style={{ color: '#4A6FD4', fontWeight: '700' }}>Ajustements : </span>{proposal.adjustments}
                </div>
              )}
              {proposal.volume_notes && (
                <div style={{ fontSize: '12px', color: '#506070', lineHeight: '1.6', borderTop: '1px solid #1a2a45', paddingTop: '12px' }}>
                  <span style={{ color: '#6B7A99', fontWeight: '700' }}>Volume : </span>{proposal.volume_notes}
                </div>
              )}
              <div style={{ marginTop: '14px', display: 'inline-block', background: '#4A6FD420', border: '1px solid #4A6FD440', borderRadius: '8px', padding: '6px 14px', fontFamily: 'Bebas Neue, sans-serif', fontSize: '15px', color: '#4A6FD4', letterSpacing: '2px' }}>
                📋 {proposal.cycle_name}
              </div>
            </div>

            {proposal.workouts?.map((workout, wi) => (
              <div key={wi} style={{ background: '#111118', border: '1px solid #1e1e28', borderRadius: '12px', marginBottom: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '13px 18px', background: 'linear-gradient(135deg,#0D1B4E,#1a2a6e)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '17px', letterSpacing: '2px', color: 'white' }}>{workout.name}</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '4px' }}>{workout.type}</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{DAYS_FR[(workout.day_of_week || 1) - 1]} · {workout.duration_min}min</span>
                  </div>
                </div>
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 65px 80px 80px', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid #1e1e28', marginBottom: '6px' }}>
                    {['Exercice', 'Séries', 'Reps', 'Repos'].map(h => (
                      <div key={h} style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#333', fontWeight: '700' }}>{h}</div>
                    ))}
                  </div>
                  {workout.exercises?.map((ex, ei) => (
                    <div key={ei} style={{ display: 'grid', gridTemplateColumns: '1fr 65px 80px 80px', gap: '8px', padding: '9px 0', borderBottom: '1px solid #15151f', alignItems: 'start' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#E0E0F0' }}>{ex.name}</div>
                        {ex.note && <div style={{ fontSize: '11px', color: '#4A6090', marginTop: '3px', lineHeight: '1.5' }}>{ex.note}</div>}
                        {ex.target_weight && <div style={{ fontSize: '11px', color: '#6B7A99', marginTop: '2px' }}>Cible : {ex.target_weight}</div>}
                      </div>
                      <div style={{ fontSize: '14px', color: '#8090C0', textAlign: 'center' }}>{ex.sets}</div>
                      <div style={{ fontSize: '14px', color: '#8090C0', textAlign: 'center' }}>{ex.reps}</div>
                      <div style={{ fontSize: '12px', color: '#506070', textAlign: 'center' }}>⏱ {ex.rest}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingBottom: '40px' }}>
              <button onClick={insertProgram} disabled={inserting}
                style={{ flex: 1, padding: '14px', background: inserting ? '#1e1e28' : '#4A6FD4', color: inserting ? '#444' : 'white', border: 'none', borderRadius: '11px', fontSize: '14px', fontWeight: '700', cursor: inserting ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {inserting ? 'Insertion en cours…' : '✅ Valider et insérer dans Ben&Fit'}
              </button>
              <button onClick={generate} disabled={generating}
                style={{ padding: '14px 22px', background: 'transparent', color: '#4A6FD4', border: '1.5px solid #4A6FD440', borderRadius: '11px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                🔄 Regénérer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
