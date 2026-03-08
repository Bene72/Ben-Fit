import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export default function Objectifs() {
  const [user, setUser] = useState(null)
  const [goals, setGoals] = useState([])
  const [measures, setMeasures] = useState([])
  const [prs, setPrs] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      const [{ data: g }, { data: m }, { data: p }] = await Promise.all([
        supabase.from('goals').select('*').eq('client_id', user.id).order('created_at'),
        supabase.from('measures').select('*').eq('client_id', user.id).order('date', { ascending: false }).limit(8),
        supabase.from('personal_records').select('*').eq('client_id', user.id).order('date', { ascending: false }),
      ])

      setGoals(g || [])
      setMeasures(m || [])
      setPrs(p || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <LoadingScreen />

  return (
    <Layout title="Objectifs & Progression" user={user}>
      {/* Goals */}
      {goals.length > 0 && (
        <>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
            Objectifs du programme
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '28px' }}>
            {goals.map(goal => {
              const pct = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
              const circumference = 2 * Math.PI * 26
              const offset = circumference - (pct / 100) * circumference
              return (
                <div key={goal.id} style={{
                  background: '#FDFAF4', border: '1px solid #E0D9CC',
                  borderRadius: '14px', padding: '22px 24px'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>{goal.icon || '🎯'}</div>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{goal.name}</div>
                  <div style={{ fontSize: '12px', color: '#7A7A6A', marginBottom: '14px' }}>
                    Cible : {goal.target_value} {goal.unit}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <svg width="64" height="64" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                      <circle cx="32" cy="32" r="26" fill="none" stroke="#E0D9CC" strokeWidth="6" />
                      <circle cx="32" cy="32" r="26" fill="none" stroke={goal.color || '#C8A85A'}
                        strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                      />
                    </svg>
                    <div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '700' }}>{pct}%</div>
                      <div style={{ fontSize: '12px', color: '#7A7A6A', marginTop: '2px' }}>
                        {goal.current_value} {goal.unit} actuel
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Measures */}
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
            Historique des mesures
          </div>
          <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', overflow: 'hidden' }}>
            {measures.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#7A7A6A', fontSize: '14px' }}>
                Aucune mesure enregistrée.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date', 'Poids', 'Tour taille', '% MG'].map(h => (
                      <th key={h} style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', fontWeight: '500', textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #E0D9CC' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {measures.map((m, i) => (
                    <tr key={m.id}>
                      <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: "'DM Mono', monospace", color: '#7A7A6A' }}>
                        {new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: i === 0 ? '700' : '400', fontSize: '14px' }}>
                        {m.weight} kg
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{m.waist_cm ? `${m.waist_cm} cm` : '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>{m.body_fat_pct ? `${m.body_fat_pct}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* PRs */}
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
            Records personnels
          </div>
          <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', overflow: 'hidden' }}>
            {prs.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#7A7A6A', fontSize: '14px' }}>
                Aucun record enregistré.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Exercice', 'Record', 'Date', ''].map(h => (
                      <th key={h} style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', fontWeight: '500', textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #E0D9CC' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prs.map(pr => (
                    <tr key={pr.id}>
                      <td style={{ padding: '12px 16px', fontWeight: '600', fontSize: '14px' }}>{pr.exercise}</td>
                      <td style={{ padding: '12px 16px', fontFamily: "'DM Mono', monospace", fontSize: '13px' }}>
                        {pr.weight_kg}kg × {pr.reps}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#7A7A6A' }}>
                        {new Date(pr.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: 'rgba(143,160,122,0.2)', color: '#4A5240' }}>
                          PR! 🎉
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8', fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#7A7A6A' }}>
      Chargement…
    </div>
  )
}
