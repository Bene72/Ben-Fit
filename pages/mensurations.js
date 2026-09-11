'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { watchBreakpoint } from '../lib/breakpoints'
import AppShell from '../components/ui/AppShell'
import { useToast } from '../lib/useToast'
// CORRECTIF AUDIT 09/09/2026 (point 4 : découpage des gros fichiers, 3e
// passe) — MiniChart, BodyTracker et RecipeOfTheDay étaient définis dans ce
// même fichier (1635 lignes). Extraits tel quel, sans changement de
// comportement. RecipeOfTheDay n'est pas ré-importé ici : il était déjà
// désactivé ("masqué pour le moment", cf. commentaire plus bas) et n'a
// aucun point d'appel — son code reste disponible dans
// components/mensurations/RecipeOfTheDay.jsx pour une réactivation future.
// Voir CHANGELOG-AUDIT-DECOUPAGE-3.md.
import BodyTracker from '../components/mensurations/BodyTracker'

// pages/mensurations.js
// Ancien contenu de "Aperçu" (pages/dashboard.js), déplacé ici tel quel lors
// de la V2 : /dashboard devient la page "Aujourd'hui" (accueil épuré), et ce
// qui vivait dans ses onglets "Mensurations" / "Recette du chef" / profil
// reste disponible ici, accessible depuis le menu ⋯ (AppShell → ClientMoreMenu).
// Aucune logique changée par rapport à l'original — seuls le titre AppShell
// et l'onglet ouvert par défaut ont bougé (voir plus bas), pour ne rien
// casser côté requêtes Supabase / RLS.
export default function Mensurations() {
  const { show, ToastComponent } = useToast()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [measures, setMeasures] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editProfile, setEditProfile] = useState(false)
  const [editWeight, setEditWeight] = useState(false)
  const [profileForm, setProfileForm] = useState({})
  const [weightForm, setWeightForm] = useState({
    weight: '',
    waist: '',
    hips: '',
    chest: '',
    arm: '',
    thigh: '',
    calf: '',
    glutes: '',
    notes: '',
  })
  const [deletingId, setDeletingId] = useState(null)
  const [editingMeasure, setEditingMeasure] = useState(null)
  const [bodyTab, setBodyTab] = useState('history')
  const [chartField, setChartField] = useState('weight')
  const [saving, setSaving] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' })
  const [pwdError, setPwdError] = useState('')
  const [pwdDone, setPwdDone] = useState(false)
  const router = useRouter()
  // (ancien sélecteur d'onglet Dashboard/Mensurations/Recette — supprimé, les deux
  // premiers sont désormais fusionnés en un seul écran, voir plus bas.)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => watchBreakpoint('tablet', setIsMobile), [])

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/')
          return
        }
        setUser(user)
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (profErr) throw profErr
        if (prof?.role === 'coach') {
          router.replace('/coach')
          return
        }
        setProfile(prof)
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
          .limit(200)
        // Le schéma stocke les mensurations en *_cm (waist_cm, chest_cm...).
        // On les remappe ici vers les clés courtes utilisées par l'UI existante
        // (m.waist, m.hips...) pour ne pas devoir réécrire tout l'affichage.
        setMeasures((m || []).map(fromDbMeasure))
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
        const { data: s } = await supabase
          .from('workout_sessions')
          .select('*')
          .eq('client_id', user.id)
          .gte('date', weekStart.toISOString().split('T')[0])
        setSessions(s || [])
      } catch (e) {
        show('Erreur de chargement : ' + e.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- exécution unique au montage (charge les données une fois)
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update(profileForm).eq('id', user.id)
      if (error) throw error
      setProfile((prev) => ({ ...prev, ...profileForm }))
      setEditProfile(false)
      show('Profil mis à jour', 'success')
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    setPwdError('')
    if (pwdForm.next.length < 10) {
      setPwdError('10 caractères minimum.')
      return
    }
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdError('Les mots de passe ne correspondent pas.')
      return
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: pwdForm.next })
      if (error) throw error
      setPwdDone(true)
      setPwdForm({ current: '', next: '', confirm: '' })
      setTimeout(() => {
        setPwdDone(false)
        setShowPwd(false)
      }, 3000)
      show('Mot de passe modifié', 'success')
    } catch (e) {
      setPwdError(e.message)
    }
  }

  const saveWeight = async () => {
    if (!weightForm.weight) return
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('measures')
        .insert({
          client_id: user.id,
          date: today,
          weight: +weightForm.weight,
          waist_cm: +weightForm.waist || null,
          hips_cm: +weightForm.hips || null,
          chest_cm: +weightForm.chest || null,
          arm_cm: +weightForm.arm || null,
          thigh_cm: +weightForm.thigh || null,
          calf_cm: +weightForm.calf || null,
          glutes_cm: +weightForm.glutes || null,
          notes: weightForm.notes || null,
        })
        .select()
        .single()
      if (error) throw error
      setMeasures((prev) => [fromDbMeasure(data), ...prev])
      setEditWeight(false)
      setWeightForm({
        weight: '',
        waist: '',
        hips: '',
        chest: '',
        arm: '',
        thigh: '',
        calf: '',
        glutes: '',
        notes: '',
      })
      show('Mesure enregistrée', 'success')
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteMeasure = async (id) => {
    setDeletingId(id)
    try {
      const { error } = await supabase.from('measures').delete().eq('id', id)
      if (error) throw error
      setMeasures((prev) => prev.filter((m) => m.id !== id))
      show('Mesure supprimée', 'success')
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const updateMeasure = async () => {
    if (!weightForm.weight || !editingMeasure) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('measures')
        .update({
          weight: +weightForm.weight,
          waist_cm: +weightForm.waist || null,
          hips_cm: +weightForm.hips || null,
          chest_cm: +weightForm.chest || null,
          arm_cm: +weightForm.arm || null,
          thigh_cm: +weightForm.thigh || null,
          calf_cm: +weightForm.calf || null,
          glutes_cm: +weightForm.glutes || null,
          notes: weightForm.notes || null,
        })
        .eq('id', editingMeasure)
        .select()
        .single()
      if (error) throw error
      setMeasures((prev) => prev.map((m) => (m.id === editingMeasure ? fromDbMeasure(data) : m)))
      setEditingMeasure(null)
      setEditWeight(false)
      setWeightForm({
        weight: '',
        waist: '',
        hips: '',
        chest: '',
        arm: '',
        thigh: '',
        calf: '',
        glutes: '',
        notes: '',
      })
      show('Mesure mise à jour ✓', 'success')
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const startEditMeasure = (m) => {
    setEditingMeasure(m.id)
    setWeightForm({
      weight: m.weight ?? '',
      waist: m.waist ?? '',
      hips: m.hips ?? '',
      chest: m.chest ?? '',
      arm: m.arm ?? '',
      thigh: m.thigh ?? '',
      calf: m.calf ?? '',
      glutes: m.glutes ?? '',
      notes: m.notes ?? '',
    })
    setEditWeight(true)
    setBodyTab('history')
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  const latestWeight = measures[0]?.weight
  const prevWeight = measures[1]?.weight
  const weightDelta = latestWeight && prevWeight ? (latestWeight - prevWeight).toFixed(1) : null
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const adherence = sessions.length > 0 ? Math.round((sessions.length / 5) * 100) : 0

  if (loading)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '3px solid #E8E4DC',
              borderTopColor: 'var(--gold)',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div
            style={{
              fontSize: 13,
              color: '#8A8070',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            Chargement
          </div>
        </div>
      </div>
    )

  return (
    <>
      <ToastComponent />
      <AppShell
        title="Mensurations & profil"
        userName={profile?.full_name?.split(' ')[0]}
        cycleName={profile?.current_cycle_name}
      >
        <div
          style={{
            background: 'var(--bg)',
            minHeight: '100vh',
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          {/* Onglets "Dashboard" et "Mensurations" fusionnés en un seul écran continu
              (ils faisaient doublon : la carte "Poids actuel" et l'aperçu "Suivi
              corporel" ci-dessous redirigeaient simplement vers le même contenu que
              le vrai suivi mesures juste en dessous). "Recette du chef" masqué pour
              le moment — RecipeOfTheDay reste dans ce fichier, juste plus affiché. */}
          <>
            {/* ══ CARDS ══ */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: 12,
              }}
            >
              {/* Profil */}
              <div
                style={{
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '18px 22px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>
                    👤 Mon profil
                  </div>
                  <button
                    onClick={() => setEditProfile(!editProfile)}
                    style={btn3(editProfile ? 'var(--navy)' : 'var(--navy)', 'white')}
                  >
                    {editProfile ? '✕' : '✏️ Modifier'}
                  </button>
                </div>
                {editProfile ? (
                  <div>
                    {[
                      { label: 'Prénom / Nom', key: 'full_name', placeholder: 'Jean Dupont' },
                      {
                        label: 'Programme actuel',
                        key: 'current_program',
                        placeholder: 'Phase 2 · Hypertrophie',
                      },
                      { label: 'Objectif', key: 'objective', placeholder: 'Prise de masse…' },
                      { label: 'Taille (cm)', key: 'height', placeholder: '180' },
                    ].map((f) => (
                      <div key={f.key} style={{ marginBottom: 10 }}>
                        <label style={lbl3}>{f.label}</label>
                        <input
                          value={profileForm[f.key] || ''}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, [f.key]: e.target.value }))
                          }
                          placeholder={f.placeholder}
                          style={inp3}
                        />
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button
                        onClick={saveProfile}
                        disabled={saving}
                        style={btn3('var(--navy)', 'white')}
                      >
                        {saving ? 'Sauvegarde…' : '✓ Enregistrer'}
                      </button>
                      <button
                        onClick={() => setEditProfile(false)}
                        style={btn3('transparent', '#8A8070', '#E8E4DC')}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Nom', value: profile?.full_name },
                      { label: 'Programme', value: profile?.current_program },
                      { label: 'Objectif', value: profile?.objective },
                      { label: 'Taille', value: profile?.height ? `${profile.height} cm` : null },
                    ].map((f) =>
                      f.value ? (
                        <div key={f.label} style={{ display: 'flex', gap: 8, fontSize: 14 }}>
                          <span style={{ color: 'var(--text-faint)', width: 90, flexShrink: 0 }}>
                            {f.label}
                          </span>
                          <span style={{ fontWeight: 500, color: 'var(--navy)' }}>{f.value}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
              </div>

              {/* Mot de passe */}
              <div
                style={{
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '18px 22px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>
                    🔒 Mot de passe
                  </div>
                  <button
                    onClick={() => {
                      setShowPwd(!showPwd)
                      setPwdError('')
                      setPwdDone(false)
                    }}
                    style={btn3(
                      showPwd ? 'var(--border-soft)' : 'var(--navy)',
                      showPwd ? '#8A8070' : 'white'
                    )}
                  >
                    {showPwd ? '✕ Fermer' : '✏️ Modifier'}
                  </button>
                </div>
                {showPwd && (
                  <div style={{ marginTop: 16 }}>
                    {pwdDone ? (
                      <div
                        style={{
                          background: '#E8F0E8',
                          border: '1px solid #A5C4A5',
                          borderRadius: 8,
                          padding: 12,
                          color: 'var(--success)',
                          fontSize: 14,
                          textAlign: 'center',
                        }}
                      >
                        ✅ Mot de passe modifié !
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          {
                            key: 'current',
                            label: 'Ancien mot de passe',
                            placeholder: '••••••••',
                          },
                          {
                            key: 'next',
                            label: 'Nouveau mot de passe',
                            placeholder: '6 caractères minimum',
                          },
                          { key: 'confirm', label: 'Confirmer', placeholder: '••••••••' },
                        ].map((f) => (
                          <div key={f.key}>
                            <label style={lbl3}>{f.label}</label>
                            <input
                              type="password"
                              value={pwdForm[f.key]}
                              onChange={(e) =>
                                setPwdForm((p) => ({ ...p, [f.key]: e.target.value }))
                              }
                              placeholder={f.placeholder}
                              style={inp3}
                            />
                          </div>
                        ))}
                        {pwdError && (
                          <div
                            style={{
                              color: 'var(--danger)',
                              fontSize: 13,
                              padding: '8px 12px',
                              background: 'rgba(196,92,58,0.08)',
                              borderRadius: 7,
                            }}
                          >
                            {pwdError}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={changePassword} style={btn3('var(--navy)', 'white')}>
                            ✓ Enregistrer
                          </button>
                          <button
                            onClick={() => {
                              setShowPwd(false)
                              setPwdError('')
                            }}
                            style={btn3('transparent', '#8A8070', '#E8E4DC')}
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Suivi mensurations (ex-onglet "Mensurations") ── */}
            <BodyTracker
              measures={measures}
              weightForm={weightForm}
              setWeightForm={setWeightForm}
              editWeight={editWeight}
              setEditWeight={setEditWeight}
              saving={saving}
              saveWeight={saveWeight}
              deleteMeasure={deleteMeasure}
              deletingId={deletingId}
              editingMeasure={editingMeasure}
              setEditingMeasure={setEditingMeasure}
              updateMeasure={updateMeasure}
              startEditMeasure={startEditMeasure}
              bodyTab={bodyTab}
              setBodyTab={setBodyTab}
              chartField={chartField}
              setChartField={setChartField}
            />
          </>
        </div>
      </AppShell>
    </>
  )
}

// ── Styles locaux ──────────────────────────────────────────────────────────────
const kpiLabel = {
  fontSize: 10,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'var(--text-faint)',
  marginBottom: 6,
  fontWeight: 700,
}
const kpiValue = {
  fontFamily: "'Playfair Display',serif",
  fontSize: 32,
  fontWeight: 700,
  lineHeight: 1,
  color: 'var(--navy)',
}
const lbl3 = {
  display: 'block',
  fontSize: 10,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'var(--text-faint)',
  marginBottom: 4,
  fontWeight: 600,
}
const inp3 = {
  width: '100%',
  padding: '9px 11px',
  border: '1.5px solid #E8E4DC',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "'DM Sans',sans-serif",
  background: 'var(--bg)',
  outline: 'none',
  color: 'var(--navy)',
  boxSizing: 'border-box',
}
const btn3 = (bg, color, border) => ({
  padding: '7px 14px',
  background: bg,
  color,
  border: border ? `1.5px solid ${border}` : 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'DM Sans',sans-serif",
})

// ── Mapping colonnes DB (*_cm) <-> clés UI courtes ────────────────────────────
// Le schéma Supabase stocke les mensurations en waist_cm/chest_cm/hips_cm/
// arm_cm/thigh_cm/calf_cm/glutes_cm. On les traduit ici en clés courtes
// (waist, chest...) utilisées par le reste de ce composant, pour éviter
// que les écritures soient silencieusement perdues sur des colonnes qui
// n'existent pas côté base (cf. audit sécurité/qualité).
export function fromDbMeasure(row) {
  if (!row) return row
  return {
    ...row,
    waist: row.waist_cm ?? row.waist ?? null,
    chest: row.chest_cm ?? row.chest ?? null,
    hips: row.hips_cm ?? row.hips ?? null,
    arm: row.arm_cm ?? row.arm ?? null,
    thigh: row.thigh_cm ?? row.thigh ?? null,
    calf: row.calf_cm ?? row.calf ?? null,
    glutes: row.glutes_cm ?? row.glutes ?? null,
  }
}
