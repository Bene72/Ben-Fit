/**
 * components/nutrition/FoodBlock.jsx
 * Bloc de recherche, ajout manuel et liste des aliments d'un log.
 *
 * Utilisé par :
 *   - pages/nutrition.js              → vue client  (mode='client')
 *   - components/coach/NutritionTab   → vue coach   (mode='coach')
 *
 * Différences selon mode :
 *   - 'client' : boutons larges, style AppShell, `onItemsChange` callback pour
 *                remonter les totaux au parent (combinedValues)
 *   - 'coach'  : boutons compacts, style inline coach, pas de callback totaux
 *
 * Props :
 *   log            {object|null}   Log du jour (doit avoir un id pour ajouter des items)
 *   onEnsureLog    {async fn}      Crée le log si absent, retourne le log créé
 *   mode           {'client'|'coach'}
 *   onItemsChange  {fn}            (client only) callback({ calories, protein, carbs, fat })
 */

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { sumItems } from '../../lib/nutritionUtils'
import { ci as coachInputStyle } from '../../lib/coachShared'

export default function FoodBlock({ log, onEnsureLog, mode = 'client', onItemsChange }) {
  const isCoach  = mode === 'coach'
  const [items,     setItems]     = useState([])
  const [showAdd,   setShowAdd]   = useState(false)
  const [addMode,   setAddMode]   = useState('search')      // 'search' | 'manual'
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState([])
  const [selected,  setSelected]  = useState(null)
  const [qty,       setQty]       = useState('100')
  const [mealName,  setMealName]  = useState('')
  const [searching, setSearching] = useState(false)
  const [manual,    setManual]    = useState({ name: '', quantity: '100', calories: '', protein: '', carbs: '', fat: '' })
  const timerRef = useRef(null)

  // ── Chargement des items quand le log change ─────────────────────────────────
  useEffect(() => {
    if (log?.id) {
      supabase
        .from('nutrition_log_meals').select('*').eq('log_id', log.id).order('created_at')
        .then(({ data }) => setItems(data || []))
    } else {
      setItems([])
    }
  }, [log?.id])

  // ── Remonter les totaux au parent (vue client) ───────────────────────────────
  useEffect(() => {
    if (!isCoach && onItemsChange) {
      const t = sumItems(items)
      onItemsChange({ calories: t.calories, protein: t.protein, carbs: t.carbs, fat: t.fat })
    }
  }, [items]) // eslint-disable-line

  // ── Recherche aliments avec debounce ─────────────────────────────────────────
  useEffect(() => {
    if (addMode !== 'search' || query.length < 2) { setResults([]); return }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      const q = query.trim().toLowerCase()
      const { data } = await supabase.from('foods').select('*').ilike('name', `%${q}%`).order('name').limit(100)
      const sorted = (data || [])
        .sort((a, b) => {
          const an = a.name.toLowerCase(), bn = b.name.toLowerCase()
          if (an.startsWith(q) && !bn.startsWith(q)) return -1
          if (!an.startsWith(q) && bn.startsWith(q)) return 1
          return an.localeCompare(bn, 'fr')
        })
        .slice(0, 20)
      setResults(sorted)
      setSearching(false)
    }, isCoach ? 300 : 260)
    return () => clearTimeout(timerRef.current)
  }, [query, addMode]) // eslint-disable-line

  // ── Obtenir ou créer le log avant d'ajouter ──────────────────────────────────
  const resolveLog = async () => {
    if (log?.id) return log
    if (onEnsureLog) return await onEnsureLog()
    return null
  }

  // ── Ajouter depuis la recherche ──────────────────────────────────────────────
  const addItem = async () => {
    if (!selected) return
    const currentLog = await resolveLog()
    if (!currentLog?.id) return
    const ratio = (parseFloat(qty) || 100) / 100
    const item = {
      log_id:   currentLog.id,
      name:     selected.name + (mealName ? ` (${mealName})` : ''),
      quantity: parseFloat(qty) || 100,
      unit:     'g',
      calories: Math.round((selected.calories || 0) * ratio),
      protein:  Math.round((selected.protein  || 0) * ratio * 10) / 10,
      carbs:    Math.round((selected.carbs    || 0) * ratio * 10) / 10,
      fat:      Math.round((selected.fat      || 0) * ratio * 10) / 10,
      fiber:    0,
    }
    const { data } = await supabase.from('nutrition_log_meals').insert(item).select().single()
    if (data) {
      setItems((prev) => [...prev, data])
      setSelected(null); setQuery(''); setQty('100'); setMealName(''); setResults([])
    }
  }

  // ── Ajouter manuellement ────────────────────────────────────────────────────
  const addManualItem = async () => {
    if (!manual.name.trim()) return
    const currentLog = await resolveLog()
    if (!currentLog?.id) return
    const item = {
      log_id:   currentLog.id,
      name:     manual.name.trim() + (mealName ? ` (${mealName})` : ''),
      quantity: parseFloat(manual.quantity) || 100,
      unit:     'g',
      calories: parseInt(manual.calories)  || 0,
      protein:  parseFloat(manual.protein) || 0,
      carbs:    parseFloat(manual.carbs)   || 0,
      fat:      parseFloat(manual.fat)     || 0,
      fiber:    0,
    }
    const { data } = await supabase.from('nutrition_log_meals').insert(item).select().single()
    if (data) {
      setItems((prev) => [...prev, data])
      setManual({ name: '', quantity: '100', calories: '', protein: '', carbs: '', fat: '' })
      setMealName('')
    }
  }

  // ── Supprimer ────────────────────────────────────────────────────────────────
  const deleteItem = async (id) => {
    await supabase.from('nutrition_log_meals').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const totals   = sumItems(items)
  const canAdd   = !!log?.id || !!onEnsureLog
  const inputCls = isCoach ? coachInputStyle : clientInputStyle

  // ── Rendu ────────────────────────────────────────────────────────────────────
  return isCoach
    ? <CoachLayout
        items={items} totals={totals} canAdd={canAdd}
        showAdd={showAdd} setShowAdd={setShowAdd}
        addMode={addMode} setAddMode={setAddMode}
        query={query} setQuery={setQuery}
        results={results} selected={selected} setSelected={setSelected}
        qty={qty} setQty={setQty} searching={searching}
        manual={manual} setManual={setManual}
        addItem={addItem} addManualItem={addManualItem} deleteItem={deleteItem}
      />
    : <ClientLayout
        items={items} totals={totals} canAdd={canAdd}
        showAdd={showAdd} setShowAdd={setShowAdd}
        addMode={addMode} setAddMode={setAddMode}
        query={query} setQuery={setQuery}
        results={results} selected={selected} setSelected={setSelected}
        qty={qty} setQty={setQty} mealName={mealName} setMealName={setMealName}
        searching={searching} manual={manual} setManual={setManual}
        addItem={addItem} addManualItem={addManualItem} deleteItem={deleteItem}
      />
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT CLIENT (pages/nutrition.js)
// ─────────────────────────────────────────────────────────────────────────────
import SurfaceCard from '../ui/SurfaceCard'
import SectionHead from '../ui/SectionHead'
import EmptyPanel  from '../ui/EmptyPanel'

function ClientLayout({ items, totals, canAdd, showAdd, setShowAdd, addMode, setAddMode, query, setQuery, results, selected, setSelected, qty, setQty, mealName, setMealName, searching, manual, setManual, addItem, addManualItem, deleteItem }) {
  return (
    <SurfaceCard padded>
      <SectionHead
        title="Détail aliments"
        caption="Tu peux commencer ici directement. Si l'aliment n'existe pas, ajoute-le à la main."
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" style={clientSecBtn()} onClick={() => { setAddMode('search');  setShowAdd(true) }}>Rechercher</button>
            <button type="button" style={clientPriBtn()} onClick={() => { setAddMode('manual'); setShowAdd(true) }}>Ajouter manuellement</button>
          </div>
        }
      />
      <div style={{ color: '#6B7A99', marginBottom: 12 }}>Les calories et macros enregistrées ici s'ajoutent automatiquement aux apports du jour.</div>

      {/* ── Panneau recherche ── */}
      {showAdd && addMode === 'search' && (
        <ClientAddPanel label="Recherche" onClose={() => setShowAdd(false)} onSubmit={addItem} submitLabel="Ajouter l'aliment" submitDisabled={!selected}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,1.3fr) 170px minmax(220px,1fr)', gap: 12 }}>
            <ClientField label="Aliment" style={{ position: 'relative' }}>
              <input style={clientInputStyle()} value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null) }} placeholder="Ex : poulet, riz, avocat…" />
              {searching && <div style={{ color: '#6B7A99', marginTop: 6 }}>Recherche…</div>}
              {results.length > 0 && !selected && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 40, background: 'white', border: '1px solid #DCE5F3', borderRadius: 18, boxShadow: '0 18px 38px rgba(13,27,78,0.12)', maxHeight: 320, overflowY: 'auto', marginTop: 6 }}>
                  {results.map((food) => (
                    <button key={food.id} type="button" onClick={() => { setSelected(food); setQuery(food.name); setResults([]) }}
                      style={{ width: '100%', textAlign: 'left', border: 'none', background: 'white', padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #EEF3FA', fontFamily: "'DM Sans',sans-serif" }}>
                      <div style={{ fontWeight: 900, color: '#0D1B4E', fontSize: 15 }}>{food.name}</div>
                      <div style={{ color: '#6B7A99', fontSize: 12, marginTop: 4 }}>{food.calories} kcal · P {food.protein} · G {food.carbs} · L {food.fat}</div>
                    </button>
                  ))}
                </div>
              )}
              {!searching && query.length >= 2 && results.length === 0 && !selected && (
                <div style={{ border: '1px solid #DCE5F3', borderRadius: 18, background: '#FFF', padding: 14, marginTop: 12 }}>
                  <div style={{ fontWeight: 900, color: '#0D1B4E', marginBottom: 4 }}>Aucun aliment trouvé</div>
                  <button type="button" style={clientPriBtn()} onClick={() => { setManual((p) => ({ ...p, name: query })); setAddMode('manual') }}>Basculer en ajout manuel</button>
                </div>
              )}
              {selected && (
                <div style={{ border: '1px solid #DCE5F3', borderRadius: 18, background: '#FFF', padding: 14, marginTop: 12 }}>
                  <div style={{ fontWeight: 900, color: '#0D1B4E', marginBottom: 4 }}>{selected.name} — {qty || 100} g</div>
                  <div style={{ color: '#6B7A99', fontSize: 13 }}>
                    🔥 {Math.round((selected.calories || 0) * ((parseFloat(qty) || 100) / 100))} kcal ·
                    P {Math.round((selected.protein || 0) * ((parseFloat(qty) || 100) / 100) * 10) / 10} ·
                    G {Math.round((selected.carbs   || 0) * ((parseFloat(qty) || 100) / 100) * 10) / 10} ·
                    L {Math.round((selected.fat     || 0) * ((parseFloat(qty) || 100) / 100) * 10) / 10}
                  </div>
                </div>
              )}
            </ClientField>
            <ClientField label="Quantité (g)"><input style={clientInputStyle()} type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></ClientField>
            <ClientField label="Repas (optionnel)"><input style={clientInputStyle()} value={mealName} onChange={(e) => setMealName(e.target.value)} placeholder="Déjeuner, collation…" /></ClientField>
          </div>
        </ClientAddPanel>
      )}

      {/* ── Panneau manuel ── */}
      {showAdd && addMode === 'manual' && (
        <ClientAddPanel label="Ajout manuel" onClose={() => setShowAdd(false)} onSubmit={addManualItem} submitLabel="Ajouter à la main" submitDisabled={!manual.name.trim()}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,1.3fr) 170px minmax(220px,1fr)', gap: 12 }}>
            <ClientField label="Nom de l'aliment"><input style={clientInputStyle()} value={manual.name} onChange={(e) => setManual((p) => ({ ...p, name: e.target.value }))} placeholder="Ex : Wrap maison" /></ClientField>
            <ClientField label="Quantité"><input style={clientInputStyle()} type="number" value={manual.quantity} onChange={(e) => setManual((p) => ({ ...p, quantity: e.target.value }))} /></ClientField>
            <ClientField label="Repas (optionnel)"><input style={clientInputStyle()} value={mealName} onChange={(e) => setMealName(e.target.value)} /></ClientField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, marginTop: 12 }}>
            {['calories','protein','carbs','fat'].map((k) => (
              <ClientField key={k} label={k === 'calories' ? 'Calories' : k === 'protein' ? 'Protéines' : k === 'carbs' ? 'Glucides' : 'Lipides'}>
                <input style={clientInputStyle()} type="number" value={manual[k]} onChange={(e) => setManual((p) => ({ ...p, [k]: e.target.value }))} />
              </ClientField>
            ))}
          </div>
        </ClientAddPanel>
      )}

      {/* ── Liste ── */}
      {items.length > 0 ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginBottom: 10 }}>
            <MiniKpi label="Calories aliments" value={Math.round(totals.calories)} />
            <MiniKpi label="Protéines"         value={Math.round(totals.protein * 10) / 10} />
            <MiniKpi label="Glucides"          value={Math.round(totals.carbs * 10) / 10} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', border: '1px solid #DCE5F3', borderRadius: 10, background: '#FFF', padding: '8px 10px' }}>
                <div>
                  <div style={{ fontWeight: 900, color: '#0D1B4E' }}>{item.name}</div>
                  <div style={{ color: '#6B7A99', fontSize: 13, marginTop: 4 }}>{item.quantity}g · {item.calories} kcal · P {item.protein} · G {item.carbs} · L {item.fat}</div>
                </div>
                <button type="button" style={clientSecBtn()} onClick={() => deleteItem(item.id)}>Supprimer</button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyPanel title="Aucun aliment enregistré" description="Tu peux commencer ici directement, même si les apports du jour ne sont pas encore remplis." />
      )}
    </SurfaceCard>
  )
}

