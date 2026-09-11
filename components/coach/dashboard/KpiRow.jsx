// components/coach/dashboard/KpiRow.jsx
// Extrait de pages/coach.js (découpage audit 09/09/2026, point 4).
import KpiCard from '../KpiCard'
import { S } from '../../../lib/coachDashboard/offersAndCompliance'

export default function KpiRow({
  activeCount,
  archivedCount,
  mrr,
  pendingMessages,
  onShowActiveClients,
  onShowMessages,
}) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
      <KpiCard
        icon="👥"
        label="Clients actifs"
        value={activeCount}
        sub={`${archivedCount} archivé(s)`}
        onClick={onShowActiveClients}
      />
      <KpiCard icon="💰" label="MRR" value={`${mrr} €`} sub="Revenus mensuels" accent={S.blue} />
      {pendingMessages > 0 && (
        <KpiCard
          icon="💬"
          label="Messages"
          value={pendingMessages}
          sub="non lus"
          accent={S.blue}
          onClick={onShowMessages}
        />
      )}
    </div>
  )
}
