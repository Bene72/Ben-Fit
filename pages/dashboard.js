import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

import AppShell from '../components/ui/AppShell'
import SurfaceCard from '../components/ui/SurfaceCard'
import SectionHead from '../components/ui/SectionHead'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyPanel from '../components/ui/EmptyPanel'

function todayString() {
  return new Date().toISOString().split('T')[0]
}

function mondayString() {
  const d = new Date()
  const day = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().split('T')[0]
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    })
  } catch {
    return '—'
  }
}

export default function DashboardPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const [workouts, setWorkouts] = useState([])
  const [nutritionPlan, setNutritionPlan] = useState(null)
  const [nutritionLogs, setNutritionLogs] = useState([])
  const [bilans, setBilans] = useState([])
  const [messages, setMessages] = useState([])

  useEffect(() => {
    let active = true

    async function boot() {
      try {
        setLoading(true)
        setError('')

        const { data: authData } = await supabase.auth.getUser()
        const currentUser = authData?.user

        if (!currentUser) {
          router.push('/')
          return
        }

        if (!active) return
        setUser(currentUser)

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle()

        if (profileError) throw profileError

        if (profileData?.role === 'coach') {
          router.push('/coach')
          return
        }

        if (!active) return
        setProfile(profileData || null)

        const [
          workoutsRes,
          planRes,
          logsRes,
          bilansRes,
          messagesRes,
        ] = await Promise.all([
          supabase
            .from('workouts')
            .select('*, exercises(*)')
            .eq('client_id', currentUser.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('nutrition_plans')
            .select('*')
            .eq('client_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(1),
          supabase
            .from('nutrition_logs')
            .select('*')
            .eq('client_id', currentUser.id)
            .order('date', { ascending: false })
            .limit(14),
          supabase
            .from('bilans')
            .select('*')
            .eq('client_id', currentUser.id)
            .order('week_start', { ascending: false })
            .limit(8),
          supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
            .order('created_at', { ascending: false })
            .limit(12),
        ])

        if (workoutsRes.error) throw workoutsRes.error
        if (planRes.error) throw planRes.error
        if (logsRes.error) throw logsRes.error
        if (bilansRes.error) throw bilansRes.error
        if (messagesRes.error) throw messagesRes.error

        if (!active) return

        const normalizedWorkouts = (workoutsRes.data || []).map((w) => ({
          ...w,
          exercises: [...(w.exercises || [])].sort(
            (a, b) => (a.order_index || 0) - (b.order_index || 0)
          ),
        }))

        setWorkouts(normalizedWorkouts)
        setNutritionPlan(planRes.data?.[0] || null)
        setNutritionLogs(logsRes.data || [])
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
    return () => {
      active = false
    }
  }, [router])

  const todayWorkout = useMemo(() => workouts[0] || null, [workouts])

  const todayNutritionLog = useMemo(() => {
    const today = todayString()
    return nutritionLogs.find((log) => log.date === today) || null
  }, [nutritionLogs])

  const currentWeekBilan = useMemo(() => {
    const currentMonday = mondayString()
    return bilans.find((b) => b.week_start === currentMonday) || null
  }, [bilans])

  const latestMessage = useMemo(() => messages[0] || null, [messages])

  const unreadMessages = useMemo(() => {
    return messages.filter((m) => m.receiver_id === user?.id && !m.read_at).length
  }, [messages, user])

  const todayCalories = Number(todayNutritionLog?.calories || 0)
  const targetCalories = Number(nutritionPlan?.target_calories || 0)
  const todayProtein = Number(todayNutritionLog?.protein || 0)
  const targetProtein = Number(nutritionPlan?.target_protein || 0)

  const nutritionStatusTone = !nutritionPlan
    ? 'warning'
    : todayNutritionLog
      ? 'success'
      : 'warning'

  const bilanTone = currentWeekBilan?.filled_by_client ? 'success' : 'warning'

  if (loading) {
    return (
      <AppShell title="Dashboard" subtitle="Chargement de ton espace...">
        <SurfaceCard padded>
          <div className="ui-muted">Chargement…</div>
        </SurfaceCard>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle="Ton hub personnel pour savoir quoi faire aujourd’hui, où tu en es, et où aller ensuite."
    >
      {error ? (
        <div style={{ marginBottom: 16 }}>
          <SurfaceCard padded style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>Erreur</strong>
            <div className="ui-muted" style={{ color: 'var(--danger)' }}>{error}</div>
          </SurfaceCard>
        </div>
      ) : null}

      <div className="ui-grid-3">
        <div className="ui-stack">
          <SurfaceCard padded sticky>
            <SectionHead title="Profil" caption="Vue rapide de ton espace." />
            <div className="ui-stack">
              <div className="ui-card ui-card--soft ui-card--padded">
                <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.03em', marginBottom: 6 }}>
                  {profile?.first_name || profile?.full_name || 'Athlète'}
                </div>
                <div className="ui-muted">{profile?.email || user?.email || 'Compte connecté'}</div>
              </div>

              <div className="ui-list-item">
                <span>Training</span>
                <StatusBadge tone={todayWorkout ? 'success' : 'warning'}>
                  {todayWorkout ? 'Prêt' : 'Vide'}
                </StatusBadge>
              </div>

              <div className="ui-list-item">
                <span>Nutrition</span>
                <StatusBadge tone={nutritionStatusTone}>
                  {todayNutritionLog ? 'Renseignée' : 'À remplir'}
                </StatusBadge>
              </div>

              <div className="ui-list-item">
                <span>Bilan semaine</span>
                <StatusBadge tone={bilanTone}>
                  {currentWeekBilan?.filled_by_client ? 'Complété' : 'À faire'}
                </StatusBadge>
              </div>

              <div className="ui-list-item">
                <span>Messages non lus</span>
                <StatusBadge tone={unreadMessages ? 'warning' : 'default'}>
                  {unreadMessages}
                </StatusBadge>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard padded>
            <SectionHead title="Actions rapides" caption="Accès direct aux pages importantes." />
            <div className="ui-stack" style={{ gap: 10 }}>
              <button type="button" className="ui-button ui-button--primary" onClick={() => router.push('/training')}>
                Ouvrir Training
              </button>
              <button type="button" className="ui-button ui-button--secondary" onClick={() => router.push('/nutrition')}>
                Ouvrir Nutrition
              </button>
              <button type="button" className="ui-button ui-button--secondary" onClick={() => router.push('/bilan')}>
                Ouvrir Bilan
              </button>
              <button type="button" className="ui-button ui-button--secondary" onClick={() => router.push('/messages')}>
                Ouvrir Messages
              </button>
            </div>
          </SurfaceCard>
        </div>

        <div className="ui-stack">
          <SurfaceCard padded>
            <SectionHead title="Aujourd’hui" caption="Les 3 blocs qui comptent en priorité." />
            <div className="ui-kpi-row">
              <div className="ui-kpi">
                <p className="ui-kpi-label">Calories</p>
                <p className="ui-kpi-value">{todayCalories || 0}</p>
                <div className="ui-muted">/ {targetCalories || '—'}</div>
              </div>
              <div className="ui-kpi">
                <p className="ui-kpi-label">Protéines</p>
                <p className="ui-kpi-value">{todayProtein || 0}</p>
                <div className="ui-muted">/ {targetProtein || '—'}</div>
              </div>
              <div className="ui-kpi">
                <p className="ui-kpi-label">Messages</p>
                <p className="ui-kpi-value">{unreadMessages}</p>
                <div className="ui-muted">non lu(x)</div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard padded>
            <SectionHead
              title="Séance du moment"
              caption="Ton point d’entrée principal côté entraînement."
              action={
                todayWorkout ? <StatusBadge tone="accent">{todayWorkout.exercises?.length || 0} exo</StatusBadge> : null
              }
            />
            {todayWorkout ? (
              <div className="ui-stack">
                <div className="ui-card ui-card--soft ui-card--padded">
                  <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.03em', marginBottom: 8 }}>
                    {todayWorkout.name || 'Séance'}
                  </div>
                  <div className="ui-muted" style={{ lineHeight: 1.65 }}>
                    {(todayWorkout.exercises || []).slice(0, 5).map((ex) => ex.name).filter(Boolean).join(' · ') || 'Aucun exercice'}
                  </div>
                </div>

                <div className="ui-toolbar">
                  <div className="ui-muted">
                    Ouvre la séance pour suivre les consignes et enregistrer tes performances.
                  </div>
                  <button type="button" className="ui-button ui-button--primary" onClick={() => router.push('/training')}>
                    Aller à Training
                  </button>
                </div>
              </div>
            ) : (
              <EmptyPanel
                title="Aucune séance disponible"
                description="Ton coach n’a pas encore chargé de séance dans ton programme."
              />
            )}
          </SurfaceCard>

          <div className="ui-grid-2">
            <SurfaceCard padded>
              <SectionHead
                title="Nutrition du jour"
                caption="Statut rapide par rapport au plan."
                action={<StatusBadge tone={nutritionStatusTone}>{todayNutritionLog ? 'OK' : 'À remplir'}</StatusBadge>}
              />
              {nutritionPlan ? (
                <div className="ui-stack">
                  <div className="ui-list-item">
                    <span>Calories</span>
                    <span style={{ fontWeight: 800 }}>{todayCalories || 0} / {targetCalories || '—'}</span>
                  </div>
                  <div className="ui-list-item">
                    <span>Protéines</span>
                    <span style={{ fontWeight: 800 }}>{todayProtein || 0} / {targetProtein || '—'}</span>
                  </div>
                  <button type="button" className="ui-button ui-button--secondary" onClick={() => router.push('/nutrition')}>
                    Compléter la nutrition
                  </button>
                </div>
              ) : (
                <EmptyPanel
                  title="Aucun plan nutritionnel"
                  description="Ton coach n’a pas encore enregistré de plan."
                />
              )}
            </SurfaceCard>

            <SurfaceCard padded>
              <SectionHead
                title="Bilan hebdo"
                caption="Le point de suivi de ta semaine."
                action={<StatusBadge tone={bilanTone}>{currentWeekBilan?.filled_by_client ? 'Complété' : 'À faire'}</StatusBadge>}
              />
              <div className="ui-stack">
                <div className="ui-muted">
                  {currentWeekBilan
                    ? `Semaine du ${formatDate(currentWeekBilan.week_start)}`
                    : 'Aucun bilan créé pour cette semaine.'}
                </div>
                <button type="button" className="ui-button ui-button--secondary" onClick={() => router.push('/bilan')}>
                  Ouvrir le bilan
                </button>
              </div>
            </SurfaceCard>
          </div>
        </div>

        <div className="ui-stack">
          <SurfaceCard padded sticky>
            <SectionHead title="Contexte rapide" caption="Les infos utiles sans bouger de la page." />

            <div className="ui-stack">
              <div className="ui-card ui-card--padded">
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Dernier message coach</div>
                {latestMessage ? (
                  <>
                    <div className="ui-muted" style={{ fontSize: 12, marginBottom: 8 }}>
                      {formatDate(latestMessage.created_at)}
                    </div>
                    <div className="ui-muted" style={{ lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                      {(latestMessage.content || latestMessage.body || 'Message vide.').slice(0, 220)}
                    </div>
                  </>
                ) : (
                  <div className="ui-muted">Aucun message récent.</div>
                )}
              </div>

              <div className="ui-card ui-card--padded">
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Statut de la semaine</div>
                <div className="ui-stack" style={{ gap: 10 }}>
                  <div className="ui-list-item" style={{ padding: '10px 12px' }}>
                    <span>Training</span>
                    <StatusBadge tone={todayWorkout ? 'success' : 'warning'}>
                      {todayWorkout ? 'Disponible' : 'Vide'}
                    </StatusBadge>
                  </div>
                  <div className="ui-list-item" style={{ padding: '10px 12px' }}>
                    <span>Nutrition</span>
                    <StatusBadge tone={nutritionStatusTone}>
                      {todayNutritionLog ? 'À jour' : 'Manquante'}
                    </StatusBadge>
                  </div>
                  <div className="ui-list-item" style={{ padding: '10px 12px' }}>
                    <span>Bilan</span>
                    <StatusBadge tone={bilanTone}>
                      {currentWeekBilan?.filled_by_client ? 'Envoyé' : 'En attente'}
                    </StatusBadge>
                  </div>
                </div>
              </div>

              <div className="ui-card ui-card--padded">
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Conseil</div>
                <div className="ui-muted" style={{ lineHeight: 1.65 }}>
                  Commence par ta séance si elle est prête, renseigne ensuite ta nutrition du jour,
                  puis boucle ta semaine avec le bilan. C’est le trio le plus utile pour rester suivi proprement.
                </div>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </AppShell>
  )
}
