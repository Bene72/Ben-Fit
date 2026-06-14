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
  const [weightForm, setWeightForm] = useState({ weight: '', waist: '', hips: '', chest: '', arm: '', thigh: '', calf: '', glutes: '', notes: '' })
  const [deletingId, setDeletingId] = useState(null)
  const [editingMeasure, setEditingMeasure] = useState(null) // id de la mesure en cours d'édition
  const [bodyTab, setBodyTab] = useState('history')
  const [chartField, setChartField] = useState('weight')
  const [saving, setSaving] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' })
  const [pwdError, setPwdError] = useState('')
  const [pwdDone, setPwdDone] = useState(false)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')

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
        weight: +weightForm.weight,
        waist:  +weightForm.waist  || null,
        hips:   +weightForm.hips   || null,
        chest:  +weightForm.chest  || null,
        arm:    +weightForm.arm    || null,
        thigh:  +weightForm.thigh  || null,
        calf:   +weightForm.calf   || null,
        glutes: +weightForm.glutes || null,
        notes:  weightForm.notes || null,
      }).select().single()
      if (error) throw error
      setMeasures(prev => [data, ...prev])
      setEditWeight(false)
      setWeightForm({ weight: '', waist: '', hips: '', chest: '', arm: '', thigh: '', calf: '', glutes: '', notes: '' })
      show('Mesure enregistrée', 'success')
    } catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }

  const deleteMeasure = async (id) => {
    setDeletingId(id)
    try {
      const { error } = await supabase.from('measures').delete().eq('id', id)
      if (error) throw error
      setMeasures(prev => prev.filter(m => m.id !== id))
      show('Mesure supprimée', 'success')
    } catch (e) { show(e.message, 'error') }
    finally { setDeletingId(null) }
  }

  const updateMeasure = async () => {
    if (!weightForm.weight || !editingMeasure) return
    setSaving(true)
    try {
      const { data, error } = await supabase.from('measures').update({
        weight: +weightForm.weight,
        waist:  +weightForm.waist  || null,
        hips:   +weightForm.hips   || null,
        chest:  +weightForm.chest  || null,
        arm:    +weightForm.arm    || null,
        thigh:  +weightForm.thigh  || null,
        calf:   +weightForm.calf   || null,
        glutes: +weightForm.glutes || null,
        notes:  weightForm.notes   || null,
      }).eq('id', editingMeasure).select().single()
      if (error) throw error
      setMeasures(prev => prev.map(m => m.id === editingMeasure ? data : m))
      setEditingMeasure(null)
      setEditWeight(false)
      setWeightForm({ weight: '', waist: '', hips: '', chest: '', arm: '', thigh: '', calf: '', glutes: '', notes: '' })
      show('Mesure mise à jour ✓', 'success')
    } catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }

  const startEditMeasure = (m) => {
    setEditingMeasure(m.id)
    setWeightForm({
      weight: m.weight ?? '',
      waist:  m.waist  ?? '',
      hips:   m.hips   ?? '',
      chest:  m.chest  ?? '',
      arm:    m.arm    ?? '',
      thigh:  m.thigh  ?? '',
      calf:   m.calf   ?? '',
      glutes: m.glutes ?? '',
      notes:  m.notes  ?? '',
    })
    setEditWeight(true)
    setBodyTab('history')
    // scroll to top of body tab
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
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
            { id: 'body',      label: '📏 Mensurations' },
            { id: 'recipe',    label: '🍽️ Recette de la semaine' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
          <RecipeOfTheDay />
        ) : activeTab === 'body' ? (
          <BodyTracker
            measures={measures} weightForm={weightForm} setWeightForm={setWeightForm}
            editWeight={editWeight} setEditWeight={setEditWeight}
            saving={saving} saveWeight={saveWeight}
            deleteMeasure={deleteMeasure} deletingId={deletingId}
            editingMeasure={editingMeasure} setEditingMeasure={setEditingMeasure}
            updateMeasure={updateMeasure} startEditMeasure={startEditMeasure}
            bodyTab={bodyTab} setBodyTab={setBodyTab}
            chartField={chartField} setChartField={setChartField}
          />
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

          <div style={{ background: '#F0F4FF', border: '1px solid #C5D0F0', borderRadius: '14px', padding: '20px 24px', cursor: 'pointer' }} onClick={() => setActiveTab('body')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>📏 Suivi corporel</div>
              <span style={{ fontSize: '11px', color: '#4A6FD4', fontWeight: '600' }}>Voir tout →</span>
            </div>
            {measures.length === 0 ? (
              <div style={{ color: '#6B7A99', fontSize: '13px' }}>Aucune mesure. Clique pour en ajouter !</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {measures.slice(0, 3).map((m, i) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: '13px' }}>
                    <span style={{ color: '#6B7A99', fontSize: '11px', fontFamily: "'DM Mono',monospace" }}>{new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                    <span style={{ fontWeight: '800', fontSize: '15px', color: '#C45C3A' }}>{m.weight} kg</span>
                    <span style={{ fontSize: '11px', color: '#6B7A99' }}>{[m.waist && `T:${m.waist}`, m.hips && `H:${m.hips}`].filter(Boolean).join(' ')}</span>
                    {i === 0 && <span style={{ fontSize: '9px', background: '#D4E0CC', color: '#2E5E2E', padding: '2px 6px', borderRadius: '10px', fontWeight: '700' }}>ACTUEL</span>}
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


// ──────────────────────────────────────────────────────────────
// BODY TRACKER
// ──────────────────────────────────────────────────────────────
const MEASURE_FIELDS = [
  { key: 'weight', label: 'Poids',           unit: 'kg', icon: '⚖️', color: '#C45C3A', required: true },
  { key: 'waist',  label: 'Tour de taille',  unit: 'cm', icon: '📏', color: '#4A6FD4' },
  { key: 'hips',   label: 'Tour de hanches', unit: 'cm', icon: '📏', color: '#8FA07A' },
  { key: 'glutes', label: 'Tour de fesses',  unit: 'cm', icon: '📏', color: '#9B7BB8' },
  { key: 'chest',  label: 'Tour de poitrine',unit: 'cm', icon: '📏', color: '#D4A017' },
  { key: 'arm',    label: 'Tour de bras',    unit: 'cm', icon: '💪', color: '#2C8A6E' },
  { key: 'thigh',  label: 'Tour de cuisse',  unit: 'cm', icon: '📏', color: '#C45C3A' },
  { key: 'calf',   label: 'Tour de mollet',  unit: 'cm', icon: '📏', color: '#4A6FD4' },
]

function MiniChart({ measures, field }) {
  const data = [...measures].filter(m => m[field] != null).reverse().slice(-16)
  const fieldMeta = MEASURE_FIELDS.find(f => f.key === field)
  const color = fieldMeta?.color || '#4A6FD4'

  if (data.length < 2) return (
    <div style={{ height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#C5D0F0', gap: 8 }}>
      <div style={{ fontSize: 32 }}>📉</div>
      <div style={{ fontSize: 12 }}>Ajoute au moins 2 mesures pour voir la courbe</div>
    </div>
  )

  const vals = data.map(m => +m[field])
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const W = 400, H = 140, PX = 12, PY = 14

  const pts = data.map((m, i) => [
    PX + (i / (data.length - 1)) * (W - PX * 2),
    PY + ((max - +m[field]) / range) * (H - PY * 2 - 14)
  ])
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const area = `M${pts[0][0]},${H - 14} ` + pts.map(([x, y]) => `L${x},${y}`).join(' ') + ` L${pts[pts.length - 1][0]},${H - 14} Z`
  const delta = (vals[vals.length - 1] - vals[0]).toFixed(1)
  const isPositive = parseFloat(delta) > 0
  const deltaColor = field === 'weight' ? (isPositive ? '#C45C3A' : '#3A7A5A') : (isPositive ? '#4A6FD4' : '#C45C3A')

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 140, overflow: 'visible' }}>
        <defs>
          <linearGradient id={`g-${field}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line key={i} x1={PX} y1={PY + t * (H - PY * 2 - 14)} x2={W - PX} y2={PY + t * (H - PY * 2 - 14)}
            stroke="#E8ECFA" strokeWidth="1" strokeDasharray="3,3" />
        ))}
        <path d={area} fill={`url(#g-${field})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 5 : 3.5} fill="white" stroke={color} strokeWidth="2.5" />
        ))}
        <text x={pts[0][0]} y={H - 1} textAnchor="middle" fontSize="9" fill="#6B7A99">
          {new Date(data[0].date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
        </text>
        <text x={pts[pts.length - 1][0]} y={H - 1} textAnchor="middle" fontSize="9" fill="#6B7A99">
          {new Date(data[data.length - 1].date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
        </text>
        <text x={W - PX + 3} y={PY + 3} fontSize="9" fill={color} fontWeight="700">{max}</text>
        <text x={W - PX + 3} y={H - PY - 12} fontSize="9" fill="#9BA8C0">{min}</text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={{ fontSize: 11, color: '#6B7A99' }}>
          {data.length} mesures · du {new Date(data[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au {new Date(data[data.length - 1].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, color: deltaColor }}>
          {isPositive ? '+' : ''}{delta} {fieldMeta?.unit} sur la période
        </div>
      </div>
    </div>
  )
}

function BodyTracker({ measures, weightForm, setWeightForm, editWeight, setEditWeight, saving, saveWeight, deleteMeasure, deletingId, editingMeasure, setEditingMeasure, updateMeasure, startEditMeasure, bodyTab, setBodyTab, chartField, setChartField }) {
  const latest = measures[0] || {}
  const inpB = { width: '100%', padding: '9px 11px', border: '1.5px solid #C5D0F0', borderRadius: '8px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: 'white', outline: 'none', color: '#0D1B4E', boxSizing: 'border-box' }
  const btnB = (bg, col, brd) => ({ padding: '9px 18px', background: bg, color: col, border: brd ? `1.5px solid ${brd}` : 'none', borderRadius: '9px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── HERO HEADER ── */}
      <div style={{ background: 'linear-gradient(135deg, #0D1B4E, #2C4A9E)', borderRadius: 16, padding: '22px 24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 800, marginBottom: 4 }}>📏 Suivi corporel</div>
          <div style={{ fontSize: 12, opacity: 0.72 }}>Poids · mensurations · courbe d'évolution</div>
        </div>
        <button onClick={() => {
          if (editWeight) { setEditWeight(false); setEditingMeasure(null) }
          else setEditWeight(true)
        }} style={{ ...btnB(editWeight ? 'rgba(255,255,255,0.15)' : 'white', editWeight ? 'white' : '#0D1B4E'), border: editWeight ? '1px solid rgba(255,255,255,0.3)' : 'none' }}>
          {editWeight ? '✕ Annuler' : '+ Nouvelle mesure'}
        </button>
      </div>

      {/* ── FORMULAIRE ── */}
      {editWeight && (
        <div style={{ background: '#F0F4FF', border: '1.5px solid #C5D0F0', borderRadius: 14, padding: '20px 18px' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#0D1B4E', marginBottom: 16 }}>
            {editingMeasure
              ? <span>✏️ Modifier la mesure du <span style={{ color: '#4A6FD4' }}>{new Date(measures.find(m => m.id === editingMeasure)?.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></span>
              : <span>✏️ {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            }
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 10 }}>
            {MEASURE_FIELDS.map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: 4, fontWeight: 700 }}>
                  {f.icon} {f.label} ({f.unit}){f.required ? ' *' : ''}
                </label>
                <input type="number" step="0.1" value={weightForm[f.key] || ''} onChange={e => setWeightForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.required ? 'Obligatoire' : 'Optionnel'} style={inpB} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: 4, fontWeight: 700 }}>📝 Note</label>
            <input value={weightForm.notes || ''} onChange={e => setWeightForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Ex: matin à jeun, après séance, cycle J1…" style={inpB} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={editingMeasure ? updateMeasure : saveWeight} disabled={saving || !weightForm.weight} style={{ ...btnB(editingMeasure ? '#4A6FD4' : '#0D1B4E', 'white'), opacity: !weightForm.weight ? 0.45 : 1 }}>
              {saving ? 'Sauvegarde…' : editingMeasure ? '✓ Mettre à jour' : '✓ Enregistrer'}
            </button>
            <button onClick={() => { setEditWeight(false); setEditingMeasure(null) }} style={btnB('transparent', '#6B7A99', '#C5D0F0')}>Annuler</button>
          </div>
        </div>
      )}

      {/* ── DERNIÈRES VALEURS (mini cartes) ── */}
      {measures.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {MEASURE_FIELDS.filter(f => latest[f.key] != null).map(f => {
            const prev = measures.find((m, i) => i > 0 && m[f.key] != null)
            const delta = prev ? (+latest[f.key] - +prev[f.key]).toFixed(1) : null
            const positive = delta !== null && parseFloat(delta) > 0
            const negative = delta !== null && parseFloat(delta) < 0
            const deltaColor = f.key === 'weight'
              ? (positive ? '#C45C3A' : '#3A7A5A')
              : (positive ? '#3A7A5A' : '#C45C3A')
            return (
              <div key={f.key} onClick={() => { setBodyTab('curve'); setChartField(f.key) }}
                style={{ background: 'white', border: `1.5px solid ${f.color}20`, borderTop: `3px solid ${f.color}`, borderRadius: 13, padding: '13px 10px', textAlign: 'center', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 14px ${f.color}22`}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{f.icon}</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: f.color, lineHeight: 1 }}>{latest[f.key]}</div>
                <div style={{ fontSize: 10, color: '#9BA8C0', marginBottom: 3 }}>{f.unit}</div>
                <div style={{ fontSize: 9, color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700, marginBottom: 5 }}>{f.label}</div>
                {delta !== null && (
                  <div style={{ fontSize: 10, fontWeight: 800, color: parseFloat(delta) === 0 ? '#9BA8C0' : deltaColor }}>
                    {positive ? '+' : ''}{delta} {f.unit}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── HISTORIQUE / COURBE ── */}
      <div style={{ background: 'white', border: '1px solid #C5D0F0', borderRadius: 14, overflow: 'hidden' }}>
        {/* Sub-tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E8ECFA' }}>
          {[{ id: 'history', label: '📋 Historique' }, { id: 'curve', label: '📈 Courbe' }].map(t => (
            <button key={t.id} onClick={() => setBodyTab(t.id)} style={{
              flex: 1, padding: '13px', border: 'none', cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13,
              background: bodyTab === t.id ? '#0D1B4E' : 'transparent',
              color: bodyTab === t.id ? 'white' : '#6B7A99',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ padding: 18 }}>

          {/* HISTORIQUE */}
          {bodyTab === 'history' && (
            measures.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9BA8C0', padding: '30px 0', fontSize: 13 }}>
                Aucune mesure enregistrée — clique sur + Nouvelle mesure
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 460, overflowY: 'auto' }}>
                {measures.map((m, i) => (
                  <div key={m.id} style={{
                    background: i === 0 ? '#F0F4FF' : '#FAFBFF',
                    borderRadius: 11, padding: '12px 14px',
                    border: i === 0 ? '1.5px solid #C5D0F0' : '1px solid #E8ECFA',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#6B7A99', fontFamily: "'DM Mono',monospace" }}>
                          {new Date(m.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {i === 0 && <span style={{ fontSize: 9, background: '#D4E0CC', color: '#2E5E2E', padding: '2px 8px', borderRadius: 10, fontWeight: 800, letterSpacing: '0.5px' }}>ACTUEL</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => startEditMeasure(m)}
                          style={{ background: editingMeasure === m.id ? '#EEF4FF' : 'rgba(74,111,212,0.09)', border: editingMeasure === m.id ? '1.5px solid #4A6FD4' : 'none', color: '#4A6FD4', borderRadius: 7, width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Modifier">✏️</button>
                        <button onClick={() => deleteMeasure(m.id)} disabled={deletingId === m.id}
                          style={{ background: 'rgba(196,92,58,0.09)', border: 'none', color: '#C45C3A', borderRadius: 7, width: 28, height: 28, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                          title="Supprimer">
                          {deletingId === m.id ? '…' : '×'}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px' }}>
                      {MEASURE_FIELDS.filter(f => m[f.key] != null).map(f => (
                        <div key={f.key} style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                          <span style={{ fontSize: 10, color: '#9BA8C0' }}>{f.label}</span>
                          <span style={{ fontWeight: 900, fontSize: 15, color: f.color }}>{m[f.key]}<span style={{ fontSize: 10, fontWeight: 400, color: '#9BA8C0' }}> {f.unit}</span></span>
                        </div>
                      ))}
                      {m.notes && <div style={{ width: '100%', fontSize: 11, color: '#9BA8C0', marginTop: 3, fontStyle: 'italic' }}>💬 {m.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* COURBE */}
          {bodyTab === 'curve' && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {MEASURE_FIELDS.filter(f => measures.some(m => m[f.key] != null)).map(f => (
                  <button key={f.key} onClick={() => setChartField(f.key)} style={{
                    padding: '5px 13px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 700,
                    background: chartField === f.key ? f.color : '#EEF2FF',
                    color: chartField === f.key ? 'white' : '#6B7A99',
                    transition: 'all 0.15s',
                  }}>{f.icon} {f.label}</button>
                ))}
              </div>
              <div style={{ background: '#FAFBFF', borderRadius: 12, padding: '16px 14px' }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#0D1B4E', marginBottom: 12 }}>
                  {MEASURE_FIELDS.find(f => f.key === chartField)?.icon} {MEASURE_FIELDS.find(f => f.key === chartField)?.label}
                  <span style={{ fontSize: 11, color: '#9BA8C0', fontWeight: 400, marginLeft: 8 }}>({MEASURE_FIELDS.find(f => f.key === chartField)?.unit})</span>
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

// ─── RECETTE DU JOUR — STATIQUE ───────────────────────────────
const RECIPE = {
  name: 'Muffins Pépites de Chocolat',
  category: 'Goûter',
  emoji: '🧁',
  prep_time: '10 min',
  cook_time: '20-25 min',
  servings: 8,
  description: 'Des muffins moelleux et healthy, sans sucre raffiné, riches en protéines grâce au fromage blanc. Le goûter parfait pour les sportifs qui veulent se faire plaisir sans culpabiliser.',
  image: '/muffins-choco.png',
  ingredients: [
    { qty: '125g', name: 'farine de blé semi-complète' },
    { qty: '100g', name: 'compote de pomme sans sucre ajouté' },
    { qty: '50g', name: 'fromage blanc 0% (ou yaourt grec 0% / skyr nature)' },
    { qty: '1', name: 'œuf entier (BIO de préférence)' },
    { qty: '35g', name: 'pépites de chocolat' },
    { qty: '30g', name: "sirop d'agave (ou sirop d'érable / cassonade)" },
    { qty: '10ml', name: 'huile de coco' },
    { qty: '5g', name: 'levure chimique' },
  ],
  steps: [
    'Préchauffer le four à 180°C.',
    "Faire fondre l'huile de coco au micro-ondes.",
    "Dans un grand saladier, mélanger la farine, la compote de pomme, le fromage blanc, l'œuf, le sirop d'agave, l'huile de coco fondue et la levure jusqu'à obtenir un appareil homogène sans grumeaux.",
    'Incorporer les pépites de chocolat et mélanger à nouveau.',
    'Remplir aux ¾ les moules à muffins en silicone (ou en papier).',
    "Enfourner pendant 20 à 25 min, jusqu'à ce qu'ils soient juste dorés.",
    'Laisser tiédir sur une grille avant de déguster.',
  ],
  tips: "Conserver dans un récipient hermétique au frais. À consommer dans les 2 jours pour éviter qu'ils ne sèchent.",
  macros: { calories: 139, proteines: 3.9, glucides: 21.7, lipides: 4.1 },
}

function RecipeOfTheDay() {
  const r = RECIPE

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'DM Sans',sans-serif" }}>

      {/* ── HERO ── */}
      <div style={{ borderRadius: '20px', overflow: 'hidden', position: 'relative', boxShadow: '0 8px 32px rgba(13,27,78,0.18)' }}>
        <img src={r.image} alt={r.name} style={{ width: '100%', height: '280px', objectFit: 'cover', display: 'block' }} />
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,27,78,0.92) 0%, rgba(13,27,78,0.3) 50%, transparent 100%)' }} />
        {/* Badges top */}
        <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '8px' }}>
          <span style={{ background: 'rgba(255,255,255,0.95)', color: '#C45C3A', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {r.emoji} {r.category}
          </span>
          <span style={{ background: 'rgba(0,0,0,0.45)', color: 'white', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', backdropFilter: 'blur(4px)' }}>
            ⏱ {r.prep_time} + {r.cook_time}
          </span>
        </div>
        {/* Bottom text */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 22px 20px' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '26px', fontWeight: '800', color: 'white', lineHeight: 1.15, marginBottom: '6px', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            {r.name}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, maxWidth: '480px' }}>
            {r.description}
          </div>
          <div style={{ marginTop: '12px' }}>
            <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              🍽️ {r.servings} muffins
            </span>
          </div>
        </div>
      </div>

      {/* ── MACROS ── */}
      <div>
        <div style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#6B7A99', fontWeight: '700', marginBottom: '12px' }}>
          Valeurs nutritionnelles · par muffin
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { label: 'Calories', value: `${r.macros.calories}`, unit: 'kcal', color: '#C45C3A', bg: '#FFF3EE', icon: '🔥' },
            { label: 'Protéines', value: `${r.macros.proteines}`, unit: 'g', color: '#4A6FD4', bg: '#EEF4FF', icon: '💪' },
            { label: 'Glucides', value: `${r.macros.glucides}`, unit: 'g', color: '#8FA07A', bg: '#F0F6EC', icon: '⚡' },
            { label: 'Lipides', value: `${r.macros.lipides}`, unit: 'g', color: '#D4A017', bg: '#FFFBEE', icon: '🫒' },
          ].map(m => (
            <div key={m.label} style={{ background: m.bg, border: `1.5px solid ${m.color}22`, borderRadius: '14px', padding: '16px 10px', textAlign: 'center', boxShadow: `0 2px 8px ${m.color}11` }}>
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>{m.icon}</div>
              <div style={{ fontWeight: '900', fontSize: '22px', color: m.color, lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: '11px', color: m.color, fontWeight: '600', opacity: 0.7, marginBottom: '4px' }}>{m.unit}</div>
              <div style={{ fontSize: '10px', color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── INGRÉDIENTS + STEPS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Ingrédients */}
        <div style={{ background: '#FAFBFF', border: '1.5px solid #C5D0F0', borderRadius: '16px', padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <div style={{ width: '32px', height: '32px', background: '#0D1B4E', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🛒</div>
            <div style={{ fontWeight: '800', fontSize: '15px', color: '#0D1B4E' }}>Ingrédients</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {r.ingredients.map((ing, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '9px 0', borderBottom: i < r.ingredients.length - 1 ? '1px solid #E8ECFA' : 'none' }}>
                <span style={{ background: 'linear-gradient(135deg, #0D1B4E, #2C4A9E)', color: 'white', minWidth: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', flexShrink: 0, marginTop: '1px' }}>{i + 1}</span>
                <span style={{ fontSize: '13px', color: '#0D1B4E', lineHeight: 1.5 }}>
                  <strong style={{ color: '#C45C3A', fontWeight: '800' }}>{ing.qty}</strong>&nbsp;{ing.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Préparation */}
        <div style={{ background: '#FAFBFF', border: '1.5px solid #C5D0F0', borderRadius: '16px', padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <div style={{ width: '32px', height: '32px', background: '#C45C3A', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>👨‍🍳</div>
            <div style={{ fontWeight: '800', fontSize: '15px', color: '#0D1B4E' }}>Préparation</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {r.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ background: 'linear-gradient(135deg, #C45C3A, #E07A5F)', color: 'white', minWidth: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900', flexShrink: 0, marginTop: '0px', boxShadow: '0 2px 6px rgba(196,92,58,0.3)' }}>{i + 1}</span>
                <span style={{ fontSize: '13px', color: '#0D1B4E', lineHeight: 1.65 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ASTUCE ── */}
      <div style={{ background: 'linear-gradient(135deg, #FFFBEE, #FFF5D0)', border: '1.5px solid #FFD97D', borderRadius: '14px', padding: '18px 22px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '28px', flexShrink: 0, lineHeight: 1 }}>💡</div>
        <div>
          <div style={{ fontWeight: '800', color: '#0D1B4E', fontSize: '14px', marginBottom: '5px' }}>Astuce conservation</div>
          <div style={{ fontSize: '13px', color: '#5A4A20', lineHeight: 1.65 }}>{r.tips}</div>
        </div>
      </div>

    </div>
  )
}