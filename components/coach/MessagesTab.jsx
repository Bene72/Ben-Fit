/**
 * MessagesTab — messagerie coach ↔ client
 * Extrait de coach.js — logique strictement identique.
 */
import { notifyError } from '../../lib/dialogs'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { loadMessagesPage } from '../../lib/messagesData'
import { notifyNewMessage } from '../../lib/notify'

function MessagesTab({ coachId, clientId, clientName, onRead }) {
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)
  const channelRef = useRef(null)
  // onRead dans une ref : un parent qui passe une nouvelle fonction à chaque
  // rendu ne doit pas relancer le chargement ni recréer l'abonnement.
  const onReadRef = useRef(onRead)
  onReadRef.current = onRead

  const conversationFilter = `and(sender_id.eq.${coachId},receiver_id.eq.${clientId}),and(sender_id.eq.${clientId},receiver_id.eq.${coachId})`
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadEarlier = async () => {
    if (!messages.length) return
    setLoadingMore(true)
    const page = await loadMessagesPage(conversationFilter, messages[0].created_at)
    setLoadingMore(false)
    if (page.error) return notifyError('Messages non chargés : ' + page.error.message)
    setMessages((prev) => [...page.messages, ...prev])
    setHasMore(page.hasMore)
  }

  useEffect(() => {
    const load = async () => {
      const page = await loadMessagesPage(conversationFilter)
      if (page.error) notifyError('Messages non chargés : ' + page.error.message)
      setMessages(page.messages)
      setHasMore(page.hasMore)

      const { error: readErr } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', clientId)
        .eq('receiver_id', coachId)
        .eq('read', false)
      // Le badge « non lus » n'est remis à zéro que si l'écriture a réussi
      if (!readErr) onReadRef.current?.(clientId)

      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

      if (channelRef.current) supabase.removeChannel(channelRef.current)
      const channel = supabase
        .channel(`messages-${coachId}-${clientId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${coachId}`,
          },
          (payload) => {
            if (payload.new.sender_id !== clientId) return
            setMessages((prev) =>
              prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]
            )
            // `.then()` indispensable : une requête supabase-js n'est envoyée
            // que si elle est attendue. Sans lui, le message restait "non lu".
            supabase.from('messages').update({ read: true }).eq('id', payload.new.id).then()
            setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
          }
        )
        .subscribe()
      channelRef.current = channel
    }

    load()
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [coachId, clientId, conversationFilter])

  const send = async () => {
    if (!newMsg.trim() || sending) return
    setSending(true)
    const content = newMsg.trim()
    setNewMsg('')

    const tempId = `temp-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender_id: coachId,
        receiver_id: clientId,
        content,
        read: false,
        created_at: new Date().toISOString(),
      },
    ])
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: coachId, receiver_id: clientId, content, read: false })
      .select()
      .single()

    if (error) {
      // Retire le message "optimiste" et remet le texte dans le champ
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setNewMsg(content)
      notifyError('Message non envoyé : ' + error.message)
    } else if (data) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)))
      notifyNewMessage(data.id)
    }
    setSending(false)
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    const isToday = date.toDateString() === new Date().toDateString()
    if (isToday) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-hi)',
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'column',
        height: '500px',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-hi)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: `hsl(${((clientName?.charCodeAt(0) || 65) * 7) % 360},40%,45%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: 'white',
            fontWeight: '700',
            flexShrink: 0,
          }}
        >
          {clientName?.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--chalk)' }}>
            {clientName}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--rx)' }}>● Conversation directe</div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--chalk-dim)',
              fontSize: '14px',
              margin: 'auto',
            }}
          >
            Aucun message avec {clientName?.split(' ')[0]} 👋
          </div>
        )}
        {hasMore && (
          <button
            onClick={loadEarlier}
            disabled={loadingMore}
            style={{
              alignSelf: 'center',
              background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--chalk-dim)',
              borderRadius: 999,
              padding: '6px 14px',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginBottom: 8,
            }}
          >
            {loadingMore ? 'Chargement…' : 'Voir les messages précédents'}
          </button>
        )}
        {messages.map((msg) => {
          const isCoach = msg.sender_id === coachId
          return (
            <div
              key={msg.id}
              style={{ display: 'flex', justifyContent: isCoach ? 'flex-end' : 'flex-start' }}
            >
              <div style={{ maxWidth: '70%' }}>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '14px',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    background: isCoach ? 'var(--accent)' : 'var(--bg-card-2)',
                    color: isCoach ? 'white' : 'var(--chalk)',
                    border: isCoach ? 'none' : '1px solid var(--border-hi)',
                    borderBottomRightRadius: isCoach ? '4px' : '14px',
                    borderBottomLeftRadius: isCoach ? '14px' : '4px',
                    opacity: msg.id?.toString().startsWith('temp-') ? 0.7 : 1,
                  }}
                >
                  {msg.content}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--chalk-muted)',
                    marginTop: '3px',
                    textAlign: isCoach ? 'right' : 'left',
                    display: 'flex',
                    justifyContent: isCoach ? 'flex-end' : 'flex-start',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {formatTime(msg.created_at)}
                  {isCoach && (
                    <span style={{ color: msg.read ? 'var(--rx)' : 'var(--chalk-muted)' }}>
                      {msg.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-hi)',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-end',
        }}
      >
        <textarea
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={`Message à ${clientName?.split(' ')[0]}… (Entrée pour envoyer)`}
          rows={2}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1.5px solid var(--border-hi)',
            borderRadius: '10px',
            fontSize: '14px',
            fontFamily: "'DM Sans',sans-serif",
            background: 'var(--bg-card-2)',
            color: 'var(--chalk)',
            resize: 'none',
            outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={sending || !newMsg.trim()}
          style={{
            padding: '10px 18px',
            background: !newMsg.trim() ? 'var(--bg-card-2)' : 'var(--accent)',
            color: !newMsg.trim() ? 'var(--chalk-muted)' : 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: !newMsg.trim() ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          Envoyer
        </button>
      </div>
    </div>
  )
}

export default MessagesTab
