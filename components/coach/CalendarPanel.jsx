import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import NavBtn from './NavBtn'
import { S, font, bebas, mono, buildCalendar } from '../../lib/coachDashboard/shared'

export default function CalendarPanel({ sessions, coachId, clients = [] }) {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())
  const [tasks, setTasks] = useState([])
  const [taskModalDate, setTaskModalDate] = useState(null) // 'YYYY-MM-DD' | null
  const [taskTitle, setTaskTitle] = useState('')
  const [taskTime, setTaskTime] = useState('09:00')
  const [taskClientId, setTaskClientId] = useState('')
  const [savingTask, setSavingTask] = useState(false)

  const days = buildCalendar(year, month)
  const MONTHS_FR = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ]
  const DAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const sessionMap = {}
  sessions.forEach((s) => {
    if (!sessionMap[s.date]) sessionMap[s.date] = []
    sessionMap[s.date].push(s)
  })
  const taskMap = {}
  tasks.forEach((t) => {
    if (!taskMap[t.due_date]) taskMap[t.due_date] = []
    taskMap[t.due_date].push(t)
  })
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  useEffect(() => {
    if (!coachId) return
    supabase
      .from('coach_tasks')
      .select('*')
      .eq('coach_id', coachId)
      .order('due_date')
      .order('task_time')
      .then(({ data, error }) => {
        if (!error) setTasks(data || [])
      })
  }, [coachId])

  const openTaskModal = (dateStr) => {
    setTaskModalDate(dateStr)
    setTaskTitle('')
    setTaskTime('09:00')
    setTaskClientId('')
  }

  const saveTask = async () => {
    if (!taskTitle.trim() || !taskModalDate) return
    setSavingTask(true)
    try {
      const { data, error } = await supabase
        .from('coach_tasks')
        .insert({
          coach_id: coachId,
          due_date: taskModalDate,
          task_time: taskTime || null,
          title: taskTitle.trim(),
          client_id: taskClientId || null,
        })
        .select()
        .single()
      if (error) throw error
      setTasks((prev) => [...prev, data])
      setTaskModalDate(null)
    } catch (err) {
      console.error('Erreur ajout tâche:', err)
      alert("Impossible d'ajouter la tâche.")
    } finally {
      setSavingTask(false)
    }
  }

  return (
    <div
      style={{
        background: S.card,
        border: `1px solid ${S.border}`,
        borderRadius: 14,
        padding: '18px 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ fontFamily: bebas, fontSize: 16, color: S.navy, letterSpacing: 2 }}>
          {MONTHS_FR[month].toUpperCase()} {year}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <NavBtn
            onClick={() => {
              if (month === 0) {
                setMonth(11)
                setYear((y) => y - 1)
              } else setMonth((m) => m - 1)
            }}
          >
            ‹
          </NavBtn>
          <NavBtn
            onClick={() => {
              if (month === 11) {
                setMonth(0)
                setYear((y) => y + 1)
              } else setMonth((m) => m + 1)
            }}
          >
            ›
          </NavBtn>
        </div>
      </div>
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}
      >
        {DAYS_FR.map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              fontSize: 9,
              fontWeight: 700,
              color: S.muted,
              letterSpacing: '0.5px',
              padding: '2px 0',
              textTransform: 'uppercase',
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {days.map((d, i) => {
          if (!d) return <div key={i} />
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          const ses = sessionMap[ds] || []
          const tks = taskMap[ds] || []
          const isT = ds === todayStr
          return (
            <button
              key={i}
              onClick={() => openTaskModal(ds)}
              title="Cliquer pour ajouter une tâche"
              style={{
                borderRadius: 7,
                padding: '4px 2px',
                minHeight: 36,
                background: isT ? S.navy : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isT) e.currentTarget.style.background = '#F0F2F8'
              }}
              onMouseLeave={(e) => {
                if (!isT) e.currentTarget.style.background = 'transparent'
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: isT ? 700 : 500,
                  color: isT ? 'white' : S.navy,
                  marginBottom: 2,
                }}
              >
                {d}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {ses.map((s, j) => (
                  <div
                    key={`s${j}`}
                    title={`${s.client} — ${s.type}`}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: isT ? 'white' : s.color,
                    }}
                  />
                ))}
                {tks.length > 0 && (
                  <div
                    title={`${tks.length} tâche(s)`}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: isT ? S.gold : S.gold,
                    }}
                  />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Modale rapide d'ajout de tâche — cliquée depuis une date, façon Google Agenda */}
      {taskModalDate && (
        <div
          onClick={() => setTaskModalDate(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13,27,78,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 22,
              width: 300,
              boxShadow: '0 20px 50px rgba(13,27,78,0.25)',
            }}
          >
            <div
              style={{
                fontFamily: bebas,
                fontSize: 15,
                color: S.navy,
                letterSpacing: 1.5,
                marginBottom: 4,
              }}
            >
              NOUVELLE TÂCHE
            </div>
            <div style={{ fontSize: 12, color: S.muted, marginBottom: 14 }}>
              {new Date(taskModalDate + 'T12:00:00').toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </div>
            <input
              autoFocus
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Ex : Prog à faire — Julie"
              onKeyDown={(e) => e.key === 'Enter' && saveTask()}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${S.border}`,
                fontSize: 13,
                fontFamily: font,
                marginBottom: 10,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <input
              type="time"
              value={taskTime}
              onChange={(e) => setTaskTime(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 10,
                border: `1px solid ${S.border}`,
                fontSize: 13,
                fontFamily: mono,
                marginBottom: 10,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <select
              value={taskClientId}
              onChange={(e) => setTaskClientId(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 10,
                border: `1px solid ${S.border}`,
                fontSize: 13,
                fontFamily: font,
                marginBottom: 16,
                outline: 'none',
                boxSizing: 'border-box',
                background: 'white',
                color: taskClientId ? S.navy : S.muted,
              }}
            >
              <option value="">Tâche libre (pas de client)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  Suivi — {c.name}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setTaskModalDate(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 10,
                  border: `1px solid ${S.border}`,
                  background: 'white',
                  color: S.muted,
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={saveTask}
                disabled={savingTask || !taskTitle.trim()}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 10,
                  border: 'none',
                  background: S.navy,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: savingTask ? 'default' : 'pointer',
                  opacity: savingTask || !taskTitle.trim() ? 0.5 : 1,
                }}
              >
                {savingTask ? '…' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
