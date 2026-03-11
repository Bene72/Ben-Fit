import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou mot de passe incorrect.'); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    router.push(profile?.role === 'coach' ? '/coach' : '/nutrition')
  }

  return (
    <>
      <Head>
        <title>Ben&Fit — Connexion</title>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#0D1B4E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif", position: 'relative', overflow: 'hidden' }}>

        <div style={{ position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(255,255,255,0.03) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '300px', background: 'linear-gradient(to top, rgba(6,12,38,0.8), transparent)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', width: '420px', zIndex: 10 }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <img src="/logo.png" alt="Ben&Fit" style={{ width: '160px', height: '160px', objectFit: 'contain', filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.15))' }} />
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '40px', backdropFilter: 'blur(20px)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '32px', color: 'white', letterSpacing: '3px' }}>ESPACE MEMBRE</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>Only Benefit · Since 2021</div>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontWeight: '500' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com" required
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: 'rgba(255,255,255,0.07)', color: 'white', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
              </div>
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontWeight: '500' }}>Mot de passe</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans',sans-serif", background: 'rgba(255,255,255,0.07)', color: 'white', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
              </div>

              {error && <div style={{ background: 'rgba(220,53,69,0.15)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#FF8A8A', marginBottom: '16px' }}>{error}</div>}

              <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? 'rgba(255,255,255,0.1)' : 'white', color: loading ? 'rgba(255,255,255,0.4)' : '#0D1B4E', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif", letterSpacing: '1px', textTransform: 'uppercase', transition: 'all 0.2s' }}>
                {loading ? 'Connexion…' : 'SE CONNECTER'}
              </button>
            </form>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              Pas encore de compte ? Contacte ton coach.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