function ClientAddPanel({ label, onClose, onSubmit, submitLabel, submitDisabled, children }) {
  return (
    <div style={{ border: '1px solid #DCE5F3', borderRadius: 20, padding: 16, background: '#F8FBFF', marginBottom: 12 }}>
      {children}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button type="button" style={clientPriBtn()} disabled={submitDisabled} onClick={onSubmit}>{submitLabel}</button>
        <button type="button" style={clientSecBtn()} onClick={onClose}>Fermer</button>
      </div>
    </div>
  )
}

function ClientField({ label, children, style }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7A99', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
      {children}
    </div>
  )
}

function MiniKpi({ label, value }) {
  return (
    <div style={{ border: '1px solid #DCE5F3', borderRadius: 10, background: '#FFF', padding: '8px 10px' }}>
      <div style={{ fontSize: 10, color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 900, fontSize: 18, color: '#0D1B4E' }}>{value}</div>
    </div>
  )
}

function clientInputStyle() {
  return { width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 9, border: '1px solid #DCE5F3', background: '#FFF', outline: 'none', fontSize: 13, color: '#0D1B4E', fontFamily: "'DM Sans',sans-serif" }
}
function clientPriBtn() {
  return { border: 'none', background: '#2C64E5', color: 'white', borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }
}
function clientSecBtn() {
  return { border: '1px solid #DCE5F3', background: '#FFF', color: '#0D1B4E', borderRadius: 9, padding: '7px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT COACH (components/coach/NutritionTab.jsx)
// ─────────────────────────────────────────────────────────────────────────────

function CoachLayout({ items, totals, canAdd, showAdd, setShowAdd, addMode, setAddMode, query, setQuery, results, selected, setSelected, qty, setQty, searching, manual, setManual, addItem, addManualItem, deleteItem }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #EAEAEA', overflow: 'hidden' }}>
      {/* En-tête */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#0D1B4E' }}>🍽️ Détail aliments</div>
        {canAdd && (
          <div style={{ display: 'flex', gap: 6 }}>
            <CoachBtn active={showAdd && addMode === 'search'} color="#0D1B4E" onClick={() => { setAddMode('search');  setShowAdd((s) => addMode === 'search' ? !s : true) }}>🔍 Rechercher</CoachBtn>
            <CoachBtn active={showAdd && addMode === 'manual'} color="#4A6FD4" onClick={() => { setAddMode('manual'); setShowAdd((s) => addMode === 'manual' ? !s : true) }}>✏️ Manuel</CoachBtn>
          </div>
        )}
      </div>

      {/* Recherche */}
      {showAdd && addMode === 'search' && (
        <div style={{ padding: '12px 16px', background: '#F5F8FF', borderBottom: '1px solid #EAEAEA' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8, marginBottom: 8 }}>
            <div style={{ position: 'relative' }}>
              <input value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null) }} placeholder="Rechercher un aliment…"
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #E8E8E8', borderRadius: 6, fontSize: 12, outline: 'none' }} />
              {searching && <span style={{ position: 'absolute', right: 8, top: 8, fontSize: 11, color: '#999' }}>…</span>}
              {results.length > 0 && !selected && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #E0E0E0', borderRadius: 6, boxShadow: '0 8px 20px rgba(0,0,0,0.12)', zIndex: 200, maxHeight: 200, overflowY: 'auto' }}>
                  {results.map((f) => (
                    <div key={f.id} onClick={() => { setSelected(f); setQuery(f.name); setResults([]) }}
                      style={{ padding: '7px 10px', cursor: 'pointer', borderBottom: '1px solid #F5F5F5', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F0F4FF')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}>
                      <span>{f.name}</span>
                      <span style={{ color: '#0D1B4E', fontWeight: 700 }}>{f.calories}kcal</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="100g"
              style={{ padding: '7px 8px', border: '1.5px solid #E8E8E8', borderRadius: 6, fontSize: 12, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={addItem} disabled={!selected} style={{ padding: '6px 14px', background: selected ? '#0D1B4E' : '#CCC', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: selected ? 'pointer' : 'not-allowed' }}>✓ Ajouter</button>
            <button onClick={() => setShowAdd(false)} style={{ padding: '6px 10px', background: 'transparent', color: '#666', border: '1px solid #DDD', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Fermer</button>
          </div>
        </div>
      )}

      {/* Manuel */}
      {showAdd && addMode === 'manual' && (
        <div style={{ padding: '12px 16px', background: '#F5F8FF', borderBottom: '1px solid #EAEAEA' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 10, color: '#999', display: 'block', marginBottom: 3 }}>Nom *</label>
              <input value={manual.name} onChange={(e) => setManual((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Wrap maison"
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #E8E8E8', borderRadius: 6, fontSize: 12, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#999', display: 'block', marginBottom: 3 }}>Quantité (g)</label>
              <input type="number" value={manual.quantity} onChange={(e) => setManual((p) => ({ ...p, quantity: e.target.value }))}
                style={{ width: '100%', padding: '7px 8px', border: '1.5px solid #E8E8E8', borderRadius: 6, fontSize: 12, outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
            {[['calories','🔥 Kcal'],['protein','🥩 Prot'],['carbs','🌾 Gluc'],['fat','🥑 Lip']].map(([k, l]) => (
              <div key={k}>
                <label style={{ fontSize: 10, color: '#999', display: 'block', marginBottom: 3 }}>{l}</label>
                <input type="number" value={manual[k]} onChange={(e) => setManual((p) => ({ ...p, [k]: e.target.value }))} placeholder="0"
                  style={{ width: '100%', padding: '7px 8px', border: '1.5px solid #E8E8E8', borderRadius: 6, fontSize: 12, outline: 'none' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={addManualItem} disabled={!manual.name.trim()} style={{ padding: '6px 14px', background: manual.name.trim() ? '#4A6FD4' : '#CCC', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: manual.name.trim() ? 'pointer' : 'not-allowed' }}>✓ Ajouter</button>
            <button onClick={() => setShowAdd(false)} style={{ padding: '6px 10px', background: 'transparent', color: '#666', border: '1px solid #DDD', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Fermer</button>
          </div>
        </div>
      )}

      {/* Liste */}
      {items.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center', color: '#CCC', fontSize: 12 }}>{canAdd ? 'Aucun aliment' : "Saisis d'abord les apports"}</div>
      ) : (
        <>
          {items.map((item) => (
            <div key={item.id} style={{ padding: '8px 16px', borderBottom: '1px solid #F5F5F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
              <span style={{ fontWeight: 500 }}>{item.name} <span style={{ color: '#999' }}>({item.quantity}g)</span></span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ color: '#666' }}>{item.calories}kcal · P:{item.protein}g · G:{item.carbs}g · L:{item.fat}g</span>
                <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', color: '#DDD', cursor: 'pointer', fontSize: 14 }}
                  onMouseEnter={(e) => (e.target.style.color = '#C45C3A')} onMouseLeave={(e) => (e.target.style.color = '#DDD')}>×</button>
              </div>
            </div>
          ))}
          <div style={{ padding: '8px 16px', background: '#F0F4FF', display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#0D1B4E' }}>
            <span>Total</span>
            <span>{Math.round(totals.calories)}kcal · P:{Math.round(totals.protein*10)/10}g · G:{Math.round(totals.carbs*10)/10}g · L:{Math.round(totals.fat*10)/10}g</span>
          </div>
        </>
      )}
    </div>
  )
}

function CoachBtn({ active, color, onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding: '4px 10px', background: active ? '#EEF2FF' : color, color: active ? color : 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
      {children}
    </button>
  )
}
