import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function HomePage() {
  const router = useRouter()
  const [loadingSession, setLoadingSession] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '' })

  useEffect(() => {
    let active = true

    async function boot() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user

      if (!user) {
        if (active) setLoadingSession(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (!active) return

      if (profile?.role === 'coach') router.replace('/coach')
      else router.replace('/dashboard')
    }

    boot()
    return () => {
      active = false
    }
  }, [router])

  async function signIn(e) {
    e.preventDefault()
    try {
      setSubmitting(true)
      setError('')

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })

      if (signInError) throw signInError

      const user = data?.user
      if (!user) throw new Error('Connexion impossible')

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role === 'coach') router.push('/coach')
      else router.push('/dashboard')
    } catch (e) {
      setError(e.message || 'Impossible de se connecter')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Head>
        <title>Connexion · Ben & Fit</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #f5f7fb 0%, #eef3ff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <div
          style={{
            width: 'min(480px, 100%)',
            background: 'white',
            border: '1px solid #e6ebf2',
            borderRadius: 22,
            boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
            padding: 28,
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.04em', color: '#0f172a' }}>
              Ben & Fit
            </div>
            <div style={{ color: '#64748b', marginTop: 8, lineHeight: 1.6 }}>
              Connecte-toi pour accéder directement à ton vrai espace d’accueil.
            </div>
          </div>

          {error ? (
            <div
              style={{
                marginBottom: 16,
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fca5a5',
                borderRadius: 16,
                padding: 14,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          ) : null}

          {loadingSession ? (
            <div style={{ color: '#64748b' }}>Vérification de la session…</div>
          ) : (
            <form onSubmit={signIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 800, color: '#64748b', fontSize: 13 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="ton@email.com"
                  style={{
                    width: '100%',
                    minHeight: 48,
                    borderRadius: 14,
                    border: '1px solid #e6ebf2',
                    padding: '0 14px',
                    fontSize: 15,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 800, color: '#64748b', fontSize: 13 }}>
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    minHeight: 48,
                    borderRadius: 14,
                    border: '1px solid #e6ebf2',
                    padding: '0 14px',
                    fontSize: 15,
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  minHeight: 48,
                  border: 'none',
                  borderRadius: 14,
                  background: '#2563eb',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: 'pointer',
                  marginTop: 6,
                }}
              >
                {submitting ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
