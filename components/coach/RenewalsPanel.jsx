// components/coach/RenewalsPanel.jsx
// Cockpit coach : « Renouvellements à préparer » — une carte par athlète à
// 14 jours (ou moins) de la fin de son engagement, avec son résumé
// de progression et un message pré-rédigé (modifiable avant envoi).
// N'affiche rien s'il n'y a aucun renouvellement.
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { S, font } from '../../lib/coachDashboard/offersAndCompliance'
import { coachRenewals, loadProgressSince } from '../../lib/retentionData'
import { summaryHeadline } from '../../lib/insights'
import { renewalMessage } from '../../lib/messageTemplates'
import { notifyNewMessage } from '../../lib/notify'

const fmtDate = (d) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''

const btn = (primary) => ({
  border: primary ? 0 : '1px solid var(--border-hi)',
  background: primary ? 'var(--accent)' : 'transparent',
  color: primary ? '#16110d' : 'var(--chalk)',
  fontWeight: 700,
  fontSize: 12.5,
  padding: '8px 12px',
  borderRadius: 10,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  fontFamily: font,
})

function MessageModal({ coachId, target, onClose, onSent }) {
  const [text, setText] = useState(target.text)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const send = async () => {
    if (!text.trim()) return
    setSending(true)
    setError('')
    const { data, error: err } = await supabase
      .from('messages')
      .insert({
        sender_id: coachId,
        receiver_id: target.client.id,
        content: text.trim(),
        read: false,
      })
      .select('id')
      .single()
    setSending(false)
    if (err) {
      setError(err.message)
      return
    }
    notifyNewMessage(data?.id)
    onSent(target.client)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.6)',
        zIndex: 1000,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-label={`Message à ${target.client.name}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(520px, 100%)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 18,
          fontFamily: font,
          color: 'var(--chalk)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display, "Bebas Neue")',
            fontSize: 24,
            marginBottom: 10,
          }}
        >
          Message à {target.client.name}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          style={{
            width: '100%',
            background: 'var(--bg-card-2)',
            color: 'var(--chalk)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 12,
            fontFamily: font,
            fontSize: 14,
            lineHeight: 1.5,
            resize: 'vertical',
          }}
        />
        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button style={btn(false)} onClick={onClose}>
            Annuler
          </button>
          <button style={btn(true)} onClick={send} disabled={sending}>
            {sending ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RenewalCard({ item, sent, onMessage, onOpen }) {
  const { client, engagement } = item
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    let active = true
    loadProgressSince(client.id, engagement.start).then((s) => {
      if (active) setSummary(s)
    })
    return () => {
      active = false
    }
  }, [client, engagement.start])

  const headline = summaryHeadline(summary)
  const pct = Math.min(100, Math.round((engagement.week / engagement.length) * 100))
  const color = engagement.ended ? 'var(--gold)' : 'var(--info, #4a9eff)'

  return (
    <div
      style={{
        minWidth: 250,
        flex: '1 1 250px',
        background: 'var(--bg-card-2)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 14,
        opacity: sent ? 0.6 : 1,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14 }}>{client.name}</div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color, marginTop: 2 }}>
        {engagement.ended
          ? `Terminé depuis le ${fmtDate(engagement.endDate)}`
          : `Fin le ${fmtDate(engagement.endDate)} · ${engagement.daysLeft === 0 ? "aujourd'hui" : `dans ${engagement.daysLeft} j`}`}
      </div>
      <div
        style={{
          height: 4,
          background: 'var(--border)',
          borderRadius: 99,
          overflow: 'hidden',
          marginTop: 8,
        }}
      >
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: S.muted,
          margin: '8px 0 10px',
          lineHeight: 1.45,
          minHeight: 36,
        }}
      >
        {summary ? headline || 'Pas encore assez de données pour un résumé' : 'Calcul du résumé…'}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          style={btn(true)}
          onClick={() => onMessage(client, renewalMessage(client.name, engagement, headline))}
        >
          {sent ? '✓ Envoyé' : '💬 Message'}
        </button>
        <button style={btn(false)} onClick={() => onOpen(client.id)}>
          Fiche
        </button>
      </div>
    </div>
  )
}

export default function RenewalsPanel({ coachId, clients, onOpenClient }) {
  const [target, setTarget] = useState(null)
  const [sentTo, setSentTo] = useState(() => new Set())
  const renewals = coachRenewals(clients)
  if (!renewals.length) return null

  return (
    <section
      aria-label="Renouvellements à préparer"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 18,
        marginBottom: 20,
        fontFamily: font,
        color: 'var(--chalk)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: S.muted,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
          }}
        >
          Renouvellements à préparer
        </div>
        <div style={{ fontSize: 12, color: 'var(--chalk-muted)' }}>
          fin d'engagement dans 14 jours ou moins
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {renewals.map((item) => (
          <RenewalCard
            key={item.client.id}
            item={item}
            sent={sentTo.has(item.client.id)}
            onOpen={onOpenClient}
            onMessage={(client, text) => setTarget({ client, text })}
          />
        ))}
      </div>
      {target && (
        <MessageModal
          coachId={coachId}
          target={target}
          onClose={() => setTarget(null)}
          onSent={(client) => {
            setSentTo((prev) => new Set(prev).add(client.id))
            setTarget(null)
          }}
        />
      )}
    </section>
  )
}
