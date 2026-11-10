/**
 * lib/messageTemplates.js — messages pré-rédigés pour le coach.
 * Le coach peut toujours modifier le texte avant d'envoyer.
 */
const firstName = (name = '') => String(name).trim().split(/\s+/)[0] || ''

export function riskMessage(clientName, reasons = []) {
  const n = firstName(clientName)
  const codes = new Set(reasons.map((r) => r.code))
  const hi = `Salut ${n} !`
  if (codes.has('mood'))
    return `${hi} J'ai vu dans ton bilan que ça va un peu moins bien en ce moment. Tu veux qu'on ajuste le programme cette semaine ? Dis-moi ce qui t'arrangerait 🙂`
  if (codes.has('missed'))
    return `${hi} J'ai vu que les dernières séances ont sauté, pas de souci, ça arrive. Qu'est-ce qui coince en ce moment ? On peut adapter le planning pour que ce soit plus simple à tenir.`
  if (codes.has('bilan'))
    return `${hi} Petit rappel : ton bilan de la semaine dernière n'est pas rempli. Ça me prend 2 minutes à lire et ça m'aide vraiment à ajuster ton programme 💪`
  if (codes.has('nutrition'))
    return `${hi} Je n'ai pas vu ton journal nutrition ces derniers jours. Pas besoin d'être parfait : même les repas principaux m'aident à t'accompagner. On vise 4 jours cette semaine ?`
  return `${hi} Comment ça se passe de ton côté cette semaine ?`
}

export function renewalMessage(clientName, engagement, headline) {
  const n = firstName(clientName)
  const progress = headline ? `\n\nDepuis le début : ${headline}.` : ''
  return `Salut ${n} ! On arrive à la semaine ${engagement.week}/${engagement.length} de ton accompagnement.${progress}\n\nOn se cale un moment pour faire le point et préparer la suite ?`
}
