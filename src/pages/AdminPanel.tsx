// src/pages/AdminPanel.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Users, CheckCircle, XCircle, Clock, Shield, User, Crown } from "lucide-react";

interface PendingUser {
  id: string;
  email: string;
  username: string;
  created_at: string;
  confirmed: boolean;
}

type UserRole = 'user' | 'creator' | 'admin';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_pending_users");
      
      if (error) {
        console.error("Errore nel recupero utenti in attesa:", error);
        return;
      }
      
      setPendingUsers(data || []);
    } catch (error) {
      console.error("Errore imprevisto:", error);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string, role: UserRole) => {
    if (processingUsers.has(userId)) return;

    setProcessingUsers(prev => new Set(prev).add(userId));
    
    try {
      const response = await fetch("/api/approve-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId, role }),
      });

      const result = await response.json();

      if (response.ok) {
        // Rimuovi l'utente dalla lista
        setPendingUsers(prev => prev.filter(user => user.id !== userId));
        alert(`Utente approvato con successo come ${role}`);
      } else {
        alert(`Errore: ${result.message}`);
      }
    } catch (error) {
      console.error("Errore nell'approvazione:", error);
      alert("Errore di connessione");
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const rejectUser = async (userId: string) => {
    if (processingUsers.has(userId)) return;
    
    if (!window.confirm("Sei sicuro di voler rifiutare questo utente?")) return;

    setProcessingUsers(prev => new Set(prev).add(userId));
    
    try {
      // Implementa la logica di rifiuto se necessaria
      // Per ora rimuoviamo solo dalla lista locale
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      alert("Utente rifiutato");
    } catch (error) {
      console.error("Errore nel rifiuto:", error);
      alert("Errore di connessione");
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4" />;
      case 'creator':
        return <Shield className="w-4 h-4" />;
      case 'user':
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'creator':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user':
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento utenti in attesa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="text-blue-600 mr-3" size={28} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pannello Amministratore</h1>
                <p className="text-gray-600">Gestisci le richieste di registrazione</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/")}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Torna alla Home
            </button>
          </div>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="text-yellow-600 mr-3" size={24} />
              <div>
                <p className="text-sm text-gray-600">In Attesa</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pendingUsers.filter(u => u.confirmed).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <XCircle className="text-red-600 mr-3" size={24} />
              <div>
                <p className="text-sm text-gray-600">Non Confermati</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pendingUsers.filter(u => !u.confirmed).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="text-blue-600 mr-3" size={24} />
              <div>
                <p className="text-sm text-gray-600">Totale Richieste</p>
                <p className="text-2xl font-bold text-gray-900">{pendingUsers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista utenti */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Utenti in Attesa di Approvazione</h2>
          </div>
          
          {pendingUsers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna richiesta in attesa</h3>
              <p className="text-gray-600">Non ci sono utenti che richiedono approvazione al momento.</p>
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
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.confirmed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
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
                            {(['user', 'creator', 'admin'] as UserRole[]).map((role) => (
                              <button
                                key={role}
                                onClick={() => approveUser(user.id, role)}
                                disabled={processingUsers.has(user.id)}
                                className={`inline-flex items-center px-3 py-1 border rounded-md text-xs font-medium transition-colors ${getRoleColor(role)} hover:opacity-80 disabled:opacity-50`}
                              >
                                {getRoleIcon(role)}
                                <span className="ml-1 capitalize">{role}</span>
                              </button>
                            ))}
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
                          <span className="text-gray-400 text-xs">In attesa di conferma email</span>
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