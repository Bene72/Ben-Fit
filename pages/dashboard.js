import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

import AppShell from '../components/ui/AppShell'
import SurfaceCard from '../components/ui/SurfaceCard'
import SectionHead from '../components/ui/SectionHead'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyPanel from '../components/ui/EmptyPanel'

export const dynamic = 'force-dynamic'

function mondayString() {
  const d = new Date()
  const day = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().split('T')[0]
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return '—' }
}

export default function DashboardPage() {
  const router = useRouter()

  const [isMobile, setIsMobile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [bilans, setBilans] = useState([])
  const [messages, setMessages] = useState([])

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 980)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    let active = true
    async function boot() {
      try {
        setLoading(true)
        setError('')
        const { data: authData } = await supabase.auth.getUser()
        const currentUser = authData?.user
        if (!currentUser) { router.push('/'); return }
        if (!active) return
        setUser(currentUser)

        const { data: profileData, error: profileError } = await supabase
          .from('profiles').select('*').eq('id', currentUser.id).maybeSingle()
        if (profileError) throw profileError
        if (profileData?.role === 'coach') { router.push('/coach'); return }
        if (!active) return
        setProfile(profileData || null)

        const [workoutsRes, bilansRes, messagesRes] = await Promise.all([
          supabase.from('workouts').select('*, exercises(*)').eq('client_id', currentUser.id).eq('is_archived', false).order('day_of_week'),
          supabase.from('bilans').select('*').eq('client_id', currentUser.id).order('week_start', { ascending: false }).limit(3),
          supabase.from('messages').select('*')
            .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
            .order('created_at', { ascending: false }).limit(5),
        ])

        if (!active) return
        setWorkouts((workoutsRes.data || []).map(w => ({
          ...w, exercises: [...(w.exercises || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        })))
        setBilans(bilansRes.data || [])
        setMessages(messagesRes.data || [])
      } catch (e) {
        if (!active) return
        setError(e.message || 'Impossible de charger le dashboard')
      } finally {
        if (active) setLoading(false)
      }
    }
    boot()
    return () => { active = false }
  }, [router])

  const todayNum = new Date().getDay() === 0 ? 7 : new Date().getDay()
  const todayWorkout = useMemo(() => workouts.find(w => w.day_of_week === todayNum) || workouts[0] || null, [workouts, todayNum])
  const currentWeekBilan = useMemo(() => bilans.find(b => b.week_start === mondayString()) || null, [bilans])
  const latestCoachMessage = useMemo(() => messages.find(m => m.sender_id !== user?.id) || null, [messages, user])

  if (loading) return (
    <AppShell title={isMobile ? '' : 'Dashboard'}>
      {isMobile ? (
        <div style={ marginTop: '-6px', marginBottom: 16 }>
          <div style={ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }>
            <img src="/logo-small.png" alt="Ben&Fit" style={ width: 34, height: 34, objectFit: 'contain' } />
            <div>
              <div style={ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: '1.4px', color: '#0D1B4E', lineHeight: 1 }>
                BEN&FIT
              </div>
              <div style={ fontSize: 9, color: '#6B7A99', letterSpacing: '1px', textTransform: 'uppercase' }>
                Only Benefit · since 2021
              </div>
            </div>
          </div>
          <div style={ fontWeight: 900, fontSize: 22, color: '#0D1B4E', marginBottom: 6 }>Dashboard</div>
          
        </div>
      ) : null}
      <SurfaceCard padded><div className="ui-muted">Chargement…</div></SurfaceCard>
    </AppShell>
  )

  return (
    <AppShell title={isMobile ? '' : 'Dashboard'}>
      {error ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard padded style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)' }}>
            <div className="ui-muted" style={{ color: 'var(--danger)' }}>{error}</div>
          </SurfaceCard>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', maxWidth: '900px' }}>

        {/* Profil */}
        <SurfaceCard padded>
          <SectionHead title="Mon profil" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#0D1B4E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', color: 'white', flexShrink: 0 }}>
              {(profile?.full_name || user?.email || '?').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '16px', color: '#0D1B4E' }}>{profile?.full_name || '—'}</div>
              <div className="ui-muted" style={{ fontSize: '13px', marginTop: '2px' }}>{user?.email}</div>
              {profile?.current_program && (
                <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: '600', padding: '3px 8px', background: '#EEF2FF', color: '#4A6FD4', borderRadius: '20px', display: 'inline-block' }}>
                  {profile.current_program}
                </div>
              )}
            </div>
          </div>
        </SurfaceCard>

        {/* Bilan hebdo */}
        <SurfaceCard padded>
          <SectionHead
            title="Bilan de la semaine"
            action={
              <StatusBadge tone={currentWeekBilan?.filled_by_client ? 'success' : 'warning'}>
                {currentWeekBilan?.filled_by_client ? 'Complété' : 'À faire'}
              </StatusBadge>
            }
          />
          <div className="ui-muted" style={{ marginBottom: '16px', marginTop: '4px' }}>
            {currentWeekBilan
              ? `Semaine du ${formatDate(currentWeekBilan.week_start)}`
              : 'Aucun bilan cette semaine encore.'}
          </div>
          <button type="button" className="ui-button ui-button--primary" onClick={() => router.push('/bilan')}>
            Ouvrir le bilan
          </button>
        </SurfaceCard>

        {/* Dernier message coach */}
        <SurfaceCard padded>
          <SectionHead title="Message de ton coach" />
          {latestCoachMessage ? (
            <div style={{ marginTop: '4px' }}>
              <div className="ui-muted" style={{ fontSize: '12px', marginBottom: '10px' }}>
                {formatDate(latestCoachMessage.created_at)}
              </div>
              <div style={{ lineHeight: '1.7', color: '#333', whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                {(latestCoachMessage.content || latestCoachMessage.body || '').slice(0, 280)}
                {(latestCoachMessage.content || '').length > 280 ? '…' : ''}
              </div>
              <button type="button" className="ui-button ui-button--secondary" style={{ marginTop: '14px' }} onClick={() => router.push('/messages')}>
                Voir la conversation
              </button>
            </div>
          ) : (
            <EmptyPanel title="Aucun message" description="Ton coach n'a pas encore écrit." />
          )}
        </SurfaceCard>

        {/* Séance du moment */}
        <SurfaceCard padded>
          <SectionHead
            title="Séance du moment"
            action={todayWorkout ? <StatusBadge tone="accent">{todayWorkout.exercises?.length || 0} exos</StatusBadge> : null}
          />
          {todayWorkout ? (
            <div style={{ marginTop: '4px' }}>
              <div style={{ fontWeight: '800', fontSize: '20px', color: '#0D1B4E', marginBottom: '8px' }}>
                {todayWorkout.name}
              </div>
              <div className="ui-muted" style={{ lineHeight: '1.7', marginBottom: '16px' }}>
                {(todayWorkout.exercises || []).slice(0, 4).map(ex => ex.name).filter(Boolean).join(' · ') || 'Aucun exercice'}
                {(todayWorkout.exercises || []).length > 4 ? ` · +${(todayWorkout.exercises || []).length - 4} autres` : ''}
              </div>
              <button type="button" className="ui-button ui-button--primary" onClick={() => router.push('/training')}>
                Ouvrir la séance
              </button>
            </div>
          ) : (
            <EmptyPanel title="Aucune séance" description="Ton coach n'a pas encore chargé de programme." />
          )}
        </SurfaceCard>

      </div>
    </AppShell>
  )
}
