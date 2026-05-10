import { useState } from 'react'

function ExercisePicker({ picker, query, setQuery, mode, setMode, freeVal, setFreeVal, onConfirm, onClose, exerciseFiles, supabaseUrl, loading }) {
  const normalizedFiles = exerciseFiles.map(name => ({
    name: name.replace(/\.[^.]+$/, ''),
    url: `${supabaseUrl}/storage/v1/object/public/exercise-images/${encodeURIComponent(name)}`
  }))
  const filtered = (query.length < 1
    ? normalizedFiles
    : normalizedFiles.filter(f =>
        f.name.toLowerCase().includes(query.toLowerCase()) ||
        query.toLowerCase().split(' ').some(w => w.length > 2 && f.name.toLowerCase().includes(w))
      )
  ).sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '420px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: '700', fontSize: '16px', color: '#0D1B4E', marginBottom: '16px' }}>
          ➕ Ajouter un exercice
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <button onClick={() => setMode('search')} style={{ flex: 1, padding: '8px', background: mode === 'search' ? '#0D1B4E' : '#EEF2FF', color: mode === 'search' ? 'white' : '#0D1B4E', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            🔍 Exercices répertoriés
          </button>
          <button onClick={() => setMode('free')} style={{ flex: 1, padding: '8px', background: mode === 'free' ? '#4A6FD4' : '#EEF2FF', color: mode === 'free' ? 'white' : '#4A6FD4', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            ✏️ Exercice libre
          </button>
        </div>

        {mode === 'search' && (
          <>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher un exercice…"
              style={{ padding: '10px 12px', border: '1.5px solid #C5D0F0', borderRadius: '8px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", outline: 'none', marginBottom: '12px' }}
            />
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {loading && normalizedFiles.length === 0 && (
                <div style={{ color: '#6B7A99', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                  ⏳ Chargement des exercices…
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div style={{ color: '#6B7A99', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                  {query.length > 0 ? 'Aucun résultat — utilise le mode "Exercice libre"' : 'Aucun exercice dans le bucket'}
                </div>
              )}
              {!loading && filtered.length > 0 && filtered.map(f => (
                <div key={f.name} onClick={() => onConfirm(f.name, f.url)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #E8ECFA', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <img src={f.url} alt={f.name} style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                    onError={e => { e.target.style.display='none' }} />
                  <span style={{ fontWeight: '500', fontSize: '14px', color: '#0D1B4E' }}>{f.name}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {mode === 'free' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: '#6B7A99' }}>
              Saisis le nom de l'exercice. Aucune image ne sera associée automatiquement.
            </div>
            <input
              autoFocus
              value={freeVal}
              onChange={e => setFreeVal(e.target.value)}
              placeholder="Ex: Dumbbell Romanian Deadlift…"
              style={{ padding: '10px 12px', border: '1.5px solid #C5D0F0', borderRadius: '8px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", outline: 'none' }}
              onKeyDown={e => { if (e.key === 'Enter' && freeVal.trim()) onConfirm(freeVal.trim(), null) }}
            />
            <button
              onClick={() => freeVal.trim() && onConfirm(freeVal.trim(), null)}
              disabled={!freeVal.trim()}
              style={{ padding: '10px', background: freeVal.trim() ? '#4A6FD4' : '#CCC', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: freeVal.trim() ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans',sans-serif" }}
            >
              ✓ Ajouter "{freeVal || '…'}"
            </button>
          </div>
        )}

        <button onClick={onClose} style={{ marginTop: '12px', padding: '8px', background: 'transparent', color: '#6B7A99', border: '1px solid #C5D0F0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
          Annuler
        </button>
      </div>
    </div>
  )
}

