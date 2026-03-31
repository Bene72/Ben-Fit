import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export const dynamic = 'force-dynamic'

export default function Dashboard() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [measures, setMeasures] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  const [editProfile, setEditProfile] = useState(false)
  const [editWeight, setEditWeight] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const [profileForm, setProfileForm] = useState({})
  const [weightForm, setWeightForm] = useState({ weight: '', waist: '', hips: '', chest: '', notes: '' })
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' })

  const [saving, setSaving] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdDone, setPwdDone] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 980)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/')
          return
        }

        if (!active) return
        setUser(user)

        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (prof?.role === 'coach') {
          router.push('/coach')
          return
        }

        if (!active) return
        setProfile(prof || null)
        setProfileForm({
          full_name: prof?.full_name || '',
          current_program: prof?.current_program || '',
          objective: prof?.objective || '',
          height: prof?.height || '',
        })

        const { data: m } = await supabase
          .from('measures')
          .select('*')
          .eq('client_id', user.id)
          .order('date', { ascending: false })
          .limit(10)

        if (!active) return
        setMeasures(m || [])

        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)

        let sessionsRows = []
        const sessionAttempts = [
          async () => {
            const { data, error } = await supabase
              .from('workout_sessions')
              .select('*')
              .eq('client_id', user.id)
              .gte('date', weekStart.toISOString().split('T')[0])
            if (error) throw error
            return data || []
          },
          async () => {
            const { data, error } = await supabase
              .from('workout_logs')
              .select('*')
              .eq('client_id', user.id)
              .gte('logged_at', weekStart.toISOString())
            if (error) throw error
            return data || []
          },
        ]

        for (const attempt of sessionAttempts) {
          try {
            sessionsRows = await attempt()
            break
          } catch {}
        }

        if (!active) return
        setSessions(sessionsRows || [])
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [router])

  const latestWeight = measures[0]?.weight
  const prevWeight = measures[1]?.weight
  const weightDelta = latestWeight && prevWeight ? (latestWeight - prevWeight).toFixed(1) : null
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    []
  )

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update(profileForm).eq('id', user.id)
    setProfile((prev) => ({ ...prev, ...profileForm }))
    setEditProfile(false)
    setSaving(false)
  }

  async function saveWeight() {
    if (!user || !weightForm.weight) return
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('measures')
      .insert({
        client_id: user.id,
        date: today,
        weight: +weightForm.weight,
        waist: +weightForm.waist || null,
        hips: +weightForm.hips || null,
        chest: +weightForm.chest || null,
        notes: weightForm.notes || null,
      })
      .select()
      .single()

    if (data) setMeasures((prev) => [data, ...prev])
    setWeightForm({ weight: '', waist: '', hips: '', chest: '', notes: '' })
    setEditWeight(false)
    setSaving(false)
  }

  async function changePassword() {
    if (!user) return
    setPwdError('')

    if (pwdForm.next.length < 6) {
      setPwdError('6 caractères minimum.')
      return
    }
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdError('Les mots de passe ne correspondent pas.')
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pwdForm.current,
    })
    if (signInError) {
      setPwdError('Ancien mot de passe incorrect.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: pwdForm.next })
    if (error) {
      setPwdError(error.message)
      return
    }

    setPwdDone(true)
    setPwdForm({ current: '', next: '', confirm: '' })
    setTimeout(() => {
      setPwdDone(false)
      setShowPwd(false)
    }, 2500)
  }

  if (loading) return <LoadingScreen />

  return (
    <Layout title={isMobile ? '' : 'Dashboard'} user={user}>
      {isMobile ? (
        <div style={{ marginTop: '-6px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <img src="/logo-small.png" alt="Ben&Fit" style={{ width: 30, height: 30, objectFit: 'contain' }} />
            <div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, letterSpacing: '1.2px', color: '#0D1B4E', lineHeight: 1 }}>BEN&FIT</div>
              <div style={{ fontSize: 8, color: '#6B7A99', letterSpacing: '1px', textTransform: 'uppercase' }}>Only Benefit · since 2021</div>
            </div>
          </div>
          <div style={{ fontWeight: 900, fontSize: 22, color: '#0D1B4E', marginBottom: 2 }}>Dashboard</div>
          <div style={{ color: '#6B7A99', fontSize: 13 }}>Vue simple, claire et propre de ton espace client.</div>
        </div>
      ) : null}

      <HeroCard
        isMobile={isMobile}
        name={profile?.full_name?.split(' ')[0] || 'Toi'}
        todayLabel={todayLabel}
        program={profile?.current_program || 'Aucun programme défini'}
        onTraining={() => router.push('/training')}
        onMessages={() => router.push('/messages')}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <StatCard
          tone="blue"
          label="Séances cette semaine"
          value={sessions.length}
          suffix="/5"
          sub="Objectif hebdomadaire"
          progress={Math.min(100, (sessions.length / 5) * 100)}
        />
        <StatCard
          tone="orange"
          label="Poids actuel"
          value={latestWeight || '—'}
          suffix={latestWeight ? 'kg' : ''}
          sub={weightDelta ? `${parseFloat(weightDelta) > 0 ? '+' : ''}${weightDelta} kg vs dernière mesure` : 'Ajoute une mesure pour suivre ton évolution'}
        />
        <StatCard
          tone="navy"
          label="Programme actuel"
          value={profile?.current_program || '—'}
          valueSize={profile?.current_program ? 24 : 34}
          sub={profile?.objective ? `🎯 ${profile.objective}` : 'Aucun objectif défini'}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <SimpleCard title="Mon profil" action={
          <button onClick={() => setEditProfile(!editProfile)} style={btn('#0D1B4E', 'white')}>
            {editProfile ? 'Fermer' : 'Modifier'}
          </button>
        }>
          {editProfile ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { label: 'Prénom / Nom', key: 'full_name', placeholder: 'Jean Dupont' },
                { label: 'Programme actuel', key: 'current_program', placeholder: 'Phase 2 · Hypertrophie' },
                { label: 'Objectif', key: 'objective', placeholder: 'Prise de masse, sèche…' },
                { label: 'Taille (cm)', key: 'height', placeholder: '180' },
              ].map((f) => (
                <div key={f.key}>
                  <label style={lbl}>{f.label}</label>
                  <input
                    value={profileForm[f.key] || ''}
                    onChange={(e) => setProfileForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={inp}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={saveProfile} disabled={saving} style={btn('#0D1B4E', 'white')}>{saving ? 'Sauvegarde…' : 'Enregistrer'}</button>
                <button onClick={() => setEditProfile(false)} style={btn('transparent', '#6B7A99', '#C5D0F0')}>Annuler</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <InfoRow label="Nom" value={profile?.full_name || '—'} />
              <InfoRow label="Programme" value={profile?.current_program || '—'} />
              <InfoRow label="Objectif" value={profile?.objective || '—'} />
              <InfoRow label="Taille" value={profile?.height ? `${profile.height} cm` : '—'} />
            </div>
          )}
        </SimpleCard>

        <SimpleCard title="Mot de passe" action={
          <button onClick={() => { setShowPwd(!showPwd); setPwdError(''); setPwdDone(false) }} style={btn(showPwd ? '#EEF2FF' : '#0D1B4E', showPwd ? '#6B7A99' : 'white')}>
            {showPwd ? 'Fermer' : 'Modifier'}
          </button>
        }>
          {showPwd ? (
            pwdDone ? (
              <div style={successBox}>✅ Mot de passe modifié avec succès.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { key: 'current', label: 'Ancien mot de passe', placeholder: '••••••••' },
                  { key: 'next', label: 'Nouveau mot de passe', placeholder: '6 caractères minimum' },
                  { key: 'confirm', label: 'Confirmer', placeholder: '••••••••' },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={lbl}>{f.label}</label>
                    <input
                      type="password"
                      value={pwdForm[f.key]}
                      onChange={(e) => setPwdForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      style={inp}
                    />
                  </div>
                ))}
                {pwdError ? <div style={errorBox}>{pwdError}</div> : null}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={changePassword} style={btn('#0D1B4E', 'white')}>Enregistrer</button>
                  <button onClick={() => { setShowPwd(false); setPwdError('') }} style={btn('transparent', '#6B7A99', '#C5D0F0')}>Annuler</button>
                </div>
              </div>
            )
          ) : (
            <div style={{ color: '#6B7A99', lineHeight: 1.6, fontSize: 14 }}>
              Modifie ton mot de passe si besoin. Rien de plus, rien de trop.
            </div>
          )}
        </SimpleCard>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <SimpleCard title="Suivi du poids" action={
          <button onClick={() => setEditWeight(!editWeight)} style={btn('#0D1B4E', 'white')}>
            + Nouvelle mesure
          </button>
        }>
          {editWeight ? (
            <div style={{ background: '#F8FBFF', border: '1px solid #DCE5F3', borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 8 }}>
                {[
                  { label: 'Poids (kg) *', key: 'weight', ph: '80.5' },
                  { label: 'Tour de taille', key: 'waist', ph: '85' },
                  { label: 'Tour de hanches', key: 'hips', ph: '95' },
                  { label: 'Tour de poitrine', key: 'chest', ph: '100' },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={lbl}>{f.label}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={weightForm[f.key]}
                      onChange={(e) => setWeightForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.ph}
                      style={inp}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={lbl}>Note</label>
                <input
                  value={weightForm.notes}
                  onChange={(e) => setWeightForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Ex : matin à jeun"
                  style={inp}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={saveWeight} disabled={saving} style={btn('#0D1B4E', 'white')}>{saving ? '…' : 'Enregistrer'}</button>
                <button onClick={() => setEditWeight(false)} style={btn('transparent', '#6B7A99', '#C5D0F0')}>Annuler</button>
              </div>
            </div>
          ) : null}

          {measures.length === 0 ? (
            <div style={{ color: '#6B7A99', fontSize: 14 }}>Aucune mesure enregistrée pour le moment.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
              {measures.map((m, i) => (
                <div
                  key={m.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr auto' : '110px auto auto',
                    gap: 10,
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(13,27,78,0.06)',
                  }}
                >
                  <div style={{ color: '#6B7A99', fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
                    {new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </div>
                  <div style={{ fontWeight: 800, color: '#0D1B4E' }}>{m.weight} kg</div>
                  {!isMobile ? (
                    <div style={{ justifySelf: 'end' }}>
                      {i === 0 ? <span style={pillCurrent}>Actuel</span> : <span style={{ color: '#6B7A99', fontSize: 12 }}>{m.waist ? `T:${m.waist}` : ''}{m.hips ? ` H:${m.hips}` : ''}</span>}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </SimpleCard>

        {profile?.coach_note ? (
          <SimpleCard title="Message de ton coach">
            <div style={{ fontSize: 12, letterSpacing: '1.3px', textTransform: 'uppercase', color: '#6B7A99', marginBottom: 10 }}>
              Message récent
            </div>
            <p style={{ margin: 0, color: '#0D1B4E', lineHeight: 1.7, fontSize: 14 }}>
              {profile.coach_note}
            </p>
          </SimpleCard>
        ) : (
          <SimpleCard title="Message de ton coach">
            <div style={{ color: '#6B7A99', lineHeight: 1.6, fontSize: 14 }}>
              Aucun message récent.
            </div>
          </SimpleCard>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        {[
          { icon: '🏋️', label: 'Entraînements', sub: 'Voir mon programme', href: '/training', color: '#0D1B4E' },
          { icon: '🥗', label: 'Nutrition', sub: 'Suivi alimentaire', href: '/nutrition', color: '#4A6FD4' },
          { icon: '📋', label: 'Bilan', sub: 'Mon bilan hebdo', href: '/bilan', color: '#C45C3A' },
        ].map((link) => (
          <button
            key={link.href}
            onClick={() => router.push(link.href)}
            style={{
              background: '#FFFFFF',
              border: '1px solid #DCE5F3',
              borderTop: `3px solid ${link.color}`,
              borderRadius: 18,
              padding: 18,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif",
              boxShadow: '0 10px 26px rgba(13,27,78,0.04)',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 10 }}>{link.icon}</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0D1B4E', marginBottom: 4 }}>{link.label}</div>
            <div style={{ fontSize: 13, color: '#6B7A99' }}>{link.sub}</div>
          </button>
        ))}
      </div>
    </Layout>
  )
}

function HeroCard({ isMobile, name, todayLabel, program, onTraining, onMessages }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0D1B4E 0%, #182B6B 52%, #314B9B 100%)',
        borderRadius: 22,
        padding: isMobile ? '18px 16px' : '22px 24px',
        color: 'white',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: 14,
        marginBottom: 18,
        boxShadow: '0 18px 40px rgba(13,27,78,0.12)',
      }}
    >
      <div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, marginBottom: 4 }}>Bonjour {name} 👋</div>
        <div style={{ fontSize: 13, opacity: 0.82, lineHeight: 1.6 }}>{todayLabel} · {program}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={onTraining} style={heroBtnPrimary}>Séance du jour</button>
        <button onClick={onMessages} style={heroBtnGhost}>Coach</button>
      </div>
    </div>
  )
}

function StatCard({ tone, label, value, suffix, sub, progress, valueSize }) {
  const colors = {
    blue: '#4A6FD4',
    orange: '#C45C3A',
    navy: '#0D1B4E',
  }
  const color = colors[tone] || colors.navy

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #DCE5F3',
        borderRadius: 20,
        padding: '18px 18px 16px',
        borderTop: `3px solid ${color}`,
        boxShadow: '0 10px 26px rgba(13,27,78,0.04)',
      }}
    >
      <div style={statLabel}>{label}</div>
      <div style={{ ...statValue, fontSize: valueSize || statValue.fontSize, color: '#0D1B4E' }}>
        {value}
        {suffix ? <span style={{ fontSize: 16, color: '#6B7A99', marginLeft: 6 }}>{suffix}</span> : null}
      </div>
      <div style={{ marginTop: 8, color: '#6B7A99', fontSize: 12, lineHeight: 1.5 }}>{sub}</div>
      {typeof progress === 'number' ? (
        <div style={{ marginTop: 10, height: 6, background: '#E7EDF8', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: color, width: `${progress}%`, borderRadius: 999 }} />
        </div>
      ) : null}
    </div>
  )
}

function SimpleCard({ title, action, children }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #DCE5F3',
        borderRadius: 20,
        padding: '18px 18px 16px',
        boxShadow: '0 10px 26px rgba(13,27,78,0.04)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#0D1B4E' }}>{title}</div>
        {action || null}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 10, fontSize: 14 }}>
      <div style={{ color: '#6B7A99' }}>{label}</div>
      <div style={{ color: '#0D1B4E', fontWeight: 600 }}>{value}</div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#EEF2FF',
        fontFamily: "'Playfair Display',serif",
        fontSize: 20,
        color: '#6B7A99',
      }}
    >
      Chargement…
    </div>
  )
}

