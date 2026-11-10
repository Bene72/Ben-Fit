/**
 * lib/shareCycle.js — image "Bilan de cycle" (1080×1350, format Instagram)
 * générée dans le navigateur, puis partagée (menu natif du téléphone) ou
 * téléchargée si le partage de fichiers n'est pas disponible.
 * Aucune donnée n'est envoyée à un serveur.
 */
import { fmt } from './insights'

const W = 1080
const H = 1350

const fmtDay = (d) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

export async function renderCycleImage({ report, firstName }) {
  if (document.fonts?.load) {
    await Promise.all([
      document.fonts.load('120px "Bebas Neue"').catch(() => {}),
      document.fonts.load('600 36px "DM Sans"').catch(() => {}),
    ])
  }
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const display = '"Bebas Neue", Impact, sans-serif'
  const body = '"DM Sans", Inter, system-ui, sans-serif'

  // Fond
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#0d1b4e')
  g.addColorStop(1, '#081230')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#e8c84a'
  ctx.fillRect(90, 120, 90, 8)

  ctx.fillStyle = '#ffffff'
  ctx.font = `600 36px ${body}`
  ctx.fillText('BEN&FIT', 90, 200)
  ctx.fillStyle = '#c7cff0'
  ctx.font = `400 34px ${body}`
  const range = `${fmtDay(String(report.cycle.start_date).slice(0, 10))} → ${fmtDay(report.cycle.end)}`
  ctx.fillText(range, 90, 255)

  ctx.fillStyle = '#ffffff'
  ctx.font = `140px ${display}`
  ctx.fillText('BILAN DE CYCLE', 90, 420)
  if (report.cycle.name) {
    ctx.fillStyle = '#e8c84a'
    ctx.font = `72px ${display}`
    ctx.fillText(String(report.cycle.name).toUpperCase().slice(0, 28), 90, 505)
  }

  // Lignes de stats
  const rows = []
  for (const gain of report.gains || []) rows.push([`+${fmt(gain.delta)} KG`, gain.exercise])
  if (report.adherence !== null && report.adherence !== undefined)
    rows.push([`${report.adherence} %`, 'des séances faites'])
  if (report.weightChange)
    rows.push([
      `${report.weightChange > 0 ? '+' : ''}${fmt(report.weightChange)} KG`,
      'sur la balance',
    ])

  let y = 680
  for (const [big, label] of rows.slice(0, 5)) {
    ctx.fillStyle = '#e8c84a'
    ctx.font = `120px ${display}`
    ctx.fillText(big, 90, y)
    const bw = ctx.measureText(big).width
    ctx.fillStyle = '#ffffff'
    ctx.font = `500 40px ${body}`
    ctx.fillText(String(label).slice(0, 32), 90 + bw + 30, y - 12)
    y += 140
  }

  ctx.fillStyle = 'rgba(255,255,255,.55)'
  ctx.font = `400 32px ${body}`
  ctx.fillText(firstName ? `${firstName} · coaching Ben&Fit` : 'Coaching Ben&Fit', 90, H - 90)

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

/** Partage l'image ; renvoie 'shared' ou 'downloaded'. */
export async function shareCycleImage({ report, firstName }) {
  const blob = await renderCycleImage({ report, firstName })
  const file = new File([blob], 'bilan-cycle-benfit.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Mon bilan de cycle' })
    return 'shared'
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return 'downloaded'
}
