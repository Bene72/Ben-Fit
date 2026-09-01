import { useState } from 'react'
import { ci } from '../../lib/coachShared'

export default function ExRow({
  ex,
  wId,
  edit,
  onUpdate,
  onDelete,
  onMove,
  isFirst,
  isLast,
  recentLog,
}) {
  const [showImg, setShowImg] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  if (edit) {
    return (
      <div
        style={{
          background: 'var(--surface-muted, #FAFBFF)',
          border: '1.5px solid var(--border-strong, #C5D0F0)',
          borderRadius: 'var(--r-md, 12px)',
          padding: '14px 14px 12px',
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              flexShrink: 0,
              paddingTop: 6,
            }}
          >
            <button
              onClick={() => !isFirst && onMove(wId, ex.id, -1)}
              disabled={isFirst}
              style={{
                width: 26,
                height: 24,
                border: '1px solid var(--border-strong, #C5D0F0)',
                borderRadius: 5,
                background: isFirst ? 'var(--surface-strong, #F5F5F5)' : 'var(--card, white)',
                color: isFirst ? 'var(--text-faint, #CCC)' : 'var(--navy, #0D1B4E)',
                cursor: isFirst ? 'default' : 'pointer',
                fontSize: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              ▲
            </button>
            <button
              onClick={() => !isLast && onMove(wId, ex.id, 1)}
              disabled={isLast}
              style={{
                width: 26,
                height: 24,
                border: '1px solid var(--border-strong, #C5D0F0)',
                borderRadius: 5,
                background: isLast ? 'var(--surface-strong, #F5F5F5)' : 'var(--card, white)',
                color: isLast ? 'var(--text-faint, #CCC)' : 'var(--navy, #0D1B4E)',
                cursor: isLast ? 'default' : 'pointer',
                fontSize: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              ▼
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label
              style={{
                fontSize: 10,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: 'var(--text-soft, #6B7A99)',
                fontWeight: 600,
              }}
            >
              Exercice
            </label>
            <input
              value={ex.name}
              onChange={(e) => onUpdate(wId, ex.id, 'name', e.target.value)}
              style={{ ...ci, fontWeight: 700, fontSize: 15, padding: '10px 12px' }}
            />
          </div>
          <button
            onClick={() => onDelete(wId, ex.id)}
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              border: 'none',
              background: 'var(--danger-soft)',
              color: 'var(--danger, #C45C3A)',
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 18,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: 8,
            marginBottom: 10,
          }}
        >
          {[
            { key: 'sets', label: 'Séries', type: 'number', align: 'center' },
            { key: 'reps', label: 'Reps', align: 'center' },
          ].map((f) => (
            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label
                style={{
                  fontSize: 10,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: 'var(--text-soft, #6B7A99)',
                  fontWeight: 600,
                }}
              >
                {f.label}
              </label>
              <input
                type={f.type || 'text'}
                value={ex[f.key]}
                onChange={(e) => onUpdate(wId, ex.id, f.key, e.target.value)}
                style={{ ...ci, textAlign: f.align, fontSize: 14, fontWeight: 700, padding: '8px 4px' }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label
              style={{
                fontSize: 10,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: 'var(--text-soft, #6B7A99)',
                fontWeight: 600,
              }}
            >
              Repos
            </label>
            <select
              value={ex.rest || '90s'}
              onChange={(e) => onUpdate(wId, ex.id, 'rest', e.target.value)}
              style={{ ...ci, fontSize: 13, padding: '8px 4px', textAlign: 'center' }}
            >
              {['30s', '45s', '60s', '90s', '2 min', '3 min', '4 min', '5 min'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label
              style={{
                fontSize: 10,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: 'var(--text-soft, #6B7A99)',
                fontWeight: 600,
              }}
            >
              Charge
            </label>
            <input
              value={ex.target_weight || ''}
              onChange={(e) => onUpdate(wId, ex.id, 'target_weight', e.target.value)}
              placeholder="80kg"
              style={{ ...ci, textAlign: 'center', fontSize: 13, padding: '8px 4px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label
            style={{
              fontSize: 10,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: 'var(--text-soft, #6B7A99)',
              fontWeight: 600,
            }}
          >
            Notes / consigne coach
          </label>
          <textarea
            value={ex.note || ''}
            onChange={(e) => onUpdate(wId, ex.id, 'note', e.target.value)}
            placeholder="Tempo, consigne, point d'attention…"
            rows={3}
            style={{ ...ci, resize: 'vertical', minHeight: 80, lineHeight: 1.6, fontSize: 14, padding: '10px 12px' }}
          />
        </div>
      </div>
    )
  }

  return (
    <>
      {showImg && ex.image_url && (
        <div
          onClick={() => setShowImg(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13,27,78,0.75)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ position: 'relative', maxWidth: 500, width: '90%' }}>
            <img
              src={ex.image_url}
              alt={ex.name}
              style={{ width: '100%', borderRadius: 16, boxShadow: 'var(--shadow-hero)' }}
            />
            <div style={{ textAlign: 'center', color: 'white', marginTop: 12, fontWeight: 600, fontSize: 16 }}>
              {ex.name}
            </div>
            <button
              onClick={() => setShowImg(false)}
              style={{
                position: 'absolute',
                top: -12,
                right: -12,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'white',
                border: 'none',
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 60px 70px 80px 90px 1fr',
          gap: 6,
          alignItems: 'center',
          padding: '12px 14px',
          borderBottom: showHistory ? 'none' : '1px solid var(--border-soft)',
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-muted)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {ex.image_url ? (
            <img
              src={ex.image_url}
              alt={ex.name}
              onClick={() => setShowImg(true)}
              style={{
                width: 60,
                height: 60,
                objectFit: 'cover',
                borderRadius: 7,
                cursor: 'pointer',
                flexShrink: 0,
                border: '1px solid var(--border-strong)',
              }}
            />
          ) : (
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 7,
                background: 'var(--accent-soft)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
              }}
            >
              💪
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)' }}>{ex.name}</div>
            {ex.note && <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>{ex.note}</div>}
            {recentLog && (
              <button
                onClick={() => setShowHistory((s) => !s)}
                style={{
                  marginTop: 3,
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
                  ↳ {recentLog.weight ? `${recentLog.weight} kg` : ''}
                  {recentLog.weight && recentLog.reps ? ' · ' : ''}
                  {recentLog.reps ? `${recentLog.reps} reps` : ''}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>
                  {showHistory ? '▲' : '▼'} historique
                </span>
              </button>
            )}
          </div>
        </div>
        <div style={{ fontSize: 13, textAlign: 'center', fontWeight: 700, color: 'var(--navy)' }}>{ex.sets}</div>
        <div style={{ fontSize: 13, textAlign: 'center', fontWeight: 700, color: 'var(--navy)' }}>{ex.reps}</div>
        <div style={{ fontSize: 12, textAlign: 'center', color: 'var(--text-soft)' }}>⏱ {ex.rest}</div>
        <div style={{ fontSize: 12, textAlign: 'center', color: 'var(--text-soft)' }}>
          {ex.target_weight ? `${ex.target_weight} kg` : '—'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>{ex.note}</div>
      </div>
    </>
  )
}
