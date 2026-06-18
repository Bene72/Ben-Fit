import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export default function CoachPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const currentUser = data.session?.user
        if (!currentUser) { router.push('/login'); return }
        setUser(currentUser)
        // ✅ On passe l'ID directement, pas besoin d'attendre le state
        await loadClients(currentUser.id)
      } catch (err) {
        console.error('Erreur init:', err)
        setLoading(false)
      }
    }
    init()
  }, [])

  const loadClients = async (coachId) => {
    try {
      setLoading(true)
      setError(null)

      // ✅ Filtre par coach_id — adapte le nom de colonne si besoin
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .eq('coach_id', coachId)

      if (error) {
        // Fallback : tous les clients sans filtre coach (si pas de colonne coach_id)
        console.warn('Filtre coach_id échoué, fallback sans filtre:', error.message)
        const { data: fallback, error: err2 } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'client')

        if (err2) throw err2
        setClients(fallback || [])
      } else {
        setClients(data || [])
      }
    } catch (err) {
      console.error('Erreur chargement clients:', err)
      setError(err.message)
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  const navigateToClient = (clientId) => {
    router.push(`/coach/${clientId}?tab=overview`)
  }

  if (loading) {
    return (
      <Layout title="Mes Élèves">
        <div style={{ textAlign: 'center', padding: '60px', color: '#6B7A99', fontSize: '14px' }}>
          ⏳ Chargement des élèves...
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout title="Erreur">
        <div style={{
          textAlign: 'center', padding: '60px', background: '#FFF5F5',
          borderRadius: '12px', border: '1px solid #FECACA', maxWidth: '600px', margin: '0 auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#991B1B', marginBottom: '8px' }}>
            Erreur de chargement
          </div>
          <div style={{ fontSize: '14px', color: '#6B7A99', marginBottom: '16px' }}>{error}</div>
          <div style={{ fontSize: '13px', color: '#999', marginBottom: '16px', background: '#F5F5F5', padding: '12px', borderRadius: '8px', textAlign: 'left' }}>
            <strong>💡 Solutions possibles :</strong>
            <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
              <li>Vérifie que la colonne <code>coach_id</code> existe dans <code>profiles</code></li>
              <li>Vérifie les politiques RLS dans Supabase</li>
              <li>Vérifie que tes clients ont bien <code>role = 'client'</code></li>
            </ul>
          </div>
          <button onClick={() => user && loadClients(user.id)} style={{
            padding: '8px 24px', background: '#0D1B4E', color: 'white',
            border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
            fontFamily: "'DM Sans',sans-serif"
          }}>
            🔄 Réessayer
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Mes Élèves">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '32px', color: '#0D1B4E', letterSpacing: '2px', marginBottom: '8px' }}>
            👥 Mes Élèves
          </h1>
          <p style={{ color: '#6B7A99', fontSize: '14px' }}>
            {clients.length} élève{clients.length > 1 ? 's' : ''} · Clique sur un élève pour accéder à son programme
          </p>
        </div>

        {clients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: 'white', borderRadius: '16px', border: '2px dashed #C5D0F0', color: '#6B7A99' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏋️</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#0D1B4E', marginBottom: '8px' }}>Aucun élève pour le moment</div>
            <div style={{ fontSize: '14px' }}>Les clients que tu suis apparaîtront ici.</div>
            <button onClick={() => user && loadClients(user.id)} style={{
              marginTop: '16px', padding: '8px 24px', background: '#EEF2FF',
              color: '#0D1B4E', border: '1px solid #C5D0F0', borderRadius: '8px',
              cursor: 'pointer', fontSize: '14px', fontFamily: "'DM Sans',sans-serif"
            }}>
              🔄 Rafraîchir
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {clients.map(client => {
              const displayName = client.full_name || client.name || client.email || 'Sans nom'
              const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

              return (
                <div
                  key={client.id}
                  onClick={() => navigateToClient(client.id)}
                  style={{
                    background: 'white', borderRadius: '14px', padding: '20px',
                    border: '1px solid #EAEAEA', cursor: 'pointer', transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '14px'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(13,27,78,0.12)'; e.currentTarget.style.borderColor = '#4A6FD4' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#EAEAEA' }}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%', background: '#EEF2FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', fontWeight: '700', color: '#0D1B4E', flexShrink: 0
                  }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '16px', color: '#0D1B4E' }}>{displayName}</div>
                    <div style={{ fontSize: '12px', color: '#6B7A99', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>👤 Client</span>
                      <span style={{ color: '#C5D0F0' }}>·</span>
                      <span>Cliquer pour gérer</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
