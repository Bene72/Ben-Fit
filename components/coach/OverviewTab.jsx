// components/coach/OverviewTab.jsx
// Fiche client → Vue d'ensemble (refonte validée par Bene le 10/11/2026) :
//   - 4 chiffres clés : séances de la semaine, assiduité 4 semaines, poids
//     (+ écart depuis la première pesée), dernier bilan
//   - à gauche : objectifs (Athlete Assessment) + historique du poids
//   - à droite : note coach (programme, objectif séance, prochaine fin de
//     cycle) + post-it
// L'engagement de 12 semaines est dans l'en-tête (ClientHeader).
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { inp, lbl } from '../../lib/coachShared'
import { loadClientOverview } from '../../lib/retentionData'
import { fmt, cycleUrgency } from '../../lib/insights'
import WeightHistoryPanel from './WeightHistoryPanel'
import GoalsEditor from './GoalsEditor'
import PostItPanel from './PostItPanel'
import TrackerPanel from './TrackerPanel'

// Mensurations saisies par l'athlète (le poids a son propre bloc)
const MEASURE_FIELDS = [
  { key: 'waist', label: 'Tour de taille', unit: 'cm', icon: '📏', color: 'var(--accent)' },
  { key: 'hips', label: 'Tour de hanches', unit: 'cm', icon: '📏', color: 'var(--rx)' },
  { key: 'glutes', label: 'Tour de fesses', unit: 'cm', icon: '📏', color: 'var(--gold)' },
  { key: 'chest', label: 'Tour de poitrine', unit: 'cm', icon: '📏', color: 'var(--info)' },
  { key: 'arm', label: 'Tour de bras', unit: 'cm', icon: '💪', color: 'var(--rx)' },
  { key: 'thigh', label: 'Tour de cuisse', unit: 'cm', icon: '📏', color: 'var(--accent)' },
  { key: 'calf', label: 'Tour de mollet', unit: 'cm', icon: '📏', color: 'var(--info)' },
]

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: 18,
}
const heading = {
  fontWeight: 700,
  fontSize: 12.5,
  color: 'var(--chalk-dim)',
  textTransform: 'uppercase',
  letterSpacing: 1.2,
  marginBottom: 12,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}
const linkBtn = {
  background: 'none',
  border: 0,
  color: 'var(--accent)',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  textTransform: 'none',
  letterSpacing: 0,
  fontFamily: 'inherit',
  padding: 0,
}
const bigNum = {
  fontFamily: 'var(--font-display, "Bebas Neue")',
  fontSize: 34,
  lineHeight: 1.05,
  marginTop: 6,
  color: 'var(--chalk)',
}
const fmtDay = (d) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''

function daysAgo(dateStr) {
  if (!dateStr) return ''
  const d = Math.round((Date.now() - new Date(`${dateStr}T12:00:00`).getTime()) / 86400000)
  if (d <= 0) return "aujourd'hui"
  if (d === 1) return 'hier'
  return `il y a ${d} jours`
}

