// src/pages/AdminDashboard.tsx

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

interface Utente {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  last_sign_in_at: string | null;
  login_count: number;
}

export default function AdminDashboard(): JSX.Element {
  const navigate = useNavigate();
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [roles, setRoles] = useState<Record<string, string>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUtenti = async () => {
      const { data: profili, error: profErr } = await supabase
        .from('utenti')
        .select(
          'user_id, email, display_name, role, last_sign_in_at, login_count'
        );
      if (profErr) {
        console.error('Errore fetch profili:', profErr);
        setLoading(false);
        return;
      }
      setUtenti(profili || []);
      // inizializza la mappa dei ruoli
      const initial: Record<string, string> = {};
      (profili || []).forEach((u) => {
        initial[u.user_id] = u.role;
      });
      setRoles(initial);
      setLoading(false);
    };
    fetchUtenti();
  }, []);

  const handleRoleChange = (user_id: string, newRole: string) => {
    setRoles((prev) => ({ ...prev, [user_id]: newRole }));
  };

  const handleSave = async () => {
    // aggiorna solo chi ha cambiato ruolo
    for (const u of utenti) {
      const selected = roles[u.user_id];
      if (selected !== u.role) {
        const { error } = await supabase
          .from('utenti')
          .update({ role: selected })
          .eq('user_id', u.user_id);
        if (error) console.error('Errore update role:', error);
      }
    }
    navigate('/'); // torna alla dashboard principale
  };

  const handleExit = () => {
    navigate('/');
  };

  if (loading) {
    return <p className="text-center py-6">Caricamento utenti...</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Admin Dashboard</h1>
      <p className="text-center mb-4 text-gray-600">
        Pannello di amministrazione - Accesso pubblico
      </p>
      
      <table className="w-full table-auto border-collapse text-center">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 border">Email</th>
            <th className="px-4 py-2 border">Display Name</th>
            <th className="px-4 py-2 border">Creator</th>
            <th className="px-4 py-2 border">Admin</th>
            <th className="px-4 py-2 border">User</th>
            <th className="px-4 py-2 border">Ultimo Accesso</th>
            <th className="px-4 py-2 border">Accessi Totali</th>
          </tr>
        </thead>
        <tbody>
          {utenti.map((u) => (
            <tr key={u.user_id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border">{u.email}</td>
              <td className="px-4 py-2 border">{u.display_name}</td>
              {['Creator', 'Admin', 'User'].map((r) => (
                <td key={r} className="px-4 py-2 border">
                  <input
                    type="radio"
                    name={`role-${u.user_id}`}
                    value={r}
                    checked={roles[u.user_id] === r}
                    onChange={() => handleRoleChange(u.user_id, r)}
                  />
                </td>
              ))}
              <td className="px-4 py-2 border">
                {u.last_sign_in_at
                  ? new Date(u.last_sign_in_at).toLocaleString('it-IT')
                  : '-'}
              </td>
              <td className="px-4 py-2 border">{u.login_count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-center space-x-4">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Salva
        </button>
        <button
          onClick={handleExit}
          className="px-4 py-2 border border-gray-400 text-gray-700 rounded hover:bg-gray-100"
        >
          Esci
        </button>
      </div>
    </div>
  );
}