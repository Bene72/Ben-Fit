import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

export default function CoachPanel() {
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'coach') { router.push('/dashboard'); return }

      setUser(user)

      const { data: c } = await supabase
        .from('profiles')
        .select('*, measures(weight, date), workout_sessions(date)')
        .eq('coach_id', user.id)
        .eq('role', 'client')
        .order('full_name')
      setClients(c || [])
      setLoading(false)
    }
    load()
  }, [])

  const selectClient = (client) => {
    setSelected(client)
    setNote(client.coach_note || '')
    setTab('overview')
  }

  const saveNote = async () => {
    setSaving(true)
    await supabase.from('profiles').update({ coach_note: note }).eq('id', selected.id)
    setClients(prev => prev.map(c => c.id === selected.id ? { ...c, coach_note: note } : c))
    setSelected(prev => ({ ...prev, coach_note: note }))
    setSaving(false)
  }

  const createClient = async () => {
    const email = prompt('Email du nouveau client :')
    const name = prompt('Nom complet :')
    if (!email || !name) return

    const { data, error } = await supabase.auth.admin.createUser({
      email, password: 'ChangeMe123!',
      user_metadata: { full_name: name }
    })

    if (!error) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: name,
        email,
        role: 'client',
        coach_id: user.id
      })
      alert(`Client créé ! Mot de passe temporaire : ChangeMe123!`)
    }
  }

  if (loading) return <LoadingScreen />

  const sessionsThisWeek = (client) => {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    return (client.workout_sessions || []).filter(s => new Date(s.date) >= weekStart).length
  }

  const lastWeight = (client) => {
    const m = client.measures?.sort((a, b) => new Date(b.date) - new Date(a.date))
    return m?.[0]?.weight || '—'
  }

  return (
    <>
      <Head>
        <title>Le Pavillon — Coach Admin</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F0E8', fontFamily: "'DM Sans', sans-serif" }}>

        {/* SIDEBAR COACH */}
        <aside style={{
          width: '280px', background: '#1A1A14', position: 'fixed',
          top: 0, bottom: 0, left: 0, display: 'flex', flexDirection: 'column',
          padding: '28px 0', zIndex: 100, overflowY: 'auto'
        }}>
          <div style={{ padding: '0 24px 24px', borderBottom: '1px solid #2E2E24' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#C8A85A' }}>Le Pavillon</div>
            <div style={{ fontSize: '10px', color: '#7A7A6A', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>
              Coach Dashboard
            </div>
          </div>

          <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#444438', padding: '0 12px', marginBottom: '8px' }}>
              {clients.length} clients
            </div>
            {clients.map(client => {
              const isSelected = selected?.id === client.id
              const w = sessionsThisWeek(client)
              return (
                <button key={client.id} onClick={() => selectClient(client)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                  background: isSelected ? '#4A5240' : 'transparent',
                  border: 'none', width: '100%', textAlign: 'left',
                  fontFamily: "'DM Sans', sans-serif", marginBottom: '2px',
                  transition: 'all 0.2s'
                }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                    background: `hsl(${client.full_name?.charCodeAt(0) * 7 % 360}, 40%, 45%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', color: 'white', fontWeight: '700'
                  }}>
                    {client.full_name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: isSelected ? 'white' : '#C8C8B8', fontWeight: '500' }}>
                      {client.full_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#7A7A6A' }}>
                      {w}/5 séances · {lastWeight(client)} kg
                    </div>
                  </div>
                  {w >= 4 && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#8FA07A', flexShrink: 0 }} />}
                  {w <= 1 && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C45C3A', flexShrink: 0 }} />}
                </button>
              )
            })}
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid #2E2E24' }}>
            <button onClick={createClient} style={{
              width: '100%', padding: '9px', background: '#C8A85A', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif"
            }}>+ Nouveau client</button>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ marginLeft: '280px', flex: 1 }}>
          {!selected ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100vh', flexDirection: 'column', gap: '12px', color: '#7A7A6A'
            }}>
              <div style={{ fontSize: '48px' }}>👈</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px' }}>
                Sélectionne un client
              </div>
            </div>
          ) : (
            <>
              {/* Client header */}
              <div style={{
                padding: '20px 40px', borderBottom: '1px solid #E0D9CC',
                background: '#F5F0E8', position: 'sticky', top: 0, zIndex: 50,
                display: 'flex', alignItems: 'center', gap: '16px'
              }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  background: `hsl(${selected.full_name?.charCodeAt(0) * 7 % 360}, 40%, 45%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', color: 'white', fontWeight: '700'
                }}>
                  {selected.full_name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: '700' }}>
                    {selected.full_name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#7A7A6A' }}>{selected.email}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  {['overview', 'programme', 'nutrition', 'messages'].map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                      padding: '7px 14px', borderRadius: '8px', fontSize: '13px',
                      fontWeight: '500', cursor: 'pointer', border: 'none',
                      background: tab === t ? '#4A5240' : 'transparent',
                      color: tab === t ? 'white' : '#7A7A6A',
                      fontFamily: "'DM Sans', sans-serif",
                      textTransform: 'capitalize'
                    }}>{t}</button>
                  ))}
                </div>
              </div>

              <div style={{ padding: '32px 40px' }}>
                {tab === 'overview' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
                      {[
                        { label: 'Séances cette semaine', value: `${sessionsThisWeek(selected)}/5`, accent: '#C8A85A' },
                        { label: 'Dernier poids', value: `${lastWeight(selected)} kg`, accent: '#C45C3A' },
                        { label: 'Programme actuel', value: selected.current_program || 'Phase 2', accent: '#4A5240' },
                      ].map((s, i) => (
                        <div key={i} style={{
                          background: '#FDFAF4', border: '1px solid #E0D9CC',
                          borderRadius: '14px', padding: '20px 24px', borderTop: `3px solid ${s.accent}`
                        }}>
                          <div style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A7A6A', marginBottom: '8px' }}>{s.label}</div>
                          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', fontWeight: '700' }}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Coach note */}
                    <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', padding: '24px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                        📌 Message / Note pour {selected.full_name?.split(' ')[0]}
                      </div>
                      <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Écris une note ou un message qui apparaîtra sur le dashboard du client…"
                        rows={5}
                        style={{
                          width: '100%', padding: '12px 14px',
                          border: '1.5px solid #E0D9CC', borderRadius: '10px',
                          fontSize: '14px', fontFamily: "'DM Sans', sans-serif",
                          background: 'white', resize: 'vertical', outline: 'none',
                          lineHeight: '1.6'
                        }}
                      />
                      <button onClick={saveNote} disabled={saving} style={{
                        marginTop: '12px', padding: '9px 20px',
                        background: saving ? '#8FA07A' : '#4A5240', color: 'white',
                        border: 'none', borderRadius: '8px', fontSize: '13px',
                        fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
                        fontFamily: "'DM Sans', sans-serif"
                      }}>
                        {saving ? 'Sauvegarde…' : '✓ Enregistrer'}
                      </button>
                    </div>
                  </div>
                )}

                {tab === 'programme' && (
                  <div style={{
                    background: '#FDFAF4', border: '1px solid #E0D9CC',
                    borderRadius: '14px', padding: '32px', textAlign: 'center', color: '#7A7A6A'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏋️</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', marginBottom: '8px' }}>
                      Gestion du programme
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      Gère les séances de {selected.full_name?.split(' ')[0]} directement dans Supabase Studio, ou étends cette page selon tes besoins.
                    </div>
                  </div>
                )}

                {tab === 'nutrition' && (
                  <div style={{
                    background: '#FDFAF4', border: '1px solid #E0D9CC',
                    borderRadius: '14px', padding: '32px', textAlign: 'center', color: '#7A7A6A'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🥗</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', marginBottom: '8px' }}>
                      Gestion de la nutrition
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      Configure le plan nutritionnel de {selected.full_name?.split(' ')[0]} depuis Supabase Studio.
                    </div>
                  </div>
                )}

                {tab === 'messages' && (
                  <CoachMessages coachId={user.id} clientId={selected.id} clientName={selected.full_name} />
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}

function CoachMessages({ coachId, clientId, clientName }) {
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const endRef = useRef(null)
  const { useRef } = require('react')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('messages').select('*')
        .or(`and(sender_id.eq.${coachId},receiver_id.eq.${clientId}),and(sender_id.eq.${clientId},receiver_id.eq.${coachId})`)
        .order('created_at')
      setMessages(data || [])
    }
    load()
  }, [clientId])

  const send = async () => {
    if (!newMsg.trim()) return
    const { data } = await supabase.from('messages').insert({
      sender_id: coachId, receiver_id: clientId,
      content: newMsg.trim(), read: false
    }).select().single()
    if (data) setMessages(prev => [...prev, data])
    setNewMsg('')
  }

  return (
    <div style={{ background: '#FDFAF4', border: '1px solid #E0D9CC', borderRadius: '14px', display: 'flex', flexDirection: 'column', height: '500px' }}>
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map(msg => {
          const isCoach = msg.sender_id === coachId
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isCoach ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '70%' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: '14px', fontSize: '14px', lineHeight: '1.5',
                  background: isCoach ? '#4A5240' : '#E0D9CC',
                  color: isCoach ? 'white' : '#1A1A14',
                  borderBottomRightRadius: isCoach ? '4px' : '14px',
                  borderBottomLeftRadius: isCoach ? '14px' : '4px',
                }}>
                  {msg.content}
                </div>
                <div style={{ fontSize: '11px', color: '#7A7A6A', marginTop: '4px', textAlign: isCoach ? 'right' : 'left' }}>
                  {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ padding: '14px 16px', borderTop: '1px solid #E0D9CC', display: 'flex', gap: '10px' }}>
        <input
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={`Message à ${clientName?.split(' ')[0]}…`}
          style={{
            flex: 1, padding: '10px 14px', border: '1.5px solid #E0D9CC',
            borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans', sans-serif",
            background: 'white', outline: 'none'
          }}
        />
        <button onClick={send} style={{
          padding: '10px 20px', background: '#4A5240', color: 'white',
          border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif"
        }}>Envoyer</button>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8', fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#7A7A6A' }}>
      Chargement…
    </div>
  )
}
