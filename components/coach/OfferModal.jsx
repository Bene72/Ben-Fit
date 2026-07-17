import { useState } from 'react'
import { OFFERS, S, font, bebas } from '../../lib/coachDashboard/shared'

export default function OfferModal({ client, onClose, onSave }) {
  const [form, setForm] = useState({
    offer: client.offer,
    price: OFFERS[client.offer]?.price || 149,
    startDate: client.since,
    nextPayment: client.nextPayment || '',
    note: '',
  })
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(13,27,78,0.55)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 20,
          padding: '28px 32px',
          width: '100%',
          maxWidth: 500,
          boxShadow: '0 24px 60px rgba(13,27,78,0.2)',
        }}
      >
        <div
          style={{
            fontFamily: bebas,
            fontSize: 22,
            color: S.navy,
            letterSpacing: 2,
            marginBottom: 20,
          }}
        >
          MODIFIER L'OFFRE — {client.name.toUpperCase()}
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {Object.values(OFFERS).map((o) => (
            <button
              key={o.id}
              onClick={() => setForm((p) => ({ ...p, offer: o.id, price: o.price }))}
              style={{
                flex: 1,
                padding: '12px 10px',
                border: `2px solid ${form.offer === o.id ? o.color : S.border}`,
                borderRadius: 12,
                background: form.offer === o.id ? `${o.color}12` : 'white',
                cursor: 'pointer',
                fontFamily: font,
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>{o.badge}</div>
              <div style={{ fontWeight: 800, color: S.navy, fontSize: 14 }}>{o.name}</div>
              <div style={{ fontSize: 13, color: S.muted }}>{o.price} €/mois</div>
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {[
            ['Tarif mensuel (€)', 'price', 'number'],
            ['Début contrat', 'startDate', 'date'],
            ['Prochain paiement', 'nextPayment', 'date'],
          ].map(([lbl, key, type]) => (
            <div key={key}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: S.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                {lbl}
              </label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 10px',
                  border: `1px solid ${S.border}`,
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: font,
                  outline: 'none',
                }}
              />
            </div>
          ))}
          <div style={{ gridColumn: '1/-1' }}>
            <label
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: S.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Note interne
            </label>
            <textarea
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              rows={2}
              placeholder="Ex : tarif fidélité, promo…"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 10px',
                border: `1px solid ${S.border}`,
                borderRadius: 8,
                fontSize: 13,
                fontFamily: font,
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px',
              border: `1px solid ${S.border}`,
              borderRadius: 9,
              background: 'white',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: font,
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => {
              onSave(client.id, form)
              onClose()
            }}
            style={{
              padding: '9px 18px',
              border: 'none',
              borderRadius: 9,
              background: S.navy,
              color: 'white',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: font,
            }}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
