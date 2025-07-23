// src/pages/tornei/NuovoTorneo/Tornei.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { X, Plus, Calendar, MapPin, Users } from 'lucide-react';
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
      if (errT || !tornei) {
        console.error('Errore fetch tornei:', errT);
        return;
      }
      const stagIds = Array.from(new Set(tornei.map(t => t.stagione_id)));
      const { data: st, error: errSt } = await supabase
        .from('stagioni')
        .select('id, nome')
        .in('id', stagIds);
      if (errSt) console.error('Errore fetch stagioni:', errSt);
      const mappaStag: Record<string, string> = {};
      st?.forEach(s => { mappaStag[s.id] = s.nome; });

      const torneoIds = tornei.map(t => t.id);
      const { data: fasi, error: errF } = await supabase
        .from('fasi_torneo')
        .select('torneo_id, tipo_fase')
        .in('torneo_id', torneoIds);
      if (errF) console.error('Errore fetch fasi_torneo:', errF);
      const faseMap: Record<string, string[]> = {};
      fasi?.forEach(f => {
        faseMap[f.torneo_id] = faseMap[f.torneo_id] || [];
        faseMap[f.torneo_id].push(f.tipo_fase);
      });

      const arr: TorneoMeta[] = tornei.map(t => ({
        id: t.id,
        nome: t.nome,
        luogo: t.luogo,
        stagioneNome: mappaStag[t.stagione_id] ?? '–',
        fasi: faseMap[t.id] || []
      }));
      setListaTornei(arr);
    } catch (error) {
      console.error('Errore generale:', error);
    } finally {
      setLoading(false);
    }
  }

  const apriGironi = (id: string) =>
    navigate(`/tornei/nuovo/step6-fasegironi/${id}`, { state: { torneoId: id } });
  const apriGironeUnico = (id: string) =>
    navigate(`/tornei/nuovo/step6-gironeunico/${id}`, { state: { torneoId: id } });
  const apriEliminazione = (id: string) =>
    navigate(`/tornei/nuovo/step6-eliminazione/${id}`, { state: { torneoId: id } });
  const creaFasi = (id: string) => navigate(`/tornei/nuovo/step1/${id}`);
  const nuovoTorneo = () => navigate('/tornei/nuovo/step1');

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

  const getFaseColor = (fasi: string[]) => {
    if (fasi.includes('girone_unico'))
      return 'bg-montecarlo-red-100 text-montecarlo-secondary border-montecarlo-red-200';
    if (fasi.includes('multi_gironi'))
      return 'bg-montecarlo-gold-100 text-montecarlo-secondary border-montecarlo-gold-200';
    if (fasi.includes('eliminazione'))
      return 'bg-montecarlo-gray-100 text-montecarlo-neutral border-montecarlo-gray-200';
    return 'bg-montecarlo-neutral/20 text-montecarlo-neutral border-montecarlo-neutral/30';
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
      <div className="container mx-auto px-4 py-8">
        {/* Header ridotto, centrato all'interno del box */}
        <div className="bg-white rounded-xl shadow-montecarlo p-5 mb-4 flex items-center justify-center relative">
          <h1 className="text-xl md:text-2xl font-bold text-montecarlo-secondary">
            Tornei
          </h1>
          {canAdd && (
            <button
              onClick={nuovoTorneo}
              className="absolute right-4 bg-gradient-montecarlo text-white px-4 py-1 rounded-lg font-medium hover:shadow-montecarlo-lg transition-all duration-300 transform hover:scale-105 inline-flex items-center"
            >
              <Plus className="mr-1" size={16} />
              Nuovo
            </button>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-montecarlo p-6 text-center">
            <div className="text-montecarlo-secondary">Caricamento tornei...</div>
          </div>
        ) : listaTornei.length === 0 ? (
          <div className="bg-white rounded-xl shadow-montecarlo p-6 text-center">
            <h2 className="text-lg font-bold text-montecarlo-secondary mb-2">
              Nessun torneo trovato
            </h2>
            <p className="text-montecarlo-neutral mb-4">
              Inizia creando il tuo primo torneo.
            </p>
            {canAdd && (
              <button
                onClick={nuovoTorneo}
                className="bg-gradient-montecarlo text-white px-4 py-1 rounded-lg font-medium hover:shadow-montecarlo-lg transition-all duration-300 transform hover:scale-105"
              >
                Crea Primo
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listaTornei.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-xl shadow-montecarlo hover:shadow-montecarlo-lg transition-all duration-300 transform hover:scale-[1.02] overflow-hidden border-l-4 border-montecarlo-secondary"
              >
                <div className="bg-gradient-montecarlo text-white p-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base mb-1">{t.nome}</h3>
                    <div className="flex items-center text-white/80 text-xs">
                      <Calendar className="mr-1" size={12} />
                      <span>{t.stagioneNome}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminaTorneo(t.id);
                    }}
                    className="text-montecarlo-accent hover:text-white transition-colors p-1"
                    title="Elimina"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  <div className="flex items-center text-montecarlo-neutral text-xs">
                    <MapPin className="mr-1" size={12} />
                    <span>{t.luogo}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="mr-1 text-montecarlo-neutral" size={12} />
                    <span
                      className={`text-[10px] px-2 py-1 rounded-full border ${getFaseColor(
                        t.fasi
                      )}`}
                    >
                      {getFaseLabel(t.fasi)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-montecarlo-gray-100">
                    <div className="flex flex-wrap gap-1">
                      {t.fasi.includes('girone_unico') && (
                        <button
                          onClick={() => apriGironeUnico(t.id)}
                          className="flex-1 bg-montecarlo-red-100 text-montecarlo-secondary px-2 py-1 rounded-lg text-xs font-medium hover:bg-montecarlo-red-200 transition-colors"
                        >
                          Girone Unico
                        </button>
                      )}
                      {t.fasi.includes('multi_gironi') && (
                        <button
                          onClick={() => apriGironi(t.id)}
                          className="flex-1 bg-montecarlo-gold-100 text-montecarlo-secondary px-2 py-1 rounded-lg text-xs font-medium hover:bg-montecarlo-gold-200 transition-colors"
                        >
                          Gironi
                        </button>
                      )}
                      {t.fasi.includes('eliminazione') && (
                        <button
                          onClick={() => apriEliminazione(t.id)}
                          className="flex-1 bg-montecarlo-gray-100 text-montecarlo-neutral px-2 py-1 rounded-lg text-xs font-medium hover:bg-montecarlo-gray-200 transition-colors"
                        >
                          Eliminazione
                        </button>
                      )}
                      {t.fasi.length === 0 && (
                        <button
                          onClick={() => creaFasi(t.id)}
                          className="w-full bg-montecarlo-accent text-montecarlo-secondary px-2 py-1 rounded-lg text-xs font-medium hover:bg-montecarlo-gold-600 transition-colors shadow-gold"
                        >
                          Configura
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
