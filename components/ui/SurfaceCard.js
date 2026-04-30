import { useEffect, useState } from 'react'

export default function SurfaceCard({ children, padded = true, sticky = false, style = {} }) {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 980)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.9)',
        border: '1px solid #DCE5F3',
        borderRadius: isMobile ? 14 : 22,
        boxShadow: '0 10px 30px rgba(13,27,78,0.06)',
        // Sur mobile : padding à 0 si padded est vrai, sinon 4px
        padding: padded ? (isMobile ? 0 : 18) : 0, 
        position: sticky ? 'sticky' : 'relative',
        top: sticky ? (isMobile ? 8 : 20) : 'auto',
        backdropFilter: 'blur(8px)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}