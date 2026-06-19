import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

// ── Helpers ──────────────────────────────────────────────────────────────────
function avatarColor(name = '') {
  const colors = ['#2C64E5','#3F7D58','#C45C3A','#B8860B','#7B5EA7','#2A8A8A','#C45C7A','#4A7A3A']
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length]
}
function initials(name = '') {
  return name.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?'
}
function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000)
}

// ── Composant principal ────────────────────────────────────────────────────
export default function CoachPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const [kpis, setKpis] = useState({ total: 0, activeWeek: 0, bilansThisWeek: 0, messagesUnread: 0 })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user) { router.push('/'); return }
      setUser(data.session.user)
      await loadAll(data.session.user.id)
    })
  }, [])

  const loadAll = async (coachId) => {
    setLoading(true)
    try {
      // 1. Clients
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, current_program, weight, coach_note, created_at, current_cycle_name')
        .eq('role', 'client')
        .eq('coach_id', coachId)
        .order('full_name')

      const clientList = profiles || []

      // 2. Séances cette semaine (pour chaque client)
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      weekStart.setHours(0, 0, 0, 0)
      const weekStartStr = weekStart.toISOString().split('T')[0]

      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('client_id, date')
        .in('client_id', clientList.map(c => c.id))
        .gte('date', weekStartStr)

      // 3. Dernier poids par client
      const { data: measures } = await supabase
        .from('measures')
        .select('client_id, weight, date')
        .in('client_id', clientList.map(c => c.id))
        .order('date', { ascending: false })

      // 4. Bilans cette semaine
      const { data: bilans } = await supabase
        .from('bilans')
        .select('client_id, created_at, week_start')
        .in('client_id', clientList.map(c => c.id))
        .gte('week_start', weekStartStr)

      // 5. Messages non lus
      const { data: unreadMsgs } = await supabase
        .from('messages')
        .select('id, sender_id, created_at, content')
        .eq('receiver_id', coachId)
        .eq('read', false)
        .order('created_at', { ascending: false })

      // 6. Derniers logs d'entraînement (activité récente)
      const { data: recentLogs } = await supabase
        .from('workout_logs')
        .select('client_id, exercise_name, logged_at, weight_used, reps_done')
        .in('client_id', clientList.map(c => c.id))
        .order('logged_at', { ascending: false })
        .limit(20)

      // Enrichir chaque client
      const sessionsByClient = {}
      ;(sessions || []).forEach(s => {
        sessionsByClient[s.client_id] = (sessionsByClient[s.client_id] || 0) + 1
      })
      const lastWeightByClient = {}
      ;(measures || []).forEach(m => {
        if (!lastWeightByClient[m.client_id]) lastWeightByClient[m.client_id] = m
      })
      const bilanByClient = {}
      ;(bilans || []).forEach(b => { bilanByClient[b.client_id] = b })
      const unreadByClient = {}
      ;(unreadMsgs || []).forEach(m => {
        unreadByClient[m.sender_id] = (unreadByClient[m.sender_id] || 0) + 1
      })
      const lastLogByClient = {}
      ;(recentLogs || []).forEach(l => {
        if (!lastLogByClient[l.client_id]) lastLogByClient[l.client_id] = l
      })

      const enriched = clientList.map(c => ({
        ...c,
        sessionsThisWeek: sessionsByClient[c.id] || 0,
        lastWeight: lastWeightByClient[c.id]?.weight,
        lastWeightDate: lastWeightByClient[c.id]?.date,
        bilanThisWeek: !!bilanByClient[c.id],
        unread: unreadByClient[c.id] || 0,
        lastLog: lastLogByClient[c.id],
        lastLogDays: lastLogByClient[c.id] ? daysSince(lastLogByClient[c.id].logged_at) : null,
      }))

      setClients(enriched)

      // KPIs globaux
      setKpis({
        total: enriched.length,
        activeWeek: enriched.filter(c => c.sessionsThisWeek > 0).length,
        bilansThisWeek: enriched.filter(c => c.bilanThisWeek).length,
        messagesUnread: (unreadMsgs || []).length,
      })

      // Activité récente globale
      const activity = [
        ...(recentLogs || []).slice(0, 8).map(l => ({
          type: 'log', clientId: l.client_id,
          clientName: clientList.find(c => c.id === l.client_id)?.full_name || '?',
          label: `${l.exercise_name || 'Exercice'}${l.weight_used ? ` · ${l.weight_used}kg` : ''}`,
          date: l.logged_at,
        })),
        ...(bilans || []).slice(0, 5).map(b => ({
          type: 'bilan', clientId: b.client_id,
          clientName: clientList.find(c => c.id === b.client_id)?.full_name || '?',
          label: 'Bilan hebdo rempli',
          date: b.created_at,
        })),
        ...(unreadMsgs || []).slice(0, 5).map(m => ({
          type: 'message', clientId: m.sender_id,
          clientName: clientList.find(c => c.id === m.sender_id)?.full_name || '?',
          label: m.content?.slice(0, 50) + (m.content?.length > 50 ? '…' : ''),
          date: m.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 12)

      setRecentActivity(activity)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = clients.filter(c =>
    !search || (c.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  // ── Statut d'activité d'un client ─────────────────────────────────────────
  function clientStatus(c) {
    if (c.unread > 0) return { label: `${c.unread} msg`, color: '#2C64E5', bg: '#EEF2FF' }
    if (c.sessionsThisWeek >= 3) return { label: '🔥 Actif', color: '#3F7D58', bg: '#EEF6EE' }
    if (c.lastLogDays !== null && c.lastLogDays <= 3) return { label: 'Récent', color: '#B8860B', bg: '#FDF6E3' }
    if (c.lastLogDays === null || c.lastLogDays > 7) return { label: 'Inactif', color: '#C45C3A', bg: '#FEF0EB' }
    return { label: 'Suivi', color: '#6B7A99', bg: '#F5F7FF' }
  }

  if (loading) return (
    <Layout title="Cockpit Coach" user={user}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #EEF2FF', borderTopColor: '#0D1B4E', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ fontSize: 13, color: '#9BA8C0', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Chargement cockpit</div>
      </div>
    </Layout>
  )

  return (
    <Layout title="Cockpit Coach" user={user}>
      <div style={{ fontFamily: "'DM Sans',sans-serif", maxWidth: 1400, margin: '0 auto' }}>

        {/* ══ HEADER ═══════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, color: '#0D1B2A', letterSpacing: '2px', lineHeight: 1 }}>COCKPIT COACH</div>
            <div style={{ fontSize: 13, color: '#9BA8C0', marginTop: 4 }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <button
            onClick={() => router.push('/coach/nouveau-client')}
            style={{ padding: '11px 22px', background: '#0D1B2A', color: 'white', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            + Nouveau client
          </button>
        </div>

        {/* ══ KPIs ══════════════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Clients actifs', value: kpis.total, sub: 'total suivi', icon: '👥', color: '#0D1B2A', border: '#0D1B2A' },
            { label: 'Séances / semaine', value: kpis.activeWeek, sub: `sur ${kpis.total} clients`, icon: '🏋️', color: '#3F7D58', border: '#3F7D58' },
            { label: 'Bilans reçus', value: kpis.bilansThisWeek, sub: 'cette semaine', icon: '📋', color: '#B8860B', border: '#B8860B' },
            { label: 'Messages non lus', value: kpis.messagesUnread, sub: 'en attente', icon: '💬', color: kpis.messagesUnread > 0 ? '#C45C3A' : '#9BA8C0', border: kpis.messagesUnread > 0 ? '#C45C3A' : '#EDE9E0' },
          ].map((k, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 16, padding: '20px 22px', border: '1px solid #EDE9E0', borderTop: `3px solid ${k.border}`, boxShadow: '0 1px 4px rgba(13,27,42,0.05)' }}>
              <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#9BA8C0', fontWeight: 700, marginBottom: 8 }}>{k.icon} {k.label}</div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 40, color: k.color, lineHeight: 1, marginBottom: 4 }}>{k.value}</div>
              <div style={{ fontSize: 12, color: '#9BA8C0' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ══ BODY : liste clients + activité ══════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>

          {/* ── LISTE CLIENTS ─────────────────────────────────────────────── */}
          <div>
            {/* Searchbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9BA8C0' }}>🔍</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un client…"
                  style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid #EDE9E0', borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif", background: 'white', outline: 'none', boxSizing: 'border-box', color: '#0D1B2A' }}
                />
              </div>
              <div style={{ fontSize: 12, color: '#9BA8C0', whiteSpace: 'nowrap' }}>{filtered.length} client{filtered.length > 1 ? 's' : ''}</div>
            </div>

            {/* Tableau cockpit */}
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #EDE9E0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(13,27,42,0.05)' }}>
              {/* Header tableau */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 70px 80px 90px', gap: 8, padding: '10px 18px', background: '#F8F7F4', borderBottom: '1px solid #EDE9E0' }}>
                {['Client', 'Programme', 'Poids', 'Séances', 'Bilan', 'Statut'].map((h, i) => (
                  <div key={i} style={{ fontSize: 10, fontWeight: 700, color: '#9BA8C0', letterSpacing: '1.2px', textTransform: 'uppercase', textAlign: i > 1 ? 'center' : 'left' }}>{h}</div>
                ))}
              </div>

              {/* Lignes */}
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9BA8C0', fontSize: 14 }}>Aucun client trouvé</div>
              ) : filtered.map((c, idx) => {
                const status = clientStatus(c)
                const color = avatarColor(c.full_name || '')
                return (
                  <div
                    key={c.id}
                    onClick={() => router.push(`/coach/${c.id}?tab=overview`)}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 90px 70px 70px 80px 90px',
                      gap: 8, padding: '13px 18px', cursor: 'pointer',
                      borderBottom: idx < filtered.length - 1 ? '1px solid #F5F3EF' : 'none',
                      transition: 'background 0.12s',
                      alignItems: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Nom + avatar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                        {initials(c.full_name || c.email || '')}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0D1B2A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.full_name || c.email}</div>
                        <div style={{ fontSize: 11, color: '#9BA8C0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.current_cycle_name || 'Aucun cycle'}</div>
                      </div>
                    </div>

                    {/* Programme */}
                    <div style={{ fontSize: 11, color: '#6B7A99', textAlign: 'left', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {c.current_program || '—'}
                    </div>

                    {/* Poids */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#0D1B2A' }}>{c.lastWeight ? `${c.lastWeight}` : '—'}</div>
                      {c.lastWeight && <div style={{ fontSize: 10, color: '#9BA8C0' }}>kg</div>}
                    </div>

                    {/* Séances semaine */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: c.sessionsThisWeek > 0 ? '#3F7D58' : '#9BA8C0' }}>{c.sessionsThisWeek}</div>
                      <div style={{ fontSize: 10, color: '#9BA8C0' }}>cette sem.</div>
                    </div>

                    {/* Bilan */}
                    <div style={{ textAlign: 'center' }}>
                      {c.bilanThisWeek
                        ? <span style={{ fontSize: 18 }}>✅</span>
                        : <span style={{ fontSize: 11, color: '#C45C3A', fontWeight: 700 }}>En attente</span>
                      }
                    </div>

                    {/* Statut */}
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── FEED ACTIVITÉ RÉCENTE ─────────────────────────────────────── */}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #EDE9E0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(13,27,42,0.05)' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #EDE9E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#0D1B2A' }}>Activité récente</div>
              <div style={{ fontSize: 11, color: '#9BA8C0' }}>Live</div>
            </div>
            <div style={{ padding: '8px 0', maxHeight: 560, overflowY: 'auto' }}>
              {recentActivity.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9BA8C0', fontSize: 13 }}>Aucune activité récente</div>
              ) : recentActivity.map((a, i) => {
                const icon = { log: '🏋️', bilan: '📋', message: '💬' }[a.type]
                const color = { log: '#3F7D58', bilan: '#B8860B', message: '#2C64E5' }[a.type]
                const d = new Date(a.date)
                const isToday = d.toDateString() === new Date().toDateString()
                const timeStr = isToday
                  ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                const clientColor = avatarColor(a.clientName)
                return (
                  <div
                    key={i}
                    onClick={() => router.push(`/coach/${a.clientId}?tab=${a.type === 'message' ? 'messages' : a.type === 'bilan' ? 'bilan' : 'programme'}`)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 18px', cursor: 'pointer', borderBottom: i < recentActivity.length - 1 ? '1px solid #F5F3EF' : 'none', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: clientColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'white', flexShrink: 0, marginTop: 1 }}>
                      {initials(a.clientName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: '#0D1B2A' }}>{a.clientName}</span>
                        <span style={{ fontSize: 10, color: '#9BA8C0', flexShrink: 0 }}>{timeStr}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7A99', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        <span style={{ color }}>{icon}</span> {a.label}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  )
}
