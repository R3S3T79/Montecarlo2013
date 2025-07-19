// src/pages/AdminPanel.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { UserRole } from "@/lib/roles";
import {
  Users,
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
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Carica gli utenti in attesa
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from<PendingUser>("pending_users")
        .select("id, email, username, created_at, confirmed");
      if (error) {
        console.error("Errore fetch pending_users:", error);
      } else {
        setPendingUsers(data || []);
      }
      setLoading(false);
    })();
  }, []);

  // Reinvia il link di conferma all'utente
  const resendEmail = async (email: string) => {
    if (processing.has(email)) return;
    setProcessing((s) => new Set(s).add(email));
    try {
      const res = await fetch("/.netlify/functions/resend-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        alert("Link di conferma reinviato!");
      } else {
        const { error } = await res.json();
        alert("Errore: " + error);
      }
    } catch (err) {
      console.error("Errore rete:", err);
      alert("Errore di connessione");
    } finally {
      setProcessing((s) => {
        const next = new Set(s);
        next.delete(email);
        return next;
      });
    }
  };

  // Imposta il ruolo dell'utente (user / creator / admin)
  const approveUser = async (email: string, role: UserRole) => {
    if (processing.has(email)) return;
    setProcessing((s) => new Set(s).add(email));

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      alert("Sessione scaduta. Effettua di nuovo il login.");
      setProcessing((s) => {
        const next = new Set(s);
        next.delete(email);
        return next;
      });
      return;
    }

    try {
      const res = await fetch("/.netlify/functions/set-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email, role }),
      });
      const json = await res.json();
      if (res.ok) {
        // Rimuove l'utente dalla lista dei pending
        setPendingUsers((prev) =>
          prev.filter((u) => u.email !== email)
        );
        alert(`Utente ${email} promosso a ${role}`);
      } else {
        alert(`Errore: ${json.error || json.message}`);
      }
    } catch (err) {
      console.error("Errore set-role:", err);
      alert("Errore di connessione");
    } finally {
      setProcessing((s) => {
        const next = new Set(s);
        next.delete(email);
        return next;
      });
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="text-center py-10">
        <p>Caricamento utenti in attesa…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-6">Utenti in Attesa di Approvazione</h2>
      {pendingUsers.length === 0 ? (
        <p>Nessuna richiesta in attesa.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2">Utente</th>
                <th className="px-4 py-2">Stato</th>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="font-medium">{u.username}</div>
                    <div className="text-sm text-gray-600">{u.email}</div>
                  </td>
                  <td className="px-4 py-2">
                    {u.confirmed ? (
                      <span className="inline-flex items-center text-green-700">
                        <CheckCircle className="mr-1" size={16} /> Confermato
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-yellow-700">
                        <Clock className="mr-1" size={16} /> In attesa
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-4 py-2 flex space-x-2">
                    {u.confirmed ? (
                      <>
                        <button
                          onClick={() => approveUser(u.email, UserRole.User)}
                          disabled={processing.has(u.email)}
                          className="px-3 py-1 border rounded text-sm inline-flex items-center"
                        >
                          <User className="mr-1" size={14} /> User
                        </button>
                        <button
                          onClick={() => approveUser(u.email, UserRole.Creator)}
                          disabled={processing.has(u.email)}
                          className="px-3 py-1 border rounded text-sm inline-flex items-center"
                        >
                          <Shield className="mr-1" size={14} /> Creator
                        </button>
                        <button
                          onClick={() => approveUser(u.email, UserRole.Admin)}
                          disabled={processing.has(u.email)}
                          className="px-3 py-1 border rounded text-sm inline-flex items-center"
                        >
                          <Crown className="mr-1" size={14} /> Admin
                        </button>
                        <button
                          onClick={() => resendEmail(u.email)}
                          disabled={processing.has(u.email)}
                          className="px-3 py-1 border rounded text-sm inline-flex items-center"
                        >
                          <Mail className="mr-1" size={14} /> Email
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => resendEmail(u.email)}
                        disabled={processing.has(u.email)}
                        className="px-3 py-1 border rounded text-sm inline-flex items-center"
                      >
                        <Mail className="mr-1" size={14} /> Reinvia Link
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
