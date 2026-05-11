// Générer un numéro de facture unique
export function generateInvoiceNumber() {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `FACT-${year}${month}-${random}`
}

// Calculer les totaux
export function calculateTotals(subtotal, taxRate = 20) {
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount
  return { taxAmount, total }
}

// Formater la date
export function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Formater le prix
export function formatPrice(price) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price)
}
