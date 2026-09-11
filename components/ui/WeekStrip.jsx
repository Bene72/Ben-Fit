// components/ui/WeekStrip.jsx
// Bandeau semaine "Lun → Dim" avec pastilles de statut, inspiré du composant
// WeekStrip de BoxLog (Track-your-progress). Navigation par flèches semaine
// précédente/suivante + retour rapide "Aujourd'hui". Design aligné sur les
// tokens Ben&Fit (var(--navy)/var(--gold)/var(--accent)) plutôt que sur la
// palette sombre de BoxLog.
import { useMemo, useState } from 'react'

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

// Clé locale YYYY-MM-DD (évite les décalages UTC de toISOString()).
export function localDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Jour ISO : 1 = lundi ... 7 = dimanche (convention utilisée par workouts.day_of_week)
export function isoWeekday(date) {
  const d = date.getDay()
  return d === 0 ? 7 : d
}

function startOfWeek(date) {
  const d = new Date(date)
  const diff = isoWeekday(d) - 1
  d.setDate(d.getDate() - diff)
  return d
}

/**
 * @param selectedKey  clé YYYY-MM-DD du jour sélectionné
 * @param onSelect     (key) => void
 * @param dotsForDate  (key, isoDay) => [{ color }] — pastilles à afficher pour ce jour
 */
export default function WeekStrip({ selectedKey, onSelect, dotsForDate }) {
  const [weekOffset, setWeekOffset] = useState(0)

  const today = useMemo(() => new Date(), [])
  const todayKey = localDateKey(today)

  const week = useMemo(() => {
    const s = startOfWeek(today)
    s.setDate(s.getDate() + weekOffset * 7)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(s)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [today, weekOffset])

  const goToWeek = (newOffset) => {
    setWeekOffset(newOffset)
    const s = startOfWeek(today)
    s.setDate(s.getDate() + newOffset * 7)
    onSelect(localDateKey(newOffset === 0 ? today : s))
  }

  const startMonth = MONTH_NAMES[week[0].getMonth()]
  const endMonth = MONTH_NAMES[week[6].getMonth()]
  const monthLabel = startMonth === endMonth ? startMonth : `${startMonth} – ${endMonth}`

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" onClick={() => goToWeek(weekOffset - 1)} aria-label="Semaine précédente" style={arrowStyle}>‹</button>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
            {monthLabel}
          </span>
          <button type="button" onClick={() => goToWeek(weekOffset + 1)} aria-label="Semaine suivante" style={arrowStyle}>›</button>
        </div>
        {weekOffset !== 0 && (
          <button type="button" onClick={() => goToWeek(0)} style={jumpStyle}>Aujourd&apos;hui</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 5 }}>
        {week.map((date, i) => {
          const key = localDateKey(date)
          const isToday = key === todayKey
          const isSelected = key === selectedKey
          const dots = dotsForDate ? dotsForDate(key, i + 1) : []

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '9px 2px 8px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: isToday ? 'var(--navy)' : 'var(--surface, #fff)',
                boxShadow: isSelected && !isToday ? '0 0 0 2px var(--accent) inset' : 'var(--shadow-sm)',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: isToday ? 'rgba(255,255,255,.55)' : 'var(--text-faint)' }}>
                {DAY_NAMES[i]}
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: isToday ? '#fff' : 'var(--navy)' }}>
                {date.getDate()}
              </span>
              <span style={{ display: 'flex', gap: 2, height: 6, alignItems: 'center' }}>
                {dots.map((d, di) => (
                  <span key={di} style={{ width: 5, height: 5, borderRadius: '50%', background: d.color }} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const arrowStyle = {
  width: 22, height: 22, borderRadius: 7, border: 'none', background: 'var(--surface-muted, #F7F9FC)',
  color: 'var(--navy)', fontSize: 15, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const jumpStyle = {
  fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)',
  border: 'none', padding: '4px 10px', borderRadius: 100, cursor: 'pointer',
}
