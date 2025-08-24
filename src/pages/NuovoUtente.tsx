// src/pages/NuovoUtente.tsx
// Data creazione: 20/08/2025

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function NuovoUtente() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const resp = await fetch("/.netlify/functions/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nome, cognome, username, role }),
      });

      if (!resp.ok) throw new Error("Errore durante la creazione");

      setMessage("✅ Utente creato con successo!");
      setEmail("");
      setPassword("");
      setNome("");
      setCognome("");
      setUsername("");
      setRole("user");

      setTimeout(() => navigate("/admin-panel"), 1500);
    } catch (err: any) {
      setMessage("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100">
      <div className="bg-white shadow p-8 rounded w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Crea Nuovo Utente</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />
          <input
            type="text"
            placeholder="Cognome"
            value={cognome}
            onChange={(e) => setCognome(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />
          <input
            type="password"
            placeholder="Password temporanea"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="creator">Creator</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-500 to-red-700 text-white py-2 rounded"
          >
            {loading ? "Creazione..." : "Crea Utente"}
          </button>
        </form>

        {message && <p className="mt-4 text-center">{message}</p>}
      </div>
    </div>
  );
}
