export default function SectionHead({ title, caption, action }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start', 
      gap: 10, 
      marginBottom: 10 
    }}>
      <div>
        <div style={{ 
          fontWeight: 900, 
          color: '#0D1B4E', 
          fontSize: 13, 
          lineHeight: 1.2, 
          marginBottom: caption ? 4 : 0 
        }}>
          {title}
        </div>
        {caption ? (
          <div style={{ color: '#6B7A99', fontSize: 11, lineHeight: 1.5 }}>{caption}</div>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}
