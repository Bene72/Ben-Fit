// components/mensurations/RecipeOfTheDay.jsx
// Extrait de pages/mensurations.js (decoupage audit 09/09/2026, point 4).
// Aucune logique modifiee, copie tel quel.
import Image from 'next/image'

const RECIPE = {
  name: 'Muffins Pépites de Chocolat',
  category: 'Goûter',
  emoji: '🧁',
  prep_time: '10 min',
  cook_time: '20-25 min',
  servings: 8,
  description:
    'Des muffins moelleux et healthy, sans sucre raffiné, riches en protéines. Le goûter parfait pour les sportifs.',
  image: '/muffins-choco.png',
  ingredients: [
    { qty: '125g', name: 'farine de blé semi-complète' },
    { qty: '100g', name: 'compote de pomme sans sucre ajouté' },
    { qty: '50g', name: 'fromage blanc 0%' },
    { qty: '1', name: 'œuf entier' },
    { qty: '35g', name: 'pépites de chocolat' },
    { qty: '30g', name: "sirop d'agave" },
    { qty: '10ml', name: 'huile de coco' },
    { qty: '5g', name: 'levure chimique' },
  ],
  steps: [
    'Préchauffer le four à 180°C.',
    "Faire fondre l'huile de coco.",
    "Mélanger farine, compote, fromage blanc, œuf, sirop d'agave, huile et levure.",
    'Incorporer les pépites de chocolat.',
    'Remplir aux ¾ les moules à muffins.',
    "Enfourner 20-25 min jusqu'à dorure.",
    'Laisser tiédir avant de déguster.',
  ],
  tips: 'Conserver dans un récipient hermétique au frais. À consommer dans les 2 jours.',
  macros: { calories: 139, proteines: 3.9, glucides: 21.7, lipides: 4.1 },
}

function RecipeOfTheDay() {
  const r = RECIPE
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      <div
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 8px 32px rgba(13,27,42,0.18)',
        }}
      >
        <Image
          src={r.image}
          alt={r.name}
          width={768}
          height={768}
          style={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(13,27,42,0.92) 0%, transparent 55%)',
          }}
        />
        <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
          <span
            style={{
              background: 'rgba(255,255,255,0.95)',
              color: 'var(--danger)',
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            {r.emoji} {r.category}
          </span>
          <span
            style={{
              background: 'rgba(0,0,0,0.45)',
              color: 'white',
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 11,
            }}
          >
            ⏱ {r.prep_time} + {r.cook_time}
          </span>
        </div>
        <div
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 22px 20px' }}
        >
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 26,
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.15,
              marginBottom: 6,
            }}
          >
            {r.name}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.5,
              maxWidth: 480,
            }}
          >
            {r.description}
          </div>
        </div>
      </div>
      <div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          Valeurs nutritionnelles · par muffin
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            {
              label: 'Calories',
              value: r.macros.calories,
              unit: 'kcal',
              color: 'var(--danger)',
              bg: '#FFF3EE',
              icon: '🔥',
            },
            {
              label: 'Protéines',
              value: r.macros.proteines,
              unit: 'g',
              color: 'var(--success)',
              bg: 'var(--success-bg)',
              icon: '💪',
            },
            {
              label: 'Glucides',
              value: r.macros.glucides,
              unit: 'g',
              color: 'var(--gold)',
              bg: '#FFFBEE',
              icon: '⚡',
            },
            {
              label: 'Lipides',
              value: r.macros.lipides,
              unit: 'g',
              color: '#8A7060',
              bg: '#F9F5F0',
              icon: '🫒',
            },
          ].map((m) => (
            <div
              key={m.label}
              style={{
                background: m.bg,
                border: `1.5px solid ${m.color}22`,
                borderRadius: 14,
                padding: '16px 10px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{m.icon}</div>
              <div style={{ fontWeight: 900, fontSize: 22, color: m.color, lineHeight: 1 }}>
                {m.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: m.color,
                  fontWeight: 600,
                  opacity: 0.7,
                  marginBottom: 4,
                }}
              >
                {m.unit}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#8A8070',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  fontWeight: 600,
                }}
              >
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div
          style={{
            background: 'white',
            border: '1.5px solid var(--border)',
            borderRadius: 16,
            padding: 22,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: 'var(--navy)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
              }}
            >
              🛒
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--navy)' }}>Ingrédients</div>
          </div>
          {r.ingredients.map((ing, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '9px 0',
                borderBottom:
                  i < r.ingredients.length - 1 ? '1px solid var(--border-soft)' : 'none',
              }}
            >
              <span
                style={{
                  background: 'var(--navy)',
                  color: 'white',
                  minWidth: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 13, color: 'var(--navy)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--gold)', fontWeight: 800 }}>{ing.qty}</strong>&nbsp;
                {ing.name}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            background: 'white',
            border: '1.5px solid var(--border)',
            borderRadius: 16,
            padding: 22,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: 'var(--danger)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
              }}
            >
              👨‍🍳
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--navy)' }}>Préparation</div>
          </div>
          {r.steps.map((step, i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}
            >
              <span
                style={{
                  background: 'var(--danger)',
                  color: 'white',
                  minWidth: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 13, color: 'var(--navy)', lineHeight: 1.65 }}>{step}</span>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          background: 'linear-gradient(135deg, #FFFBEE, #FFF5D0)',
          border: '1.5px solid #FFD97D',
          borderRadius: 14,
          padding: '18px 22px',
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ fontSize: 28, flexShrink: 0 }}>💡</div>
        <div>
          <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: 14, marginBottom: 5 }}>
            Astuce conservation
          </div>
          <div style={{ fontSize: 13, color: '#5A4A20', lineHeight: 1.65 }}>{r.tips}</div>
        </div>
      </div>
    </div>
  )
}

export default RecipeOfTheDay
