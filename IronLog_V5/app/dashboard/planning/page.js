'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import styles from './page.module.css'

/* ── Helpers ── */
function getWeekBounds() {
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1 // lundi = 0
  const monday = new Date(now)
  monday.setDate(now.getDate() - day)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
    label: `${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`,
  }
}

function getZone(pct) {
  if (pct >= 100) return { label: '✅ Objectif atteint', color: 'var(--green)' }
  if (pct >= 60)  return { label: '🔥 En bonne voie', color: 'var(--amber)' }
  if (pct >= 30)  return { label: '⚠️ En retard', color: 'var(--accent)' }
  return { label: '❌ Insuffisant', color: 'var(--text-muted)' }
}

/* ── Volume bar component ── */
function VolumeBar({ muscle, done, target, color }) {
  const pct = target > 0 ? Math.min(Math.round((done / target) * 100), 100) : 0
  const zone = target > 0 ? getZone(pct) : null

  return (
    <div className={styles.muscleRow}>
      <div className={styles.muscleRowTop}>
        <div className={styles.muscleLeft}>
          <div className={styles.muscleBar} style={{ background: color }} />
          <span className={styles.muscleName}>{muscle}</span>
        </div>
        <div className={styles.muscleRight}>
          <span className={styles.muscleDone} style={{ color: done > 0 ? color : 'var(--text-muted)' }}>
            {done}
          </span>
          <span className={styles.muscleTarget}>/ {target} séries</span>
          {zone && <span className={styles.zoneLabel} style={{ color: zone.color }}>{zone.label}</span>}
        </div>
      </div>
      {target > 0 && (
        <div className={styles.barTrack}>
          <div
            className={styles.barFill}
            style={{
              width: `${pct}%`,
              background: pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : color,
              boxShadow: done > 0 ? `0 0 8px ${color}44` : 'none',
            }}
          />
          {/* MEV marker à 50% */}
          <div className={styles.barMarker} style={{ left: '50%' }} title="MEV (minimum)" />
        </div>
      )}
    </div>
  )
}

export default function PlanningPage() {
  const [muscles, setMuscles] = useState([])
  const [weekSets, setWeekSets] = useState({}) // { muscle_category_id: count }
  const [loading, setLoading] = useState(true)
  const week = useMemo(() => getWeekBounds(), [])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: muscleData }, { data: logsData }] = await Promise.all([
      supabase.from('muscle_categories').select('*').order('sort_order'),
      supabase
        .from('workout_logs')
        .select('exercise_id, exercises(muscle_category_id)')
        .eq('user_id', user.id)
        .gte('created_at', week.start + 'T00:00:00')
        .lte('created_at', week.end + 'T23:59:59'),
    ])

    // Compter les séries par muscle_category_id
    const counts = {}
    ;(logsData || []).forEach(log => {
      const mid = log.exercises?.muscle_category_id
      if (mid) counts[mid] = (counts[mid] || 0) + 1
    })

    setMuscles(muscleData || [])
    setWeekSets(counts)
    setLoading(false)
  }

  const totalDone = Object.values(weekSets).reduce((a, b) => a + b, 0)
  const totalTarget = muscles.reduce((a, m) => a + (m.sets_target || 0), 0)

  const priorityGroups = [
    { key: 'Prioritaire', color: 'var(--accent)',     emoji: '🎯' },
    { key: 'Modérée',     color: 'var(--amber)',      emoji: '📈' },
    { key: 'Maintenance', color: 'var(--text-muted)', emoji: '🔧' },
  ]

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Volume Hebdo</h1>
          <p className={styles.sub}>Semaine du {week.label}</p>
        </div>
        {!loading && totalTarget > 0 && (
          <div className={styles.globalBadge}>
            <span className={styles.globalDone}>{totalDone}</span>
            <span className={styles.globalSep}>/</span>
            <span className={styles.globalTarget}>{totalTarget}</span>
            <span className={styles.globalLabel}>séries</span>
          </div>
        )}
      </div>

      {/* ── Global progress bar ── */}
      {!loading && totalTarget > 0 && (
        <div className={styles.globalBarWrap}>
          <div className={styles.globalBarTrack}>
            <div
              className={styles.globalBarFill}
              style={{ width: `${Math.min((totalDone / totalTarget) * 100, 100)}%` }}
            />
          </div>
          <span className={styles.globalPct}>
            {Math.round((totalDone / totalTarget) * 100)}%
          </span>
        </div>
      )}

      {/* ── Muscle groups ── */}
      {loading ? (
        <div className={styles.skeletonList}>
          {[0,1,2,3,4].map(i => (
            <div key={i} className={styles.skeletonRow}>
              <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 6 }} />
              <div className="skeleton" style={{ width: '100%', height: 8, borderRadius: 4, marginTop: 10 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.groups}>
          {priorityGroups.map(({ key, color, emoji }) => {
            const group = muscles.filter(m => m.priority === key)
            if (!group.length) return null
            return (
              <div key={key} className={styles.group}>
                <div className={styles.groupTitle}>
                  <span>{emoji}</span>
                  <span style={{ color }}>{key}</span>
                </div>
                <div className={styles.groupRows}>
                  {group.map(m => (
                    <VolumeBar
                      key={m.id}
                      muscle={m.name}
                      done={weekSets[m.id] || 0}
                      target={m.sets_target || 0}
                      color={m.color_hex || color}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {muscles.length === 0 && (
            <div className={styles.empty}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>💪</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Aucun groupe musculaire configuré</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Ajoute des groupes musculaires dans ta base Supabase avec un champ <code>sets_target</code>.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Legend ── */}
      {!loading && muscles.length > 0 && (
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: 'var(--text-muted)' }} />
            <span>0–29% — Insuffisant</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: 'var(--accent)' }} />
            <span>30–59% — En retard</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: 'var(--amber)' }} />
            <span>60–99% — En bonne voie</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: 'var(--green)' }} />
            <span>100%+ — Objectif atteint</span>
          </div>
        </div>
      )}
    </div>
  )
}
