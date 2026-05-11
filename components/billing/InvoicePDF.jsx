import { formatPrice, formatDate } from '../../lib/invoiceUtils'

export default function InvoicePDF({ invoice, coachInfo, clientInfo, items }) {
  const invoiceNumber = invoice.invoice_number
  const date = formatDate(invoice.date)
  const dueDate = formatDate(invoice.due_date)
  
  return (
    <div id="invoice-content" style={{ 
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      background: 'white',
      fontFamily: "'DM Sans', 'Helvetica', 'Arial', sans-serif",
      fontSize: '10pt',
      color: '#1a1a2e'
    }}>
      {/* HEADER avec logo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #0D1B4E', paddingBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src="/logo-small.png" alt="Ben&Fit" style={{ height: '50px', width: 'auto' }} />
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24pt', fontWeight: 'bold', color: '#0D1B4E', margin: 0, letterSpacing: '2px' }}>
              BEN&FITNESS
            </h1>
            <p style={{ fontSize: '9pt', color: '#6B7A99', margin: '5px 0 0 0' }}>
              Only Benefit · since 2021
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20pt', fontWeight: 'bold', color: '#0D1B4E', margin: 0, letterSpacing: '3px' }}>
            FACTURE
          </h2>
          <p style={{ fontSize: '11pt', fontWeight: 'bold', margin: '5px 0 0 0' }}>
            N° {invoiceNumber}
          </p>
        </div>
      </div>

      {/* INFOS ÉMETTEUR + DESTINATAIRE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px', marginBottom: '30px' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 'bold', marginBottom: '5px', color: '#0D1B4E' }}>Émetteur</p>
          <div style={{ fontSize: '9pt', lineHeight: '1.5', color: '#333' }}>
            <div><strong>BEN&FITNESS</strong></div>
            <div>SIRET : {coachInfo?.siret || '91947704200015'}</div>
            <div>{coachInfo?.address || '27 Rue de Coulmiers'}</div>
            <div>{coachInfo?.postal_code || '44000'} {coachInfo?.city || 'Nantes'}</div>
            <div>Tél : 0666911840</div>
            <div>Mail : benoit.buon.lms@gmail.com</div>
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 'bold', marginBottom: '5px', color: '#0D1B4E' }}>Destinataire</p>
          <div style={{ fontSize: '9pt', lineHeight: '1.5', color: '#333' }}>
            <div><strong>{clientInfo?.profiles?.full_name || 'Client'}</strong></div>
          </div>
        </div>
        
        <div style={{ flex: 1, textAlign: 'right' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '5px', color: '#0D1B4E' }}>Détails facture</p>
          <div style={{ fontSize: '9pt', lineHeight: '1.5', color: '#333' }}>
            <div>Date : {date}</div>
            <div>Échéance : {dueDate}</div>
            <div>Mode : Virement</div>
          </div>
        </div>
      </div>

      {/* TABLEAU DES PRESTATIONS */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: '#0D1B4E', color: 'white' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>Désignation</th>
            <th style={{ padding: '10px', textAlign: 'center' }}>Quantité</th>
            <th style={{ padding: '10px', textAlign: 'right' }}>Prix Unitaire HT</th>
            <th style={{ padding: '10px', textAlign: 'right' }}>Total HT</th>
           </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px' }}>{item.description}</td>
              <td style={{ padding: '10px', textAlign: 'center' }}>{item.quantity} h</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>{formatPrice(item.unit_price)}</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>{formatPrice(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TOTAUX */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <div style={{ width: '250px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
            <span>Total HT</span>
            <strong>{formatPrice(invoice.subtotal)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #ddd' }}>
            <span>TVA ({invoice.tax_rate}%)</span>
            <span>{formatPrice(invoice.tax_amount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '14pt', fontWeight: 'bold' }}>
            <span>Total TTC</span>
            <span style={{ color: '#0D1B4E' }}>{formatPrice(invoice.total)}</span>
          </div>
        </div>
      </div>

      {/* MENTION TVA */}
      <div style={{ fontSize: '9pt', fontStyle: 'italic', color: '#6B7A99', textAlign: 'center', marginBottom: '20px' }}>
        TVA non applicable, art. 293 B du CGI
      </div>

      {/* MOYENS DE PAIEMENT */}
      <div style={{ background: '#F0F4FF', padding: '15px', borderRadius: '10px', marginTop: '20px', fontSize: '9pt' }}>
        <p style={{ fontWeight: 'bold', marginBottom: '10px', color: '#0D1B4E' }}>MOYENS DE PAIEMENT :</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <div>Montant total : <strong>{formatPrice(invoice.total)}</strong></div>
            <div>• Mode de paiement : virement</div>
            <div>• Règlement : 30j à réception</div>
          </div>
          <div>
            <div>• RIB : {coachInfo?.iban || 'FR76 17906 00112 00060490772 82'}</div>
            <div>• BIC : {coachInfo?.bic || 'AGRIFRPP879'}</div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ marginTop: '30px', paddingTop: '15px', borderTop: '1px solid #ddd', textAlign: 'center', fontSize: '8pt', color: '#9BA8C0' }}>
        BEN&FITNESS · Only Benefit · SIRET 91947704200015 · 27 Rue de Coulmiers 44000 Nantes
      </div>
    </div>
  )
}
