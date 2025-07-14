// src/pages/AdminPanel.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  User,
  Crown,
} from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from<PendingUser>("pending_users")
      .select("id, email, username, created_at, confirmed");

    if (error) {
      console.error("Errore nel recupero utenti in attesa:", error);
    } else {
      setPendingUsers(data || []);
    }
    setLoading(false);
  };

  const approveUser = async (email: string, role: UserRole) => {
    if (processingUsers.has(email)) return;
    setProcessingUsers((prev) => new Set(prev).add(email));

    // Ottieni il token di sessione per l'admin
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      alert("Sessione scaduta. Esegui di nuovo il login.");
      setProcessingUsers((prev) => {
        const next = new Set(prev);
        next.delete(email);
        return next;
      });
      return;
    }

    try {
      const res = await fetch("/.netlify/functions/approve-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email, role }),
      });
      const result = await res.json();

      if (res.ok) {
        setPendingUsers((prev) => prev.filter((u) => u.email !== email));
        alert(`Utente ${email} approvato come ${role}`);
      } else {
        alert(`Errore: ${result.error || result.message}`);
      }
    } catch (err) {
      console.error("Errore nell'approvazione:", err);
      alert("Errore di connessione");
    } finally {
      setProcessingUsers((prev) => {
        const next = new Set(prev);
        next.delete(email);
        return next;
      });
    }
  };

  const rejectUser = (id: string) => {
    if (processingUsers.has(id)) return;
    if (!window.confirm("Sei sicuro di voler rifiutare questo utente?")) return;

    setProcessingUsers((prev) => new Set(prev).add(id));
    // Qui potresti chiamare una function di rifiuto, ma al momento rimuoviamo solo localmente
    setPendingUsers((prev) => prev.filter((u) => u.id !== id));
    setProcessingUsers((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    alert("Utente rifiutato");
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <Crown className="w-4 h-4" />;
      case "creator":
        return <Shield className="w-4 h-4" />;
      case "user":
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "creator":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "user":
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const awaitingCount = pendingUsers.filter((u) => !u.confirmed).length;
  const confirmedCount = pendingUsers.filter((u) => u.confirmed).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Caricamento utenti in attesa…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 flex items-center justify-between">
          <div className="flex items-center">
            <Users className="text-blue-600 mr-3" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Pannello Amministratore
              </h1>
              <p className="text-gray-600">
                Gestisci le richieste di registrazione
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Torna alla Home
          </button>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 flex items-center">
            <Clock className="text-yellow-600 mr-3" size={24} />
            <div>
              <p className="text-sm text-gray-600">In Attesa</p>
              <p className="text-2xl font-bold text-gray-900">
                {awaitingCount}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center">
            <CheckCircle className="text-green-600 mr-3" size={24} />
            <div>
              <p className="text-sm text-gray-600">Email Confermate</p>
              <p className="text-2xl font-bold text-gray-900">
                {confirmedCount}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center">
            <Users className="text-blue-600 mr-3" size={24} />
            <div>
              <p className="text-sm text-gray-600">Totale Richieste</p>
              <p className="text-2xl font-bold text-gray-900">
                {pendingUsers.length}
              </p>
            </div>
          </div>
        </div>

        {/* Lista utenti */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Utenti in Attesa di Approvazione
            </h2>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nessuna richiesta in attesa
              </h3>
              <p className="text-gray-600">
                Non ci sono utenti che richiedono approvazione al momento.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Registrazione
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.username}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.confirmed
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {user.confirmed ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Confermato
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 mr-1" />
                              In attesa conferma
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {user.confirmed ? (
                          <div className="flex space-x-2">
                            {(["user", "creator", "admin"] as UserRole[]).map(
                              (role) => (
                                <button
                                  key={role}
                                  onClick={() =>
                                    approveUser(user.email, role)
                                  }
                                  disabled={processingUsers.has(user.email)}
                                  className={`inline-flex items-center px-3 py-1 border rounded-md text-xs font-medium transition-colors ${getRoleColor(
                                    role
                                  )} hover:opacity-80 disabled:opacity-50`}
                                >
                                  {getRoleIcon(role)}
                                  <span className="ml-1 capitalize">{role}</span>
                                </button>
                              )
                            )}
                            <button
                              onClick={() => rejectUser(user.id)}
                              disabled={processingUsers.has(user.id)}
                              className="inline-flex items-center px-3 py-1 border border-red-200 rounded-md text-xs font-medium text-red-800 bg-red-100 hover:bg-red-200 disabled:opacity-50 transition-colors"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Rifiuta
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            In attesa di conferma email
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
