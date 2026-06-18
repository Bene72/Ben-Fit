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
        if (data.session?.user) {
          setUser(data.session.user)
          await loadClients()
        } else {
          router.push('/login')
        }
      } catch (err) {
        console.error('Erreur init:', err)
        setLoading(false)
      }
    }
    init()
  }, [])

  const loadClients = async () => {
    try {
      setLoading(true)
      setError(null)

      // MÉTHODE 1: Avec filtre role
      console.log('Tentative 1: avec filtre role...')
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('role', 'client')
        .order('full_name', { ascending: true })
      
      if (error) {
        console.warn('Erreur méthode 1:', error.message)
        
        // MÉTHODE 2: Sans filtre, tout récupérer
        console.log('Tentative 2: sans filtre...')
        const { data: data2, error: error2 } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .order('full_name', { ascending: true })
        
        if (error2) {
          console.warn('Erreur méthode 2:', error2.message)
          
          // MÉTHODE 3: Sélection limitée
          console.log('Tentative 3: sélection limitée...')
          const { data: data3, error: error3 } = await supabase
            .from('profiles')
            .select('id, full_name')
            .limit(100)
          
          if (error3) {
            console.error('Erreur méthode 3:', error3.message)
            setError('Impossible de charger les clients: ' + error3.message)
            setClients([])
          } else {
            setClients(data3 || [])
          }
        } else {
          // Filtrer côté client si la colonne role existe
          const clientsList = (data2 || []).filter(p => p.role === 'client')
          setClients(clientsList.length > 0 ? clientsList : data2 || [])
        }
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

  // Affichage du chargement
  if (loading) {
    return (
      <Layout title="Chargement..." user={user}>
        <div style={{ 
          textAlign: 'center', 
          padding: '60px', 
          color: '#6B7A99',
          fontSize: '14px'
        }}>
          ⏳ Chargement des élèves...
        </div>
      </Layout>
    )
  }

  // Affichage de l'erreur
  if (error) {
    return (
      <Layout title="Erreur" user={user}>
        <div style={{ 
          textAlign: 'center', 
          padding: '60px',
          background: '#FFF5F5',
          borderRadius: '12px',
          border: '1px solid #FECACA'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#991B1B', marginBottom: '8px' }}>
            Erreur de chargement
          </div>
          <div style={{ fontSize: '14px', color: '#6B7A99', marginBottom: '16px' }}>
            {error}
          </div>
          <button
            onClick={loadClients}
            style={{
              padding: '8px 24px',
              background: '#0D1B4E',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: "'DM Sans',sans-serif"
            }}
          >
            🔄 Réessayer
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Mes Élèves" user={user}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ 
            fontFamily: "'Bebas Neue',sans-serif", 
            fontSize: '32px', 
            color: '#0D1B4E', 
            letterSpacing: '2px', 
            marginBottom: '8px' 
          }}>
            👥 Mes Élèves
          </h1>
          <p style={{ color: '#6B7A99', fontSize: '14px' }}>
            {clients.length} élève{clients.length > 1 ? 's' : ''} · Clique sur un élève pour accéder à son programme
          </p>
        </div>

        {clients.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '80px 20px',
            background: 'white',
            borderRadius: '16px',
            border: '2px dashed #C5D0F0',
            color: '#6B7A99'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏋️</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#0D1B4E', marginBottom: '8px' }}>
              Aucun élève pour le moment
            </div>
            <div style={{ fontSize: '14px' }}>
              Les clients que tu suis apparaîtront ici.
            </div>
            <button
              onClick={loadClients}
              style={{
                marginTop: '16px',
                padding: '8px 24px',
                background: '#EEF2FF',
                color: '#0D1B4E',
                border: '1px solid #C5D0F0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: "'DM Sans',sans-serif"
              }}
            >
              🔄 Rafraîchir
            </button>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '16px' 
          }}>
            {clients.map(client => {
              const initials = client.full_name
                ?.split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || '?'
              
              return (
                <div
                  key={client.id}
                  onClick={() => navigateToClient(client.id)}
                  style={{
                    background: 'white',
                    borderRadius: '14px',
                    padding: '20px',
                    border: '1px solid #EAEAEA',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(13,27,78,0.12)'
                    e.currentTarget.style.borderColor = '#4A6FD4'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
                    e.currentTarget.style.borderColor = '#EAEAEA'
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: '#EEF2FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#0D1B4E',
                    flexShrink: 0
                  }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ 
                      fontWeight: '600', 
                      fontSize: '16px', 
                      color: '#0D1B4E' 
                    }}>
                      {client.full_name || 'Sans nom'}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#6B7A99',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>👤 Client</span>
                      <span style={{ color: '#C5D0F0' }}>·</span>
                      <span>Cliquez pour gérer</span>
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
