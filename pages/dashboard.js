import { useState } from "react";

// ─── DATA ─────────────────────────────────────────────────────────────────────

const OFFERS = {
  essentia_plus: {
    id: "essentia_plus",
    name: "Essentia Plus",
    price: 249,
    color: "#C8A95A",
    badge: "⚡",
    features: ["Suivi nutrition personnalisé", "Programme training sur mesure", "Bilan hebdomadaire", "Messages illimités", "Accès app Ben&Fit"],
  },
  tutto_bene: {
    id: "tutto_bene",
    name: "Tutto Bene",
    price: 149,
    color: "#4A6FD4",
    badge: "🔥",
    features: ["Programme training sur mesure", "Bilan mensuel", "Messages inclus", "Accès app Ben&Fit"],
  },
};

const CLIENTS = [
  { id: 1, name: "Sophie Moreau", avatar: "SM", offer: "essentia_plus", status: "actif", since: "2025-09-01", nextPayment: "2026-07-01", balance: 0, weight: 62.4, weightGoal: 58, compliance: 87, lastBilan: "2026-06-16", program: "Hyrox — S4", messages: 2 },
  { id: 2, name: "Thomas Rault", avatar: "TR", offer: "essentia_plus", status: "actif", since: "2025-11-15", nextPayment: "2026-07-15", balance: -249, weight: 84.1, weightGoal: 80, compliance: 72, lastBilan: "2026-06-09", program: "CrossFit — Force", messages: 0 },
  { id: 3, name: "Léa Fontaine", avatar: "LF", offer: "tutto_bene", status: "actif", since: "2026-01-10", nextPayment: "2026-07-10", balance: 0, weight: 55.8, weightGoal: 54, compliance: 94, lastBilan: "2026-06-20", program: "Renfo — Cycle 2", messages: 1 },
  { id: 4, name: "Maxime Aubert", avatar: "MA", offer: "tutto_bene", status: "inactif", since: "2025-06-01", nextPayment: null, balance: -149, weight: 90.2, weightGoal: 85, compliance: 31, lastBilan: "2026-04-12", program: "—", messages: 0 },
  { id: 5, name: "Camille Vidal", avatar: "CV", offer: "essentia_plus", status: "actif", since: "2026-03-01", nextPayment: "2026-07-01", balance: 0, weight: 67.0, weightGoal: 63, compliance: 91, lastBilan: "2026-06-18", program: "Hyrox — Débutant", messages: 3 },
];

const SESSIONS_JUNE = [
  { date: "2026-06-02", client: "Sophie Moreau", type: "Suivi", color: "#C8A95A" },
  { date: "2026-06-04", client: "Thomas Rault", type: "Bilan", color: "#4A6FD4" },
  { date: "2026-06-09", client: "Léa Fontaine", type: "Suivi", color: "#C8A95A" },
  { date: "2026-06-11", client: "Sophie Moreau", type: "Bilan", color: "#4A6FD4" },
  { date: "2026-06-16", client: "Camille Vidal", type: "Suivi", color: "#C8A95A" },
  { date: "2026-06-18", client: "Thomas Rault", type: "Suivi", color: "#C8A95A" },
  { date: "2026-06-23", client: "Léa Fontaine", type: "Bilan", color: "#4A6FD4" },
  { date: "2026-06-25", client: "Sophie Moreau", type: "Suivi", color: "#C8A95A" },
  { date: "2026-06-30", client: "Camille Vidal", type: "Bilan", color: "#4A6FD4" },
];

// ─── STYLES ───────────────────────────────────────────────────────────────────

const S = {
  navy:   "#0D1B4E",
  gold:   "#C8A95A",
  bg:     "#F0F2F8",
  card:   "#FFFFFF",
  border: "#E2E6F0",
  muted:  "#6B7A99",
  green:  "#3A8A5A",
  red:    "#C45C3A",
  blue:   "#2C64E5",
};

const font = "'DM Sans', system-ui, sans-serif";
const bebas = "'Bebas Neue', 'DM Sans', sans-serif";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function complianceColor(v) {
  if (v >= 80) return S.green;
  if (v >= 55) return "#C8A95A";
  return S.red;
}

function daysAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  return `Il y a ${diff}j`;
}

