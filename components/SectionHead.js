import React from 'react'

export default function SectionHead({ title, caption, action }) {
  return (
    <div className="ui-section-head">
      <div>
        <h2 className="ui-section-title">{title}</h2>
        {caption ? <p className="ui-section-caption">{caption}</p> : null}
      </div>
      {action ? <div className="ui-cluster">{action}</div> : null}
    </div>
  )
}
