/**
 * StatusBadge — badge de statut sémantique
 * Remplace les badges inline dupliqués partout
 * tone: 'success' | 'warning' | 'danger' | 'accent' | 'navy' | 'ghost'
 */
export default function StatusBadge({ children, tone = 'accent', dot = false }) {
  const cls = {
    success: 'badge badge-success',
    warning: 'badge badge-warning',
    danger:  'badge badge-danger',
    accent:  'badge badge-accent',
    navy:    'badge badge-navy',
    ghost:   'badge badge-ghost',
  }[tone] || 'badge badge-ghost'

  return (
    <span className={cls}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />}
      {children}
    </span>
  )
}
