/**
 * SurfaceCard — carte de surface redesignée
 * Utilise les tokens CSS au lieu de couleurs hardcodées
 * Compatible mobile/desktop via CSS au lieu de useState + resize
 */
export default function SurfaceCard({
  children,
  padded = true,
  sticky = false,
  glass = false,
  dark = false,
  style = {},
  className = '',
}) {
  return (
    <div
      className={[
        glass ? 'card-glass' : dark ? '' : 'card',
        className,
      ].filter(Boolean).join(' ')}
      style={{
        ...(dark ? {
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 'var(--r-xl)',
        } : {}),
        ...(padded ? {} : { padding: 0 }),
        ...(sticky ? { position: 'sticky', top: '20px' } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  )
}
