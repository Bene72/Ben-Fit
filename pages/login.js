// pages/login.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Si déjà connecté, rediriger vers le dashboard
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user) {
        // Vérifier le rôle pour rediriger correctement
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.session.user.id)
          .single()
        
        if (profile?.role === 'coach') {
          router.push('/coach')
        } else {
          router.push('/dashboard')
        }
      }
    }
    checkSession()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Récupérer le rôle de l'utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      // Rediriger selon le rôle
      if (profile?.role === 'coach') {
        router.push('/coach')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F8FAFF',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(13,27,78,0.12)',
        maxWidth: '400px',
        width: '100%',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '36px',
            color: '#0D1B4E',
            letterSpacing: '2px',
            margin: 0,
          }}>
            BEN&FIT
          </h1>
          <p style={{ color: '#6B7A99', fontSize: '14px', marginTop: '4px' }}>
            Connecte-toi à ton espace
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#0D1B4E',
              marginBottom: '4px',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@email.com"
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1.5px solid #E8E4DC',
                borderRadius: '10px',
                fontSize: '14px',
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#2C64E5'}
              onBlur={(e) => e.target.style.borderColor = '#E8E4DC'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#0D1B4E',
              marginBottom: '4px',
            }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1.5px solid #E8E4DC',
                borderRadius: '10px',
                fontSize: '14px',
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#2C64E5'}
              onBlur={(e) => e.target.style.borderColor = '#E8E4DC'}
            />
          </div>

          {error && (
            <div style={{
              background: '#FFF5F5',
              border: '1px solid #FECACA',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#C45C3A',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#0D1B4E',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: loading ? 'default' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = '#09123A'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = '#0D1B4E'
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
