/**
 * lib/dialogs.js — messages d'erreur et confirmations de l'app.
 *
 * Remplace les fenêtres natives du navigateur (alert / confirm), peu lisibles
 * sur téléphone et bloquantes. Le rendu est fait par <DialogHost /> (monté une
 * fois dans pages/_app.js). Si aucun hôte n'est monté (tests, rendu isolé),
 * on retombe sur les fenêtres natives pour ne jamais perdre un message.
 *
 *   notifyError("Le bilan n'a pas pu être enregistré")
 *   if (!(await confirmDialog('Supprimer cette séance ?', { danger: true }))) return
 */
let host = null

export function registerDialogHost(h) {
  host = h
  return () => {
    if (host === h) host = null
  }
}

export function notify(message, type = 'info') {
  if (host) host.toast(String(message), type)
  else if (typeof window !== 'undefined') window.alert(String(message))
}

export const notifyError = (message) => notify(message, 'error')
export const notifySuccess = (message) => notify(message, 'success')

export function confirmDialog(
  message,
  { confirmLabel = 'Confirmer', cancelLabel = 'Annuler', danger = false } = {}
) {
  if (host) return host.confirm({ message: String(message), confirmLabel, cancelLabel, danger })
  return Promise.resolve(typeof window !== 'undefined' ? window.confirm(String(message)) : false)
}
