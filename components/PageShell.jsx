/**
 * PageShell — layout commun pour toutes les pages coach et client
 * Remplace les dizaines de <div style={{ display:'flex', minHeight:'100vh', ... }}>
 * dupliqués dans coach.js, dashboard.js, training.js, nutrition.js
 *
 * Usage :
 *   <PageShell nav={<AppNav profile={profile} />} loading={loading}>
 *     <MonContenu />
 *   </PageShell>
 */
export default function PageShell({ children, nav = null, loading = false, loadingMessage = 'Chargement…' }) {
  if (loading) return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg, #EEF0F5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans',sans-serif",
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '3px solid #C5D0F0', borderTopColor: '#2C64E5',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ color: '#6B7A99', fontSize: '14px', fontWeight: '500' }}>{loadingMessage}</div>
      </div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg, #EEF0F5)',
      fontFamily: "'DM Sans',sans-serif",
      paddingBottom: nav ? '80px' : '0',
    }}>
      {children}
      {nav}
    </div>
  )
}
