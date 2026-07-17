import { S, bebas } from '../../lib/coachDashboard/shared'

export default function Avatar({ initials, size = 36, color = S.navy, grayscale = false }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: grayscale ? '#AAB0BF' : color,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: bebas,
        fontSize: size * 0.38,
        letterSpacing: 1,
        flexShrink: 0,
        opacity: grayscale ? 0.75 : 1,
      }}
    >
      {initials}
    </div>
  )
}

