'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import styles from './page.module.css'

function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px' }}>
        <div>
          <div className="skeleton" style={{ width: 160, height: 16, marginBottom: 8, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: 100, height: 11, borderRadius: 6 }} />
        </div>
        <div className="skeleton" style={{ width: 60, height: 24, borderRadius: 6 }} />
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [openSession, setOpenSession] = useState(null)
  const [sortBy, setSortBy] = useState('date') // 'date' | 'volume'

  useEffect(() => { loadHistory() }, [])

  const loadHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('workout_sessions')
      .select(`*, workout_logs(id, exercise_name, set_number, reps, weight_kg, notes)`)
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })
      .limit(100)
    setSessions(data || [])
    setLoading(false)
  }

  const totalVol = (logs) =>
    (logs || []).reduce((sum, l) => sum + ((l.reps || 0) * (l.weight_kg || 0)), 0)

  const fmtDate = (d) => {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
  }

  const fmtDateShort = (d) => {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const groupByExo = (logs) => {
    const map = {}
    ;(logs || []).forEach(l => {
      if (!map[l.exercise_name]) map[l.exercise_name] = []
      map[l.exercise_name].push(l)
    })
    return Object.entries(map)
  }

  const filtered = useMemo(() => {
    let list = sessions.filter(s => {
      if (!search) return true
      const q = search.toLowerCase()
      return s.name?.toLowerCase().includes(q) ||
        s.workout_logs?.some(l => l.exercise_name.toLowerCase().includes(q))
    })
    if (sortBy === 'volume') {
      list = [...list].sort((a, b) => totalVol(b.workout_logs) - totalVol(a.workout_logs))
    }
    return list
  }, [sessions, search, sortBy])

  // Stats globales
  const totalVolAll = useMemo(() =>
    sessions.reduce((sum, s) => sum + totalVol(s.workout_logs), 0), [sessions])

  const avgVol = sessions.length > 0 ? Math.round(totalVolAll / sessions.length) : 0

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Historique</h1>
          <p className={styles.sub}>{sessions.length} séance{sessions.length !== 1 ? 's' : ''} enregistrée{sessions.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── Stats strip ── */}
      {!loading && sessions.length > 0 && (
        <div className={styles.statsStrip}>
          <div className={styles.statItem}>
            <div className={styles.statValue}>{sessions.length}</div>
            <div className={styles.statLabel}>Séances</div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <div className={styles.statValue} style={{ color: 'var(--accent)' }}>
              {totalVolAll > 0 ? (totalVolAll / 1000).toFixed(1) + 't' : '—'}
            </div>
            <div className={styles.statLabel}>Volume total</div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <div className={styles.statValue} style={{ color: 'var(--amber)' }}>
              {avgVol > 0 ? avgVol.toLocaleString('fr-FR') + ' kg' : '—'}
            </div>
            <div className={styles.statLabel}>Vol. moyen / séance</div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <div className={styles.statValue} style={{ color: 'var(--green)' }}>
              {sessions[0] ? fmtDateShort(sessions[0].session_date) : '—'}
            </div>
            <div className={styles.statLabel}>Dernière séance</div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className={styles.search}
            placeholder="Séance ou exercice…"
            value={search}
            onChange={e => setSearch(e.target.value)} />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className={styles.sortBtns}>
          <button className={`${styles.sortBtn} ${sortBy === 'date' ? styles.sortBtnActive : ''}`}
            onClick={() => setSortBy('date')}>Date</button>
          <button className={`${styles.sortBtn} ${sortBy === 'volume' ? styles.sortBtnActive : ''}`}
            onClick={() => setSortBy('volume')}>Volume</button>
        </div>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className={styles.list}>
          {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Aucune séance trouvée</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Essaie un autre terme de recherche.</div>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(s => {
            const vol = totalVol(s.workout_logs)
            const isOpen = openSession === s.id
            const exos = [...new Set((s.workout_logs || []).map(l => l.exercise_name))]
            const setsCount = s.workout_logs?.length || 0

            return (
              <div key={s.id} className={`${styles.card} ${isOpen ? styles.cardOpen : ''}`}>

                {/* ── Card header (clickable) ── */}
                <button className={styles.cardHeader}
                  onClick={() => setOpenSession(isOpen ? null : s.id)}>
                  <div className={styles.cardLeft}>
                    <div className={styles.cardName}>{s.name || 'Séance'}</div>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardDate}>{fmtDate(s.session_date)}</span>
                      {s.duration_min && <span className={styles.metaDot}>·</span>}
                      {s.duration_min && <span>{s.duration_min} min</span>}
                      {s.rpe && <span className={styles.metaDot}>·</span>}
                      {s.rpe && <span>RPE {s.rpe}/10</span>}
                    </div>
                  </div>

                  <div className={styles.cardRight}>
                    <div className={styles.cardVol}>
                      {vol > 0 ? vol.toLocaleString('fr-FR') : '—'}
                      <span className={styles.cardVolUnit}> kg</span>
                    </div>
                    <div className={styles.cardSets}>{setsCount} set{setsCount !== 1 ? 's' : ''}</div>
                  </div>

                  <div className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </button>

                {/* ── Exo tags ── */}
                <div className={styles.tagRow}>
                  {exos.slice(0, 5).map((e, i) => <span key={i} className={styles.exoTag}>{e}</span>)}
                  {exos.length > 5 && <span className={styles.exoTagMore}>+{exos.length - 5}</span>}
                </div>

                {/* ── Expanded detail ── */}
                {isOpen && (
                  <div className={styles.detail}>
                    {s.notes && (
                      <div className={styles.sessionNote}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {s.notes}
                      </div>
                    )}

                    {groupByExo(s.workout_logs).map(([exoName, sets]) => {
                      const exoVol = sets.reduce((sum, s) => sum + ((s.reps || 0) * (s.weight_kg || 0)), 0)
                      return (
                        <div key={exoName} className={styles.exoGroup}>
                          <div className={styles.exoGroupHeader}>
                            <span className={styles.exoGroupName}>{exoName}</span>
                            {exoVol > 0 && (
                              <span className={styles.exoGroupVol}>{exoVol.toLocaleString('fr-FR')} kg</span>
                            )}
                          </div>
                          <div className={styles.setsRow}>
                            {sets.sort((a, b) => a.set_number - b.set_number).map((set, i) => (
                              <div key={i} className={styles.setBubble}>
                                <div className={styles.setBubbleNum}>S{set.set_number || i + 1}</div>
                                <div className={styles.setBubbleWeight}>
                                  {set.weight_kg > 0 ? `${set.weight_kg}kg` : 'BW'}
                                </div>
                                <div className={styles.setBubbleReps}>{set.reps} reps</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
