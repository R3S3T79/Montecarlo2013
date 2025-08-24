// src/pages/AdminNotizie.tsx

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Notizia = {
  id: string;
  testo: string;
  pubblica: boolean;
  colore: string | null;
  bold: boolean | null;
  italic: boolean | null;
  created_at: string;
};

export default function AdminNotizie() {
  const [notizie, setNotizie] = useState<Notizia[]>([]);
  const [testo, setTesto] = useState("");
  const [pubblica, setPubblica] = useState(true);
  const [colore, setColore] = useState("#000000");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotizie();
  }, []);

  const fetchNotizie = async () => {
    const { data, error } = await supabase
      .from<Notizia>("notizie")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Errore fetch notizie:", error);
    } else {
      setNotizie(data || []);
    }
  };

  const addNotizia = async () => {
    if (!testo.trim()) return;
    const { error } = await supabase.from("notizie").insert([
      {
        testo,
        pubblica,
        colore,
        bold,
        italic,
      },
    ]);
    if (error) {
      console.error("Errore inserimento notizia:", error);
    } else {
      setTesto("");
      setPubblica(true);
      setColore("#000000");
      setBold(false);
      setItalic(false);
      fetchNotizie();
    }
  };

  const deleteNotizia = async (id: string) => {
    const { error } = await supabase.from("notizie").delete().eq("id", id);
    if (error) console.error("Errore eliminazione notizia:", error);
    else fetchNotizie();
  };

  const updateNotizia = async (id: string) => {
    const { error } = await supabase
      .from("notizie")
      .update({ testo, pubblica, colore, bold, italic })
      .eq("id", id);
    if (error) {
      console.error("Errore aggiornamento notizia:", error);
    } else {
      setEditId(null);
      setTesto("");
      fetchNotizie();
    }
  };

  return (
    <div className="pt-2 px-2 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center text-white">
  Gestione Notizie
</h2>
      {/* Form aggiunta */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <textarea
          className="w-full border rounded p-2 mb-2"
          placeholder="Scrivi nuova notizia..."
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={pubblica}
              onChange={(e) => setPubblica(e.target.checked)}
            />
            Pubblica
          </label>
          <label className="flex items-center gap-1">
            Colore:
            <input
              type="color"
              value={colore}
              onChange={(e) => setColore(e.target.value)}
              className="border rounded"
            />
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={bold}
              onChange={(e) => setBold(e.target.checked)}
            />
            Grassetto
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={italic}
              onChange={(e) => setItalic(e.target.checked)}
            />
            Corsivo
          </label>
        </div>
        <button
          onClick={addNotizia}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Aggiungi
        </button>
      </div>

      {/* Lista notizie */}
      {notizie.map((n) => (
        <div key={n.id} className="bg-white p-4 rounded shadow mb-4">
          {editId === n.id ? (
            <>
              <textarea
                className="w-full border rounded p-2 mb-2"
                value={testo}
                onChange={(e) => setTesto(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={pubblica}
                    onChange={(e) => setPubblica(e.target.checked)}
                  />
                  Pubblica
                </label>
                <label className="flex items-center gap-1">
                  Colore:
                  <input
                    type="color"
                    value={colore}
                    onChange={(e) => setColore(e.target.value)}
                    className="border rounded"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={bold}
                    onChange={(e) => setBold(e.target.checked)}
                  />
                  Grassetto
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={italic}
                    onChange={(e) => setItalic(e.target.checked)}
                  />
                  Corsivo
                </label>
              </div>
              <button
                onClick={() => updateNotizia(n.id)}
                className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
              >
                Salva
              </button>
              <button
                onClick={() => setEditId(null)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Annulla
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  color: n.colore || "#000",
                  fontWeight: n.bold ? "bold" : "normal",
                  fontStyle: n.italic ? "italic" : "normal",
                }}
                className="mb-2"
              >
                {n.testo}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={n.pubblica} readOnly />
                  Pubblica
                </label>
                Creata:{" "}
                {new Date(n.created_at).toLocaleString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditId(n.id);
                    setTesto(n.testo);
                    setPubblica(n.pubblica);
                    setColore(n.colore || "#000000");
                    setBold(n.bold || false);
                    setItalic(n.italic || false);
                  }}
                  className="bg-yellow-500 text-white px-4 py-2 rounded"
                >
                  Modifica
                </button>
                <button
                  onClick={() => deleteNotizia(n.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  Elimina
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>  
  );  
}

