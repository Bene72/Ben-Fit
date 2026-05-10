// Nouvelle version de CoachHub - Dashboard Cockpit
export default function CoachHub({ clients, user, sessionsThisWeek, lastWeight, unreadCounts, onSelectClient, onNewClient }) {
  const [cockpitView, setCockpitView] = useState('clients') // 'clients', 'alerts', 'insights'
  
  // Calcul des alertes intelligentes
  const smartAlerts = []
  clients.forEach(client => {
    const sessions = sessionsThisWeek(client)
    const lastMood = client.last_mood // à récupérer via join
    
    if (sessions === 0) smartAlerts.push({ type: 'danger', client, msg: '⚠️ Aucune séance cette semaine', icon: '🚨' })
    if (sessions === 1) smartAlerts.push({ type: 'warning', client, msg: '⚡ Seulement 1 séance cette semaine', icon: '⚠️' })
    if (lastMood?.energy <= 2) smartAlerts.push({ type: 'info', client, msg: `😴 Fatigue élevée (${lastMood.energy}/5)`, icon: '😴' })
    if (unreadCounts[client.id] > 2) smartAlerts.push({ type: 'message', client, msg: `${unreadCounts[client.id]} messages non lus`, icon: '💬' })
  })

  const insights = {
    topPerformers: clients.filter(c => sessionsThisWeek(c) >= 4).length,
    atRisk: clients.filter(c => sessionsThisWeek(c) === 0).length,
    avgSessions: (clients.reduce((sum, c) => sum + sessionsThisWeek(c), 0) / clients.length || 0).toFixed(1)
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header Cockpit */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#0D1B4E' }}>COCKPIT COACH</h1>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {[
            { id: 'clients', label: '👥 Clients', icon: '👥' },
            { id: 'alerts', label: `🚨 Alertes (${smartAlerts.length})`, icon: '🚨' },
            { id: 'insights', label: '📊 Insights IA', icon: '🤖' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCockpitView(tab.id)}
              style={{
                padding: '8px 16px', borderRadius: '8px', background: cockpitView === tab.id ? '#0D1B4E' : '#F0F4FF',
                color: cockpitView === tab.id ? 'white' : '#0D1B4E', border: 'none', fontWeight: '600', cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#0D1B4E', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{clients.length}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Clients actifs</div>
        </div>
        <div style={{ background: '#4A6FD4', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{insights.topPerformers}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>💪 4+ séances/semaine</div>
        </div>
        <div style={{ background: '#C45C3A', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{insights.atRisk}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>⚠️ Clients à risque</div>
        </div>
        <div style={{ background: '#8FA07A', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{insights.avgSessions}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>📊 Moyenne séances</div>
        </div>
      </div>

      {/* Contenu dynamique */}
      {cockpitView === 'clients' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 12 }}>
          {clients.map(client => {
            const sessions = sessionsThisWeek(client)
            const target = client.session_target || 5
            const pct = Math.min(100, Math.round((sessions / target) * 100))
            return (
              <div key={client.id} onClick={() => onSelectClient(client)} style={{ background: 'white', borderRadius: 12, padding: 16, cursor: 'pointer', border: '1px solid #E8ECFA' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `hsl(${(client.full_name?.charCodeAt(0) || 65) * 7 % 360},40%,45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>{client.full_name?.substring(0,2).toUpperCase()}</div>
                  <div><div style={{ fontWeight: 700 }}>{client.full_name}</div><div style={{ fontSize: 11, color: '#9BA8C0' }}>{client.current_program || 'Aucun programme'}</div></div>
                  {unreadCounts[client.id] > 0 && <div style={{ marginLeft: 'auto', background: '#C45C3A', color: 'white', borderRadius: 20, padding: '2px 8px', fontSize: 11 }}>💬 {unreadCounts[client.id]}</div>}
                </div>
                <div style={{ height: 6, background: '#F0F0F0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', background: sessions >= target ? '#8FA07A' : sessions >= 2 ? '#4A6FD4' : '#C45C3A', width: `${pct}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span>{sessions}/{target} séances</span>
                  <span>{lastWeight(client)} kg</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {cockpitView === 'alerts' && (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden' }}>
          {smartAlerts.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#8FA07A' }}>✅ Tout est calme !</div>
          ) : (
            smartAlerts.map((alert, i) => (
              <div key={i} onClick={() => onSelectClient(alert.client)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderBottom: '1px solid #F0F0F0', cursor: 'pointer' }}>
                <span style={{ fontSize: 20 }}>{alert.icon}</span>
                <div><div style={{ fontWeight: 600 }}>{alert.client.full_name}</div><div style={{ fontSize: 13, color: alert.type === 'danger' ? '#C45C3A' : '#6B7A99' }}>{alert.msg}</div></div>
              </div>
            ))
          )}
        </div>
      )}

      {cockpitView === 'insights' && (
        <div style={{ background: '#F0F4FF', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 24 }}>🤖</span>
            <div><div style={{ fontWeight: 700 }}>IA Coach Assistant</div><div style={{ fontSize: 12, color: '#6B7A99' }}>Analyse de la semaine</div></div>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>📉 {insights.atRisk} client(s) sans séance cette semaine → check-in recommandé</li>
            <li style={{ marginBottom: 8 }}>💪 {insights.topPerformers} client(s) excellentes performances</li>
            <li style={{ marginBottom: 8 }}>📊 Moyenne d'adhérence : {insights.avgSessions}/5</li>
          </ul>
          <button style={{ marginTop: 16, padding: '8px 16px', background: '#0D1B4E', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>🔍 Analyser en détail</button>
        </div>
      )}
    </div>
  )
}
