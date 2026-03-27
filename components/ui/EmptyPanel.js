import React from 'react'

export default function EmptyPanel({ title = 'Rien à afficher', description = 'Ajoute un élément ou sélectionne un client pour commencer.' }) {
  return (
    <div className="ui-empty">
      <strong style={{ display: 'block', marginBottom: 8, color: 'var(--text)' }}>{title}</strong>
      <div>{description}</div>
    </div>
  )
}
