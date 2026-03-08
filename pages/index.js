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

    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    // Check if coach or client
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'coach') {
      router.push('/coach')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <>
      <Head>
        <title>Le Pavillon — Connexion</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <div style={{
        minHeight: '100vh',
        background: '#1A1A14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif"
      }}>
        {/* Background texture */}
        <div style={{
          position: 'fixed', inset: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(74,82,64,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(200,168,90,0.1) 0%, transparent 40%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          background: '#FDFAF4',
          borderRadius: '20px',
          padding: '48px 44px',
          width: '420px',
          position: 'relative',
          boxShadow: '0 40px 80px rgba(0,0,0,0.4)'
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '30px',
              fontWeight: '700',
              color: '#1A1A14',
              lineHeight: 1.1
            }}>Le Pavillon</div>
            <div style={{
              fontSize: '11px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: '#7A7A6A',
              marginTop: '6px'
            }}>Ben & Fitness · Coaching</div>
            <div style={{
              width: '40px', height: '2px',
              background: '#C8A85A',
              margin: '16px auto 0'
            }} />
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '11px',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: '#7A7A6A',
                marginBottom: '8px',
                fontWeight: '500'
              }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ton@email.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid #E0D9CC',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontFamily: "'DM Sans', sans-serif",
                  background: 'white',
                  color: '#1A1A14',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#4A5240'}
                onBlur={e => e.target.style.borderColor = '#E0D9CC'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '11px',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: '#7A7A6A',
                marginBottom: '8px',
                fontWeight: '500'
              }}>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid #E0D9CC',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontFamily: "'DM Sans', sans-serif",
                  background: 'white',
                  color: '#1A1A14',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#4A5240'}
                onBlur={e => e.target.style.borderColor = '#E0D9CC'}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(196,92,58,0.1)',
                border: '1px solid rgba(196,92,58,0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                color: '#C45C3A',
                marginBottom: '16px'
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                background: loading ? '#8FA07A' : '#4A5240',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'background 0.2s',
                letterSpacing: '0.5px'
              }}
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <div style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#7A7A6A'
          }}>
            Pas encore de compte ? Contacte ton coach.
          </div>
        </div>
      </div>
    </>
  )
}
