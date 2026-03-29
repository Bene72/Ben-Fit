export default function EmptyPanel({ title, description }) {
  return (
    <div
      style={{
        border: '1px dashed #D4DEED',
        background: '#F8FBFF',
        borderRadius: 20,
        padding: '26px 18px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontWeight: 900, color: '#0D1B4E', fontSize: 18, marginBottom: 8 }}>{title}</div>
      <div style={{ color: '#6B7A99', lineHeight: 1.6, fontSize: 14 }}>{description}</div>
    </div>
  )
}
