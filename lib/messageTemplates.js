/**
 * lib/messageTemplates.js — messages pré-rédigés pour le coach.
 * Le coach peut toujours modifier le texte avant d'envoyer.
 */
const firstName = (name = '') => String(name).trim().split(/\s+/)[0] || ''

export function renewalMessage(clientName, engagement, headline) {
  const n = firstName(clientName)
  const progress = headline ? `\n\nDepuis le début : ${headline}.` : ''
  return `Salut ${n} ! On arrive à la semaine ${engagement.week}/${engagement.length} de ton accompagnement.${progress}\n\nOn se cale un moment pour faire le point et préparer la suite ?`
}
