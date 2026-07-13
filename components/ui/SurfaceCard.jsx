import React from 'react';

const VARIANTS = {
  default: {
    background: 'var(--card, #FFFFFF)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md, 16px)',
    boxShadow: 'var(--shadow-sm)',
  },
  hero: {
    background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%)',
    border: 'none',
    borderRadius: 'var(--r-lg, 24px)',
    boxShadow: 'var(--shadow-hero)',
    color: 'white',
  },
  metric: {
    background: 'var(--card, #FFFFFF)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-sm, 10px)',
    boxShadow: 'var(--shadow-sm)',
    borderTop: '3px solid var(--accent)', /* Utilise maintenant l'accent bleu moderne */
  },
  coach: {
    background: 'linear-gradient(135deg, var(--card), var(--surface))',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md, 16px)',
    boxShadow: 'var(--shadow-md)',
  },
  progress: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md, 16px)',
    boxShadow: 'none',
  },
  insight: {
    background: 'var(--navy)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 'var(--r-md, 16px)',
    boxShadow: 'var(--shadow-lg)',
  },
};

export default function SurfaceCard({ children, variant = 'default', style = {}, onClick }) {
  const baseStyle = VARIANTS[variant] || VARIANTS.default;

  return (
    <div
      onClick={onClick}
      style={{
        ...baseStyle,
        padding: '20px',
        transition: 'all 0.2s ease-in-out',
        cursor: onClick ? 'pointer' : 'default',
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
