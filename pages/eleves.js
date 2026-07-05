'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import AppShell from '../components/ui/AppShell'

export default function ElevesPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [form, setForm] = useState({ email: '', password: '', full_name: '', objective: '', height: '', current_program: '' })

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const currentUser = data.session?.user
        if (!currentUser) { router.push('/login'); return }
        setUser(currentUser)
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

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .eq('coach_id', coachId)

      if (error) {
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

  const resetForm = () => {
    setForm({ email: '', password: '', full_name: '', objective: '', height: '', current_program: '' })
    setCreateError('')
  }

  const createClient = async () => {
    setCreateError('')
    if (!form.email || !form.password) {
      setCreateError('Email et mot de passe sont obligatoires.')
      return
    }
    if (form.password.length < 6) {
      setCreateError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }

    setCreating(true)
    try {
      // Force un refresh du token pour éviter "Invalid Refresh Token" après inactivité
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      const session = refreshData?.session

      if (refreshError || !session?.access_token) {
        // Session vraiment morte → renvoyer au login
        router.push('/login')
        return
      }

      const res = await fetch('/api/create-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erreur lors de la création')

      setClients(prev => [result.profile, ...prev])
      setShowCreate(false)
      resetForm()
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const filtered = clients.filter(c => {
    const name = (c.full_name || c.name || c.email || '').toLowerCase()
    return name.includes(search.toLowerCase())
  })

  // ── États dérivés pour le hero ──
  const totalClients = clients.length
  const withProgram = clients.filter(c => c.current_program).length

  if (loading) {
    return (
      <AppShell title="Mes Élèves">
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
      <AppShell title="Mes Élèves">
        <div style={{
          textAlign: 'center', padding: '60px', background: '#FFF5F5',
          borderRadius: '16px', border: '1px solid #FECACA', maxWidth: '600px', margin: '0 auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#991B1B', marginBottom: '8px', fontFamily: "'Playfair Display',serif" }}>
            Erreur de chargement
          </div>
          <div style={{ fontSize: '14px', color: '#6B7A99', marginBottom: '16px' }}>{error}</div>
          <button onClick={() => user && loadClients(user.id)} style={{
            padding: '10px 24px', background: '#0D1B2A', color: 'white',
            border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px',
            fontFamily: "'DM Sans',sans-serif", fontWeight: 700
          }}>
            🔄 Réessayer
          </button>
        </div>
      </AppShell>
    )
  }

  const inpC = { width: '100%', padding: '10px 12px', border: '1.5px solid #E8E4DC', borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", background: '#FAF9F7', outline: 'none', color: '#0D1B2A', boxSizing: 'border-box' }
  const lblC = { display: 'block', fontSize: 11, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#8A8070', marginBottom: 5, fontWeight: 700 }

  return (
    <AppShell title="Mes Élèves">
      <div style={{ background: '#FAF9F7', minHeight: '100vh', fontFamily: "'DM Sans',sans-serif", margin: '-24px -28px', padding: isMobile ? '20px 16px' : '24px 28px' }}>

        {/* ══ HERO ══ */}
        <div style={{
          background: '#0D1B2A', borderRadius: 20,
          padding: isMobile ? '24px 18px' : '32px 36px',
          marginBottom: 20, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(184,134,11,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: '2px', textTransform: 'uppercase', color: '#B8860B', fontWeight: 700, marginBottom: 8 }}>
                ESPACE COACH
              </div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: isMobile ? 24 : 34, fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: 6 }}>
                👥 Mes Élèves
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 20 }}>
                {totalClients} élève{totalClients > 1 ? 's' : ''} sous ton suivi
              </div>
              <button onClick={() => { setShowCreate(true); resetForm() }} style={{
                padding: '11px 22px', background: '#B8860B', color: 'white',
                border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                boxShadow: '0 4px 16px rgba(184,134,11,0.35)',
              }}>+ Nouvel élève</button>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 18px', minWidth: 100, backdropFilter: 'blur(10px)', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 800, color: '#B8860B' }}>{totalClients}</div>
                <div style={{ fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Total</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 18px', minWidth: 100, backdropFilter: 'blur(10px)', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 800, color: '#3F7D58' }}>{withProgram}</div>
                <div style={{ fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Avec programme</div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ MODALE CRÉATION ══ */}
        {showCreate && (
          <div onClick={() => !creating && setShowCreate(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(13,27,42,0.55)',
            backdropFilter: 'blur(2px)', zIndex: 300, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 16,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'white', borderRadius: 18, padding: isMobile ? '22px 18px' : '28px 30px',
              maxWidth: 460, width: '100%', maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(13,27,42,0.3)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 800, color: '#0D1B2A' }}>
                  + Nouvel élève
                </div>
                <button onClick={() => !creating && setShowCreate(false)} style={{
                  background: '#F0EDE6', border: 'none', borderRadius: 8, width: 28, height: 28,
                  cursor: 'pointer', fontSize: 14, color: '#8A8070',
                }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={lblC}>Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="eleve@example.com" style={inpC} />
                </div>
                <div>
                  <label style={lblC}>Mot de passe provisoire *</label>
                  <input type="password" autoComplete="new-password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="6 caractères minimum" style={inpC} />
                </div>
                <div>
                  <label style={lblC}>Prénom / Nom</label>
                  <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Camille Dupont" style={inpC} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={lblC}>Taille (cm)</label>
                    <input type="number" value={form.height} onChange={e => setForm(p => ({ ...p, height: e.target.value }))} placeholder="170" style={inpC} />
                  </div>
                  <div>
                    <label style={lblC}>Programme</label>
                    <input value={form.current_program} onChange={e => setForm(p => ({ ...p, current_program: e.target.value }))} placeholder="Phase 1" style={inpC} />
                  </div>
                </div>
                <div>
                  <label style={lblC}>Objectif</label>
                  <input value={form.objective} onChange={e => setForm(p => ({ ...p, objective: e.target.value }))} placeholder="Prise de masse…" style={inpC} />
                </div>

                {createError && (
                  <div style={{ background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 9, padding: '10px 12px', color: '#C45C3A', fontSize: 13 }}>
                    {createError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button onClick={createClient} disabled={creating} style={{
                    flex: 1, padding: '11px 20px', background: '#0D1B2A', color: 'white',
                    border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    cursor: creating ? 'default' : 'pointer', fontFamily: "'DM Sans',sans-serif",
                    opacity: creating ? 0.7 : 1,
                  }}>
                    {creating ? 'Création…' : '✓ Créer le compte'}
                  </button>
                  <button onClick={() => !creating && setShowCreate(false)} style={{
                    padding: '11px 20px', background: 'transparent', color: '#8A8070',
                    border: '1.5px solid #E8E4DC', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                  }}>Annuler</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ RECHERCHE ══ */}
        <div style={{ marginBottom: 20 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Rechercher un élève par nom ou email…"
            style={{
              width: '100%', padding: '12px 16px', border: '1.5px solid #E8E4DC',
              borderRadius: 12, fontSize: 14, fontFamily: "'DM Sans',sans-serif",
              background: 'white', outline: 'none', color: '#0D1B2A', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* ══ GRID ÉLÈVES ══ */}
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 20px', background: 'white',
            borderRadius: '20px', border: '2px dashed #E8E4DC', color: '#8A8070'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏋️</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#0D1B2A', marginBottom: '8px', fontFamily: "'Playfair Display',serif" }}>
              {search ? 'Aucun résultat' : 'Aucun élève pour le moment'}
            </div>
            <div style={{ fontSize: '14px', marginBottom: search ? 0 : 16 }}>
              {search ? 'Essaie un autre terme de recherche.' : 'Crée ton premier élève pour commencer.'}
            </div>
            {!search && (
              <button onClick={() => { setShowCreate(true); resetForm() }} style={{
                padding: '10px 22px', background: '#0D1B2A', color: 'white',
                border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
              }}>+ Nouvel élève</button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '14px'
          }}>
            {filtered.map(client => {
              const displayName = client.full_name || client.name || client.email || 'Sans nom'
              const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

              return (
                <div
                  key={client.id}
                  onClick={() => navigateToClient(client.id)}
                  style={{
                    background: 'white', borderRadius: '16px', padding: '20px',
                    border: '1px solid #EDE9E0', cursor: 'pointer', transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(13,27,42,0.04)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 10px 28px rgba(13,27,42,0.12)'
                    e.currentTarget.style.borderColor = '#B8860B'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(13,27,42,0.04)'
                    e.currentTarget.style.borderColor = '#EDE9E0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: client.current_program || client.objective ? 14 : 0 }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0D1B2A, #1A2F4A)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '17px', fontWeight: '800', color: '#B8860B', flexShrink: 0,
                      fontFamily: "'Playfair Display',serif",
                    }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: '#0D1B2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#A09880', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client.email}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, color: '#C5D0F0', flexShrink: 0 }}>→</div>
                  </div>

                  {(client.current_program || client.objective) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 14, borderTop: '1px solid #F0EDE6' }}>
                      {client.current_program && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <span style={{ color: '#A09880' }}>💪</span>
                          <span style={{ color: '#0D1B2A', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.current_program}</span>
                        </div>
                      )}
                      {client.objective && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <span style={{ color: '#A09880' }}>🎯</span>
                          <span style={{ color: '#6B7A99', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.objective}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
