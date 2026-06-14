import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Supabase injecte la session depuis le lien magic link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async () => {
    setError('')
    if (password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.push('/'), 2500)
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', border: '1.5px solid rgba(255,255,255,0.15)',
    borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif",
    background: 'rgba(255,255,255,0.07)', color: 'white', outline: 'none', boxSizing: 'border-box'
  }
  const labelStyle = {
    display: 'block', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontWeight: '500'
  }

  return (
    <>
      <Head>
        <title>Ben&Fit — Nouveau mot de passe</title>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#0D1B4E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ width: '420px', zIndex: 10 }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <img src="/logo.png" alt="Ben&Fit" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '40px', backdropFilter: 'blur(20px)' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '28px', color: 'white', letterSpacing: '3px' }}>NOUVEAU MOT DE PASSE</div>
            </div>

            {done ? (
              <div style={{ textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                <div style={{ fontSize: '15px', fontWeight: '600' }}>Mot de passe modifié !</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>Redirection en cours…</div>
              </div>
            ) : !ready ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                Vérification du lien…
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>Nouveau mot de passe</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>Confirmer</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
                </div>
                {error && <div style={{ background: 'rgba(220,53,69,0.15)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#FF8A8A', marginBottom: '16px' }}>{error}</div>}
                <button onClick={handleReset} disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? 'rgba(255,255,255,0.1)' : 'white', color: loading ? 'rgba(255,255,255,0.4)' : '#0D1B4E', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif", letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {loading ? 'Sauvegarde…' : 'ENREGISTRER'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
