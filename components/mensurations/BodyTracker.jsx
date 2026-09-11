// components/mensurations/BodyTracker.jsx
// Extrait de pages/mensurations.js (decoupage audit 09/09/2026, point 4).
// Aucune logique modifiee, copie tel quel.
import MiniChart from './MiniChart'
import { MEASURE_FIELDS } from './measureFields'

export default function BodyTracker({
  measures,
  weightForm,
  setWeightForm,
  editWeight,
  setEditWeight,
  saving,
  saveWeight,
  deleteMeasure,
  deletingId,
  editingMeasure,
  setEditingMeasure,
  updateMeasure,
  startEditMeasure,
  bodyTab,
  setBodyTab,
  chartField,
  setChartField,
}) {
  const latest = measures[0] || {}
  const inpB = {
    width: '100%',
    padding: '9px 11px',
    border: '1.5px solid #E8E4DC',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "'DM Sans',sans-serif",
    background: 'var(--bg)',
    outline: 'none',
    color: 'var(--navy)',
    boxSizing: 'border-box',
  }
  const btnB = (bg, col, brd) => ({
    padding: '9px 18px',
    background: bg,
    color: col,
    border: brd ? `1.5px solid ${brd}` : 'none',
    borderRadius: 9,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'DM Sans',sans-serif",
  })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div
        style={{
          background: 'var(--navy)',
          borderRadius: 16,
          padding: '22px 24px',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 22,
              fontWeight: 800,
              marginBottom: 4,
            }}
          >
            📏 Suivi corporel
          </div>
          <div style={{ fontSize: 12, opacity: 0.55 }}>Poids · mensurations · évolution</div>
        </div>
        <button
          onClick={() => {
            if (editWeight) {
              setEditWeight(false)
              setEditingMeasure(null)
            } else setEditWeight(true)
          }}
          style={{
            ...btnB(editWeight ? 'rgba(255,255,255,0.1)' : 'var(--gold)', 'white'),
            border: editWeight ? '1px solid rgba(255,255,255,0.2)' : 'none',
          }}
        >
          {editWeight ? '✕ Annuler' : '+ Nouvelle mesure'}
        </button>
      </div>
      {editWeight && (
        <div
          style={{
            background: 'white',
            border: '1.5px solid #E8E4DC',
            borderRadius: 14,
            padding: '20px 18px',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--navy)', marginBottom: 16 }}>
            {editingMeasure ? (
              <span>
                ✏️ Modifier la mesure du{' '}
                <span style={{ color: 'var(--gold)' }}>
                  {new Date(
                    measures.find((m) => m.id === editingMeasure)?.date + 'T12:00'
                  ).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </span>
            ) : (
              <span>
                ✏️{' '}
                {new Date().toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
              marginBottom: 10,
            }}
          >
            {MEASURE_FIELDS.map((f) => (
              <div key={f.key}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 10,
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    color: 'var(--text-faint)',
                    marginBottom: 4,
                    fontWeight: 700,
                  }}
                >
                  {f.icon} {f.label} ({f.unit}){f.required ? ' *' : ''}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weightForm[f.key] || ''}
                  onChange={(e) => setWeightForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.required ? 'Obligatoire' : 'Optionnel'}
                  style={inpB}
                />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: 'block',
                fontSize: 10,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: 'var(--text-faint)',
                marginBottom: 4,
                fontWeight: 700,
              }}
            >
              📝 Note
            </label>
            <input
              value={weightForm.notes || ''}
              onChange={(e) => setWeightForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Ex: matin à jeun, après séance…"
              style={inpB}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={editingMeasure ? updateMeasure : saveWeight}
              disabled={saving || !weightForm.weight}
              style={{
                ...btnB(editingMeasure ? 'var(--gold)' : 'var(--navy)', 'white'),
                opacity: !weightForm.weight ? 0.45 : 1,
              }}
            >
              {saving ? 'Sauvegarde…' : editingMeasure ? '✓ Mettre à jour' : '✓ Enregistrer'}
            </button>
            <button
              onClick={() => {
                setEditWeight(false)
                setEditingMeasure(null)
              }}
              style={btnB('transparent', '#8A8070', '#E8E4DC')}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
      {measures.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {MEASURE_FIELDS.filter((f) => latest[f.key] != null).map((f) => {
            const prev = measures.find((m, i) => i > 0 && m[f.key] != null)
            const delta = prev ? (+latest[f.key] - +prev[f.key]).toFixed(1) : null
            const positive = delta !== null && parseFloat(delta) > 0
            const dColor =
              f.key === 'weight'
                ? positive
                  ? 'var(--danger)'
                  : 'var(--success)'
                : positive
                  ? 'var(--success)'
                  : 'var(--danger)'
            return (
              <div
                key={f.key}
                onClick={() => {
                  setBodyTab('curve')
                  setChartField(f.key)
                }}
                style={{
                  background: 'white',
                  border: `1.5px solid ${f.color}20`,
                  borderTop: `3px solid ${f.color}`,
                  borderRadius: 13,
                  padding: '13px 10px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 4px 14px ${f.color}22`)}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{f.icon}</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: f.color, lineHeight: 1 }}>
                  {latest[f.key]}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 3 }}>
                  {f.unit}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: '#8A8070',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    fontWeight: 700,
                    marginBottom: 5,
                  }}
                >
                  {f.label}
                </div>
                {delta !== null && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: parseFloat(delta) === 0 ? 'var(--text-faint)' : dColor,
                    }}
                  >
                    {positive ? '+' : ''}
                    {delta} {f.unit}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <div
        style={{
          background: 'white',
          border: '1px solid #E8E4DC',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {[
            { id: 'history', label: '📋 Historique' },
            { id: 'curve', label: '📈 Courbe' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setBodyTab(t.id)}
              style={{
                flex: 1,
                padding: 13,
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'DM Sans',sans-serif",
                fontWeight: 700,
                fontSize: 13,
                background: bodyTab === t.id ? 'var(--navy)' : 'transparent',
                color: bodyTab === t.id ? 'white' : '#8A8070',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ padding: 18 }}>
          {bodyTab === 'history' &&
            (measures.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  color: 'var(--text-faint)',
                  padding: '30px 0',
                  fontSize: 13,
                }}
              >
                Aucune mesure enregistrée
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  maxHeight: 460,
                  overflowY: 'auto',
                }}
              >
                {measures.map((m, i) => (
                  <div
                    key={m.id}
                    style={{
                      background: i === 0 ? 'var(--bg)' : 'white',
                      borderRadius: 11,
                      padding: '12px 14px',
                      border: i === 0 ? '1.5px solid #E8E4DC' : '1px solid var(--border-soft)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--text-faint)',
                            fontFamily: "'DM Mono',monospace",
                          }}
                        >
                          {new Date(m.date).toLocaleDateString('fr-FR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {i === 0 && (
                          <span
                            style={{
                              fontSize: 9,
                              background: '#E8F0E8',
                              color: 'var(--success)',
                              padding: '2px 8px',
                              borderRadius: 10,
                              fontWeight: 800,
                            }}
                          >
                            ACTUEL
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => startEditMeasure(m)}
                          style={{
                            background: 'rgba(184,134,11,0.09)',
                            border: 'none',
                            color: 'var(--gold)',
                            borderRadius: 7,
                            width: 28,
                            height: 28,
                            cursor: 'pointer',
                            fontSize: 14,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteMeasure(m.id)}
                          disabled={deletingId === m.id}
                          style={{
                            background: 'rgba(196,92,58,0.09)',
                            border: 'none',
                            color: 'var(--danger)',
                            borderRadius: 7,
                            width: 28,
                            height: 28,
                            cursor: 'pointer',
                            fontSize: 15,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                          }}
                        >
                          {deletingId === m.id ? '…' : '×'}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px' }}>
                      {MEASURE_FIELDS.filter((f) => m[f.key] != null).map((f) => (
                        <div
                          key={f.key}
                          style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}
                        >
                          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                            {f.label}
                          </span>
                          <span style={{ fontWeight: 900, fontSize: 15, color: f.color }}>
                            {m[f.key]}
                            <span
                              style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-faint)' }}
                            >
                              {' '}
                              {f.unit}
                            </span>
                          </span>
                        </div>
                      ))}
                      {m.notes && (
                        <div
                          style={{
                            width: '100%',
                            fontSize: 11,
                            color: 'var(--text-faint)',
                            marginTop: 3,
                            fontStyle: 'italic',
                          }}
                        >
                          💬 {m.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          {bodyTab === 'curve' && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {MEASURE_FIELDS.filter((f) => measures.some((m) => m[f.key] != null)).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setChartField(f.key)}
                    style={{
                      padding: '5px 13px',
                      borderRadius: 20,
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: "'DM Sans',sans-serif",
                      fontSize: 12,
                      fontWeight: 700,
                      background: chartField === f.key ? f.color : 'var(--border-soft)',
                      color: chartField === f.key ? 'white' : '#8A8070',
                      transition: 'all 0.15s',
                    }}
                  >
                    {f.icon} {f.label}
                  </button>
                ))}
              </div>
              <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '16px 14px' }}>
                <div
                  style={{ fontWeight: 800, fontSize: 14, color: 'var(--navy)', marginBottom: 12 }}
                >
                  {MEASURE_FIELDS.find((f) => f.key === chartField)?.icon}{' '}
                  {MEASURE_FIELDS.find((f) => f.key === chartField)?.label}{' '}
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 400 }}>
                    ({MEASURE_FIELDS.find((f) => f.key === chartField)?.unit})
                  </span>
                </div>
                <MiniChart measures={measures} field={chartField} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
