import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Weight() {
  const [data, setData] = useState([]);
  const [weight, setWeight] = useState("");

  const fetchData = async () => {
    const { data } = await supabase
      .from("body_metrics")
      .select("*")
      .order("created_at", { ascending: false });

    setData(data || []);
  };

  const addWeight = async () => {
    if (!weight) return;

    const user = (await supabase.auth.getUser()).data.user;

    await supabase.from("body_metrics").insert({
      user_id: user.id,
      weight: parseFloat(weight),
    });

    setWeight("");
    fetchData();
  };

  const deleteEntry = async (id) => {
    await supabase.from("body_metrics").delete().eq("id", id);
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  const last = data[0]?.weight || "--";

  return (
    <div style={{ padding: 20 }}>
      <h2>📊 Suivi du poids</h2>

      <div style={{ marginBottom: 20 }}>
        <strong>Dernier poids :</strong> {last} kg
      </div>

      <input
        placeholder="Entrer poids"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        style={{ padding: 10, marginRight: 10 }}
      />

      <button onClick={addWeight}>Ajouter</button>

      <hr style={{ margin: "20px 0" }} />

      <h3>Historique</h3>

      {data.map((d) => (
        <div key={d.id} style={{ marginBottom: 10 }}>
          {d.weight} kg – {new Date(d.created_at).toLocaleDateString()}
          <button
            onClick={() => deleteEntry(d.id)}
            style={{ marginLeft: 10 }}
          >
            ❌
          </button>
        </div>
      ))}
    </div>
  );
}
