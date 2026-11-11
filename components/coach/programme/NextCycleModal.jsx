// components/coach/programme/NextCycleModal.jsx
// « Préparer le cycle suivant » : recopie le cycle actuel dans le cycle futur
// avec une progression au choix. Rien n'est supprimé : si le cycle futur
// contient déjà des séances, les nouvelles s'ajoutent à la suite.
import { useState } from 'react'
import { btnVariant } from '../../../lib/coachShared'
import { PROGRESSIONS, countProgressed } from '../../../lib/programme/progression'

export default function NextCycleModal({ workouts, futureCount, preparing, onConfirm, onCancel }) {
  const [mode, setMode] = useState('kg2.5')
  const changed = countProgressed(workouts, mode)
  const exCount = workouts.reduce((n, w) => n + (w.exercises || []).length, 0)

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 200,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
    >
      <div
        role="dialog"
        aria-label="Préparer le cycle suivant"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 22,
          width: '100%',
          maxWidth: 440,
          color: 'var(--chalk)',
        }}
      >
        <h3
          style={{
            margin: '0 0 6px',
            fontFamily: 'var(--font-display, "Bebas Neue")',
            fontSize: 26,
            fontWeight: 400,
            letterSpacing: 0.5,
          }}
        >
          Préparer le cycle suivant
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--chalk-dim)', lineHeight: 1.5 }}>
          Les {workouts.length} séances du cycle actuel ({exCount} exercices) sont recopiées dans le
          <b> cycle futur</b>. Tu ajustes ensuite, puis tu actives quand tu veux.
        </p>

        <div style={{ display: 'grid', gap: 8, marginBottom: 14 }} role="radiogroup">
          {PROGRESSIONS.map((p) => {
            const on = mode === p.id
            return (
              <button
                key={p.id}
                role="radio"
                aria-checked={on}
                onClick={() => setMode(p.id)}
                style={{
                  textAlign: 'left',
                  padding: '11px 14px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: on ? 'var(--accent-dim)' : 'var(--bg-card-2)',
                  border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                  color: 'var(--chalk)',
                }}
              >
                <b style={{ fontSize: 14 }}>{p.label}</b>
                <span style={{ fontSize: 12, color: 'var(--chalk-dim)', marginLeft: 8 }}>
                  {p.hint}
                </span>
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: 12.5, color: 'var(--chalk-dim)', marginBottom: 6 }}>
          {mode === 'same'
            ? 'Les charges et répétitions restent identiques.'
            : `${changed} exercice${changed > 1 ? 's' : ''} sur ${exCount} seront ajustés. Les valeurs non chiffrées (%, RPE, PDC…) restent telles quelles.`}
        </div>
        {futureCount > 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--gold)', marginBottom: 6 }}>
            ⚠️ Le cycle futur contient déjà {futureCount} séance{futureCount > 1 ? 's' : ''} : les
            nouvelles s'ajouteront à la suite (rien n'est supprimé).
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button onClick={onCancel} style={btnVariant('ghost')}>
            Annuler
          </button>
          <button
            onClick={() => onConfirm(mode)}
            disabled={preparing || !workouts.length}
            style={btnVariant('primary')}
          >
            {preparing ? 'Préparation…' : 'Créer le cycle futur'}
          </button>
        </div>
      </div>
    </div>
  )
}
