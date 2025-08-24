import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function MenuFormazione() {
  const { id } = useParams(); // id della partita
  const navigate = useNavigate();

  const [giocatori, setGiocatori] = useState([]);
  const [formazione, setFormazione] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchDati = async () => {
      setLoading(true);

      const { data: tuttiGiocatori, error: err1 } = await supabase
        .from("giocatori")
        .select("id, nome, cognome")
        .order("cognome", { ascending: true });

      const { data: presenze, error: err2 } = await supabase
        .from("presenze")
        .select("giocatore_id")
        .eq("partita_id", id);

      if (!err1 && !err2) {
        setGiocatori(tuttiGiocatori);
        setFormazione(presenze.map((p) => p.giocatore_id));
      }

      setLoading(false);
    };

    fetchDati();
  }, [id]);

  const toggleGiocatore = (giocatoreId) => {
    setFormazione((prev) =>
      prev.includes(giocatoreId)
        ? prev.filter((id) => id !== giocatoreId)
        : [...prev, giocatoreId]
    );
  };

  const salvaFormazione = async () => {
    if (!id) return;

    const presenzeArray = formazione.map((gid) => ({
      partita_id: id,
      giocatore_id: gid,
    }));

    // Cancella tutte le presenze precedenti
    await supabase.from("presenze").delete().eq("partita_id", id);

    // Inserisce le nuove presenze
    const { error } = await supabase
      .from("presenze")
      .insert(presenzeArray);

    if (error) {
      alert("Errore durante il salvataggio");
    } else {
      alert("Formazione salvata!");
      navigate(`/partita/${id}`);
    }
  };

  const annulla = () => {
    navigate(`/partita/${id}`);
  };

  if (loading) return <div className="p-4 text-center">Caricamento…</div>;

  return (
    <div className="container mx-auto px-2">
      <h2 className="text-xl font-bold mb-4 text-center">Seleziona Formazione</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
        {giocatori.map((g) => (
          <label key={g.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formazione.includes(g.id)}
              onChange={() => toggleGiocatore(g.id)}
            />
            <span>{g.cognome} {g.nome}</span>
          </label>
        ))}
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={annulla}
          className="bg-gray-400 text-white px-4 py-2 rounded"
        >
          Annulla
        </button>
        <button
          onClick={salvaFormazione}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Salva Formazione
        </button>
      </div>
    </div>
  );
}
