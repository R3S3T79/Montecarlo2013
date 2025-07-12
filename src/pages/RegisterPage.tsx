// src/pages/RegisterPage.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Errore generico");

      setMessage({ text: "Controlla l'email per confermare la registrazione", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Errore di rete", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Registrati</h1>

      {message && (
        <div className={`mb-4 p-3 rounded ${message.type === "error" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input type="email" className="w-full border px-3 py-2 rounded" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block mb-1 font-medium">Nome utente</label>
          <input type="text" className="w-full border px-3 py-2 rounded" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div>
          <label className="block mb-1 font-medium">Password</label>
          <input type="password" className="w-full border px-3 py-2 rounded" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition">
          {loading ? "Invio..." : "Registrati"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Hai già un account? <Link to="/login" className="text-blue-600 hover:underline">Accedi</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
