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
        <title>Ben & Fit — Only Benefit</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0D1B4E 0%, #13286E 60%, #1D4ED8 100%)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.05fr) minmax(360px, 0.95fr)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          style={{
            padding: '48px 44px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '100vh',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <img
                src="/logo-small.png"
                alt="Ben & Fit"
                style={{ width: 62, height: 62, objectFit: 'contain' }}
              />
              <div>
                <div
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 34,
                    letterSpacing: '2px',
                    lineHeight: 1,
                  }}
                >
                  BEN&FIT
                </div>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    opacity: 0.7,
                    marginTop: 4,
                  }}
                >
                  Only Benefit · since 2021
                </div>
              </div>
            </div>

            <div style={{ maxWidth: 560, marginTop: 42 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  marginBottom: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                <span>Coach & Client Platform</span>
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(36px, 6vw, 64px)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.05em',
                  fontWeight: 900,
                }}
              >
                La performance,
                <br />
                sans bruit.
              </h1>

              <p
                style={{
                  marginTop: 22,
                  marginBottom: 0,
                  maxWidth: 520,
                  fontSize: 17,
                  lineHeight: 1.75,
                  opacity: 0.86,
                }}
              >
                Retrouve ton programme, ta nutrition, ton bilan hebdomadaire et tes échanges coach
                dans une interface claire, premium et fidèle à l’identité Ben & Fit.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 14,
              maxWidth: 620,
            }}
          >
            {[
              ['Training', 'Exécution & logs'],
              ['Nutrition', 'Suivi alimentaire'],
              ['Bilan', 'Check-in hebdo'],
            ].map(([title, sub]) => (
              <div
                key={title}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 18,
                  padding: '18px 16px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 13, opacity: 0.74 }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: '#F5F7FB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              width: 'min(460px, 100%)',
              background: 'white',
              border: '1px solid #E6EBF2',
              borderRadius: 26,
              boxShadow: '0 18px 48px rgba(15,23,42,0.10)',
              padding: 30,
            }}
          >
            <div style={{ marginBottom: 22 }}>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  letterSpacing: '-0.04em',
                  color: '#0D1B4E',
                  marginBottom: 6,
                }}
              >
                Connexion
              </div>
              <div style={{ color: '#6B7A99', lineHeight: 1.6 }}>
                Accède à ton espace Ben & Fit.
              </div>
            </div>

            {error ? (
              <div
                style={{
                  marginBottom: 16,
                  background: '#FEF2F2',
                  color: '#DC2626',
                  border: '1px solid #FCA5A5',
                  borderRadius: 16,
                  padding: 14,
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            ) : null}

            {loadingSession ? (
              <div style={{ color: '#6B7A99' }}>Vérification de la session…</div>
            ) : (
              <form onSubmit={signIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontWeight: 800,
                      color: '#6B7A99',
                      fontSize: 12,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="ton@email.com"
                    style={{
                      width: '100%',
                      minHeight: 50,
                      borderRadius: 14,
                      border: '1.5px solid #D8E1F0',
                      padding: '0 14px',
                      fontSize: 15,
                      outline: 'none',
                      color: '#0D1B4E',
                      background: '#FBFCFF',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontWeight: 800,
                      color: '#6B7A99',
                      fontSize: 12,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      minHeight: 50,
                      borderRadius: 14,
                      border: '1.5px solid #D8E1F0',
                      padding: '0 14px',
                      fontSize: 15,
                      outline: 'none',
                      color: '#0D1B4E',
                      background: '#FBFCFF',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    minHeight: 50,
                    border: 'none',
                    borderRadius: 14,
                    background: '#0D1B4E',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: 'pointer',
                    marginTop: 6,
                    boxShadow: '0 12px 24px rgba(13,27,78,0.18)',
                  }}
                >
                  {submitting ? 'Connexion…' : 'Se connecter'}
                </button>
              </form>
            )}
          </div>
        </div>

        <style jsx>{`
          @media (max-width: 960px) {
            div[style*="grid-template-columns: 'minmax(0, 1.05fr) minmax(360px, 0.95fr)'"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </>
  )
}
