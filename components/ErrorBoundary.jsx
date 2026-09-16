/**
 * ErrorBoundary — capture les erreurs React non catchées
 * Usage : entoure toute page ou section critique
 *
 * <ErrorBoundary>
 *   <MonComposant />
 * </ErrorBoundary>
 */
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // En prod : envoyer à Sentry ou un logger externe
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '40px',
          background: '#FEE8E0',
          border: '1px solid #C45C3A',
          borderRadius: '16px',
          margin: '24px',
        }}>
          <div style={{ fontSize: '32px' }}>⚠️</div>
          <div style={{
            fontFamily: "'DM Sans',sans-serif",
            fontWeight: '700',
            fontSize: '16px',
            color: '#7A2010',
          }}>
            Une erreur est survenue
          </div>
          <div style={{
            fontSize: '13px',
            color: '#A03020',
            textAlign: 'center',
            maxWidth: '320px',
            lineHeight: 1.5,
          }}>
            {this.props.fallbackMessage || 'Recharge la page. Si le problème persiste, contacte le coach.'}
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            style={{
              padding: '10px 20px',
              background: '#C45C3A',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            Recharger
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