function buildCalendar(year, month) {
  const first = new Date(year, month, 1).getDay();
  const days  = new Date(year, month + 1, 0).getDate();
  const start = first === 0 ? 6 : first - 1;
  return Array.from({ length: start + days }, (_, i) =>
    i < start ? null : i - start + 1
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function Avatar({ initials, size = 36, color = S.navy }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: bebas, fontSize: size * 0.38, letterSpacing: 1, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, accent = S.navy, onClick }) {
  return (
    <div onClick={onClick} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: "16px 18px", cursor: onClick ? "pointer" : "default", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: bebas, fontSize: 28, color: accent, letterSpacing: 1, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: "uppercase", letterSpacing: "0.8px", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Badge({ text, color, bg }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: bg || `${color}18`, color: color, letterSpacing: "0.5px", textTransform: "uppercase" }}>
      {text}
    </span>
  );
}

function ProgressBar({ value, color, height = 5 }) {
  return (
    <div style={{ height, background: "#EEF0F8", borderRadius: 99, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: "100%", background: color, borderRadius: 99 }} />
    </div>
  );
}

// ─── MODAL OFFRE ──────────────────────────────────────────────────────────────

function OfferModal({ client, onClose, onSave }) {
  const [form, setForm] = useState({
    offer: client.offer,
    price: OFFERS[client.offer].price,
    startDate: client.since,
    nextPayment: client.nextPayment || "",
    note: "",
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(13,27,78,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "white", borderRadius: 20, padding: "28px 32px", width: "100%", maxWidth: 500, boxShadow: "0 24px 60px rgba(13,27,78,0.2)" }}>
        <div style={{ fontFamily: bebas, fontSize: 22, color: S.navy, letterSpacing: 2, marginBottom: 20 }}>MODIFIER L'OFFRE — {client.name.toUpperCase()}</div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {Object.values(OFFERS).map((o) => (
            <button key={o.id} onClick={() => setForm((p) => ({ ...p, offer: o.id, price: o.price }))}
              style={{ flex: 1, padding: "12px 10px", border: `2px solid ${form.offer === o.id ? o.color : S.border}`, borderRadius: 12, background: form.offer === o.id ? `${o.color}12` : "white", cursor: "pointer", fontFamily: font }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{o.badge}</div>
              <div style={{ fontWeight: 800, color: S.navy, fontSize: 14 }}>{o.name}</div>
              <div style={{ fontSize: 13, color: S.muted }}>{o.price} €/mois</div>
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          {[["Tarif mensuel (€)", "price", "number"], ["Début contrat", "startDate", "date"], ["Prochain paiement", "nextPayment", "date"]].map(([lbl, key, type]) => (
            <div key={key} style={{ gridColumn: key === "note" ? "1/-1" : undefined }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: 4 }}>{lbl}</label>
              <input type={type} value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, fontFamily: font, outline: "none" }} />
            </div>
          ))}
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: 4 }}>Note interne</label>
            <textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} rows={2} placeholder="Ex : tarif fidélité, promo, accord verbal…"
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 13, fontFamily: font, outline: "none", resize: "vertical" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", border: `1px solid ${S.border}`, borderRadius: 9, background: "white", cursor: "pointer", fontSize: 13, fontFamily: font }}>Annuler</button>
          <button onClick={() => { onSave(client.id, form); onClose(); }}
            style={{ padding: "9px 18px", border: "none", borderRadius: 9, background: S.navy, color: "white", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: font }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ─── VUE DÉTAIL CLIENT ────────────────────────────────────────────────────────

function ClientDetail({ client, onBack, onEditOffer }) {
  const offer = OFFERS[client.offer];
  const weightPct = client.weightGoal && client.weight
    ? Math.max(0, Math.min(100, ((client.weight - client.weightGoal) / (client.weight - client.weightGoal + 4)) * 100))
    : 0;

  const weightHistory = [
    { d: "Avr", v: client.weight + 2.4 }, { d: "Mai", v: client.weight + 1.1 },
    { d: "Juin", v: client.weight },
  ];
  const maxW = Math.max(...weightHistory.map((h) => h.v));

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button onClick={onBack} style={{ border: "none", background: "transparent", color: S.muted, cursor: "pointer", fontSize: 20, padding: 0, display: "flex" }}>←</button>
        <Avatar initials={client.avatar} size={48} color={offer.color} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: bebas, fontSize: 22, color: S.navy, letterSpacing: 1 }}>{client.name.toUpperCase()}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Badge text={offer.name} color={offer.color} />
            <Badge text={client.status} color={client.status === "actif" ? S.green : S.red} />
            {client.messages > 0 && <Badge text={`${client.messages} msg`} color={S.blue} />}
          </div>
        </div>
        <button onClick={onEditOffer} style={{ padding: "8px 16px", border: `1px solid ${S.border}`, borderRadius: 9, background: "white", cursor: "pointer", fontSize: 12, fontWeight: 700, color: S.navy, fontFamily: font }}>
          ✏️ Modifier l'offre
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <KpiCard icon="⚖️" label="Poids actuel" value={`${client.weight} kg`} sub={`Objectif : ${client.weightGoal} kg`} accent={S.navy} />
        <KpiCard icon="📊" label="Compliance" value={`${client.compliance}%`} sub="7 derniers jours" accent={complianceColor(client.compliance)} />
        <KpiCard icon="📋" label="Dernier bilan" value={daysAgo(client.lastBilan)} sub={client.lastBilan} accent={S.navy} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Financier */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontFamily: bebas, fontSize: 14, color: S.navy, letterSpacing: 2, marginBottom: 14 }}>FINANCIER</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[["Tarif", `${offer.price} €/m`], ["Solde", `${client.balance} €`], ["Prochain", client.nextPayment ? new Date(client.nextPayment).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "—"]].map(([lbl, val]) => (
              <div key={lbl} style={{ textAlign: "center", background: "#F8FAFF", borderRadius: 10, padding: "10px 6px" }}>
                <div style={{ fontFamily: bebas, fontSize: 20, color: client.balance < 0 && lbl === "Solde" ? S.red : S.navy }}>{val}</div>
                <div style={{ fontSize: 10, color: S.muted, textTransform: "uppercase", letterSpacing: "0.8px" }}>{lbl}</div>
              </div>
            ))}
          </div>
          {client.balance < 0 && (
            <div style={{ padding: "8px 12px", background: "#FEF2F2", borderRadius: 8, border: `1px solid #F3C4C4`, fontSize: 12, color: S.red, fontWeight: 600 }}>
              ⚠️ Retard de paiement : {Math.abs(client.balance)} €
            </div>
          )}
        </div>

        {/* Programme */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontFamily: bebas, fontSize: 14, color: S.navy, letterSpacing: 2, marginBottom: 14 }}>PROGRAMME ACTIF</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: S.navy, marginBottom: 8 }}>{client.program}</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: S.muted }}>Compliance semaine</span>
              <span style={{ fontWeight: 700, color: complianceColor(client.compliance) }}>{client.compliance}%</span>
            </div>
            <ProgressBar value={client.compliance} color={complianceColor(client.compliance)} height={7} />
          </div>
          <div style={{ fontSize: 12, color: S.muted }}>Depuis le {new Date(client.since).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
        </div>

        {/* Évolution poids */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontFamily: bebas, fontSize: 14, color: S.navy, letterSpacing: 2, marginBottom: 14 }}>ÉVOLUTION POIDS</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 60, marginBottom: 8 }}>
            {weightHistory.map((h, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
                <div style={{ fontSize: 9, color: S.muted }}>{h.v} kg</div>
                <div style={{ width: "100%", background: i === weightHistory.length - 1 ? S.gold : "#C5CEEA", borderRadius: "4px 4px 0 0", height: `${(h.v / maxW) * 80}%` }} />
                <div style={{ fontSize: 9, color: S.muted }}>{h.d}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: S.muted }}>Objectif : <strong style={{ color: S.navy }}>{client.weightGoal} kg</strong> · Écart : <strong style={{ color: complianceColor(client.compliance) }}>{(client.weight - client.weightGoal).toFixed(1)} kg</strong></div>
        </div>

        {/* Offre */}
        <div style={{ background: `${offer.color}0E`, border: `1.5px solid ${offer.color}44`, borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontFamily: bebas, fontSize: 14, color: S.navy, letterSpacing: 2, marginBottom: 14 }}>OFFRE SOUSCRITE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>{offer.badge}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: S.navy }}>{offer.name}</div>
              <div style={{ fontFamily: bebas, fontSize: 20, color: offer.color }}>{offer.price} €<span style={{ fontSize: 12, fontWeight: 400, color: S.muted }}>/mois</span></div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {offer.features.map((f) => (
              <div key={f} style={{ fontSize: 12, color: S.navy, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: offer.color, fontWeight: 800 }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CALENDRIER ───────────────────────────────────────────────────────────────

function CalendarPanel({ sessions }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year,  setYear]  = useState(today.getFullYear());
  const days = buildCalendar(year, month);
  const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const DAYS_FR   = ["L","M","M","J","V","S","D"];

  const sessionMap = {};
  sessions.forEach((s) => { if (!sessionMap[s.date]) sessionMap[s.date] = []; sessionMap[s.date].push(s); });

  const todayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: bebas, fontSize: 16, color: S.navy, letterSpacing: 2 }}>
          {MONTHS_FR[month].toUpperCase()} {year}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <NavBtn onClick={() => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); }}>‹</NavBtn>
          <NavBtn onClick={() => { if (month === 11) { setMonth(0);  setYear((y) => y + 1); } else setMonth((m) => m + 1); }}>›</NavBtn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
        {DAYS_FR.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: "0.5px", padding: "2px 0", textTransform: "uppercase" }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const ds  = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const ses = sessionMap[ds] || [];
          const isT = ds === todayStr;
          return (
            <div key={i} style={{ borderRadius: 7, padding: "4px 2px", minHeight: 36, background: isT ? S.navy : "transparent", position: "relative", cursor: ses.length ? "pointer" : "default" }}>
              <div style={{ textAlign: "center", fontSize: 11, fontWeight: isT ? 700 : 500, color: isT ? "white" : S.navy, marginBottom: 2 }}>{d}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
                {ses.map((s, j) => (
                  <div key={j} title={`${s.client} — ${s.type}`} style={{ width: 6, height: 6, borderRadius: "50%", background: isT ? "white" : s.color }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Prochains rdv */}
      <div style={{ borderTop: `1px solid ${S.border}`, marginTop: 14, paddingTop: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Prochains suivis</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {sessions.filter((s) => s.date >= todayStr).slice(0, 3).map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "#F8FAFF", borderRadius: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: S.navy }}>{s.client}</div>
              <Badge text={s.type} color={s.color} />
              <div style={{ fontSize: 10, color: S.muted }}>{new Date(s.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NavBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ width: 26, height: 26, border: `1px solid ${S.border}`, borderRadius: 6, background: "white", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", color: S.navy }}>
      {children}
    </button>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [clients,      setClients]      = useState(CLIENTS);
  const [selected,     setSelected]     = useState(null);
  const [editingOffer, setEditingOffer] = useState(null);
  const [activeTab,    setActiveTab]    = useState("clients");

  const activeClients  = clients.filter((c) => c.status === "actif");
  const mrr            = activeClients.reduce((s, c) => s + OFFERS[c.offer].price, 0);
  const avgCompliance  = Math.round(activeClients.reduce((s, c) => s + c.compliance, 0) / (activeClients.length || 1));
  const pendingPayment = clients.filter((c) => c.balance < 0).length;
  const pendingMsg     = clients.reduce((s, c) => s + c.messages, 0);

  const handleSaveOffer = (clientId, form) => {
    setClients((prev) => prev.map((c) =>
      c.id === clientId ? { ...c, offer: form.offer, since: form.startDate, nextPayment: form.nextPayment } : c
    ));
  };

  const selectedClient = selected ? clients.find((c) => c.id === selected) : null;

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: font, color: S.navy }}>

      {/* ── SIDEBAR ── */}
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <div style={{ width: 220, background: S.navy, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          {/* Logo */}
          <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontFamily: bebas, fontSize: 26, color: S.gold, letterSpacing: 3 }}>BEN&FIT</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "1px", textTransform: "uppercase" }}>Dashboard Coach</div>
          </div>

          {/* Nav */}
          <nav style={{ padding: "16px 10px", flex: 1 }}>
            {[
              { id: "clients",  icon: "👥", label: "Clients" },
              { id: "offres",   icon: "📦", label: "Offres" },
              { id: "calendar", icon: "📅", label: "Calendrier" },
              { id: "finances", icon: "💳", label: "Finances" },
            ].map((item) => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSelected(null); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: activeTab === item.id ? "rgba(200,169,90,0.15)" : "transparent", color: activeTab === item.id ? S.gold : "rgba(255,255,255,0.6)", fontFamily: font, fontSize: 13, fontWeight: activeTab === item.id ? 700 : 500, marginBottom: 2, transition: "all 0.15s" }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
              </button>
            ))}
          </nav>

          {/* Coach info */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar initials="BN" size={34} color={S.gold} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>Bene</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>Coach Ben&Fit</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, padding: "28px 28px", overflowY: "auto" }}>

          {/* KPI Row — toujours visible */}
          {!selectedClient && (
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              <KpiCard icon="👥" label="Clients actifs"      value={activeClients.length}   sub={`${clients.length} total`} />
              <KpiCard icon="💰" label="MRR"                 value={`${mrr} €`}             sub="Revenus mensuels récurrents" accent={S.gold} />
              <KpiCard icon="📊" label="Compliance moy."     value={`${avgCompliance}%`}    sub="7 derniers jours"           accent={complianceColor(avgCompliance)} />
              <KpiCard icon="⚠️" label="Paiements en attente" value={pendingPayment}         sub="clients en retard"          accent={pendingPayment > 0 ? S.red : S.green} />
              {pendingMsg > 0 && <KpiCard icon="💬" label="Messages" value={pendingMsg} sub="non lus" accent={S.blue} />}
            </div>
          )}

          {/* ── VUE CLIENTS ── */}
          {(activeTab === "clients" || activeTab === "calendar") && selectedClient ? (
            <ClientDetail
              client={selectedClient}
              onBack={() => setSelected(null)}
              onEditOffer={() => setEditingOffer(selectedClient)}
            />
          ) : activeTab === "clients" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
              <div>
                <div style={{ fontFamily: bebas, fontSize: 18, color: S.navy, letterSpacing: 2, marginBottom: 14 }}>MES CLIENTS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {clients.map((c) => {
                    const offer = OFFERS[c.offer];
                    return (
                      <div key={c.id} onClick={() => setSelected(c.id)} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, transition: "box-shadow 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(13,27,78,0.1)")}
                        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}>
                        <Avatar initials={c.avatar} size={42} color={c.status === "actif" ? offer.color : "#CCC"} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: S.navy }}>{c.name}</div>
                            <Badge text={offer.name} color={offer.color} />
                            {c.status !== "actif" && <Badge text="inactif" color={S.red} />}
                            {c.messages > 0 && <Badge text={`${c.messages} msg`} color={S.blue} />}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ flex: 1, maxWidth: 120 }}>
                              <ProgressBar value={c.compliance} color={complianceColor(c.compliance)} height={4} />
                            </div>
                            <span style={{ fontSize: 11, color: complianceColor(c.compliance), fontWeight: 700 }}>{c.compliance}%</span>
                            <span style={{ fontSize: 11, color: S.muted }}>· {c.program}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontFamily: bebas, fontSize: 18, color: c.balance < 0 ? S.red : S.navy }}>{c.balance === 0 ? "✓" : `${c.balance} €`}</div>
                          <div style={{ fontSize: 10, color: S.muted }}>{daysAgo(c.lastBilan)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <CalendarPanel sessions={SESSIONS_JUNE} />
            </div>
          ) : null}

          {/* ── VUE OFFRES ── */}
          {activeTab === "offres" && (
            <div>
              <div style={{ fontFamily: bebas, fontSize: 18, color: S.navy, letterSpacing: 2, marginBottom: 20 }}>MES OFFRES</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
                {Object.values(OFFERS).map((offer) => {
                  const count = clients.filter((c) => c.offer === offer.id && c.status === "actif").length;
                  return (
                    <div key={offer.id} style={{ background: S.card, border: `2px solid ${offer.color}44`, borderRadius: 18, padding: "24px 28px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                        <div>
                          <div style={{ fontSize: 24, marginBottom: 6 }}>{offer.badge}</div>
                          <div style={{ fontFamily: bebas, fontSize: 24, color: S.navy, letterSpacing: 2 }}>{offer.name.toUpperCase()}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: bebas, fontSize: 32, color: offer.color, letterSpacing: 1 }}>{offer.price} €</div>
                          <div style={{ fontSize: 11, color: S.muted }}>par mois</div>
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        {offer.features.map((f) => (
                          <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${S.border}`, fontSize: 13 }}>
                            <span style={{ color: offer.color, fontWeight: 800 }}>✓</span>{f}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: `${offer.color}10`, borderRadius: 10 }}>
                        <span style={{ fontSize: 12, color: S.muted }}>Clients actifs sur cette offre</span>
                        <span style={{ fontFamily: bebas, fontSize: 22, color: offer.color }}>{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Table clients par offre */}
              <div style={{ fontFamily: bebas, fontSize: 14, color: S.navy, letterSpacing: 2, marginBottom: 12 }}>RÉPARTITION</div>
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", background: "#F8FAFF", padding: "10px 18px", fontSize: 10, fontWeight: 700, color: S.muted, textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: `1px solid ${S.border}` }}>
                  <span>Client</span><span>Offre</span><span>Tarif</span><span>Statut</span>
                </div>
                {clients.map((c) => {
                  const offer = OFFERS[c.offer];
                  return (
                    <div key={c.id} onClick={() => { setSelected(c.id); setActiveTab("clients"); }}
                      style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "12px 18px", borderBottom: `1px solid ${S.border}`, alignItems: "center", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFF")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar initials={c.avatar} size={28} color={offer.color} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                      </div>
                      <Badge text={offer.name} color={offer.color} />
                      <div style={{ fontFamily: bebas, fontSize: 16, color: S.navy }}>{offer.price} €</div>
                      <Badge text={c.status} color={c.status === "actif" ? S.green : S.red} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── VUE CALENDRIER ── */}
          {activeTab === "calendar" && !selectedClient && (
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
              <CalendarPanel sessions={SESSIONS_JUNE} />
              <div>
                <div style={{ fontFamily: bebas, fontSize: 18, color: S.navy, letterSpacing: 2, marginBottom: 14 }}>TOUS LES SUIVIS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {SESSIONS_JUNE.map((s, i) => (
                    <div key={i} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 4, height: 36, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: S.navy }}>{s.client}</div>
                        <Badge text={s.type} color={s.color} />
                      </div>
                      <div style={{ fontSize: 12, color: S.muted }}>{new Date(s.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── VUE FINANCES ── */}
          {activeTab === "finances" && (
            <div>
              <div style={{ fontFamily: bebas, fontSize: 18, color: S.navy, letterSpacing: 2, marginBottom: 20 }}>FINANCES</div>
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <KpiCard icon="💰" label="MRR total"          value={`${mrr} €`}          sub="Clients actifs"          accent={S.gold} />
                <KpiCard icon="✅" label="Paiements à jour"    value={clients.filter((c) => c.balance === 0).length}    sub="clients"                 accent={S.green} />
                <KpiCard icon="⚠️" label="Retards"             value={clients.filter((c) => c.balance < 0).length}     sub="clients"                 accent={pendingPayment > 0 ? S.red : S.green} />
                <KpiCard icon="📈" label="ARR estimé"          value={`${mrr * 12} €`}    sub="Revenus annuels"         accent={S.navy} />
              </div>

              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", background: "#F8FAFF", padding: "10px 18px", fontSize: 10, fontWeight: 700, color: S.muted, textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: `1px solid ${S.border}` }}>
                  <span>Client</span><span>Offre</span><span>Tarif / mois</span><span>Solde</span><span>Prochain paiement</span>
                </div>
                {clients.map((c) => {
                  const offer = OFFERS[c.offer];
                  return (
                    <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", padding: "13px 18px", borderBottom: `1px solid ${S.border}`, alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar initials={c.avatar} size={30} color={c.status === "actif" ? offer.color : "#CCC"} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                          <Badge text={c.status} color={c.status === "actif" ? S.green : S.red} />
                        </div>
                      </div>
                      <Badge text={offer.name} color={offer.color} />
                      <div style={{ fontFamily: bebas, fontSize: 18, color: S.navy }}>{c.status === "actif" ? `${offer.price} €` : "—"}</div>
                      <div style={{ fontFamily: bebas, fontSize: 18, color: c.balance < 0 ? S.red : S.green }}>
                        {c.balance < 0 ? `${c.balance} €` : "✓"}
                      </div>
                      <div style={{ fontSize: 12, color: S.muted }}>
                        {c.nextPayment ? new Date(c.nextPayment).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"}
                      </div>
                    </div>
                  );
                })}
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", padding: "13px 18px", background: "#F8FAFF", borderTop: `2px solid ${S.border}` }}>
                  <div style={{ fontWeight: 700, color: S.navy }}>Total</div>
                  <div />
                  <div style={{ fontFamily: bebas, fontSize: 20, color: S.gold }}>{mrr} €</div>
                  <div style={{ fontFamily: bebas, fontSize: 20, color: S.red }}>{clients.filter((c) => c.balance < 0).reduce((s, c) => s + c.balance, 0)} €</div>
                  <div />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL OFFRE ── */}
      {editingOffer && (
        <OfferModal
          client={editingOffer}
          onClose={() => setEditingOffer(null)}
          onSave={handleSaveOffer}
        />
      )}
    </div>
  );
}
