/**
 * components/nutrition/WeekTable.jsx
 * Tableau de suivi semaine partagé entre vue client et vue coach.
 *
 * Props :
 *   logs       {object[]}
 *   plan       {object|null}
 *   today      {string}        YYYY-MM-DD
 *   mode       {'client'|'coach'}
 *   onOpenDay  {fn}            (date) => void
 *                              - client : bascule vers l'onglet "Aujourd'hui"
 *                              - coach  : ouvre le détail inline du jour
 *   renderDayDetail {fn}       (date, log) => JSX  — coach only, rendu inline
 */

import { useMemo, useState } from 'react'
import { MACROS, getDayName, getWeekLabel, getWeekStart, groupLogsByWeek, buildWeekDays } from '../../lib/nutritionUtils'
import SurfaceCard from '../ui/SurfaceCard'
import SectionHead from '../ui/SectionHead'

export default function WeekTable({ logs, plan, today, mode = 'client', onOpenDay, renderDayDetail }) {
  const isCoach = mode === 'coach'
  const [openDay, setOpenDay] = useState(isCoach ? today : null)

  const weeks       = useMemo(() => groupLogsByWeek(logs, today), [logs, today])
  const sortedWeeks = useMemo(() => Object.keys(weeks).sort((a, b) => b.localeCompare(a)), [weeks])

  function handleDayClick(date, isFuture) {
    if (isFuture) return
    if (isCoach) {
      setOpenDay((prev) => prev === date ? null : date)
      onOpenDay?.(date)
    } else {
      onOpenDay?.(date)
    }
  }

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {sortedWeeks.map((weekStart) => {
        const weekLogs  = weeks[weekStart]
        const isCurrent = weekStart === getWeekStart(today)
        const days      = buildWeekDays(weekStart, today, weekLogs)

        return (
          <div key={weekStart} style={{ background: 'white', borderRadius: 12, border: `1px solid ${isCurrent ? '#C0CAEF' : '#EAEAEA'}`, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            {/* En-tête semaine */}
            <div style={{ padding: '10px 16px', background: isCurrent ? '#EEF2FF' : '#F5F7FF', borderBottom: '1px solid #EAEAEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0D1B4E' }}>📅 {getWeekLabel(weekStart)}</div>
              <div style={{ fontSize: 11, color: '#999' }}>{weekLogs.filter((l) => l.calories > 0).length}/7 jours</div>
            </div>

            {/* En-tête colonnes */}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr 1fr 1fr', background: '#F8FAFF', borderBottom: '1px solid #F0F0F0' }}>
              {['Jour', 'Calories', 'Protéines', 'Glucides', 'Lipides'].map((h) => (
                <div key={h} style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: '#999', fontWeight: 600, padding: '6px 12px' }}>{h}</div>
              ))}
            </div>

            {/* Lignes jours */}
            {days.map(({ date, log, isToday, isFuture }) => {
              const isOpen   = isCoach && openDay === date
              const hasData  = log && log.calories > 0
              const dayName  = getDayName(date)

              return (
                <div key={date}>
                  <div
                    onClick={() => handleDayClick(date, isFuture)}
                    style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr 1fr 1fr', borderBottom: '1px solid #F5F5F5', background: isToday ? '#FAFBFF' : isOpen ? '#F5F7FF' : 'transparent', cursor: isFuture ? 'default' : 'pointer' }}
                    onMouseEnter={(e) => { if (!isFuture) e.currentTarget.style.background = '#F0F4FF' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isToday ? '#FAFBFF' : isOpen ? '#F5F7FF' : 'transparent' }}
                  >
                    <div style={{ padding: '9px 12px' }}>
                      <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isFuture ? '#CCC' : '#0D1B4E' }}>
                        {isToday ? '📍 ' : ''}{dayName}
                      </div>
                    </div>

                    {MACROS.map((m) => {
                      const val    = log?.[m.key] || 0
                      const target = plan?.[m.target]
                      const pct    = target && val ? Math.min(100, (val / target) * 100) : 0
                      return (
                        <div key={m.key} style={{ padding: '9px 12px' }}>
                          {hasData && val > 0 ? (
                            <>
                              <div style={{ fontSize: 12, fontWeight: 600, color: m.color }}>
                                {val}<span style={{ fontSize: 9, color: '#BBB' }}> {m.unit}</span>
                              </div>
                              {target && (
                                <div style={{ marginTop: 2, height: 3, width: 60, background: '#F0F0F0', borderRadius: 2, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', background: m.color, width: `${pct}%` }} />
                                </div>
                              )}
                            </>
                          ) : (
                            <span style={{ color: '#DDD', fontSize: 12 }}>—</span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Détail inline (coach uniquement) */}
                  {isOpen && renderDayDetail && (
                    <div style={{ padding: '14px 16px', background: '#F5F8FF', borderBottom: '2px solid #E8ECFA' }}>
                      {renderDayDetail(date, log)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )

  // Vue client : enveloppée dans SurfaceCard
  if (!isCoach) {
    return (
      <SurfaceCard padded>
        <SectionHead title="Vue semaine" caption="Clique sur un jour pour le modifier." />
        {content}
      </SurfaceCard>
    )
  }

  // Vue coach : rendu direct sans wrapper
  return content
}
