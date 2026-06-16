/**
 * useBreakpoint — hook unique de détection mobile
 * Remplace window.innerWidth < 980 dupliqué dans AppShell, SurfaceCard, AppNav, dashboard, training, coach
 *
 * Usage :
 *   const isMobile = useBreakpoint()
 *   const isMobile = useBreakpoint(768) // breakpoint custom
 */
import { useEffect, useState } from 'react'

export function useBreakpoint(maxWidth = 980) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < maxWidth)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [maxWidth])

  return isMobile
}
