import { useState } from 'react'
import CoachMiniChart from './CoachMiniChart'
import { S, font, bebas, mono } from '../../lib/coachDashboard/shared'

export default function TrackerPanel({ title, icon, subtitle, entries, fields, defaultField, emptyLabel }) {
  const [subTab, setSubTab] = useState('list')
  const [field, setField] = useState(defaultField)
  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date))
  const availableFields = fields.filter((f) => entries.some((e) => e[f.key] != null))
  return (
    <div
      style={{
        background: S.card,
        border: `1px solid ${S.border}`,
        borderRadius: 14,
        padding: '18px 20px',
        gridColumn: '1/-1',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: bebas,
              fontSize: 14,
              color: S.navy,
              letterSpacing: 2,
              marginBottom: 4,
            }}
          >
            {icon} {title}
          </div>
          <div style={{ fontSize: 12, color: S.muted }}>{subtitle}</div>
        </div>
      </div>
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', color: S.muted, padding: '24px 0', fontSize: 13 }}>
          {emptyLabel}
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              gap: 2,
              marginBottom: 14,
              borderBottom: `1px solid ${S.border}`,
            }}
          >
            {[
              { id: 'list', label: '📋 Historique' },
              { id: 'curve', label: '📈 Courbe' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                style={{
                  padding: '7px 14px',
                  border: 'none',
                  background: 'transparent',
                  fontFamily: font,
                  fontSize: 12,
                  fontWeight: subTab === t.id ? 700 : 500,
                  cursor: 'pointer',
                  color: subTab === t.id ? S.navy : S.muted,
                  borderBottom: `2px solid ${subTab === t.id ? S.gold : 'transparent'}`,
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {subTab === 'list' ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: 400,
                overflowY: 'auto',
              }}
            >
              {sorted.map((e, i) => (
                <div
                  key={e.id || e.date}
                  style={{
                    background: i === 0 ? '#F8FAFF' : 'white',
                    borderRadius: 11,
                    padding: '10px 13px',
                    border: i === 0 ? `1.5px solid ${S.border}` : `1px solid ${S.border}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{ fontSize: 12, color: S.muted, fontFamily: "'DM Mono',monospace" }}
                    >
                      {new Date(e.date).toLocaleDateString('fr-FR', {
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
                          color: S.green,
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontWeight: 800,
                        }}
                      >
                        DERNIER
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px' }}>
                    {fields
                      .filter((f) => e[f.key] != null)
                      .map((f) => (
                        <div
                          key={f.key}
                          style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}
                        >
                          <span style={{ fontSize: 10, color: S.muted }}>
                            {f.icon} {f.label}
                          </span>
                          <span style={{ fontWeight: 900, fontSize: 14, color: f.color }}>
                            {e[f.key]}
                            <span style={{ fontSize: 10, fontWeight: 400, color: S.muted }}>
                              {' '}
                              {f.unit}
                            </span>
                          </span>
                        </div>
                      ))}
                    {(e.notes || e.note || e.comment) && (
                      <div
                        style={{
                          width: '100%',
                          fontSize: 11,
                          color: S.muted,
                          marginTop: 3,
                          fontStyle: 'italic',
                        }}
                      >
                        💬 {e.notes || e.note || e.comment}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {availableFields.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setField(f.key)}
                    style={{
                      padding: '5px 13px',
                      borderRadius: 20,
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: font,
                      fontSize: 12,
                      fontWeight: 700,
                      background: field === f.key ? f.color : '#F0F2F8',
                      color: field === f.key ? 'white' : S.muted,
                    }}
                  >
                    {f.icon} {f.label}
                  </button>
                ))}
              </div>
              <div style={{ background: '#F8FAFF', borderRadius: 12, padding: '16px 14px' }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: S.navy, marginBottom: 12 }}>
                  {fields.find((f) => f.key === field)?.icon}{' '}
                  {fields.find((f) => f.key === field)?.label}{' '}
                  <span style={{ fontSize: 11, color: S.muted, fontWeight: 400 }}>
                    ({fields.find((f) => f.key === field)?.unit})
                  </span>
                </div>
                <CoachMiniChart entries={entries} field={field} fieldsMeta={fields} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
