/** components/training/ExerciseWorkspace.jsx */
export default function ExerciseWorkspace({ exercise, input, onInput, onLog, logging, onImageOpen, latestLog, isMobile, recentLogs }) {
  return (
    <div style={{ borderRadius: 10, border: '1.5px solid #2C64E5', background: '#F8FBFF', padding: isMobile ? 12 : 16, marginBottom: 8 }}>
      {exercise.note && (
        <div style={{ marginBottom: 10, padding: '7px 12px', background: 'white', borderRadius: 8, borderLeft: '3px solid #2C64E5', fontSize: 13, color: '#0D1B4E', lineHeight: 1.6 }}>
          📋 <span style={{ fontWeight: 700 }}>Note coach :</span> {exercise.note}
        </div>
      )}
      <div style={{ fontWeight: 900, fontSize: 14, color: '#0D1B4E', marginBottom: 10 }}>{exercise.name}</div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        <div>
          <Label>PRESCRIPTION</Label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', background: '#2C64E5', color: 'white', borderRadius: 20 }}>{exercise.sets} × {exercise.reps}</span>
            <span style={{ fontSize: 12, padding: '4px 10px', background: '#EEF4FF', color: '#2C64E5', borderRadius: 20 }}>⏱ {exercise.rest}</span>
          </div>
          <div style={{ color: '#4A6FB5', lineHeight: 1.5, fontSize: 12, marginBottom: 12 }}>{exercise.note || 'Aucune note.'}</div>
          {recentLogs?.length > 0 && (
            <>
              <Label>HISTORIQUE</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                {recentLogs.slice(0, 5).map((log, i) => (
                  <div key={log.id || i} style={{ background: 'white', borderRadius: 8, padding: '7px 10px', border: '1px solid #DCE5F3', fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 800, color: '#2C64E5' }}>
                        {log.weight_used ? `${log.weight_used} kg` : ''}{log.weight_used && log.reps_done ? ' · ' : ''}{log.reps_done ? `${log.reps_done} reps` : ''}
                      </span>
                      <span style={{ fontSize: 10, color: '#9BA8C0' }}>
                        {log.logged_at ? new Date(log.logged_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : ''}
                      </span>
                    </div>
                    {(log.notes || log.note) && <div style={{ fontSize: 11, color: '#6B7A99', marginTop: 3, fontStyle: 'italic' }}>"{log.notes || log.note}"</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div>
          <Label>RÉSULTAT</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <Field label="Charge"><input value={input.weight || ''} onChange={(e) => onInput('weight', e.target.value)} placeholder="kg" style={inputStyle()} /></Field>
            <Field label="Reps"><input value={input.reps || ''} onChange={(e) => onInput('reps', e.target.value)} placeholder="reps" style={inputStyle()} /></Field>
          </div>
          <div style={{ marginBottom: 8 }}>
            <Field label="RPE (1-10)"><input value={input.rpe || ''} onChange={(e) => onInput('rpe', e.target.value)} placeholder="ex: 8" style={inputStyle()} /></Field>
          </div>
          <div style={{ marginBottom: 8 }}>
            <Field label="Ton ressenti (optionnel)">
              <textarea value={input.note || ''} onChange={(e) => onInput('note', e.target.value)} placeholder="Ex: bonne séance, sensation de force, douleur épaule…" rows={2} style={{ ...inputStyle(), resize: 'vertical', fontFamily: "'DM Sans',sans-serif" }} />
            </Field>
          </div>
          <button type="button" onClick={onLog} disabled={logging} style={{ width: '100%', border: 'none', background: '#2C64E5', color: 'white', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            {logging ? '...' : '✓ Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function inputStyle() {
  return { width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: 8, border: '1px solid #C5D8F5', background: 'white', fontSize: 13, color: '#0D1B4E', fontFamily: "'DM Sans',sans-serif" }
}
function Label({ children }) {
  return <div style={{ fontWeight: 800, color: '#0D1B4E', marginBottom: 6, fontSize: 10, letterSpacing: '0.5px' }}>{children}</div>
}
function Field({ label, children }) {
  return <div><div style={{ fontSize: 10, fontWeight: 800, color: '#6B7A99', marginBottom: 4 }}>{label}</div>{children}</div>
}
