import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import AppNav from './AppNav'

export default function Layout({ title = 'Ben & Fit', user, children }) {
  const router = useRouter()
  const [profile, setProfile] = useState(null)

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
          padding: '24px 20px 100px',
          marginLeft: typeof window !== 'undefined' && window.innerWidth > 980 ? 250 : 0,
        }}
      >
        <div style={{ width: 'min(1440px, 100%)', margin: '0 auto' }}>{children}</div>
      </main>
    </>
  )
}
