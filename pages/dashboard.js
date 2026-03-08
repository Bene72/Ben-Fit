import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(prof)

      // Load latest weight
      const { data: measures } = await supabase
        .from('measures')
        .select('*')
        .eq('client_id', user.id)
        .order('date', { ascending: false })
        .limit(1)

      // Load sessions this week
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', user.id)
        .gte('date', weekStart.toISOString().split('T')[0])

      setStats({
        weight: measures?.[0]?.weight || '—',
        sessionsThisWeek: sessions?.length || 0,
        program: prof?.current_program || 'Phase 2 · Hypertrophie'
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <LoadingScreen />

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <Layout title="Dashboard" user={user}>
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, #4A5240, #3A4230)',
        borderRadius: '14px', padding: '22px 28px',
        color: 'white', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '28px'
      }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', marginBottom: '4px' }}>
            Bonjour {profile?.full_name?.split(' ')[0] || 'Toi'} 👋
          </div>
          <div style={{ fontSize: '13px', opacity: 0.75 }}>
            {today} · {stats?.program}
          </div>
        </div>
        <button onClick={() => router.push('/training')} style={{
          padding: '9px 20px', background: '#C8A85A', color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '13px',
          fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif"
        }}>
          ▶ Voir ma séance
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Séances cette semaine', value: `${stats?.sessionsThisWeek}/5`, accent: '#C8A85A', delta: 'Objectif hebdo' },
          { label: 'Poids actuel', value: `${stats?.weight} kg`, accent: '#C45C3A', delta: 'Dernière mesure' },
          { label: 'Programme', value: 'Phase 2', accent: '#4A5240', delta: '6 semaines restantes' },
        ].map((s, i) => (
          <div key={i} style={{
            background: '#FDFAF4', border: '1px solid #E0D9CC',
            borderRadius: '14px', padding: '20px 24px',
            borderTop: `3px solid ${s.accent}`
          }}>
            <div style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '8px' }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '30px', fontWeight: '700', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#8FA07A', fontWeight: '500' }}>
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Coach message */}
      {profile?.coach_note && (
        <div style={{
          background: '#FDFAF4', border: '1px solid #E0D9CC',
          borderRadius: '14px', padding: '22px 24px'
        }}>
          <div style={{ fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '12px' }}>
            📌 Message de ton coach
          </div>
          <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#1A1A14' }}>
            {profile.coach_note}
          </p>
        </div>
      )}
    </Layout>
  )
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F5F0E8', fontFamily: "'Playfair Display', serif",
      fontSize: '20px', color: '#7A7A6A'
    }}>
      Chargement…
    </div>
  )
}
