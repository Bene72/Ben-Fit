'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import AppShell from '../../components/ui/AppShell'

// ── Helper : formatte une date relative en français ──────────────────────
function timeAgo(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffH < 24) return `il y a ${diffH}h`
  if (diffD === 1) return 'hier'
  if (diffD < 7) return `il y a ${diffD} j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const EVENT_META = {
  measure:  { icon: '⚖️', color: '#C45C3A', bg: '#FFF3EE', verb: 'a enregistré une mesure' },
  session:  { icon: '💪', color: '#3F7D58', bg: '#EEF6EE', verb: 'a validé une séance' },
  bilan:    { icon: '📋', color: '#B8860B', bg: '#FFFBEE', verb: 'a soumis un bilan' },
}

export default function ActivitePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all | measure | session | bilan
  const [isMobile, setIsMobile] = useState(false)
  const [clientsMap, setClientsMap] = useState({})

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const { data: refreshData } = await supabase.auth.refreshSession()
        const data = refreshData
        const currentUser = data.session?.user
        if (!currentUser) { router.push('/login'); return }
        setUser(currentUser)
        await loadActivity(currentUser.id)
      } catch (err) {
        console.error('Erreur init:', err)
        setLoading(false)
      }
    }
    init()
  }, [])

  const loadActivity = async (coachId) => {
    try {
      setLoading(true)
      setError(null)

      // 1. Récupère mes élèves
      const { data: clients, error: clientsErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'client')
        .eq('coach_id', coachId)

      if (clientsErr) throw clientsErr

      const clientIds = (clients || []).map(c => c.id)
      const cMap = {}
      ;(clients || []).forEach(c => { cMap[c.id] = c })
      setClientsMap(cMap)

      if (clientIds.length === 0) {
        setEvents([])
        setLoading(false)
        return
      }

      // 2. Récupère les 3 sources d'activité en parallèle
      const [measuresRes, sessionsRes, bilansRes] = await Promise.all([
        supabase.from('measures').select('*').in('client_id', clientIds).order('date', { ascending: false }).limit(30),
        supabase.from('workout_sessions').select('*').in('client_id', clientIds).order('date', { ascending: false }).limit(30),
        supabase.from('bilans').select('*').in('client_id', clientIds).order('created_at', { ascending: false }).limit(30).then(
          r => r,
          () => ({ data: [], error: null }) // si la table n'existe pas avec ce nom de colonne, on ignore
        ),
      ])

      const combined = []

      ;(measuresRes.data || []).forEach(m => combined.push({
        type: 'measure',
        id: `measure-${m.id}`,
        client_id: m.client_id,
        date: m.date || m.created_at,
        detail: `${m.weight ? m.weight + ' kg' : ''}${m.notes ? ' · ' + m.notes : ''}`,
      }))

      ;(sessionsRes.data || []).forEach(s => combined.push({
        type: 'session',
        id: `session-${s.id}`,
        client_id: s.client_id,
        date: s.date || s.created_at,
        detail: s.name || s.session_name || 'Séance complétée',
      }))

      ;(bilansRes.data || []).forEach(b => combined.push({
        type: 'bilan',
        id: `bilan-${b.id}`,
        client_id: b.client_id,
        date: b.created_at || b.date,
        detail: b.title || b.note || 'Bilan soumis',
      }))

      combined.sort((a, b) => new Date(b.date) - new Date(a.date))
      setEvents(combined)
    } catch (err) {
      console.error('Erreur chargement activité:', err)
      setError(err.message)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter)

  const counts = {
    all: events.length,
    measure: events.filter(e => e.type === 'measure').length,
    session: events.filter(e => e.type === 'session').length,
    bilan: events.filter(e => e.type === 'bilan').length,
  }

  if (loading) {
    return (
      <AppShell title="Activité">
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #E8E4DC', borderTopColor: '#B8860B', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ fontSize: 13, color: '#8A8070', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif" }}>Chargement</div>
          </div>
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell title="Activité">
        <div style={{
          textAlign: 'center', padding: '60px', background: '#FFF5F5',
          borderRadius: '16px', border: '1px solid #FECACA', maxWidth: '600px', margin: '0 auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#991B1B', marginBottom: '8px', fontFamily: "'Playfair Display',serif" }}>
            Erreur de chargement
          </div>
          <div style={{ fontSize: '14px', color: '#6B7A99' }}>{error}</div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Activité">
      <div style={{ background: '#FAF9F7', minHeight: '100vh', fontFamily: "'DM Sans',sans-serif", margin: '-24px -28px', padding: isMobile ? '20px 16px' : '24px 28px' }}>

        {/* ══ HERO ══ */}
        <div style={{
          background: '#0D1B2A', borderRadius: 20,
          padding: isMobile ? '24px 18px' : '32px 36px',
          marginBottom: 20, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(184,134,11,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 12, letterSpacing: '2px', textTransform: 'uppercase', color: '#B8860B', fontWeight: 700, marginBottom: 8 }}>
              ESPACE COACH
            </div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: isMobile ? 24 : 34, fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: 6 }}>
              📋 Activité de tes élèves
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>
              {events.length} action{events.length > 1 ? 's' : ''} récente{events.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* ══ FILTRES ══ */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { id: 'all',     label: 'Tout',     icon: '🗂️' },
            { id: 'measure', label: 'Mesures',  icon: '⚖️' },
            { id: 'session', label: 'Séances',  icon: '💪' },
            { id: 'bilan',   label: 'Bilans',   icon: '📋' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700,
              background: filter === f.id ? '#0D1B2A' : 'white',
              color: filter === f.id ? 'white' : '#6B7A99',
              border: filter === f.id ? 'none' : '1px solid #E8E4DC',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {f.icon} {f.label}
              <span style={{
                background: filter === f.id ? 'rgba(255,255,255,0.2)' : '#F0EDE6',
                color: filter === f.id ? 'white' : '#8A8070',
                borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800,
              }}>{counts[f.id]}</span>
            </button>
          ))}
        </div>

        {/* ══ FLUX D'ACTIVITÉ ══ */}
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 20px', background: 'white',
            borderRadius: '20px', border: '2px dashed #E8E4DC', color: '#8A8070'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#0D1B2A', marginBottom: '8px', fontFamily: "'Playfair Display',serif" }}>
              Aucune activité
            </div>
            <div style={{ fontSize: '14px' }}>
              Les actions de tes élèves apparaîtront ici en temps réel.
            </div>
          </div>
        ) : (
          <div style={{ background: 'white', border: '1px solid #EDE9E0', borderRadius: 16, overflow: 'hidden' }}>
            {filtered.map((event, i) => {
              const meta = EVENT_META[event.type]
              const client = clientsMap[event.client_id]
              const clientName = client?.full_name || client?.email || 'Élève'

              return (
                <div key={event.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '16px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid #F0EDE6' : 'none',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: meta.bg, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 17,
                  }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: '#0D1B2A' }}>
                      <span style={{ fontWeight: 700 }}>{clientName}</span>
                      <span style={{ color: '#8A8070' }}> {meta.verb}</span>
                    </div>
                    {event.detail && (
                      <div style={{ fontSize: 13, color: meta.color, fontWeight: 600, marginTop: 2 }}>
                        {event.detail}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#A09880', flexShrink: 0, whiteSpace: 'nowrap', marginTop: 2 }}>
                    {timeAgo(event.date)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
