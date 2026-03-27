import React from 'react'

export default function StatusBadge({ children, tone = 'default' }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>
}

import React from 'react'

export default function SegmentTabs({ items = [], value, onChange }) {
  return (
    <div className="ui-tabs" role="tablist">
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            className={`ui-tab ${active ? 'is-active' : ''}`}
            onClick={() => onChange?.(item.value)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
