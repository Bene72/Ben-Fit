import { S, font } from '../../lib/coachDashboard/shared'

export default function NavBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 26,
        height: 26,
        border: `1px solid ${S.border}`,
        borderRadius: 6,
        background: 'white',
        cursor: 'pointer',
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: S.navy,
      }}
    >
      {children}
    </button>
  )
}

