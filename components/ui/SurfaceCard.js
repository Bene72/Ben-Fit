import React from 'react'

export default function SurfaceCard({ children, padded = true, soft = False, sticky = False, style = {}, className = '' }) {
  const classes = [
    'ui-card',
    padded ? 'ui-card--padded' : '',
    soft ? 'ui-card--soft' : '',
    sticky ? 'ui-card--sticky' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  )
}
