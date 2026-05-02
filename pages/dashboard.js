'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { useToast } from '../lib/useToast'

export default function Dashboard() {
  const { show, ToastComponent } = useToast()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [measures, setMeasures] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editProfile, setEditProfile] = useState(false)
  const [editWeight, setEditWeight] = useState(false)
  const [profileForm, setProfileForm] = useState({})
  const [weightForm, setWeightForm] = useState({ weight: '', waist: '', hips: '', chest: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' })
  const [pwdError, setPwdError] = useState('')
  const [pwdDone, setPwdDone] = useState(false)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [recipe, setRecipe] = useState(null)
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [recipeError, setRecipeError] = useState('')

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 980)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/'); return }
        setUser(user)

        const { data: prof, error: profErr } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (profErr) throw profErr
        if (prof?.role === 'coach') { router.replace('/coach'); return }
        setProfile(prof)
        setProfileForm({ full_name: prof?.full_name || '', current_program: prof?.current_program || '', objective: prof?.objective || '', height: prof?.height || '' })

        const { data: m } = await supabase.from('measures').select('*').eq('client_id', user.id).order('date', { ascending: false }).limit(10)
        setMeasures(m || [])

        const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
        const { data: s } = await supabase.from('workout_sessions').select('*').eq('client_id', user.id).gte('date', weekStart.toISOString().split('T')[0])
        setSessions(s || [])
      } catch (e) {
        show('Erreur de chargement : ' + e.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update(profileForm).eq('id', user.id)
      if (error) throw error
      setProfile(prev => ({ ...prev, ...profileForm }))
      setEditProfile(false)
      show('Profil mis à jour', 'success')
    } catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }

  const changePassword = async () => {
    setPwdError('')
    if (pwdForm.next.length < 6) { setPwdError('6 caractères minimum.'); return }
    if (pwdForm.next !== pwdForm.confirm) { setPwdError('Les mots de passe ne correspondent pas.'); return }
    
    try {
      // Supabase exige une session récente pour changer le mdp
      const { error } = await supabase.auth.updateUser({ password: pwdForm.next })
      if (error) throw error
      setPwdDone(true)
      setPwdForm({ current: '', next: '', confirm: '' })
      setTimeout(() => { setPwdDone(false); setShowPwd(false) }, 3000)
      show('Mot de passe modifié', 'success')
    } catch (e) { setPwdError(e.message) }
  }

  const saveWeight = async () => {
    if (!weightForm.weight) return
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase.from('measures').insert({ 
        client_id: user.id, date: today, 
        weight: +weightForm.weight, waist: +weightForm.waist || null, 
        hips: +weightForm.hips || null, chest: +weightForm.chest || null, notes: weightForm.notes 
      }).select().single()
      if (error) throw error
      setMeasures(prev => [data, ...prev])
      setEditWeight(false)
      setWeightForm({ weight: '', waist: '', hips: '', chest: '', notes: '' })
      show('Mesure enregistrée', 'success')
    } catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }

  const loadRecipe = async () => {
    setRecipeLoading(true)
    setRecipeError('')
    try {
      // Seed basé sur la date pour avoir la même recette toute la journée
      const dateKey = new Date().toISOString().split('T')[0]
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Tu es un nutritionniste sportif. Génère UNE recette healthy et gourmande du jour pour le ${dateKey}. Réponds UNIQUEMENT en JSON valide (pas de markdown, pas de backticks), avec exactement cette structure :
{
  "name": "Nom de la recette",
  "emoji": "🍽️",
  "category": "Petit-déjeuner|Déjeuner|Dîner|Snack|Goûter",
  "prep_time": "15 min",
  "cook_time": "20 min",
  "servings": 4,
  "description": "Courte description appétissante en 1-2 phrases.",
  "ingredients": [
    { "qty": "125g", "name": "farine de blé semi-complète" }
  ],
  "steps": [
    "Préchauffer le four à 180°C.",
    "Autre étape..."
  ],
  "tips": "Astuce ou conseil de conservation.",
  "nutrition_per_serving": {
    "calories": 139,
    "proteines": 3.9,
    "glucides": 21.7,
    "lipides": 4.1,
    "fibres": 1.2
  }
}`
          }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const parsed = JSON.parse(text.trim())
      setRecipe(parsed)
    } catch(e) {
      setRecipeError('Impossible de charger la recette. Réessaie dans un instant.')
    }
    setRecipeLoading(false)
  }

  const latestWeight = measures[0]?.weight
  const prevWeight = measures[1]?.weight
  const weightDelta = latestWeight && prevWeight ? (latestWeight - prevWeight).toFixed(1) : null
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) return <div style={{padding: 40, textAlign:'center', color:'#6B7A99'}}>Chargement…</div>

  return (
    <>
      <ToastComponent />
      <Layout title={isMobile ? "" : "Dashboard"} user={user}>
        {isMobile ? (
           <div style={{ marginTop: '-10px', marginBottom: 14 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
               <img src="/logo-small.png" alt="Ben &Fit" style={{ width: 30, height: 30, objectFit: 'contain' }} />
               <div><div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, letterSpacing: '1.2px', color: '#0D1B4E', lineHeight: 1 }}>BEN &FIT</div>
               <div style={{ fontSize: 8, color: '#6B7A99', letterSpacing: '1px', textTransform: 'uppercase' }}>Only Benefit · since 2021</div></div>
             </div>
             <div style={{ fontWeight: 900, fontSize: 22, color: '#0D1B4E', marginBottom: 4 }}>Dashboard</div>
           </div>
        ) : null}

        {/* ─── ONGLETS ─── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #E8ECFA', paddingBottom: '0' }}>
          {[
            { id: 'dashboard', label: '📊 Tableau de bord' },
            { id: 'recipe', label: '🍽️ Recette du jour' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id === 'recipe' && !recipe && !recipeLoading) loadRecipe()
              }}
              style={{
                padding: '10px 18px', border: 'none', borderRadius: '10px 10px 0 0', fontSize: '13px', fontWeight: '700',
                cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                background: activeTab === tab.id ? '#0D1B4E' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#6B7A99',
                borderBottom: activeTab === tab.id ? '2px solid #0D1B4E' : '2px solid transparent',
                marginBottom: '-2px', transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'recipe' ? (
          <RecipeOfTheDay recipe={recipe} loading={recipeLoading} error={recipeError} onRefresh={loadRecipe} />
        ) : (<>

        <div style={{ background: 'linear-gradient(135deg, #0D1B4E, #3A4230)', borderRadius: '14px', padding: '22px 28px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', marginBottom: '4px' }}>Bonjour {profile?.full_name?.split(' ')[0] || 'Toi'} 👋</div>
            <div style={{ fontSize: '13px', opacity: 0.75 }}>{today} · {profile?.current_program || 'Aucun programme défini'}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => router.push('/training')} style={{ padding: '9px 18px', background: '#4A6FD4', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>▶ Séance du jour</button>
            <button onClick={() => router.push('/messages')} style={{ padding: '9px 18px', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>💬 Coach</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px', borderTop: '3px solid #4A6FD4' }}>
            <div style={statLabel}>Séances cette semaine</div>
            <div style={statValue}>{sessions.length} <span style={{ fontSize: '18px', color: '#6B7A99' }}>/5</span></div>
            <div style={{ marginTop: '8px', height: '6px', background: '#C5D0F0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#4A6FD4', width: `${Math.min(100, (sessions.length / 5) * 100)}%`, borderRadius: '3px' }} />
            </div>
          </div>
          <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px', borderTop: '3px solid #C45C3A' }}>
            <div style={statLabel}>Poids actuel</div>
            <div style={statValue}>{latestWeight || '—'} <span style={{ fontSize: '16px', color: '#6B7A99' }}> kg</span></div>
            {weightDelta && <div style={{ marginTop: '4px', fontSize: '12px', fontWeight: '600', color: parseFloat(weightDelta) < 0 ? '#8FA07A' : '#C45C3A' }}>{parseFloat(weightDelta) > 0 ? '+' : ''}{weightDelta} kg vs dernière mesure</div>}
          </div>
          <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px', borderTop: '3px solid #0D1B4E' }}>
            <div style={statLabel}>Programme actuel</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '20px', fontWeight: '700', marginTop: '6px' }}>{profile?.current_program || '—'}</div>
            {profile?.objective && <div style={{ marginTop: '4px', fontSize: '12px', color: '#8FA07A' }}>🎯 {profile.objective}</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>👤 Mon profil</div>
              <button onClick={() => setEditProfile(!editProfile)} style={btn(editProfile ? '#0D1B4E' : '#0D1B4E', 'white')}>{editProfile ? '✕' : '✏️ Modifier'}</button>
            </div>
            {editProfile ? (
              <div>
                {[
                  { label: 'Prénom / Nom', key: 'full_name', placeholder: 'Jean Dupont' },
                  { label: 'Programme actuel', key: 'current_program', placeholder: 'Phase 2 · Hypertrophie' },
                  { label: 'Objectif', key: 'objective', placeholder: 'Prise de masse, sèche…' },
                  { label: 'Taille (cm)', key: 'height', placeholder: '180' },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: '10px' }}>
                    <label style={lbl}>{f.label}</label>
                    <input value={profileForm[f.key] || ''} onChange={e => setProfileForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inp} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button onClick={saveProfile} disabled={saving} style={btn('#0D1B4E', 'white')}>{saving ? 'Sauvegarde…' : '✓ Enregistrer'}</button>
                  <button onClick={() => setEditProfile(false)} style={btn('transparent', '#6B7A99', '#C5D0F0')}>Annuler</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Nom', value: profile?.full_name },
                  { label: 'Programme', value: profile?.current_program },
                  { label: 'Objectif', value: profile?.objective },
                  { label: 'Taille', value: profile?.height ? `${profile.height} cm` : null },
                ].map(f => f.value ? (
                  <div key={f.label} style={{ display: 'flex', gap: '8px', fontSize: '14px' }}>
                    <span style={{ color: '#6B7A99', width: '90px', flexShrink: 0 }}>{f.label}</span>
                    <span style={{ fontWeight: '500' }}>{f.value}</span>
                  </div>
                ) : null)}
              </div>
            )}
          </div>

          <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>🔒 Mot de passe</div>
              <button onClick={() => { setShowPwd(!showPwd); setPwdError(''); setPwdDone(false) }} style={btn(showPwd ? '#EEF2FF' : '#0D1B4E', showPwd ? '#6B7A99' : 'white')}>
                {showPwd ? '✕ Fermer' : '✏️ Modifier'}
              </button>
            </div>
            {showPwd && (
              <div style={{ marginTop: '16px' }}>
                {pwdDone ? (
                  <div style={{ background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: '8px', padding: '12px', color: '#2E7D32', fontSize: '14px', textAlign: 'center' }}>
                    ✅ Mot de passe modifié avec succès !
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { key: 'current', label: 'Ancien mot de passe', placeholder: '••••••••' },
                      { key: 'next', label: 'Nouveau mot de passe', placeholder: '6 caractères minimum' },
                      { key: 'confirm', label: 'Confirmer', placeholder: '••••••••' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={lbl}>{f.label}</label>
                        <input type="password" value={pwdForm[f.key]} onChange={e => setPwdForm(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.placeholder} style={inp} />
                      </div>
                    ))}
                    {pwdError && <div style={{ color: '#C45C3A', fontSize: '13px', padding: '8px 12px', background: 'rgba(196,92,58,0.08)', borderRadius: '7px' }}>{pwdError}</div>}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={changePassword} style={btn('#0D1B4E', 'white')}>✓ Enregistrer</button>
                      <button onClick={() => { setShowPwd(false); setPwdError('') }} style={btn('transparent', '#6B7A99', '#C5D0F0')}>Annuler</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>⚖️ Suivi du poids</div>
              <button onClick={() => setEditWeight(!editWeight)} style={btn('#0D1B4E', 'white')}>+ Nouvelle mesure</button>
            </div>
            {editWeight && (
              <div style={{ background: '#EEF2FF', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  {[
                    { label: '⚖️ Poids (kg) *', key: 'weight', ph: '80.5' },
                    { label: '📏 Tour de taille (cm)', key: 'waist', ph: '85' },
                    { label: '📏 Tour de hanches (cm)', key: 'hips', ph: '95' },
                    { label: '📏 Tour de poitrine (cm)', key: 'chest', ph: '100' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={lbl}>{f.label}</label>
                      <input type="number" step="0.1" value={weightForm[f.key]} onChange={e => setWeightForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph} style={inp} />
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={lbl}>Note</label>
                  <input value={weightForm.notes} onChange={e => setWeightForm(p => ({ ...p, notes: e.target.value }))} placeholder="Ex: après entraînement, matin à jeun…" style={inp} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={saveWeight} disabled={saving} style={btn('#0D1B4E', 'white')}>{saving ? '…' : '✓ Enregistrer'}</button>
                  <button onClick={() => setEditWeight(false)} style={btn('transparent', '#6B7A99', '#C5D0F0')}>Annuler</button>
                </div>
              </div>
            )}
            {measures.length === 0 ? (
              <div style={{ color: '#6B7A99', fontSize: '13px', textAlign: 'center', padding: '10px' }}>Aucune mesure. Clique sur "+ Nouvelle mesure" !</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                {measures.map((m, i) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: '13px' }}>
                    <span style={{ color: '#6B7A99', fontFamily: "'DM Mono',monospace", fontSize: '11px' }}>{new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                    <span style={{ fontWeight: '700', fontSize: '15px' }}>{m.weight} kg</span>
                    <span style={{ fontSize: '11px', color: '#6B7A99' }}>{m.waist ? `T:${m.waist}` : ''}{m.hips ? ` H:${m.hips}` : ''}</span>
                    {i === 0 && <span style={{ fontSize: '10px', background: '#D4E0CC', color: '#0D1B4E', padding: '2px 6px', borderRadius: '10px', fontWeight: '600' }}>Actuel</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {profile?.coach_note && (
           <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px', marginBottom: '16px' }}>
             <div style={{ fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: '10px' }}>📌 Message de ton coach</div>
             <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#0D1B4E', margin: 0 }}>{profile.coach_note}</p>
           </div>
        )}
        </>)}
      </Layout>
    </>
  )
}

const statLabel = { fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: '6px' }
const statValue = { fontFamily: "'Playfair Display',serif", fontSize: '32px', fontWeight: '700', lineHeight: 1 }
const lbl = { display: 'block', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: '5px', fontWeight: '500' }
const inp = { width: '100%', padding: '8px 10px', border: '1.5px solid #C5D0F0', borderRadius: '7px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif", background: 'white', outline: 'none', color: '#0D1B4E' }
const btn = (bg, color, border) => ({ padding: '7px 14px', background: bg, color, border: border ? `1.5px solid ${border}` : 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" })

// ─── RECETTE DU JOUR ───────────────────────────────────────────
function RecipeOfTheDay({ recipe, loading, error, onRefresh }) {
  const [expanded, setExpanded] = useState(false)

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '16px' }}>
      <div style={{ fontSize: '40px', animation: 'spin 1.5s linear infinite' }}>🍳</div>
      <div style={{ fontWeight: '600', color: '#0D1B4E', fontSize: '15px' }}>Le chef prépare ta recette…</div>
      <div style={{ fontSize: '13px', color: '#6B7A99' }}>Génération en cours avec l'IA</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ background: '#FFF3F0', border: '1px solid #FFC5B0', borderRadius: '14px', padding: '28px', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>😔</div>
      <div style={{ fontWeight: '600', color: '#C45C3A', marginBottom: '8px' }}>Impossible de charger la recette</div>
      <div style={{ fontSize: '13px', color: '#6B7A99', marginBottom: '16px' }}>{error}</div>
      <button onClick={onRefresh} style={{ padding: '9px 20px', background: '#C45C3A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
        🔄 Réessayer
      </button>
    </div>
  )

  if (!recipe) return (
    <div style={{ background: 'linear-gradient(135deg, #FFF8F0, #FFF0E8)', border: '1px solid #FFD0B0', borderRadius: '14px', padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '52px', marginBottom: '12px' }}>🍽️</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '22px', color: '#0D1B4E', marginBottom: '8px' }}>Recette du jour</div>
      <div style={{ fontSize: '14px', color: '#6B7A99', marginBottom: '24px', maxWidth: '340px', margin: '0 auto 24px' }}>
        Découvre une recette healthy et gourmande générée par l'IA, adaptée à tes objectifs fitness.
      </div>
      <button onClick={onRefresh} style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #C45C3A, #E07A5F)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif', boxShadow: '0 4px 14px rgba(196,92,58,0.3)'" }}>
        ✨ Générer la recette du jour
      </button>
    </div>
  )

  const r = recipe
  const macros = r.nutrition_per_serving || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Hero card */}
      <div style={{ background: 'linear-gradient(135deg, #0D1B4E, #3A4230)', borderRadius: '16px', padding: '28px', color: 'white', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-10px', top: '-10px', fontSize: '100px', opacity: 0.12, transform: 'rotate(-15deg)', userSelect: 'none' }}>{r.emoji || '🍽️'}</div>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>{r.category || 'Recette'}</span>
            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>⏱ {r.prep_time || '—'} prep · {r.cook_time || '—'} cuisson</span>
          </div>
          <div style={{ fontSize: '28px', marginBottom: '4px' }}>{r.emoji || '🍽️'}</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '26px', fontWeight: '700', marginBottom: '8px', lineHeight: 1.2 }}>{r.name}</div>
          <div style={{ fontSize: '14px', opacity: 0.8, lineHeight: 1.6, maxWidth: '480px' }}>{r.description}</div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '16px', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(255,255,255,0.12)', padding: '5px 12px', borderRadius: '20px', fontSize: '12px' }}>🍽️ {r.servings} portions</span>
          </div>
        </div>
      </div>

      {/* Macros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
        {[
          { label: 'Calories', value: macros.calories ? `${macros.calories} kcal` : '—', color: '#C45C3A', icon: '🔥' },
          { label: 'Protéines', value: macros.proteines ? `${macros.proteines}g` : '—', color: '#4A6FD4', icon: '💪' },
          { label: 'Glucides', value: macros.glucides ? `${macros.glucides}g` : '—', color: '#8FA07A', icon: '⚡' },
          { label: 'Lipides', value: macros.lipides ? `${macros.lipides}g` : '—', color: '#F4A261', icon: '🫒' },
          { label: 'Fibres', value: macros.fibres ? `${macros.fibres}g` : '—', color: '#9B7BB8', icon: '🌿' },
        ].map(m => (
          <div key={m.label} style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '12px', padding: '14px 10px', textAlign: 'center', borderTop: `3px solid ${m.color}` }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{m.icon}</div>
            <div style={{ fontWeight: '800', fontSize: '15px', color: '#0D1B4E', marginBottom: '2px' }}>{m.value}</div>
            <div style={{ fontSize: '10px', color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{m.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '11px', color: '#6B7A99', textAlign: 'right', marginTop: '-6px' }}>* Valeurs nutritionnelles par portion</div>

      {/* Ingrédients + Instructions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Ingrédients */}
        <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 22px' }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color: '#0D1B4E', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🛒 Ingrédients <span style={{ fontSize: '11px', color: '#6B7A99', fontWeight: '400' }}>({r.servings} portions)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(r.ingredients || []).map((ing, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '6px 0', borderBottom: i < r.ingredients.length - 1 ? '1px solid rgba(197,208,240,0.5)' : 'none' }}>
                <span style={{ background: '#0D1B4E', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', flexShrink: 0, marginTop: '1px' }}>{i + 1}</span>
                <span style={{ fontSize: '13px', color: '#0D1B4E', lineHeight: 1.5 }}>
                  <strong style={{ color: '#4A6FD4' }}>{ing.qty}</strong> {ing.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 22px' }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color: '#0D1B4E', marginBottom: '14px' }}>
            👨‍🍳 Préparation
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(r.steps || []).map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ background: 'linear-gradient(135deg, #C45C3A, #E07A5F)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0, marginTop: '1px' }}>{i + 1}</span>
                <span style={{ fontSize: '13px', color: '#0D1B4E', lineHeight: 1.6 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Astuce + Refresh */}
      {r.tips && (
        <div style={{ background: 'linear-gradient(135deg, #FFF8E8, #FFF0D0)', border: '1px solid #FFD580', borderRadius: '12px', padding: '16px 20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>💡</span>
          <div>
            <div style={{ fontWeight: '700', color: '#0D1B4E', fontSize: '13px', marginBottom: '4px' }}>Astuce du chef</div>
            <div style={{ fontSize: '13px', color: '#5A4A2A', lineHeight: 1.6 }}>{r.tips}</div>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', paddingTop: '4px' }}>
        <button onClick={onRefresh} style={{ padding: '10px 22px', background: 'transparent', color: '#6B7A99', border: '1.5px solid #C5D0F0', borderRadius: '9px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
          🔄 Générer une autre recette
        </button>
      </div>
    </div>
  )
}
