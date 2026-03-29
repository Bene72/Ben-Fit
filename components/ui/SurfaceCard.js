export default function SurfaceCard({ children, padded = true, sticky = false, style = {} }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.9)',
        border: '1px solid #DCE5F3',
        borderRadius: 22,
        boxShadow: '0 10px 30px rgba(13,27,78,0.06)',
        padding: padded ? 18 : 0,
        position: sticky ? 'sticky' : 'relative',
        top: sticky ? 20 : 'auto',
        backdropFilter: 'blur(8px)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
