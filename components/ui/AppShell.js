import React from 'react'

export default function AppShell({ title, subtitle, actions, children }) {
  return (
    <div className="ui-page">
      <div className="ui-container" style={{ padding: '24px 0 40px' }}>
        {(title || subtitle || actions) && (
          <header className="ui-page-header">
            <div>
              {title ? <h1 className="ui-page-title">{title}</h1> : null}
              {subtitle ? <p className="ui-page-subtitle">{subtitle}</p> : null}
            </div>
            {actions ? <div className="ui-cluster">{actions}</div> : null}
          </header>
        )}
        {children}
      </div>
    </div>
  )
}
