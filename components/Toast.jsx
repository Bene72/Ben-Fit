/**
 * Composant Toast — remplace les setError/setSuccess dispersés dans chaque page
 *
 * Usage :
 *   const { toast, showToast } = useToast()
 *   showToast('Programme sauvegardé !', 'success')
 *   showToast('Erreur réseau', 'error')
 *
 *   // Dans le JSX :
 *   {toast && <Toast toast={toast} />}
 */
import { useEffect, useState } from 'react'

const COLORS = {
  success: { bg: '#E8F5EE', text: '#3A7A5A', border: '#3A7A5A' },
  error:   { bg: '#FEE8E0', text: '#C45C3A', border: '#C45C3A' },
  info:    { bg: '#EEF2FF', text: '#2C64E5', border: '#2C64E5' },
}

const ICONS = { success: '✓', error: '✕', info: 'ℹ' }

export function Toast({ toast }) {
  if (!toast) return null
  const c = COLORS[toast.type] || COLORS.info
  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      background: c.bg, color: c.text, border: `1.5px solid ${c.border}`,
      borderRadius: '10px', padding: '12px 20px', fontSize: '13px', fontWeight: '600',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999, fontFamily: "'DM Sans',sans-serif",
      display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
      animation: 'toastIn 0.25s ease',
    }}>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
      <span style={{ fontWeight: '800', fontSize: '15px' }}>{ICONS[toast.type]}</span>
      {toast.message}
    </div>
  )
}

export function useToast(duration = 3000) {
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), duration)
  }

  return { toast, showToast }
}
