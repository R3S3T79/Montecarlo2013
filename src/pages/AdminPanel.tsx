// src/pages/AdminPanel.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Users, CheckCircle, Clock, Shield, User, Crown, Mail } from "lucide-react";

interface PendingUser {
  id: string;
  email: string;
  username: string;
  created_at: string;
  confirmed: boolean;
}
type UserRole = "user" | "creator" | "admin";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from<PendingUser>("pending_users").select();
      setPendingUsers(data || []);
      setLoading(false);
    })();
  }, []);

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
        const err = await res.json();
        alert("Errore: " + err.error);
      }
    } catch {
      alert("Errore di connessione");
    } finally {
      setProcessing((s) => {
        const n = new Set(s);
        n.delete(email);
        return n;
      });
    }
  };

  const approveUser = async (email: string, role: UserRole) => {
    // ... il tuo codice di approveUser rimane identico
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("it-IT", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  if (loading) return <p>Caricamento…</p>;

  return (
    <div>
      <h2>Utenti in Attesa di Approvazione</h2>
      <table>
        <thead>
          <tr>
            <th>Utente</th><th>Stato</th><th>Data</th><th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {pendingUsers.map((u) => (
            <tr key={u.id}>
              <td>
                <div>{u.username}</div>
                <div>{u.email}</div>
              </td>
              <td>
                {u.confirmed ? (
                  <span className="text-green-600">Confermato</span>
                ) : (
                  <span className="text-yellow-600">In attesa conferma</span>
                )}
              </td>
              <td>{formatDate(u.created_at)}</td>
              <td className="flex space-x-2">
                {u.confirmed ? (
                  <>
                    <button onClick={() => approveUser(u.email, "user")}>
                      <User size={14} /> User
                    </button>
                    <button onClick={() => approveUser(u.email, "creator")}>
                      <Shield size={14} /> Creator
                    </button>
                    <button onClick={() => approveUser(u.email, "admin")}>
                      <Crown size={14} /> Admin
                    </button>
                    {/* invece di “Rifiuta”: */}
                    <button
                      onClick={() => resendEmail(u.email)}
                      disabled={processing.has(u.email)}
                    >
                      <Mail size={14} /> Email
                    </button>
                  </>
                ) : (
                  /* se non ha ancora confermato: */
                  <button
                    onClick={() => resendEmail(u.email)}
                    disabled={processing.has(u.email)}
                  >
                    <Mail size={14} /> Reinvia Link
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
