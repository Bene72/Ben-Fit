/**
 * lib/messageTemplates.js — messages pré-rédigés pour le coach.
 * Le coach peut toujours modifier le texte avant d'envoyer.
 */
const firstName = (name = '') => String(name).trim().split(/\s+/)[0] || ''

export function renewalMessage(clientName, engagement, headline) {
  const n = firstName(clientName)
  const end = new Date(`${engagement.endDate}T12:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  })
  const when = engagement.ended
    ? `Ton accompagnement s'est terminé le ${end}.`
    : `Ton accompagnement se termine le ${end}.`
  const progress = headline ? `\n\nDepuis le début : ${headline}.` : ''
  return `Salut ${n} ! ${when}${progress}\n\nOn se cale un moment pour faire le point et préparer la suite ?`
}
