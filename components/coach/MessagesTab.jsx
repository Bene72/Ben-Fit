import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

function MessagesTab({ coachId, clientId, clientName, onRead }) {
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${coachId},receiver_id.eq.${clientId}),and(sender_id.eq.${clientId},receiver_id.eq.${coachId})`)
        .order('created_at')
      setMessages(data || [])

      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', clientId)
        .eq('receiver_id', coachId)
        .eq('read', false)
      onRead?.(clientId)

      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

      if (channelRef.current) supabase.removeChannel(channelRef.current)
      const channel = supabase
        .channel(`messages-${coachId}-${clientId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${coachId}`
        }, payload => {
          if (payload.new.sender_id !== clientId) return
          setMessages(prev => [...prev, payload.new])
          supabase.from('messages').update({ read: true }).eq('id', payload.new.id)
          setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        })
        .subscribe()
      channelRef.current = channel
    }

    load()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [clientId])

  const send = async () => {
    if (!newMsg.trim() || sending) return
    setSending(true)
    const content = newMsg.trim()
    setNewMsg('')

    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { id: tempId, sender_id: coachId, receiver_id: clientId, content, read: false, created_at: new Date().toISOString() }])
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    const { data } = await supabase
      .from('messages')
      .insert({ sender_id: coachId, receiver_id: clientId, content, read: false })
      .select().single()

    if (data) setMessages(prev => prev.map(m => m.id === tempId ? data : m))
    setSending(false)
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    const isToday = date.toDateString() === new Date().toDateString()
    if (isToday) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', display: 'flex', flexDirection: 'column', height: '500px' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #C5D0F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `hsl(${(clientName?.charCodeAt(0) || 65) * 7 % 360},40%,45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white', fontWeight: '700', flexShrink: 0 }}>
          {clientName?.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#0D1B4E' }}>{clientName}</div>
          <div style={{ fontSize: '11px', color: '#8FA07A' }}>● Conversation directe</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6B7A99', fontSize: '14px', margin: 'auto' }}>
            Aucun message avec {clientName?.split(' ')[0]} 👋
          </div>
        )}
        {messages.map(msg => {
          const isCoach = msg.sender_id === coachId
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isCoach ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '70%' }}>
                <div style={{ padding: '10px 14px', borderRadius: '14px', fontSize: '14px', lineHeight: '1.5', background: isCoach ? '#0D1B4E' : 'white', color: isCoach ? 'white' : '#0D1B4E', border: isCoach ? 'none' : '1px solid #C5D0F0', borderBottomRightRadius: isCoach ? '4px' : '14px', borderBottomLeftRadius: isCoach ? '14px' : '4px', opacity: msg.id?.toString().startsWith('temp-') ? 0.7 : 1 }}>
                  {msg.content}
                </div>
                <div style={{ fontSize: '10px', color: '#6B7A99', marginTop: '3px', textAlign: isCoach ? 'right' : 'left', display: 'flex', justifyContent: isCoach ? 'flex-end' : 'flex-start', alignItems: 'center', gap: '4px' }}>
                  {formatTime(msg.created_at)}
                  {isCoach && <span style={{ color: msg.read ? '#8FA07A' : '#6B7A99' }}>{msg.read ? '✓✓' : '✓'}</span>}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #C5D0F0', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <textarea
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={`Message à ${clientName?.split(' ')[0]}… (Entrée pour envoyer)`}
          rows={2}
          style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #C5D0F0', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: 'white', resize: 'none', outline: 'none' }}
        />
        <button onClick={send} disabled={sending || !newMsg.trim()} style={{ padding: '10px 18px', background: !newMsg.trim() ? 'rgba(13,27,78,0.3)' : '#0D1B4E', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: !newMsg.trim() ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
          Envoyer
        </button>
      </div>
    </div>
  )
}