const statLabel = {
  fontSize: 11,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: '#6B7A99',
  marginBottom: 8,
}
const statValue = {
  fontFamily: "'Playfair Display',serif",
  fontSize: 34,
  fontWeight: 700,
  lineHeight: 1.1,
}
const lbl = {
  display: 'block',
  fontSize: 11,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: '#6B7A99',
  marginBottom: 6,
  fontWeight: 600,
}
const inp = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #DCE5F3',
  borderRadius: 12,
  fontSize: 14,
  fontFamily: "'DM Sans',sans-serif",
  background: 'white',
  outline: 'none',
  color: '#0D1B4E',
  boxSizing: 'border-box',
}
const btn = (bg, color, border) => ({
  padding: '9px 14px',
  background: bg,
  color,
  border: border ? `1.5px solid ${border}` : 'none',
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: "'DM Sans',sans-serif",
})
const heroBtnPrimary = {
  padding: '10px 16px',
  background: '#FFFFFF',
  color: '#0D1B4E',
  border: 'none',
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: "'DM Sans',sans-serif",
}
const heroBtnGhost = {
  padding: '10px 16px',
  background: 'rgba(255,255,255,0.12)',
  color: '#FFFFFF',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: "'DM Sans',sans-serif",
}
const errorBox = {
  color: '#C45C3A',
  fontSize: 13,
  padding: '10px 12px',
  background: 'rgba(196,92,58,0.08)',
  borderRadius: 12,
}
const successBox = {
  background: '#E8F5E9',
  border: '1px solid #A5D6A7',
  borderRadius: 12,
  padding: 12,
  color: '#2E7D32',
  fontSize: 14,
  textAlign: 'center',
}
const pillCurrent = {
  fontSize: 11,
  background: '#DCE9D1',
  color: '#0D1B4E',
  padding: '3px 8px',
  borderRadius: 999,
  fontWeight: 700,
}
