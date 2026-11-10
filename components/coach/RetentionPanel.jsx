// components/coach/RetentionPanel.jsx
// "Qui a besoin de toi cette semaine ?" — en tête du cockpit coach.
//   - athlètes à risque (règles : lib/insights.js → computeRisk)
//   - renouvellements à préparer (semaine 10+ de l'engagement de 12 semaines)
// Chaque ligne a un bouton « Envoyer un message » avec un texte pré-rédigé
// modifiable avant envoi.
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { S, font, bebas } from '../../lib/coachDashboard/offersAndCompliance'
import { loadCoachRetention, loadProgressSince } from '../../lib/retentionData'
import { summaryHeadline, fmt } from '../../lib/insights'
import { riskMessage, renewalMessage } from '../../lib/messageTemplates'
import { notifyNewMessage } from '../../lib/notify'
import Avatar from './Avatar'

const LEVEL = {
  high: {
    label: 'Risque élevé',
    color: 'var(--danger)',
    bg: 'var(--danger-dim, rgba(229,72,77,.12))',
  },
  medium: {
    label: 'À surveiller',
    color: 'var(--gold)',
    bg: 'var(--gold-dim, rgba(232,200,74,.15))',
  },
}

const card = {
  background: S.card,
  border: `1px solid ${S.border}`,
  borderRadius: 16,
  padding: 16,
}

const btnGold = {
  border: 0,
  background: 'var(--gold)',
  color: '#0d1b4e',
  fontWeight: 700,
  fontSize: 12,
  padding: '8px 12px',
  borderRadius: 9,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  fontFamily: font,
}
const btnGhost = {
  ...btnGold,
  background: 'transparent',
  color: S.muted,
  border: `1px solid ${S.border}`,
}

