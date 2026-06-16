/**
 * SurfaceCard — utilise useBreakpoint() au lieu de window.innerWidth dupliqué
 * Radius normalisés via tokens (--r-sm/md/lg)
 */
import { useBreakpoint } from '../../hooks/useBreakpoint'

const VARIANTS = {
  default: {
    background: 'var(--card, #FFFFFF)',
    border: '1px solid var(--border, #EDE9E0)',
    borderRadius: 'var(--r-md, 20px)',
    boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(13,27,42,0.05))',
  },
  hero: {
    background: 'var(--navy, #0D1B2A)',
    border: 'none',
    borderRadius: 'var(--r-lg, 28px)',
    boxShadow: 'var(--shadow-hero, 0 24px 60px rgba(13,27,42,0.22))',
    color: 'white',
  },
  metric: {
    background: 'var(--card, #FFFFFF)',
    border: '1px solid var(--border, #EDE9E0)',
    borderRadius: 'var(--r-sm, 12px)',
    boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(13,27,42,0.05))',
    borderTop: '3px solid var(--gold, #B8860B)',
  },
  coach: {
    background: 'linear-gradient(135deg, var(--bg, #FAF9F7), var(--surface, #F4F1EB))',
    border: '1.5px solid var(--gold-light, #D4AF37)',
    borderRadius: 'var(--r-md, 20px)',
    boxShadow: 'var(--shadow-md, 0 10px 30px rgba(13,27,42,0.09))',
  },
  progress: {
    background: 'var(--surface, #F4F1EB)',
    border: '1px solid var(--border, #EDE9E0)',
    borderRadius: 'var(--r-md, 20px)',
    boxShadow: 'none',
  },
  insight: {
    background: 'var(--navy, #0D1B2A)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 'var(--r-md, 20px)',
    boxShadow: 'var(--shadow-lg, 0 20px 50px rgba(13,27,42,0.16))',
  },
}

export default function SurfaceCard({
  children, variant = 'default', padded = true,
  sticky = false, style = {}, onClick = null,
}) {
  const isMobile = useBreakpoint(980)
  const base = VARIANTS[variant] || VARIANTS.default

  return (
    <div
      onClick={onClick}
      style={{
        ...base,
        padding: padded ? (isMobile ? 14 : 20) : 0,
        position: sticky ? 'sticky' : 'relative',
        top: sticky ? 20 : 'auto',
        cursor: onClick ? 'pointer' : 'default',
        transition: onClick ? 'transform 0.18s ease, box-shadow 0.18s ease' : 'none',
        ...style,
      }}
      onMouseEnter={onClick ? e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md, 0 10px 30px rgba(13,27,42,0.09))' } : undefined}
      onMouseLeave={onClick ? e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = base.boxShadow || '' } : undefined}
    >
      {children}
    </div>
  )
}
