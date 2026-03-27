import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import AppNav from '../AppNav'

export default function AppShell({ title, subtitle, actions, children }) {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 980)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    let active = true

    async function loadProfile() {
      const { data: authData } = await supabase.auth.getUser()
      const authUser = authData?.user
      if (!authUser) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (!active) return
      setProfile(data || null)
    }

    loadProfile()
    return () => {
      active = false
    }
  }, [router.pathname])

  return (
    <>
      <Head>
        <title>{title ? `${title} · Ben & Fit` : 'Ben & Fit'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <AppNav profile={profile} />

      <div
        className="ui-page"
        style={{
          marginLeft: isMobile ? 0 : 250,
          paddingTop: isMobile ? 88 : 24,
          paddingBottom: isMobile ? 96 : 32,
          paddingLeft: isMobile ? 12 : 20,
          paddingRight: isMobile ? 12 : 20,
        }}
      >
        <div className="ui-container" style={{ width: isMobile ? '100%' : 'min(1440px, calc(100vw - 320px))' }}>
          {(title || subtitle || actions) && (
            <header
              className="ui-page-header"
              style={{
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'flex-start',
              }}
            >
              <div>
                {title ? <h1 className="ui-page-title">{title}</h1> : null}
                {subtitle ? <p className="ui-page-subtitle">{subtitle}</p> : null}
              </div>
              {actions ? <div className="ui-cluster" style={{ justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>{actions}</div> : null}
            </header>
          )}
          {children}
        </div>
      </div>
    </>
  )
}