function formatDate(d) {
  return d
    ? new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : ''
}

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
        background: 'rgba(0,0,0,.55)',
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
        style={{ ...card, width: 'min(520px, 100%)', fontFamily: font, color: S.navy }}
      >
        <div style={{ fontFamily: bebas, fontSize: 24, marginBottom: 10 }}>
          Message à {target.client.name}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          style={{
            width: '100%',
            background: 'var(--bg-card-2, rgba(255,255,255,.04))',
            color: S.navy,
            border: `1px solid ${S.border}`,
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
          <button style={btnGhost} onClick={onClose}>
            Annuler
          </button>
          <button style={btnGold} onClick={send} disabled={sending}>
            {sending ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RenewalRow({ item, onMessage, onOpen }) {
  const { client, engagement } = item
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    let active = true
    loadProgressSince(client.id, String(client._raw.engagement_start).slice(0, 10)).then((s) => {
      if (active) setSummary(s)
    })
    return () => {
      active = false
    }
  }, [client])

  const headline = summaryHeadline(summary)
  return (
    <div style={{ padding: '10px 0', borderTop: `1px solid ${S.border}` }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {client.name}{' '}
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
              {engagement.ended
                ? `Terminé depuis le ${formatDate(engagement.endDate)}`
                : `Semaine ${engagement.week}/${engagement.length} · fin ${formatDate(engagement.endDate)}`}
            </span>
          </div>
          <div style={{ fontSize: 12, color: S.muted, marginTop: 3 }}>
            {summary
              ? headline || 'Pas encore assez de données pour un résumé'
              : 'Calcul du résumé…'}
          </div>
          {summary?.gains?.length > 1 && (
            <div style={{ fontSize: 11.5, color: S.muted, marginTop: 3 }}>
              {summary.gains
                .slice(1)
                .map((g) => `+${fmt(g.delta)} kg ${g.exercise}`)
                .join(' · ')}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            style={btnGold}
            onClick={() => onMessage(client, renewalMessage(client.name, engagement, headline))}
          >
            💬 Message
          </button>
          <button style={btnGhost} onClick={() => onOpen(client.id)}>
            Fiche
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RetentionPanel({ coachId, clients, isMobile, onOpenClient }) {
  const [state, setState] = useState({ loading: true, risks: [], renewals: [] })
  const [target, setTarget] = useState(null)
  const [sentTo, setSentTo] = useState(() => new Set())

  // Le parent recrée la liste à chaque rendu : on ne recharge que si les
  // athlètes (ou leur date d'engagement) changent vraiment.
  const clientsRef = useRef(clients)
  clientsRef.current = clients
  const clientsKey = (clients || [])
    .map((c) => `${c.id}:${c._raw?.engagement_start || ''}`)
    .join(',')

  useEffect(() => {
    let active = true
    const list = clientsRef.current || []
    if (!list.length) {
      setState({ loading: false, risks: [], renewals: [] })
      return
    }
    loadCoachRetention(list).then((res) => {
      if (active) setState({ loading: false, ...res })
    })
    return () => {
      active = false
    }
  }, [clientsKey])

  const high = state.risks.filter((r) => r.level === 'high').length
  const medium = state.risks.length - high

  if (state.loading) {
    return (
      <div style={{ ...card, marginBottom: 20, color: S.muted, fontSize: 13 }}>
        Analyse des athlètes…
      </div>
    )
  }
  if (!state.risks.length && !state.renewals.length) {
    return (
      <div style={{ ...card, marginBottom: 20, fontSize: 14 }}>
        ✅ <b>Tout le monde est sur la bonne voie</b>
        <span style={{ color: S.muted }}>
          {' '}
          : aucun athlète à risque, aucun renouvellement à préparer.
        </span>
      </div>
    )
  }

  return (
    <section
      style={{ marginBottom: 20, fontFamily: font, color: S.navy }}
      aria-label="Athlètes à suivre"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <div style={{ fontFamily: bebas, fontSize: 26, letterSpacing: 0.5 }}>
          Qui a besoin de toi cette semaine ?
        </div>
        <div style={{ fontSize: 12, color: S.muted }}>
          {high > 0 && <b style={{ color: 'var(--danger)' }}>{high} à risque élevé</b>}
          {high > 0 && medium > 0 && ' · '}
          {medium > 0 && <b style={{ color: 'var(--gold)' }}>{medium} à surveiller</b>}
          {(high > 0 || medium > 0) && state.renewals.length > 0 && ' · '}
          {state.renewals.length > 0 && (
            <b style={{ color: 'var(--accent)' }}>{state.renewals.length} renouvellement(s)</b>
          )}
        </div>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr', gap: 16 }}
      >
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Athlètes à risque</div>
          {!state.risks.length && <div style={{ fontSize: 13, color: S.muted }}>Aucun 👌</div>}
          {state.risks.map((r) => {
            const lv = LEVEL[r.level]
            const done = sentTo.has(r.client.id)
            return (
              <div
                key={r.client.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 12,
                  background: 'var(--bg-card-2, rgba(255,255,255,.03))',
                  borderLeft: `4px solid ${lv.color}`,
                  marginBottom: 10,
                  opacity: done ? 0.55 : 1,
                }}
              >
                <Avatar initials={r.client.avatar} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {r.client.name}{' '}
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 6,
                        background: lv.bg,
                        color: lv.color,
                        marginLeft: 4,
                      }}
                    >
                      {lv.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {r.reasons.map((reason) => (
                      <span
                        key={reason.code}
                        style={{
                          fontSize: 11,
                          color: S.muted,
                          background: 'rgba(255,255,255,.05)',
                          padding: '3px 8px',
                          borderRadius: 6,
                        }}
                      >
                        {reason.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    style={btnGold}
                    onClick={() =>
                      setTarget({ client: r.client, text: riskMessage(r.client.name, r.reasons) })
                    }
                  >
                    {done ? '✓ Envoyé' : '💬 Envoyer un message'}
                  </button>
                  <button style={btnGhost} onClick={() => onOpenClient(r.client.id)}>
                    Voir la fiche
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            Renouvellements à préparer
          </div>
          <div style={{ fontSize: 11.5, color: S.muted, marginBottom: 6 }}>
            Semaine 10 et plus de l'engagement de 12 semaines, avec la progression depuis le début.
          </div>
          {!state.renewals.length && (
            <div style={{ fontSize: 13, color: S.muted }}>Aucun pour l'instant.</div>
          )}
          {state.renewals.map((item) => (
            <RenewalRow
              key={item.client.id}
              item={item}
              onOpen={onOpenClient}
              onMessage={(client, text) => setTarget({ client, text })}
            />
          ))}
        </div>
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
