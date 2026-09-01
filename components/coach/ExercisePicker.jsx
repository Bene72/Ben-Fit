import { useState } from 'react'

export default function ExercisePicker({
  query,
  setQuery,
  mode,
  setMode,
  freeText,
  setFreeText,
  imageFiles,
  addedNames = [],
  onConfirm,
  onClose,
}) {
  const [loading] = useState(false)
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

  const normalizedFiles = (imageFiles || []).map((name) => ({
    name: name.replace(/\.[^.]+$/, ''),
    url: `${SUPABASE_URL}/storage/v1/object/public/exercise-images/${encodeURIComponent(name)}`,
  }))

  const filtered = (
    query.length < 1
      ? normalizedFiles
      : normalizedFiles.filter(
          (f) =>
            f.name.toLowerCase().includes(query.toLowerCase()) ||
            query
              .toLowerCase()
              .split(' ')
              .some((w) => w.length > 2 && f.name.toLowerCase().includes(w))
        )
  ).sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(13,27,78,0.45)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'var(--card, #fff)',
          borderRadius: 'var(--r-lg, 16px)',
          padding: 24,
          width: 420,
          maxWidth: '95vw',
          boxShadow: 'var(--shadow-lg, 0 20px 60px rgba(0,0,0,0.3))',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: 'var(--navy)',
            marginBottom: 4,
          }}
        >
          ➕ Ajouter des exercices
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 14 }}>
          Clique pour ajouter — la fenêtre reste ouverte, enchaîne directement sur le suivant.
        </div>

        {/* Exercices déjà ajoutés dans cette session de picker */}
        {addedNames.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {addedNames.map((n, i) => (
              <span
                key={`${n}-${i}`}
                style={{
                  background: 'var(--success-soft)',
                  color: 'var(--success)',
                  border: '1px solid var(--success)',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                ✓ {n}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button
            onClick={() => setMode('search')}
            style={{
              flex: 1,
              padding: 8,
              background: mode === 'search' ? 'var(--navy)' : 'var(--accent-soft)',
              color: mode === 'search' ? '#fff' : 'var(--navy)',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            🔍 Exercices répertoriés
          </button>
          <button
            onClick={() => setMode('free')}
            style={{
              flex: 1,
              padding: 8,
              background: mode === 'free' ? 'var(--accent)' : 'var(--accent-soft)',
              color: mode === 'free' ? '#fff' : 'var(--accent)',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            ✏️ Exercice libre
          </button>
        </div>

        {mode === 'search' && (
          <>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un exercice…"
              style={{
                padding: '10px 12px',
                border: '1.5px solid var(--border-strong)',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: "'DM Sans',sans-serif",
                outline: 'none',
                marginBottom: 12,
              }}
            />
            <div
              style={{
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {loading && normalizedFiles.length === 0 && (
                <div
                  style={{
                    color: 'var(--text-soft)',
                    fontSize: 13,
                    textAlign: 'center',
                    padding: 20,
                  }}
                >
                  ⏳ Chargement des exercices…
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div
                  style={{
                    color: 'var(--text-soft)',
                    fontSize: 13,
                    textAlign: 'center',
                    padding: 20,
                  }}
                >
                  {query.length > 0
                    ? 'Aucun résultat — utilise le mode "Exercice libre"'
                    : 'Aucun exercice dans le bucket'}
                </div>
              )}
              {!loading &&
                filtered.length > 0 &&
                filtered.map((f) => (
                  <div
                    key={f.name}
                    onClick={() => onConfirm(f.name, f.url)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-soft)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <img
                      src={f.url}
                      alt={f.name}
                      style={{
                        width: 44,
                        height: 44,
                        objectFit: 'cover',
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                    <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--navy)' }}>
                      {f.name}
                    </span>
                  </div>
                ))}
            </div>
          </>
        )}

        {mode === 'free' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>
              Saisis le nom de l'exercice. Aucune image ne sera associée automatiquement.
            </div>
            <input
              autoFocus
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Ex: Dumbbell Romanian Deadlift…"
              style={{
                padding: '10px 12px',
                border: '1.5px solid var(--border-strong)',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: "'DM Sans',sans-serif",
                outline: 'none',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && freeText.trim()) onConfirm(freeText.trim(), null)
              }}
            />
            <button
              onClick={() => freeText.trim() && onConfirm(freeText.trim(), null)}
              disabled={!freeText.trim()}
              style={{
                padding: 10,
                background: freeText.trim() ? 'var(--accent)' : '#CCC',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: freeText.trim() ? 'pointer' : 'not-allowed',
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              ✓ Ajouter "{freeText || '…'}"
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: 12,
            padding: 10,
            background: addedNames.length > 0 ? 'var(--navy)' : 'transparent',
            color: addedNames.length > 0 ? '#fff' : 'var(--text-soft)',
            border: addedNames.length > 0 ? 'none' : '1px solid var(--border-strong)',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          {addedNames.length > 0 ? `✓ Terminé (${addedNames.length} ajouté${addedNames.length > 1 ? 's' : ''})` : 'Annuler'}
        </button>
      </div>
    </div>
  )
}
