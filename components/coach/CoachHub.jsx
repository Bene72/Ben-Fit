import { useState } from 'react'
import { btn, sessionsThisWeek, lastWeight } from '../../lib/coachUtils'

export default function CoachHub({ clients, user, sessionsThisWeek, lastWeight, unreadCounts, onSelectClient, onNewClient }) {
  const [clientsOpen, setClientsOpen] = useState(true)
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const dateLabel = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const totalClients = clients.length
  const totalSessionsWeek = clients.reduce((sum, c) => sum + sessionsThisWeek(c), 0)
  const totalUnread = Object.values(unreadCounts).reduce((s, n) => s + n, 0)
  const activeClients = clients.filter(c => sessionsThisWeek(c) >= 1).length

  const alerts = []
  clients.forEach(c => {
    const sessions = sessionsThisWeek(c)
    const measures = (c.measures || []).sort((a, b) => new Date(b.date) - new Date(a.date))
    if (sessions === 0) alerts.push({ type: 'warning', client: c, msg: `Aucune séance cette semaine` })
    if (measures.length >= 2) {
      const delta = measures[0].weight - measures[1].weight
      if (delta >= 2) alerts.push({ type: 'danger', client: c, msg: `+${delta.toFixed(1)} kg en 1 mesure` })
      if (delta <= -2) alerts.push({ type: 'info', client: c, msg: `${delta.toFixed(1)} kg en 1 mesure` })
    }
    if (unreadCounts[c.id] > 0) alerts.push({ type: 'message', client: c, msg: `${unreadCounts[c.id]} message(s) non lu(s)` })
  })

  const recentActivity = []
  clients.forEach(c => {
    const measures = (c.measures || []).sort((a, b) => new Date(b.date) - new Date(a.date))
    if (measures[0]) recentActivity.push({ client: c, type: 'weight', value: measures[0].weight, date: measures[0].date })
  })
  recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date))

  const alertColors = { warning: '#D4A017', danger: '#C45C3A', info: '#4A6FD4', message: '#8FA07A' }
  const alertIcons = { warning: '⚠️', danger: '🔻', info: '📉', message: '💬' }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: '#0D1B4E', letterSpacing: '1px', lineHeight: 1 }}>
              {greeting} 👋
            </div>
            <div style={{ fontSize: 14, color: '#6B7A99', marginTop: 4 }}>
              {dateLabel} · {totalClients} client{totalClients > 1 ? 's' : ''} actif{totalClients > 1 ? 's' : ''}
            </div>
          </div>
          <button onClick={onNewClient} style={{ padding: '10px 20px', background: '#4A6FD4', color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", boxShadow: '0 4px 14px rgba(74,111,212,0.3)' }}>
            + Nouveau client
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { icon: '👥', label: 'Clients totaux', value: totalClients, sub: `${activeClients} actifs cette semaine`, color: '#4A6FD4', border: '#4A6FD4' },
          { icon: '✅', label: 'Séances / semaine', value: totalSessionsWeek, sub: `sur ${totalClients * 5} possibles`, color: '#8FA07A', border: '#8FA07A' },
          { icon: '💬', label: 'Messages non lus', value: totalUnread, sub: totalUnread > 0 ? 'À traiter' : 'Tout est lu ✓', color: totalUnread > 0 ? '#C45C3A' : '#8FA07A', border: totalUnread > 0 ? '#C45C3A' : '#C5D0F0' },
          { icon: '⚠️', label: 'Alertes', value: alerts.length, sub: alerts.length > 0 ? 'Voir ci-dessous' : 'Aucune alerte', color: alerts.length > 0 ? '#D4A017' : '#8FA07A', border: alerts.length > 0 ? '#D4A017' : '#C5D0F0' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: `1px solid #E8ECFA`, borderTop: `3px solid ${k.border}`, boxShadow: '0 2px 8px rgba(13,27,78,0.05)' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0D1B4E', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 4 }}>{k.label}</div>
            <div style={{ fontSize: 11, color: '#9BA8C0', marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div>
          <button onClick={() => setClientsOpen(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', border: '1px solid #E8ECFA', borderRadius: 12, padding: '12px 16px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", marginBottom: 8, boxShadow: '0 2px 6px rgba(13,27,78,0.04)', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#4A6FD4'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#E8ECFA'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>👥</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#0D1B4E' }}>Tous les clients</span>
              <span style={{ background: '#EEF2FF', color: '#4A6FD4', borderRadius: 20, fontSize: 11, fontWeight: 800, padding: '1px 9px' }}>{clients.length}</span>
            </div>
            <span style={{ fontSize: 18, color: '#9BA8C0', transition: 'transform 0.2s', transform: clientsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>⌄</span>
          </button>
          {clientsOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 10 }}>
              {clients.map(client => {
                const sessions = sessionsThisWeek(client)
                const target = client.session_target || 5
                const pct = Math.min(100, Math.round((sessions / target) * 100))
                const w = lastWeight(client)
                const measures = (client.measures || []).sort((a, b) => new Date(b.date) - new Date(a.date))
                const delta = measures.length >= 2 ? (measures[0].weight - measures[1].weight).toFixed(1) : null
                const hue = (client.full_name?.charCodeAt(0) || 65) * 7 % 360
                const statusColor = sessions >= target ? '#8FA07A' : sessions >= 2 ? '#4A6FD4' : '#C45C3A'
                const hasUnread = (unreadCounts[client.id] || 0) > 0

                return (
                  <div key={client.id} onClick={() => onSelectClient(client)}
                    style={{ background: 'white', borderRadius: 14, border: '1px solid #E8ECFA', padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative', boxShadow: '0 2px 6px rgba(13,27,78,0.04)' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(13,27,78,0.12)'; e.currentTarget.style.borderColor = '#4A6FD4' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 6px rgba(13,27,78,0.04)'; e.currentTarget.style.borderColor = '#E8ECFA' }}
                  >
                    {hasUnread && (
                      <div style={{ position: 'absolute', top: 12, right: 12, background: '#C45C3A', color: 'white', borderRadius: 20, fontSize: 9, fontWeight: 800, padding: '2px 7px' }}>
                        💬 {unreadCounts[client.id]}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: `hsl(${hue},40%,45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'white', fontWeight: 800, flexShrink: 0 }}>
                        {client.full_name?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0D1B4E', lineHeight: 1.2 }}>{client.full_name}</div>
                        <div style={{ fontSize: 10, color: '#9BA8C0', marginTop: 2 }}>{client.current_program || 'Aucun programme'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                      <div style={{ background: '#F8FAFF', borderRadius: 9, padding: '8px 10px' }}>
                        <div style={{ fontSize: 9, color: '#9BA8C0', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>Séances</div>
                        <div style={{ fontWeight: 900, fontSize: 18, color: statusColor, lineHeight: 1.1 }}>{sessions}<span style={{ fontSize: 11, fontWeight: 400, color: '#9BA8C0' }}>/{target}</span></div>
                      </div>
                      <div style={{ background: '#F8FAFF', borderRadius: 9, padding: '8px 10px' }}>
                        <div style={{ fontSize: 9, color: '#9BA8C0', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>Poids</div>
                        <div style={{ fontWeight: 900, fontSize: 18, color: '#C45C3A', lineHeight: 1.1 }}>
                          {w}<span style={{ fontSize: 11, fontWeight: 400, color: '#9BA8C0' }}> kg</span>
                          {delta !== null && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: parseFloat(delta) > 0 ? '#C45C3A' : '#8FA07A', marginLeft: 4 }}>
                              {parseFloat(delta) > 0 ? '+' : ''}{delta}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 9, color: '#9BA8C0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Progression semaine</span>
                        <span style={{ fontSize: 9, color: statusColor, fontWeight: 800 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 5, background: '#F0F0F0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: statusColor, width: `${pct}%`, borderRadius: 3, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E8ECFA', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0F0F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#0D1B4E' }}>⚠️ Alertes</div>
              {alerts.length > 0 && <span style={{ fontSize: 10, background: '#FFF3E0', color: '#D4A017', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{alerts.length}</span>}
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {alerts.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9BA8C0', fontSize: 12 }}>✅ Tout est au vert</div>
              ) : alerts.slice(0, 8).map((a, i) => (
                <div key={i} onClick={() => onSelectClient(a.client)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid #F8F8FA', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFF'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{alertIcons[a.type]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0D1B4E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.client.full_name?.split(' ')[0]}</div>
                    <div style={{ fontSize: 11, color: alertColors[a.type], fontWeight: 600 }}>{a.msg}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E8ECFA', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0F0F5' }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#0D1B4E' }}>🕐 Activité récente</div>
            </div>
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {recentActivity.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9BA8C0', fontSize: 12 }}>Aucune activité récente</div>
              ) : recentActivity.slice(0, 10).map((a, i) => {
                const hue = (a.client.full_name?.charCodeAt(0) || 65) * 7 % 360
                const dayDiff = Math.round((new Date() - new Date(a.date)) / 86400000)
                const timeLabel = dayDiff === 0 ? "aujourd'hui" : dayDiff === 1 ? 'hier' : `il y a ${dayDiff}j`
                return (
                  <div key={i} onClick={() => onSelectClient(a.client)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid #F8F8FA', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFF'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${hue},40%,45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', fontWeight: 800, flexShrink: 0 }}>
                      {a.client.full_name?.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0D1B4E' }}>{a.client.full_name?.split(' ')[0]}</div>
                      <div style={{ fontSize: 11, color: '#9BA8C0' }}>⚖️ {a.value} kg · {timeLabel}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
