export default function EmptyPanel({ title, description }) {
  return (
    <div style={{ 
      border: '1px dashed #D4DEED', 
      background: '#F8FBFF', 
      borderRadius: 12, 
      padding: '16px 14px', 
      textAlign: 'center' 
    }}>
      <div style={{ fontWeight: 900, color: '#0D1B4E', fontSize: 14, marginBottom: 6 }}>{title}</div>
      <div style={{ color: '#6B7A99', lineHeight: 1.5, fontSize: 12 }}>{description}</div>
    </div>
  )
}
