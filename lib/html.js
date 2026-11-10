/**
 * lib/html.js
 * Échappement HTML pour tout texte inséré dans une chaîne HTML construite à la
 * main (export PDF du programme, etc.).
 *
 * SÉCURITÉ (10/11/2026) : l'export PDF de ProgrammeTab injectait le nom du
 * client, les noms d'exercices et les notes tels quels dans une fenêtre
 * ouverte avec window.open + document.write (même origine que l'app). Or un
 * athlète peut modifier son propre nom (page Mensurations) : un nom du type
 * `<img src=x onerror=...>` exécutait du JavaScript dans la session du coach
 * au moment de l'export.
 */
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function escapeHtml(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[&<>"']/g, (c) => ESCAPES[c])
}

/** N'accepte que les data: base64 (image) et les URL http(s), sinon chaîne vide. */
export function safeImageSrc(value) {
  const s = String(value || '')
  if (/^data:(image\/[a-z0-9.+-]+|application\/octet-stream);base64,[A-Za-z0-9+/=]+$/i.test(s)) return s
  if (/^https?:\/\//i.test(s)) return escapeHtml(s)
  return ''
}
