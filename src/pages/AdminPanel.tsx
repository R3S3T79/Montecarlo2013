// src/pages/AdminPanel.tsx
// Data creazione chat: 2025-08-19 (rev: flusso approvazione + cambio ruolo post-conferma)

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserRole } from "@/lib/roles";
import {
  CheckCircle,
  Clock,
  Shield,
  User,
  Crown,
  Newspaper,
} from "lucide-react";
import { Link } from "react-router-dom";

interface PendingUser {
  id: string;
  email: string;
  username: string;
  created_at: string;
  confirmed: boolean; // true = già passato in auth.users
  role: UserRole | null;
}

export default function AdminPanel() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch iniziale
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from<PendingUser>("pending_users")
        .select("id, email, username, created_at, confirmed, role");
      if (error) console.error("Errore fetch:", error);
      setPendingUsers(data || []);
      setLoading(false);
    })();
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Approva o aggiorna ruolo
  const setRole = async (email: string, role: UserRole, isNew: boolean) => {
    if (processing.has(email)) return;
    setProcessing((prev) => new Set(prev).add(email));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sessione scaduta");

      const endpoint = isNew
        ? "/.netlify/functions/approve-user"
        : "/.netlify/functions/set-role"; // set-role solo aggiorna

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email, role }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("setRole failed:", res.status, text);
        alert(`Errore server: ${res.status}`);
      } else {
        alert(
          isNew
            ? `Utente ${email} approvato come ${role}`
            : `Ruolo di ${email} aggiornato a ${role}`
        );
        setPendingUsers((prev) =>
          prev.map((u) =>
            u.email === email ? { ...u, role, confirmed: true } : u
          )
        );
      }
    } catch (err: any) {
      console.error(err);
      alert("Errore di connessione: " + err.message);
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(email);
        return next;
      });
    }
  };

  if (loading) {
    return <p className="p-6">Caricamento utenti…</p>;
  }

  return (
    <div className="pt-20 px-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Pannello Amministratore</h2>

      {/* Pulsante gestione notizie */}
      <div className="mb-6">
        <Link
          to="/admin-notizie"
          className="px-4 py-2 bg-blue-600 text-white rounded inline-flex items-center hover:bg-blue-700"
        >
          <Newspaper className="mr-2" size={18} />
          Gestione Notizie
        </Link>
      </div>

      <h3 className="text-xl font-semibold mb-2">Utenti</h3>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Utente</th>
            <th className="p-2">Stato</th>
            <th className="p-2">Data</th>
            <th className="p-2">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {pendingUsers.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="p-2">
                <div className="font-medium">{u.username}</div>
                <div className="text-sm text-gray-600">{u.email}</div>
              </td>
              <td className="p-2">
                {u.confirmed ? (
                  <span className="text-green-700 flex items-center">
                    <CheckCircle className="mr-1" size={16} /> Confermato (
                    {u.role})
                  </span>
                ) : (
                  <span className="text-yellow-700 flex items-center">
                    <Clock className="mr-1" size={16} /> In attesa approvazione
                  </span>
                )}
              </td>
              <td className="p-2 text-sm text-gray-600">
                {formatDate(u.created_at)}
              </td>
              <td className="p-2 flex space-x-2">
                {(["user", "creator", "admin"] as UserRole[])
                  .filter((r) => r !== u.role) // non mostra quello già attivo
                  .map((r) => {
                    const Icon =
                      r === "user" ? User : r === "creator" ? Shield : Crown;
                    return (
                      <button
                        key={r}
                        onClick={() => setRole(u.email, r, !u.confirmed)}
                        disabled={processing.has(u.email)}
                        className="px-3 py-1 border rounded inline-flex items-center text-sm"
                      >
                        <Icon className="mr-1" size={14} />
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    );
                  })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
