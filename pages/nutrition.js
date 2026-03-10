function MacroBlock({ log, plan }) {

  const macros = [
    { key:'calories', label:'Calories', unit:'kcal', target:plan?.target_calories, color:'#0D1B4E' },
    { key:'protein', label:'Protéines', unit:'g', target:plan?.target_protein, color:'#C45C3A' },
    { key:'carbs', label:'Glucides', unit:'g', target:plan?.target_carbs, color:'#A07820' },
    { key:'fat', label:'Lipides', unit:'g', target:plan?.target_fat, color:'#5A8A5A' }
  ]

  return (
    <div style={{
      background:'white',
      borderRadius:'14px',
      padding:'24px',
      border:'1px solid #EAEAEA',
      boxShadow:'0 2px 8px rgba(0,0,0,0.06)'
    }}>

      {macros.map(m => {

        const value = log?.[m.key] || 0
        const target = m.target || 0
        const percent = target ? Math.min(100, (value / target) * 100) : 0

        return (

          <div key={m.key} style={{marginBottom:'18px'}}>

            <div style={{
              display:'flex',
              justifyContent:'space-between',
              marginBottom:'6px'
            }}>
              <span style={{fontWeight:'600'}}>{m.label}</span>
              <span>
                {value} / {target} {m.unit}
              </span>
            </div>

            <div style={{
              height:'10px',
              background:'#EEE',
              borderRadius:'6px',
              overflow:'hidden'
            }}>
              <div style={{
                height:'100%',
                width:`${percent}%`,
                background:m.color,
                transition:'0.4s'
              }}/>
            </div>

          </div>
        )
      })}

    </div>
  )
}
