// ─── Export PDF / HTML programme ─────────────────────────────
// Usage : await exportProgramPDF(workouts, clientName)

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

async function imgToBase64(url) {
  try {
    const res  = await fetch(url)
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

export async function exportProgramPDF(workouts, clientName) {
  // 1. Précharger les images
  const allExercises = workouts.flatMap(w => w.exercises || [])
  const imgCache = {}
  await Promise.all(
    allExercises
      .filter(e => e.image_url)
      .map(async (e) => {
        if (!imgCache[e.image_url]) imgCache[e.image_url] = await imgToBase64(e.image_url)
      })
  )

  // 2. Construire les blocs séances
  const workoutBlocks = workouts.map(workout => {
    const dayLabel = DAY_NAMES[(workout.day_of_week || 1) - 1] || ''
    const tag = workout.type
      ? `<span style="background:#EEF2FF;color:#4A6FD4;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:700;">${workout.type}</span>`
      : ''

    const exercises = (workout.exercises || []).map((ex, idx) => {
      const img = ex.image_url && imgCache[ex.image_url]
        ? `<img src="${imgCache[ex.image_url]}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid #e0e6f0;" />`
        : `<div style="width:72px;height:72px;border-radius:8px;background:#EEF2FF;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">💪</div>`

      const badges = [
        ex.sets && ex.reps ? `<span class="badge">${ex.sets} × ${ex.reps}</span>` : '',
        ex.rest ? `<span class="badge-outline">⏱ ${ex.rest}</span>` : '',
        ex.target_weight ? `<span class="badge-outline">🏋️ ${ex.target_weight}</span>` : '',
      ].filter(Boolean).join(' ')

      return `
        <div style="display:flex;gap:14px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #F0F4FF;">
          ${img}
          <div style="flex:1;min-width:0;">
            <div style="font-weight:800;font-size:14px;color:#0D1B4E;margin-bottom:5px;">${idx + 1}. ${ex.name || '—'}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">${badges}</div>
            ${ex.note ? `<div style="font-size:12px;color:#6B7A99;background:#F8FAFF;border-left:3px solid #4A6FD4;padding:6px 10px;border-radius:0 6px 6px 0;line-height:1.5;">${ex.note}</div>` : ''}
          </div>
        </div>`
    }).join('')

    return `
      <div class="workout-block" style="page-break-inside:avoid;margin-bottom:28px;background:white;border-radius:14px;border:1px solid #E0E6F5;overflow:hidden;box-shadow:0 2px 8px rgba(13,27,78,0.06);">
        <div style="background:linear-gradient(135deg,#0D1B4E,#2C4A9E);padding:14px 20px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:2px;">${dayLabel}</div>
            <div style="font-size:18px;font-weight:900;color:white;">${workout.name}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:3px;">${(workout.exercises || []).length} exercices${workout.duration_min ? ' · ' + workout.duration_min + ' min' : ''}</div>
          </div>
          ${tag}
        </div>
        <div style="padding:4px 20px 8px;">${exercises}</div>
      </div>`
  }).join('')

  // 3. Calendrier 7 jours
  const calGrid = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((d, i) => {
    const w = workouts.find(x => x.day_of_week === i + 1)
    return `<div style="background:${w ? '#0D1B4E' : '#F0F4FF'};border-radius:8px;padding:8px 4px;text-align:center;">
      <div style="font-size:9px;text-transform:uppercase;color:${w ? 'rgba(255,255,255,0.5)' : '#9BA8C0'};letter-spacing:1px;">${d}</div>
      <div style="font-size:10px;font-weight:700;color:${w ? 'white' : '#C5D0F0'};margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${w ? (w.name.length > 10 ? w.name.substring(0, 10) + '…' : w.name) : '—'}</div>
    </div>`
  }).join('')

  const exportDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // 4. HTML final
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Programme — ${clientName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', -apple-system, sans-serif; background: #F5F7FF; color: #0D1B4E; }
    .page { max-width: 800px; margin: 0 auto; padding: 32px 28px; }
    .badge { display:inline-block; background:#0D1B4E; color:white; border-radius:20px; padding:3px 11px; font-size:12px; font-weight:800; }
    .badge-outline { display:inline-block; background:#EEF2FF; color:#4A6FD4; border-radius:20px; padding:3px 11px; font-size:12px; font-weight:700; }
    @media print {
      body { background: white; }
      .page { padding: 16px; }
      .workout-block { page-break-inside: avoid; }
      @page { margin: 1.5cm; size: A4; }
    }
  </style>
</head>
<body>
<div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #E0E6F5;">
    <div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#9BA8C0;margin-bottom:4px;">Programme d'entraînement</div>
      <div style="font-size:32px;font-weight:900;color:#0D1B4E;line-height:1;">${clientName}</div>
      <div style="font-size:13px;color:#6B7A99;margin-top:6px;">Exporté le ${exportDate} · ${workouts.length} séance${workouts.length > 1 ? 's' : ''}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:22px;font-weight:900;color:#0D1B4E;letter-spacing:1px;">BEN&FIT</div>
      <div style="font-size:9px;color:#9BA8C0;letter-spacing:2px;text-transform:uppercase;">Only Benefit · since 2021</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:28px;">${calGrid}</div>

  ${workoutBlocks}

  <div style="margin-top:24px;padding-top:16px;border-top:1px solid #E0E6F5;text-align:center;font-size:11px;color:#C5D0F0;">
    BEN&FIT Coach · Programme confidentiel · ${clientName}
  </div>
</div>
<script>window.onload = () => { window.print() }</script>
</body>
</html>`

  // 5. Ouvrir dans un nouvel onglet → print dialog
  const blob = new Blob([html], { type: 'text/html' })
  const url  = URL.createObjectURL(blob)
  const win  = window.open(url, '_blank')
  if (!win) alert('Autorise les popups pour télécharger le PDF')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
