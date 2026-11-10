/**
 * lib/programme/exportPdf.js — export imprimable / PDF d'un programme.
 * Extrait de components/coach/ProgrammeTab.jsx (10/11/2026).
 *
 * Tout texte inséré dans le HTML passe par escapeHtml (un athlète peut
 * modifier son propre nom), et les images par safeImageSrc.
 * Les couleurs sont écrites en dur : la fenêtre d'impression ne connaît pas
 * les variables CSS de l'app (avant, bordures et pastilles n'apparaissaient pas).
 */
import { escapeHtml, safeImageSrc } from '../html'

async function imgToBase64(url) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const r = new FileReader()
      r.onloadend = () => resolve(r.result)
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/** Télécharge les images des exercices en data: URL (pour l'impression). */
export async function loadImageCache(workouts) {
  const imgCache = {}
  const urls = [
    ...new Set(
      workouts
        .flatMap((w) => w.exercises || [])
        .map((e) => e.image_url)
        .filter(Boolean)
    ),
  ]
  await Promise.all(
    urls.map(async (u) => {
      imgCache[u] = await imgToBase64(u)
    })
  )
  return imgCache
}

/** HTML complet du programme (fonction pure, testée). */
export function buildProgrammeHtml({ workouts, clientName, isFuture = false, imgCache = {} }) {
  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
  const workoutBlocks = workouts
    .map((workout) => {
      const exercises = (workout.exercises || [])
        .map((ex) => {
          const imgSrc = ex.image_url ? safeImageSrc(imgCache[ex.image_url]) : ''
          const img = imgSrc
            ? `<img src="${imgSrc}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid #2A2D34;" />`
            : `<div style="width:72px;height:72px;border-radius:8px;background:rgba(255,91,46,0.15);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">💪</div>`
          const details = [
            ex.sets && ex.reps
              ? `<span style="background:rgba(255,91,46,0.15);color:#FF5B2E;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;">${escapeHtml(ex.sets)} × ${escapeHtml(ex.reps)}</span>`
              : '',
            ex.rest
              ? `<span style="border:1px solid rgba(255,91,46,0.45);color:#A9ADB8;padding:2px 8px;border-radius:4px;font-size:12px;">⏱ ${escapeHtml(ex.rest)}</span>`
              : '',
            ex.target_weight
              ? `<span style="border:1px solid rgba(255,91,46,0.45);color:#A9ADB8;padding:2px 8px;border-radius:4px;font-size:12px;">🏋️ ${escapeHtml(ex.target_weight)}</span>`
              : '',
          ]
            .filter(Boolean)
            .join(' ')
          const note = ex.note
            ? `<div style="font-size:11px;color:#A9ADB8;margin-top:4px;font-style:italic;">📋 ${escapeHtml(ex.note)}</div>`
            : ''
          return `<div style="display:flex;gap:14px;align-items:flex-start;padding:12px 0;border-bottom:1px solid rgba(255,91,46,0.35);">${img}<div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:14px;color:#F4F1E9;margin-bottom:4px;">${escapeHtml(ex.name)}</div><div style="display:flex;gap:6px;flex-wrap:wrap;">${details}</div>${note}</div></div>`
        })
        .join('')
      const dayLabel = dayNames[(workout.day_of_week || 1) - 1] || ''
      return `<div style="margin-bottom:28px;background:#1B1D22;border-radius:12px;border:1px solid #2A2D34;overflow:hidden;"><div style="background:#FF5B2E;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;"><div style="color:#16110D;font-weight:700;font-size:16px;">${escapeHtml(workout.name)}</div><div style="color:#16110D;opacity:0.75;font-size:13px;">${dayLabel} · ${escapeHtml(workout.duration_min || 60)} min</div></div><div style="padding:0 18px;">${exercises}</div></div>`
    })
    .join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:24px;background:#121316;color:#F4F1E9;}</style></head><body><div style="text-align:center;margin-bottom:24px;"><h1 style="font-size:22px;color:#F4F1E9;margin:0 0 4px;">${escapeHtml(clientName || 'Programme')}${isFuture ? ' — Cycle futur' : ''}</h1><div style="color:#A9ADB8;font-size:13px;">${workouts.length} séance${workouts.length > 1 ? 's' : ''}</div></div>${workoutBlocks}</body></html>`
}

/** Ouvre la fenêtre d'impression (« Enregistrer en PDF » dans le navigateur). */
export async function printProgramme({ workouts, clientName, isFuture }) {
  const imgCache = await loadImageCache(workouts)
  const html = buildProgrammeHtml({ workouts, clientName, isFuture, imgCache })
  const win = window.open('', '_blank')
  if (!win) throw new Error('fenêtre bloquée par le navigateur (autorise les pop-ups)')
  win.document.write(html)
  win.document.close()
  win.print()
}
