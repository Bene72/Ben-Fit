import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();

  return (
    <div style={{ padding: 20 }}>

      <div
        onClick={() => router.push("/weight")}
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 16,
          marginBottom: 20,
          boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
          cursor: "pointer"
        }}
      >
        <h3>📊 Suivi du poids</h3>
        <p>Voir mon évolution</p>
      </div>

      <div
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 16,
          marginBottom: 20,
          boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
        }}
      >
        <h3>💬 Message de ton coach</h3>
        <p>Aucun message récent.</p>
      </div>

    </div>
  );
}
