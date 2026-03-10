function TodayView({ today, logs, plan }) {

  const log = logs.find(l => l.date === today)

  return (
    <div>

      <h2 style={{marginBottom:'20px'}}>
        {new Date(today).toLocaleDateString('fr-FR',{
          weekday:'long',
          day:'numeric',
          month:'long'
        })}
      </h2>

      <MacroBlock
        log={log}
        plan={plan}
      />

    </div>
  )
}
