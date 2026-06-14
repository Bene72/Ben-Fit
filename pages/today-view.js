import { useState } from "react"

function Ring({ value, target, label, color }) {

  const percent = Math.min(100, (value / target) * 100)
  const radius = 60
  const stroke = 10
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset =
    circumference - (percent / 100) * circumference

  return (

    <div style={{ textAlign: "center" }}>

      <svg height={radius * 2} width={radius * 2}>

        <circle
          stroke="#eee"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />

        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{
            strokeDashoffset,
            transition: "stroke-dashoffset 0.5s"
          }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />

      </svg>

      <div style={{ marginTop: -95, fontWeight: 700 }}>
        {value}
      </div>

      <div style={{ fontSize: 12, color: "#666" }}>
        / {target}
      </div>

      <div style={{ marginTop: 10, fontWeight: 600 }}>
        {label}
      </div>

    </div>
  )
}

export default function TodayView() {

  // EXEMPLE DATA (à remplacer plus tard par ta DB)

  const [data] = useState({

    calories: 1800,
    protein: 140,
    carbs: 180,
    fat: 55

  })

  const targets = {

    calories: 2200,
    protein: 150,
    carbs: 220,
    fat: 70

  }

  return (

    <div
      style={{
        padding: 40,
        fontFamily: "sans-serif"
      }}
    >

      <h1
        style={{
          marginBottom: 40
        }}
      >
        Nutrition du jour
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 40,
          maxWidth: 400
        }}
      >

        <Ring
          value={data.calories}
          target={targets.calories}
          label="Calories"
          color="#0D1B4E"
        />

        <Ring
          value={data.protein}
          target={targets.protein}
          label="Protéines"
          color="#C45C3A"
        />

        <Ring
          value={data.carbs}
          target={targets.carbs}
          label="Glucides"
          color="#A07820"
        />

        <Ring
          value={data.fat}
          target={targets.fat}
          label="Lipides"
          color="#5A8A5A"
        />

      </div>

    </div>

  )
}
