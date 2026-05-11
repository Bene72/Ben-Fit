import { useState } from 'react'

const lbl = {
  display: 'block', fontSize: '11px', letterSpacing: '1.5px',
  textTransform: 'uppercase', color: '#6B7A99', marginBottom: '5px', fontWeight: '500',
}

const inp = {
  width: '100%', padding: '7px 10px', border: '1.5px solid #C5D0F0',
  borderRadius: '7px', fontSize: '13px', fontFamily: "'DM Sans',sans-serif",
  background: 'white', outline: 'none', color: '#0D1B4E',
}

const btn = (bg, color, border) => ({
  padding: '7px 14px', background: bg, color,
  border: border ? `1.5px solid ${border}` : 'none',
  borderRadius: '8px', fontSize: '13px', fontWeight: '600',
  cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
})

export default function CoachBillingSettings({ coachInfo, onSave }) {
  const [form, setForm] = useState({
    company_name: coachInfo?.company_name || '',
    address: coachInfo?.address || '',
    city: coachInfo?.city || '',
    postal_code: coachInfo?.postal_code || '',
    country: coachInfo?.country || 'France',
    siret: coachInfo?.siret || '',
    vat_number: coachInfo?.vat_number || '',
    iban: coachInfo?.iban || '',
    bic: coachInfo?.bic || ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🏢 Mes informations professionnelles</h3>
      <p style={{ fontSize: 13, color: '#6B7A99', marginBottom: 20 }}>
        Ces informations apparaîtront sur vos factures.
      </p>
      
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <label style={lbl}>Nom de l'entreprise</label>
          <input 
            value={form.company_name} 
            onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
            placeholder="BEN&FITNESS"
            style={inp} 
          />
        </div>
        
        <div>
          <label style={lbl}>Adresse</label>
          <input 
            value={form.address} 
            onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
            placeholder="27 Rue de Coulmiers"
            style={inp} 
          />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <div>
            <label style={lbl}>Code postal</label>
            <input 
              value={form.postal_code} 
              onChange={e => setForm(p => ({ ...p, postal_code: e.target.value }))}
              placeholder="44000"
              style={inp} 
            />
          </div>
          <div>
            <label style={lbl}>Ville</label>
            <input 
              value={form.city} 
              onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
              placeholder="Nantes"
              style={inp} 
            />
          </div>
        </div>
        
        <div>
          <label style={lbl}>Pays</label>
          <input 
            value={form.country} 
            onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
            placeholder="France"
            style={inp} 
          />
        </div>
        
        <div>
          <label style={lbl}>Numéro SIRET</label>
          <input 
            value={form.siret} 
            onChange={e => setForm(p => ({ ...p, siret: e.target.value }))}
            placeholder="91947704200015"
            style={inp} 
          />
        </div>
        
        <div>
          <label style={lbl}>Numéro TVA intracommunautaire</label>
          <input 
            value={form.vat_number} 
            onChange={e => setForm(p => ({ ...p, vat_number: e.target.value }))}
            placeholder="FRXXXXXXXXXXX"
            style={inp} 
          />
        </div>
        
        <div style={{ borderTop: '1px solid #C5D0F0', paddingTop: 16, marginTop: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>🏦 Coordonnées bancaires</div>
          
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>IBAN</label>
            <input 
              value={form.iban} 
              onChange={e => setForm(p => ({ ...p, iban: e.target.value }))}
              placeholder="FR76 17906 00112 00060490772 82"
              style={inp} 
            />
          </div>
          
          <div>
            <label style={lbl}>BIC / SWIFT</label>
            <input 
              value={form.bic} 
              onChange={e => setForm(p => ({ ...p, bic: e.target.value }))}
              placeholder="AGRIFRPP879"
              style={inp} 
            />
          </div>
        </div>
        
        <button 
          onClick={handleSubmit} 
          disabled={saving} 
          style={btn('#0D1B4E', 'white')}
        >
          {saving ? 'Sauvegarde...' : '✓ Enregistrer mes informations'}
        </button>
      </div>
    </div>
  )
}
