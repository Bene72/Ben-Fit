import React from 'react';

/**
 * components/ui/SurfaceCard.jsx
 * Harmonisé avec le design system posé dans pages/training.js (tokens
 * var(--navy)/var(--accent)/var(--gold), rayons/ombres via CSS vars).
 * Ajout : `padded` et `sticky` sont maintenant de vraies props gérées ici —
 * training.js et HistoryCalendar.jsx les passent déjà (`<SurfaceCard padded sticky>`)
 * mais elles étaient jusque-là ignorées silencieusement (le sticky des
 * colonnes desktop ne faisait donc rien).
 */
const VARIANTS = {
  default: {
    background: 'var(--card, #FFFFFF)',
    border: '1px solid var(--border, #E8ECF5)',
    borderRadius: 'var(--r-md, 16px)',
    boxShadow: 'var(--shadow-sm)',
  },
  hero: {
    background: 'linear-gradient(135deg, var(--navy, #0D1B4E) 0%, var(--navy-mid, #24365E) 100%)',
    border: 'none',
    borderRadius: 'var(--r-lg, 24px)',
    boxShadow: 'var(--shadow-hero)',
    color: 'white',
  },
  metric: {
    background: 'var(--card, #FFFFFF)',
    border: '1px solid var(--border, #E8ECF5)',
    borderRadius: 'var(--r-sm, 10px)',
    boxShadow: 'var(--shadow-sm)',
    borderTop: '3px solid var(--accent, #2C64E5)',
  },
  coach: {
    background: 'linear-gradient(135deg, var(--card, #FFFFFF), var(--surface, #F8FAFF))',
    border: '1px solid var(--border, #E8ECF5)',
    borderRadius: 'var(--r-md, 16px)',
    boxShadow: 'var(--shadow-md)',
  },
  progress: {
    background: 'var(--surface, #F8FAFF)',
    border: '1px solid var(--border, #E8ECF5)',
    borderRadius: 'var(--r-md, 16px)',
    boxShadow: 'none',
  },
  insight: {
    background: 'var(--navy, #0D1B4E)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 'var(--r-md, 16px)',
    boxShadow: 'var(--shadow-lg)',
  },
};

export default function SurfaceCard({ children, variant = 'default', padded = true, sticky = false, style = {}, onClick }) {
  const baseStyle = VARIANTS[variant] || VARIANTS.default;

  return (
    <div
      onClick={onClick}
      style={{
        ...baseStyle,
        padding: padded ? '20px' : 0,
        transition: 'all 0.2s ease-in-out',
        cursor: onClick ? 'pointer' : 'default',
        ...(sticky
          ? { position: 'sticky', top: 20, maxHeight: 'calc(100dvh - 40px)', overflowY: 'auto' }
          : null),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = baseStyle.boxShadow || 'none';
        }
      }}
    >
      {children}
    </div>
  );
}
