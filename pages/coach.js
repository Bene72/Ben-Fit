import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export default function CoachPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user)
        loadClients()
      } else {
        router.push('/login')
      }
    })
  }, [])

  const loadClients = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('role', 'client')
      .order('full_name')
    setClients(data || [])
    setLoading(false)
  }

  const navigateToClient = (clientId) => {
    router.push(`/coach/${clientId}?tab=overview`)
  }

  if (loading) {
    return (
      <Layout title="Chargement..." user={user}>
        <div style={{ textAlign: 'center', padding: '60px', color: '#6B7A99' }}>
          Chargement des élèves...
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Mes Élèves" user={user}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '32px', color: '#0D1B4E', letterSpacing: '2px', marginBottom: '8px' }}>
            👥 Mes Élèves
          </h1>
          <p style={{ color: '#6B7A99' }}>{clients.length} élève{clients.length > 1 ? 's' : ''} · Clique sur un élève pour accéder à son programme</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {clients.map(client => (
            <div
              key={client.id}
              onClick={() => navigateToClient(client.id)}
              style={{
                background: 'white',
                borderRadius: '14px',
                padding: '20px',
                border: '1px solid #EAEAEA',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#EEF2FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#0D1B4E',
                  flexShrink: 0
                }}>
                  {client.full_name?.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '16px', color: '#0D1B4E' }}>
                    {client.full_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7A99' }}>
                    Cliquez pour gérer son programme
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {clients.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6B7A99' }}>
            Aucun élève pour le moment.
          </div>
        )}
      </div>
    </Layout>
  )
}
