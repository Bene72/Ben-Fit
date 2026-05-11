import { formatPrice, formatDate } from '../../lib/invoiceUtils'

export default function InvoicePDF({ invoice, coachInfo, clientInfo, items }) {
  const invoiceNumber = invoice.invoice_number
  const date = formatDate(invoice.date)
  const dueDate = formatDate(invoice.due_date)
  
  return (
    <div style={{ 
      width: '210mm', 
      minHeight: '297mm', 
      padding: '20mm 15mm', 
      background: 'white', 
      fontFamily: "'DM Sans', 'Helvetica', 'Arial', sans-serif",
      fontSize: '10pt',
      color: '#1a1a2e',
      margin: '0 auto'
    }}>
      {/* Style pour l'impression */}
      <style>
        {`
          @media print {
            body { margin: 0; padding: 0; }
            .page-break { page-break-before: always; }
          }
        `}
      </style>

      {/* HEADER - Logo + Titre */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', borderBottom: '2px solid #0D1B4E', paddingBottom: '15px' }}>
        <div>
          <h1 style={{ 
            fontFamily: "'Bebas Neue', 'DM Sans', sans-serif", 
            fontSize: '28pt', 
            fontWeight: 'bold', 
            color: '#0D1B4E', 
            margin: 0,
            letterSpacing: '2px'
          }}>
            BEN&FITNESS
          </h1>
          <p style={{ fontSize: '9pt', color: '#6B7A99', margin: '5px 0 0 0' }}>
            Only Benefit · since 2021
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ 
            fontFamily: "'Bebas Neue', sans-serif", 
            fontSize: '22pt', 
            fontWeight: 'bold', 
            color: '#0D1B4E', 
            margin: 0,
            letterSpacing: '3px'
          }}>
            FACTURE
          </h2>
          <p style={{ fontSize: '11pt', fontWeight: 'bold', margin: '5px 0 0 0' }}>
            N° {invoiceNumber}
          </p>
        </div>
      </div>

      {/* INFOS ÉMETTEUR + DESTINATAIRE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px', marginBottom: '30px' }}>
        {/* Émetteur (coach) */}
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
        
        {/* Destinataire (client) */}
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 'bold', marginBottom: '5px', color: '#0D1B4E' }}>Destinataire</p>
          <div style={{ fontSize: '9pt', lineHeight: '1.5', color: '#333' }}>
            <div><strong>{clientInfo?.company_name || clientInfo?.full_name || 'Client'}</strong></div>
            {clientInfo?.company_name && <div>{clientInfo?.full_name}</div>}
            <div>{clientInfo?.address || ''}</div>
            <div>{clientInfo?.postal_code ? `${clientInfo.postal_code} ${clientInfo.city || ''}` : ''}</div>
            <div>{clientInfo?.vat_number ? `TVA : ${clientInfo.vat_number}` : ''}</div>
          </div>
        </div>
        
        {/* Infos facture */}
        <div style={{ flex: 1, textAlign: 'right' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '5px', color: '#0D1B4E' }}>Détails facture</p>
          <div style={{ fontSize: '9pt', lineHeight: '1.5', color: '#333' }}>
            <div>Date : {date}</div>
            <div>Échéance : {dueDate}</div>
            <div>Mode : Virement</div>
          </div>
        </div>
      </div>

      {/* DESCRIPTION - comme dans le PDF */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontWeight: 'bold', marginBottom: '10px', color: '#0D1B4E' }}>DESCRIPTION :</p>
        <div style={{ 
          background: '#F8FAFF', 
          padding: '12px 15px', 
          borderRadius: '8px', 
          fontSize: '10pt', 
          fontStyle: 'italic',
          color: '#555'
        }}>
          {invoice.notes || 'Prestations pour l\'animation d\'heures de coaching'}
        </div>
      </div>

      {/* TABLEAU DES PRESTATIONS */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: '#0D1B4E', color: 'white' }}>
            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Désignation</th>
            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Unité</th>
            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Quantité</th>
            <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Prix Unitaire HT</th>
            <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Total HT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px' }}>{item.description}</td>
              <td style={{ padding: '10px', textAlign: 'center' }}>Heure</td>
              <td style={{ padding: '10px', textAlign: 'center' }}>{item.quantity}</td>
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
            <span><strong>{formatPrice(invoice.subtotal)}</strong></span>
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
      <div style={{ 
        background: '#F0F4FF', 
        padding: '15px', 
        borderRadius: '10px', 
        marginTop: '20px',
        fontSize: '9pt'
      }}>
        <p style={{ fontWeight: 'bold', marginBottom: '10px', color: '#0D1B4E' }}>MOYENS DE PAIEMENT :</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <div>Montant total net de TVA : <strong>{formatPrice(invoice.total)}</strong></div>
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
      <div style={{ 
        marginTop: '30px', 
        paddingTop: '15px', 
        borderTop: '1px solid #ddd', 
        textAlign: 'center', 
        fontSize: '8pt', 
        color: '#9BA8C0' 
      }}>
        BEN&FITNESS · Only Benefit · SIRET 91947704200015 · 27 Rue de Coulmiers 44000 Nantes
      </div>
    </div>
  )
}
