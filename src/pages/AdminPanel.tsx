// src/pages/AdminPanel.tsx

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle,
  Clock,
  KeyRound,
  Newspaper,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { UserRole } from "@/lib/roles";

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

  // =======================================
  // CARICAMENTO UTENTI
  // =======================================

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from<PendingUser>("pending_users")
        .select(
          "id, email, username, created_at, confirmed, role"
        )
        .order("username", { ascending: true });

      if (error) {
        console.error("Errore caricamento utenti:", error);
      }

      setPendingUsers(data || []);
      setLoading(false);
    };

    void loadUsers();
  }, []);

  // =======================================
  // UTILITÀ
  // =======================================

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const startProcessing = (email: string) => {
    setProcessing((prev) => new Set(prev).add(email));
  };

  const stopProcessing = (email: string) => {
    setProcessing((prev) => {
      const next = new Set(prev);
      next.delete(email);
      return next;
    });
  };

  const getSessionToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Sessione scaduta");
    }

    return session.access_token;
  };

  // =======================================
  // APPROVAZIONE NUOVO UTENTE
  // =======================================

  const approveUser = async (
    email: string,
    role: UserRole
  ) => {
    if (processing.has(email)) return;

    startProcessing(email);

    try {
      const token = await getSessionToken();

      const res = await fetch(
        "/.netlify/functions/approve-user",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            email,
            role,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();

        console.error(
          "approve-user failed:",
          res.status,
          text
        );

        alert(`Errore server: ${res.status}`);
        return;
      }

      setPendingUsers((prev) =>
        prev.map((u) =>
          u.email === email
            ? {
                ...u,
                role,
                confirmed: true,
              }
            : u
        )
      );

      alert(
        `Utente ${email} approvato come ${role}`
      );
    } catch (error: any) {
      console.error(error);

      alert(
        "Errore: " +
          (error?.message || "operazione non riuscita")
      );
    } finally {
      stopProcessing(email);
    }
  };

  // =======================================
  // CAMBIO RUOLO
  // =======================================

  const changeRole = async (
    email: string,
    role: UserRole
  ) => {
    if (processing.has(email)) return;

    startProcessing(email);

    try {
      const token = await getSessionToken();

      const res = await fetch(
        "/.netlify/functions/set-role",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            email,
            role,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();

        console.error(
          "set-role failed:",
          res.status,
          text
        );

        alert(`Errore server: ${res.status}`);
        return;
      }

      setPendingUsers((prev) =>
        prev.map((u) =>
          u.email === email
            ? {
                ...u,
                role,
                confirmed: true,
              }
            : u
        )
      );

      alert(
        `Ruolo di ${email} aggiornato a ${role}`
      );
    } catch (error: any) {
      console.error(error);

      alert(
        "Errore: " +
          (error?.message || "operazione non riuscita")
      );
    } finally {
      stopProcessing(email);
    }
  };

  // =======================================
  // GESTIONE SELECT RUOLO
  // =======================================

  const handleRoleChange = async (
    user: PendingUser,
    role: UserRole
  ) => {
    if (role === user.role && user.confirmed) {
      return;
    }

    if (user.confirmed) {
      await changeRole(user.email, role);
    } else {
      await approveUser(user.email, role);
    }
  };

  // =======================================
  // RESET PASSWORD
  // =======================================

  const resetPassword = async (email: string) => {
    if (processing.has(email)) return;

    const confirmed = window.confirm(
      `Inviare a ${email} l'email per impostare una nuova password?`
    );

    if (!confirmed) return;

    startProcessing(email);

    try {
      const token = await getSessionToken();

      const res = await fetch(
        "/.netlify/functions/send-password-reset",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            email,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();

        console.error(
          "send-password-reset failed:",
          res.status,
          text
        );

        alert(
          `Errore durante l'invio del reset password: ${res.status}`
        );

        return;
      }

      alert(
        `Email per il reset della password inviata a ${email}`
      );
    } catch (error: any) {
      console.error(error);

      alert(
        "Errore: " +
          (error?.message || "operazione non riuscita")
      );
    } finally {
      stopProcessing(email);
    }
  };

  // =======================================
  // ELIMINA UTENTE
  // =======================================

  const deleteUser = async (email: string) => {
    if (processing.has(email)) return;

    const confirmed = window.confirm(
      `Eliminare definitivamente l'utente ${email}?\n\nQuesta operazione non può essere annullata.`
    );

    if (!confirmed) return;

    startProcessing(email);

    try {
      const token = await getSessionToken();

      const res = await fetch(
        "/.netlify/functions/delete-user",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            email,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();

        console.error(
          "delete-user failed:",
          res.status,
          text
        );

        alert(`Errore server: ${res.status}`);
        return;
      }

      setPendingUsers((prev) =>
        prev.filter((u) => u.email !== email)
      );

      alert(`Utente ${email} eliminato`);
    } catch (error: any) {
      console.error(error);

      alert(
        "Errore: " +
          (error?.message || "operazione non riuscita")
      );
    } finally {
      stopProcessing(email);
    }
  };

  // =======================================
  // LOADING
  // =======================================

  if (loading) {
    return (
      <div className="px-3 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-neutral-900/90 p-6 shadow-xl">
          <p className="text-center text-sm text-gray-300">
            Caricamento utenti...
          </p>
        </div>
      </div>
    );
  }

  // =======================================
  // RENDER
  // =======================================

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="mb-4 rounded-2xl border border-white/10 bg-neutral-900/90 p-4 shadow-xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={24}
                  className="text-red-500"
                />

                <h1 className="text-xl font-bold text-white sm:text-2xl">
                  Pannello Amministratore
                </h1>
              </div>

              <p className="mt-1 text-sm text-gray-400">
                Gestione utenti e contenuti
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/admin-notizie"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
              >
                <Newspaper size={17} />
                Notizie
              </Link>

              <Link
                to="/nuovo-utente"
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                <Plus size={17} />
                Nuovo utente
              </Link>
            </div>
          </div>
        </div>

        {/* UTENTI */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900/90 p-3 shadow-xl sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users
                size={20}
                className="text-red-500"
              />

              <h2 className="text-lg font-semibold text-white">
                Utenti
              </h2>
            </div>

            <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-medium text-gray-300">
              {pendingUsers.length}
            </span>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-neutral-800/60 p-6 text-center text-sm text-gray-400">
              Nessun utente presente.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((u) => {
                const isProcessing =
                  processing.has(u.email);

                return (
                  <div
                    key={u.id}
                    className="rounded-xl border border-white/10 bg-neutral-800/70 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      {/* DATI UTENTE */}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-white">
                          {u.username || "Utente"}
                        </div>

                        <div className="mt-0.5 break-all text-sm text-gray-400">
                          {u.email}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {u.confirmed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400">
                              <CheckCircle size={14} />
                              Confermato
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-400">
                              <Clock size={14} />
                              In attesa
                            </span>
                          )}

                          <span className="text-xs text-gray-500">
                            Registrato il{" "}
                            {formatDate(u.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* AZIONI */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                        {/* RUOLO */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Ruolo
                          </span>

                          <select
                            value={u.role || ""}
                            disabled={isProcessing}
                            onChange={(e) =>
                              void handleRoleChange(
                                u,
                                e.target.value as UserRole
                              )
                            }
                            className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white outline-none transition focus:border-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {!u.role && (
                              <option value="">
                                Seleziona
                              </option>
                            )}

                            <option value="user">
                              User
                            </option>

                            <option value="admin">
                              Admin
                            </option>

                            <option value="creator">
                              Creator
                            </option>
                          </select>
                        </div>

                        {/* RESET PASSWORD */}
                        {u.confirmed && (
                          <button
                            type="button"
                            onClick={() =>
                              void resetPassword(u.email)
                            }
                            disabled={isProcessing}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <KeyRound size={16} />
                            Reset password
                          </button>
                        )}

                        {/* ELIMINA */}
                        <button
                          type="button"
                          onClick={() =>
                            void deleteUser(u.email)
                          }
                          disabled={isProcessing}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                          Elimina
                        </button>
                      </div>
                    </div>

                    {isProcessing && (
                      <div className="mt-3 border-t border-white/10 pt-3 text-xs text-gray-400">
                        Operazione in corso...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}