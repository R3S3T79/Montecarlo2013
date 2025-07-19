// src/pages/AdminPanel.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserRole } from "@/lib/roles";
import {
  CheckCircle,
  Clock,
  Shield,
  User,
  Crown,
  Mail,
} from "lucide-react";

interface PendingUser {
  id: string;
  email: string;
  username: string;
  created_at: string;
  confirmed: boolean;
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

  // Reinvia link di conferma
  const resendEmail = async (email: string) => {
    if (processing.has(email)) return;
    setProcessing((s) => new Set(s).add(email));
    try {
      const res = await fetch("/api/resend-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error("resend-confirm failed:", json);
        alert("Errore: " + json.error);
      } else {
        alert("Link di conferma reinviato!");
      }
    } catch (err: any) {
      console.error(err);
      alert("Errore di connessione: " + err.message);
    } finally {
      setProcessing((s) => {
        const n = new Set(s); n.delete(email); return n;
      });
    }
  };

  // Imposta ruolo via set-role
  const setRole = async (email: string, role: UserRole) => {
    if (processing.has(email)) return;
    setProcessing((s) => new Set(s).add(email));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sessione scaduta");

      const res = await fetch("/api/set-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("set-role failed:", res.status, text);
        alert(`Errore server: ${res.status}`);
      } else {
        alert(`Utente ${email} promosso a ${role}`);
        setPendingUsers((prev) =>
          prev.map((u) => (u.email === email ? { ...u, role } : u))
        );
      }
    } catch (err: any) {
      console.error(err);
      alert("Errore di connessione: " + err.message);
    } finally {
      setProcessing((s) => {
        const n = new Set(s); n.delete(email); return n;
      });
    }
  };

  if (loading) {
    return <p className="p-6">Caricamento utenti…</p>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Utenti in Attesa</h2>
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
          {pendingUsers.map((u) => {
            const roles: UserRole[] = ["user", "creator", "admin"];
            // Rimuovi il ruolo già assegnato
            const toShow = u.confirmed
              ? roles.filter((r) => r !== u.role)
              : [];

            return (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-2">
                  <div className="font-medium">{u.username}</div>
                  <div className="text-sm text-gray-600">{u.email}</div>
                </td>
                <td className="p-2">
                  {u.confirmed ? (
                    <span className="text-green-700 flex items-center">
                      <CheckCircle className="mr-1" size={16} /> Confermato
                    </span>
                  ) : (
                    <span className="text-yellow-700 flex items-center">
                      <Clock className="mr-1" size={16} /> In attesa
                    </span>
                  )}
                </td>
                <td className="p-2 text-sm text-gray-600">
                  {formatDate(u.created_at)}
                </td>
                <td className="p-2 flex space-x-2">
                  {u.confirmed
                    ? toShow.map((r) => {
                        const Icon = r === "user" ? User : r === "creator" ? Shield : Crown;
                        return (
                          <button
                            key={r}
                            onClick={() => setRole(u.email, r)}
                            disabled={processing.has(u.email)}
                            className="px-3 py-1 border rounded inline-flex items-center text-sm"
                          >
                            <Icon className="mr-1" size={14} />
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </button>
                        );
                      })
                    : (
                      <button
                        onClick={() => resendEmail(u.email)}
                        disabled={processing.has(u.email)}
                        className="px-3 py-1 border rounded inline-flex items-center text-sm"
                      >
                        <Mail className="mr-1" size={14} /> Reinvia Link
                      </button>
                    )}
                  {u.confirmed && (
                    <button
                      onClick={() => resendEmail(u.email)}
                      disabled={processing.has(u.email)}
                      className="px-3 py-1 border rounded inline-flex items-center text-sm"
                    >
                      <Mail className="mr-1" size={14} /> Email
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
