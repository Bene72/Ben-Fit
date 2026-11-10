// components/ui/AppPrompt.jsx
// Invite discrète : installer l'app sur l'écran d'accueil et/ou activer les
// notifications. N'apparaît que si une action est possible, et peut être
// repoussée de 7 jours (« Plus tard »).
import { useEffect, useState } from 'react'
import {
  enablePush,
  hasPushSubscription,
  isIOSBrowser,
  isStandalone,
  permissionState,
  pushConfigured,
  pushSupported,
} from '../../lib/push'

const SNOOZE_KEY = 'benfit:appPromptSnooze'
const SNOOZE_MS = 7 * 24 * 3600 * 1000

function snoozed() {
  try {
    return Date.now() < Number(window.localStorage.getItem(SNOOZE_KEY) || 0)
  } catch {
    return false
  }
}

export default function AppPrompt({ userId, dark = false }) {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!userId || snoozed()) return
    let active = true
    const compute = async () => {
      const canInstall = !isStandalone() && Boolean(window.__benfitInstallPrompt)
      const ios = isIOSBrowser()
      const canPush =
        pushSupported() &&
        pushConfigured() &&
        permissionState() !== 'denied' &&
        !(await hasPushSubscription())
      if (active) setState({ canInstall, ios, canPush })
    }
    compute()
    window.addEventListener('benfit:installable', compute)
    return () => {
      active = false
      window.removeEventListener('benfit:installable', compute)
    }
  }, [userId])

  if (!state || (!state.canInstall && !state.ios && !state.canPush)) return null

  const install = async () => {
    const prompt = window.__benfitInstallPrompt
    if (!prompt) return
    prompt.prompt()
    await prompt.userChoice.catch(() => {})
    window.__benfitInstallPrompt = null
    setState((s) => ({ ...s, canInstall: false }))
  }

  const activate = async () => {
    setBusy(true)
    setMsg('')
    try {
      await enablePush(userId)
      setMsg('Notifications activées ✓')
      setState((s) => ({ ...s, canPush: false }))
    } catch (e) {
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }

  const later = () => {
    try {
      window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS))
    } catch {}
    setState(null)
  }

  const c = dark
    ? {
        bg: 'var(--bg-card)',
        text: 'var(--chalk)',
        soft: 'var(--chalk-dim)',
        border: 'var(--border)',
      }
    : {
        bg: 'var(--surface)',
        text: 'var(--navy)',
        soft: 'var(--text-soft)',
        border: 'var(--border-soft)',
      }
  const btn = (primary) => ({
    border: primary ? 0 : `1px solid ${c.border}`,
    background: primary ? 'var(--gold)' : 'transparent',
    color: primary ? '#0d1b4e' : c.soft,
    fontWeight: 700,
    fontSize: 12.5,
    padding: '8px 12px',
    borderRadius: 10,
    cursor: 'pointer',
    fontFamily: 'inherit',
  })

  return (
    <div
      role="region"
      aria-label="Installer l'app et notifications"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        color: c.text,
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>📲 Ben&Fit sur ton téléphone</div>
      {state.ios ? (
        <div style={{ color: c.soft, lineHeight: 1.5, marginBottom: 10 }}>
          Pour l'installer et recevoir les notifications : touche <b>Partager</b> (le carré avec une
          flèche ⬆️) en bas de Safari, puis <b>« Sur l'écran d'accueil »</b>. Ouvre ensuite l'app
          depuis l'icône.
        </div>
      ) : (
        <div style={{ color: c.soft, lineHeight: 1.5, marginBottom: 10 }}>
          {state.canPush
            ? 'Active les notifications pour être prévenu des messages du coach, des séances et des bilans.'
            : "Installe l'app pour l'ouvrir en un geste depuis ton écran d'accueil."}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {state.canInstall && (
          <button style={btn(true)} onClick={install}>
            Installer l'app
          </button>
        )}
        {state.canPush && !state.ios && (
          <button style={btn(!state.canInstall)} onClick={activate} disabled={busy}>
            {busy ? '…' : 'Activer les notifications'}
          </button>
        )}
        <button style={btn(false)} onClick={later}>
          Plus tard
        </button>
      </div>
      {msg && <div style={{ fontSize: 12, color: c.soft, marginTop: 8 }}>{msg}</div>}
    </div>
  )
}
