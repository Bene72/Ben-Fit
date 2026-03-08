import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export default function Nutrition() {
  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState(null)
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      const { data: np } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('client_id', user.id)
        .eq('active', true)
        .single()
      setPlan(np)

      if (np) {
        const todayName = new Date().toLocaleDateString('fr-FR', { weekday: 'long' })
        const { data: ml } = await supabase
          .from('meals')
          .select('*, food_items(*)')
          .eq('nutrition_plan_id', np.id)
          .or(`day.eq.${todayName},day.eq.tous`)
          .order('time_slot')
        setMeals(ml || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <LoadingScreen />

  const totalCals = meals.reduce((sum, m) => sum + (m.calories || 0), 0)

  return (
    <Layout title="Nutrition" user={user}>
      {!plan ? (
        <EmptyState msg="Ton plan nutritionnel n'est pas encore configuré. Ton coach va le préparer prochainement." />
      ) : (
        <>
          {/* Macro summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                {[
                  { label: 'Consommées', value: totalCals, color: '#1A1A14' },
                  { label: 'Objectif', value: plan.target_calories, color: '#7A7A6A' },
                  { label: 'Restantes', value: plan.target_calories - totalCals, color: '#8FA07A' },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', fontWeight: '700', color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '12px', color: '#7A7A6A' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {[
                { label: 'Protéines 🥩', current: plan.current_protein || 0, target: plan.target_protein, color: '#C45C3A' },
                { label: 'Glucides 🌾', current: plan.current_carbs || 0, target: plan.target_carbs, color: '#C8A85A' },
                { label: 'Lipides 🥑', current: plan.current_fat || 0, target: plan.target_fat, color: '#8FA07A' },
              ].map(m => (
                <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '110px', fontSize: '13px', fontWeight: '500' }}>{m.label}</div>
                  <div style={{ flex: 1, height: '8px', background: '#E0D9CC', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: m.color, borderRadius: '4px', width: `${Math.min(100, (m.current / m.target) * 100)}%`, transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ width: '100px', textAlign: 'right', fontSize: '13px', color: '#7A7A6A', fontFamily: "'DM Mono', monospace" }}>
                    {m.current}g / {m.target}g
                  </div>
                </div>
              ))}
            </div>

            {plan.coach_note && (
              <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '24px' }}>
                <div style={{ fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '12px' }}>
                  📌 Note du coach
                </div>
                <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#1A1A14' }}>{plan.coach_note}</p>
              </div>
            )}
          </div>

          {/* Meals */}
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '700' }}>Plan du jour</div>
          </div>

          {meals.length === 0 ? (
            <EmptyState msg="Aucun repas planifié pour aujourd'hui." />
          ) : meals.map(meal => (
            <div key={meal.id} style={{
              background: '#FDFAF4', border: '1px solid #E0D9CC',
              borderRadius: '14px', padding: '20px 24px', marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#7A7A6A', fontFamily: "'DM Mono', monospace" }}>{meal.time_slot}</div>
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>{meal.name}</div>
                </div>
                <span style={{
                  fontSize: '13px', fontWeight: '600', color: '#A07820',
                  background: 'rgba(200,168,90,0.12)', padding: '3px 10px', borderRadius: '20px'
                }}>{meal.calories} kcal</span>
              </div>
              {meal.food_items && meal.food_items.length > 0 && (
                <ul style={{ listStyle: 'none' }}>
                  {meal.food_items.map(food => (
                    <li key={food.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: '14px'
                    }}>
                      <span>{food.name} ({food.quantity}{food.unit})</span>
                      <span style={{ fontSize: '12px', color: '#7A7A6A', fontFamily: "'DM Mono', monospace" }}>
                        P:{food.protein}g · G:{food.carbs}g · L:{food.fat}g
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </>
      )}
    </Layout>
  )
}

function EmptyState({ msg }) {
  return (
    <div style={{
      background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px',
      padding: '40px', textAlign: 'center', color: '#7A7A6A', fontSize: '14px'
    }}>{msg}</div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8', fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#7A7A6A' }}>
      Chargement…
    </div>
  )
}
