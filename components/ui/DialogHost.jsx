// components/ui/DialogHost.jsx
// Affiche les messages (notify) et les confirmations (confirmDialog) de
// lib/dialogs.js. Monté une seule fois dans pages/_app.js.
import { useEffect, useRef, useState } from 'react'
import { registerDialogHost } from '../../lib/dialogs'

const COLORS = { error: '#c0392b', success: '#1f8a5b', info: '#0d1b4e' }

export default function DialogHost() {
  const [toasts, setToasts] = useState([])
  const [ask, setAsk] = useState(null)
  const nextId = useRef(1)
  const confirmBtn = useRef(null)

  useEffect(
    () =>
      registerDialogHost({
        toast(message, type) {
          const id = nextId.current++
          setToasts((t) => [...t.slice(-2), { id, message, type }])
          setTimeout(
            () => setToasts((t) => t.filter((x) => x.id !== id)),
            type === 'error' ? 7000 : 3500
          )
        },
        confirm(options) {
          return new Promise((resolve) => setAsk({ ...options, resolve }))
        },
      }),
    []
  )

  useEffect(() => {
    if (!ask) return
    confirmBtn.current?.focus()
    const onKey = (e) => e.key === 'Escape' && answer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask])

  const answer = (value) => {
    ask?.resolve(value)
    setAsk(null)
  }

  return (
    <>
      <div
        aria-live="assertive"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 24,
          transform: 'translateX(-50%)',
          zIndex: 10000,
          display: 'grid',
          gap: 8,
          width: 'min(460px, calc(100vw - 32px))',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              background: COLORS[t.type] || COLORS.info,
              color: '#fff',
              borderRadius: 12,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.4,
              boxShadow: '0 10px 30px rgba(0,0,0,.3)',
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

      {ask && (
        <div
          onClick={() => answer(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.55)',
            zIndex: 10001,
            display: 'grid',
            placeItems: 'center',
            padding: 20,
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={ask.message}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              color: '#0d1b4e',
              borderRadius: 16,
              padding: 22,
              width: 'min(420px, 100%)',
              boxShadow: '0 30px 70px rgba(0,0,0,.4)',
            }}
          >
            <div style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.45, marginBottom: 18 }}>
              {ask.message}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => answer(false)}
                style={{
                  border: '1px solid #c9d1e3',
                  background: '#fff',
                  color: '#0d1b4e',
                  borderRadius: 10,
                  padding: '10px 16px',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {ask.cancelLabel}
              </button>
              <button
                ref={confirmBtn}
                onClick={() => answer(true)}
                style={{
                  border: 0,
                  background: ask.danger ? '#c0392b' : '#0d1b4e',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '10px 16px',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {ask.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
