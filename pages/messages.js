import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export const dynamic = 'force-dynamic
export default function Messages() {
  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      // Load messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true })
      setMessages(msgs || [])

      // Mark as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('receiver_id', user.id)
        .eq('read', false)

      // Real-time subscription
      const channel = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        }, payload => {
          setMessages(prev => [...prev, payload.new])
        })
        .subscribe()

      return () => supabase.removeChannel(channel)
    }
    load()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!newMsg.trim() || sending) return
    setSending(true)

    // Get coach id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('coach_id')
      .eq('id', user.id)
      .single()

    const { data } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: profile?.coach_id,
        content: newMsg.trim(),
        read: false
      })
      .select()
      .single()

    if (data) setMessages(prev => [...prev, data])
    setNewMsg('')
    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!user) return <LoadingScreen />

  return (
    <Layout title="Messages" user={user}>
      <div style={{
        background: '#F0F4FF', border: '1px solid #C5D0F0',
        borderRadius: '14px', display: 'flex', flexDirection: 'column',
        height: '600px'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #C5D0F0',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #4A6FD4, #C45C3A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Playfair Display', serif", fontSize: '14px', color: 'white', fontWeight: '700'
          }}>B</div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '15px' }}>Benjamin — Coach</div>
            <div style={{ fontSize: '12px', color: '#8FA07A' }}>● Disponible</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6B7A99', fontSize: '14px', marginTop: '40px' }}>
              Commence la conversation avec ton coach 👋
            </div>
          ) : messages.map(msg => {
            const isSent = msg.sender_id === user.id
            return (
              <div key={msg.id} style={{
                display: 'flex', justifyContent: isSent ? 'flex-end' : 'flex-start',
                gap: '10px'
              }}>
                <div style={{ maxWidth: '70%' }}>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '14px',
                    fontSize: '14px', lineHeight: '1.5',
                    background: isSent ? '#0D1B4E' : '#C5D0F0',
                    color: isSent ? 'white' : '#0D1B4E',
                    borderBottomRightRadius: isSent ? '4px' : '14px',
                    borderBottomLeftRadius: isSent ? '14px' : '4px',
                  }}>
                    {msg.content}
                  </div>
                  <div style={{
                    fontSize: '11px', color: '#6B7A99', marginTop: '4px',
                    textAlign: isSent ? 'right' : 'left'
                  }}>
                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '14px 16px', borderTop: '1px solid #C5D0F0',
          display: 'flex', gap: '10px', alignItems: 'flex-end'
        }}>
          <textarea
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écris ton message… (Entrée pour envoyer)"
            rows={2}
            style={{
              flex: 1, padding: '10px 14px',
              border: '1.5px solid #C5D0F0', borderRadius: '10px',
              fontSize: '14px', fontFamily: "'DM Sans', sans-serif",
              background: 'white', resize: 'none', outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = '#0D1B4E'}
            onBlur={e => e.target.style.borderColor = '#C5D0F0'}
          />
          <button onClick={sendMessage} disabled={sending || !newMsg.trim()} style={{
            padding: '10px 20px', background: sending || !newMsg.trim() ? '#8FA07A' : '#0D1B4E',
            color: 'white', border: 'none', borderRadius: '10px',
            fontSize: '13px', fontWeight: '600', cursor: sending ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif", transition: 'background 0.2s'
          }}>
            Envoyer
          </button>
        </div>
      </div>
    </Layout>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EEF2FF', fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#6B7A99' }}>
      Chargement…
    </div>
  )
}