function Stat({ label, children, sub, subColor }) {
  return (
    <div style={{ ...card, padding: '14px 16px' }}>
      <div
        style={{
          fontSize: 11.5,
          color: 'var(--chalk-dim)',
          textTransform: 'uppercase',
          letterSpacing: 1,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      {children}
      {sub && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            marginTop: 2,
            color: subColor || 'var(--chalk-dim)',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}

export default function OverviewTab({ client, measures, onMeasuresChange, onUpdate, isMobile }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ coach_note: '', current_program: '', session_target: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [overview, setOverview] = useState(null)

  useEffect(() => {
    if (!client) return
    setForm({
      coach_note: client.coach_note || '',
      current_program: client.current_program || '',
      session_target: client.session_target || '',
    })
  }, [client])

  useEffect(() => {
    if (!client?.id) return
    let active = true
    loadClientOverview(client.id).then((o) => active && setOverview(o))
    return () => {
      active = false
    }
  }, [client?.id])

  const save = async () => {
    setSaving(true)
    setError('')
    const { data, error: err } = await supabase
      .from('profiles')
      .update({
        coach_note: form.coach_note,
        current_program: form.current_program,
        session_target: form.session_target,
      })
      .eq('id', client.id)
      .select()
      .single()
    setSaving(false)
    if (err) {
      // La saisie reste dans le formulaire : rien n'est perdu
      setError("La note n'a pas pu être enregistrée : " + err.message)
      return
    }
    onUpdate?.({ ...client, ...data })
    setEditing(false)
  }

  if (!client) {
    return (
      <div style={{ color: 'var(--chalk-dim)', textAlign: 'center', padding: 40 }}>
        Client non trouvé
      </div>
    )
  }

  // Poids : dernière pesée et écart depuis la première
  const byDate = [...(measures || [])]
    .filter((m) => m.weight != null)
    .sort((a, b) => a.date.localeCompare(b.date))
  const lastWeight = byDate.length ? Number(byDate[byDate.length - 1].weight) : null
  const weightDelta =
    byDate.length >= 2 ? Math.round((lastWeight - Number(byDate[0].weight)) * 10) / 10 : null

  const hasMensurations = (measures || []).some((m) => MEASURE_FIELDS.some((f) => m[f.key] != null))
  const o = overview
  const cycle = o?.nextCycleEnd
  const cycleTag = cycle ? cycleUrgency(cycle.days_remaining) : null

  return (
    <div>
      {/* ── Chiffres clés ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Stat label="Séances cette semaine">
          <div style={bigNum}>
            {o ? o.weekDone : '…'}
            {o?.weekPlanned ? (
              <span style={{ color: 'var(--chalk-muted)', fontSize: 22 }}> / {o.weekPlanned}</span>
            ) : null}
          </div>
          {o?.weekPlanned > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }} aria-hidden>
              {Array.from({ length: o.weekPlanned }, (_, i) => (
                <i
                  key={i}
                  style={{
                    width: 16,
                    height: 6,
                    borderRadius: 3,
                    background: i < o.weekDone ? 'var(--rx)' : 'var(--border-hi)',
                  }}
                />
              ))}
            </div>
          )}
        </Stat>
        <Stat
          label="Assiduité 4 semaines"
          sub={
            o?.sessionsPlanned
              ? `${o.sessionsDone} séances sur ${o.sessionsPlanned}`
              : o
                ? 'Pas de programme actif'
                : ''
          }
        >
          <div
            style={{
              ...bigNum,
              color:
                o?.adherence == null
                  ? 'var(--chalk)'
                  : o.adherence >= 80
                    ? 'var(--rx)'
                    : o.adherence >= 55
                      ? 'var(--gold)'
                      : 'var(--danger)',
            }}
          >
            {o ? (o.adherence != null ? `${o.adherence} %` : '—') : '…'}
          </div>
        </Stat>
        <Stat
          label="Poids"
          sub={
            weightDelta !== null
              ? `${weightDelta > 0 ? '+' : ''}${fmt(weightDelta)} kg depuis le début`
              : byDate.length === 1
                ? `1 pesée · ${fmtDay(byDate[0].date)}`
                : 'Aucune pesée'
          }
          subColor={
            weightDelta === null ? undefined : weightDelta <= 0 ? 'var(--rx)' : 'var(--gold)'
          }
        >
          <div style={bigNum}>{lastWeight !== null ? `${fmt(lastWeight)} kg` : '—'}</div>
        </Stat>
        <Stat
          label="Dernier bilan"
          sub={
            o?.lastBilan
              ? `${daysAgo(o.lastBilan.weekStart)}${
                  o.lastBilan.trend ? ` · ${o.lastBilan.trend > 0 ? 'en hausse' : 'en baisse'}` : ''
                }`
              : o
                ? 'Aucun bilan'
                : ''
          }
          subColor={o?.lastBilan?.trend < 0 ? 'var(--gold)' : undefined}
        >
          <div style={bigNum}>
            {o?.lastBilan?.average != null ? (
              <>
                {fmt(o.lastBilan.average)}
                <span style={{ color: 'var(--chalk-muted)', fontSize: 22 }}> / 10</span>
              </>
            ) : o ? (
              '—'
            ) : (
              '…'
            )}
          </div>
        </Stat>
      </div>

      {/* ── 2 colonnes ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.5fr) minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <GoalsEditor clientId={client.id} />
          <WeightHistoryPanel
            clientId={client.id}
            measures={measures || []}
            onChange={onMeasuresChange}
          />
          {hasMensurations && (
            <TrackerPanel
              title="Mensurations"
              icon="📏"
              subtitle="Valeurs saisies par l'athlète, avec date et courbe d'évolution."
              entries={measures}
              fields={MEASURE_FIELDS}
              defaultField={MEASURE_FIELDS.find((f) => measures.some((m) => m[f.key] != null))?.key}
              emptyLabel="Aucune mensuration"
            />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <div style={heading}>
              Note coach
              <button style={linkBtn} onClick={() => setEditing((v) => !v)}>
                {editing ? 'Annuler' : 'Modifier'}
              </button>
            </div>

            {editing ? (
              <div>
                <label style={lbl}>Note coach</label>
                <textarea
                  value={form.coach_note}
                  onChange={(e) => setForm((p) => ({ ...p, coach_note: e.target.value }))}
                  rows={4}
                  placeholder="Objectifs, points d'attention, feedback..."
                  style={{ ...inp, resize: 'vertical', minHeight: 80, marginBottom: 10 }}
                />
                <label style={lbl}>Programme actuel</label>
                <input
                  value={form.current_program}
                  onChange={(e) => setForm((p) => ({ ...p, current_program: e.target.value }))}
                  placeholder="Ex: Cycle Force Hiver 2026"
                  style={{ ...inp, marginBottom: 10 }}
                />
                <label style={lbl}>Objectif séance</label>
                <input
                  value={form.session_target}
                  onChange={(e) => setForm((p) => ({ ...p, session_target: e.target.value }))}
                  placeholder="Ex: 5x5, 3x10, Hyrox..."
                  style={{ ...inp, marginBottom: 12 }}
                />
                {error && (
                  <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>
                    {error}
                  </div>
                )}
                <button
                  onClick={save}
                  disabled={saving}
                  style={{
                    border: 0,
                    background: 'var(--accent)',
                    color: '#16110d',
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '9px 14px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {saving ? 'Sauvegarde…' : 'Enregistrer'}
                </button>
              </div>
            ) : (
              <>
                {client.coach_note ? (
                  <div
                    style={{
                      background: 'var(--accent-dim)',
                      borderLeft: '3px solid var(--accent)',
                      borderRadius: 10,
                      padding: '12px 14px',
                      fontSize: 13.5,
                      lineHeight: 1.55,
                      color: 'var(--chalk)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {client.coach_note}
                  </div>
                ) : (
                  <div style={{ color: 'var(--chalk-dim)', fontSize: 13, fontStyle: 'italic' }}>
                    Aucune note pour ce client
                  </div>
                )}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '8px 14px',
                    fontSize: 13,
                    marginTop: 14,
                    color: 'var(--chalk)',
                  }}
                >
                  <span style={{ color: 'var(--chalk-dim)' }}>Objectif client</span>
                  <b>{client.objective || '—'}</b>
                  <span style={{ color: 'var(--chalk-dim)' }}>Programme</span>
                  <b>{client.current_program || '—'}</b>
                  <span style={{ color: 'var(--chalk-dim)' }}>Objectif séance</span>
                  <b>{client.session_target || '—'}</b>
                  <span style={{ color: 'var(--chalk-dim)' }}>Fin de cycle</span>
                  <b
                    style={{
                      color:
                        cycleTag === 'J-7' || cycleTag === 'Terminé'
                          ? 'var(--danger)'
                          : cycleTag
                            ? 'var(--gold)'
                            : 'var(--chalk)',
                    }}
                  >
                    {cycle?.end_date
                      ? `${cycleTag && cycleTag !== 'Terminé' ? `${cycleTag} · ` : ''}${fmtDay(String(cycle.end_date).slice(0, 10))}${
                          cycleTag === 'Terminé' ? ' (dépassée)' : ''
                        }`
                      : '—'}
                  </b>
                </div>
              </>
            )}
          </div>

          <PostItPanel
            clientId={client.id}
            notes={client.coach_notes || []}
            onUpdate={(updated) => onUpdate?.({ ...client, coach_notes: updated })}
          />
        </div>
      </div>
    </div>
  )
}
