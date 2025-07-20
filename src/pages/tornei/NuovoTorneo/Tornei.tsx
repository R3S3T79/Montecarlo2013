// src/pages/tornei/NuovoTorneo/Tornei.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { X, Plus } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { UserRole } from '../../../lib/roles';

interface TorneoMeta {
  id: string;
  nome: string;
  luogo: string;
  stagioneNome: string;
  fasi: string[];
}

export default function Tornei() {
  const [listaTornei, setListaTornei] = useState<TorneoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const role =
    (user?.user_metadata?.role as UserRole) ||
    (user?.app_metadata?.role as UserRole) ||
    UserRole.Authenticated;
  const canAdd = role === UserRole.Admin || role === UserRole.Creator;

  useEffect(() => {
    fetchListaTornei();
  }, []);

  async function fetchListaTornei() {
    setLoading(true);
    try {
      const { data: tornei, error: errT } = await supabase
        .from('tornei')
        .select('id, nome, luogo, stagione_id')
        .order('created_at', { ascending: false });
      if (errT || !tornei) throw errT;

      // Recupera nomi stagioni
      const stagIds = Array.from(new Set(tornei.map(t => t.stagione_id)));
      const { data: st, error: errSt } = await supabase
        .from('stagioni')
        .select('id, nome')
        .in('id', stagIds);
      if (errSt) throw errSt;
      const mappaStag: Record<string, string> = {};
      st?.forEach(s => { mappaStag[s.id] = s.nome; });

      // Recupera fasi torneo
      const torneoIds = tornei.map(t => t.id);
      const { data: fasi, error: errF } = await supabase
        .from('fasi_torneo')
        .select('torneo_id, tipo_fase')
        .in('torneo_id', torneoIds);
      if (errF) throw errF;
      const faseMap: Record<string, string[]> = {};
      fasi?.forEach(f => {
        faseMap[f.torneo_id] = faseMap[f.torneo_id] || [];
        faseMap[f.torneo_id].push(f.tipo_fase);
      });

      // Mappa risultati
      const arr: TorneoMeta[] = tornei.map(t => ({
        id: t.id,
        nome: t.nome,
        luogo: t.luogo || '–',
        stagioneNome: mappaStag[t.stagione_id] || '–',
        fasi: faseMap[t.id] || []
      }));
      setListaTornei(arr);
    } catch (error) {
      console.error('Errore fetch tornei:', error);
    } finally {
      setLoading(false);
    }
  }

  const eliminaTorneo = async (id: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo torneo?')) return;
    try {
      await supabase.from('partite_torneo').delete().eq('torneo_id', id);
      await supabase.from('fasi_torneo').delete().eq('torneo_id', id);
      await supabase.from('torneo_squadre').delete().eq('torneo_id', id);
      await supabase.from('tornei').delete().eq('id', id);
      fetchListaTornei();
    } catch (error) {
      console.error('Errore eliminazione torneo:', error);
    }
  };

  const getFaseLabel = (fasi: string[]) => {
    if (fasi.includes('girone_unico')) return 'Girone Unico';
    if (fasi.includes('multi_gironi')) return 'Fase Gironi';
    if (fasi.includes('eliminazione')) return 'Eliminazione';
    return 'Da Configurare';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Caricamento…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-montecarlo-light">
      <div className="container mx-auto px-4 py-6">
        {/* Header “Tornei” uniforme */}
        <div className="relative mt-4 mb-4">
          <div className="bg-white rounded-xl shadow-montecarlo p-2">
            <h2 className="text-lg font-bold text-montecarlo-secondary text-center">
              Tornei
            </h2>
            {canAdd && (
              <button
                onClick={() => navigate('/tornei/nuovo/step1')}
                className="absolute right-2 top-2 w-8 h-8 bg-gradient-montecarlo text-white rounded-full flex items-center justify-center hover:shadow-montecarlo-lg transition-all duration-300 transform hover:scale-105"
                aria-label="Nuovo Torneo"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Lista dei tornei come elenco */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-montecarlo p-8 text-center">
            <span className="text-montecarlo-secondary">Caricamento tornei…</span>
          </div>
        ) : listaTornei.length === 0 ? (
          <div className="bg-white rounded-lg shadow-montecarlo p-8 text-center">
            <span className="text-montecarlo-neutral">Nessun torneo trovato.</span>
          </div>
        ) : (
          <ul className="space-y-4">
            {listaTornei.map(t => (
              <li
                key={t.id}
                onClick={() =>
                  navigate(`/tornei/nuovo/step6-fasegironi/${t.id}`, {
                    state: { torneoId: t.id }
                  })
                }
                className="bg-white rounded-lg shadow-montecarlo hover:shadow-montecarlo-lg p-4 cursor-pointer border-l-4 border-montecarlo-secondary transition-all duration-300"
              >
                {/* Nome del torneo */}
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-montecarlo-secondary">
                    {t.nome}
                  </span>
                  {canAdd && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        eliminaTorneo(t.id);
                      }}
                      className="text-montecarlo-accent hover:text-montecarlo-secondary p-1"
                      title="Elimina Torneo"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Seconda riga: stagione, luogo, tipologia */}
                <div className="mt-2 text-sm text-montecarlo-neutral flex justify-between">
                  <span>{t.stagioneNome}</span>
                  <span>{t.luogo}</span>
                  <span>{getFaseLabel(t.fasi)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
