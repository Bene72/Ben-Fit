import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import AppNav from './AppNav'

export default function Layout({ title = 'Ben & Fit', user, children }) {
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
      const authUser = user || (await supabase.auth.getUser()).data?.user
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
  }, [user, router.pathname])

  return (
    <>
      <Head>
        <title>{title} · Ben & Fit</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <AppNav profile={profile} />

      <main
        style={{
          marginLeft: isMobile ? 0 : 250,
          paddingTop: isMobile ? 88 : 24,
          paddingBottom: isMobile ? 96 : 32,
          paddingLeft: isMobile ? 12 : 20,
          paddingRight: isMobile ? 12 : 20,
        }}
      >
        <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 1280, margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </>
  )
}
