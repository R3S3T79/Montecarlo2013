// Data creazione chat: 2025-07-31
// src/pages/NuovaPartitaPage.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface Squadra { id: string; nome: string; }
interface Stagione { id: string; nome: string; }
interface Giocatore { id: string; nome: string; cognome: string; ruolo?: string | null; }

export default function NuovaPartitaPage() {
  const navigate = useNavigate();
  const MONTE_ID = 'a16a8645-9f86-41d9-a81f-a92931f1cc67';

  // stati locali
  const [squadre, setSquadre] = useState<Squadra[]>([]);
  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [giocatori, setGiocatori] = useState<Giocatore[]>([]);
  const [formazione, setFormazione] = useState<string[]>([]);
  const [goalMC, setGoalMC] = useState([0, 0, 0, 0]);
  const [goalAvv, setGoalAvv] = useState([0, 0, 0, 0]);
  const [marcatori, setMarcatori] = useState<{ [tempo: number]: (string | null)[] }>({});
  const [portieri, setPortieri] = useState<{ [tempo: number]: (string | null)[] }>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFormazione, setShowFormazione] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    stagione_id: '',
    stato: 'DaGiocare',
    data: '',
    ora: '',
    squadra_casa_id: '',
    squadra_ospite_id: '',
    campionato_torneo: 'Campionato',
    nome_torneo: '',   // 👈 giornata o nome torneo
    luogo_torneo: ''   // 👈 solo per tornei
  });

  // carica squadre e stagioni
  useEffect(() => {
    supabase.from('squadre').select('id,nome').order('nome')
      .then(r => r.data && setSquadre(r.data));
    supabase.from('stagioni').select('id,nome').order('data_inizio', { ascending: false })
      .then(r => r.data && setStagioni(r.data));
  }, []);

  // carica giocatori quando cambio stagione
  useEffect(() => {
    if (!formData.stagione_id) {
      setGiocatori([]);
      return;
    }
    (async () => {
      const { data: gs, error } = await supabase
  .from('v_giocatori_completo')
  .select('giocatore_stagione_id, nome, cognome, ruolo')
  .eq('stagione_id', formData.stagione_id)
  .order('cognome', { ascending: true });

if (!error && gs) {
  setGiocatori(gs.map(r => ({
    id: r.giocatore_stagione_id,
    nome: r.nome,
    cognome: r.cognome,
    ruolo: r.ruolo
  })));
}
    })();
  }, [formData.stagione_id]);

  // sposta Montecarlo in cima e ordina le altre in ordine alfabetico
  const squadreOrd = useMemo(() => {
    const arr = [...squadre];
    const idx = arr.findIndex(s => s.id === MONTE_ID);

    const monte = idx > -1 ? arr.splice(idx, 1)[0] : null;
    arr.sort((a, b) => a.nome.localeCompare(b.nome));
    return monte ? [monte, ...arr] : arr;
  }, [squadre]);

  // determino se Montecarlo è in casa
  const isMCcasa = formData.squadra_casa_id === MONTE_ID;

  // nomi estesi
  const MC_NAME = useMemo(
    () => squadre.find(s => s.id === MONTE_ID)?.nome || 'Montecarlo',
    [squadre]
  );
  const homeName = useMemo(
    () => squadre.find(s => s.id === formData.squadra_casa_id)?.nome || '',
    [squadre, formData.squadra_casa_id]
  );
  const awayName = useMemo(
    () => squadre.find(s => s.id === formData.squadra_ospite_id)?.nome || '',
    [squadre, formData.squadra_ospite_id]
  );

  // aggiorna goal e marcatori
  const handleGoal = (tempo: number, who: 'MC' | 'AVV', up: boolean) => {
    const change = (arr: number[]) =>
      arr.map((v, i) => (i === tempo ? Math.max(0, v + (up ? 1 : -1)) : v));

    if (who === 'MC') {
      setGoalMC(change);
      setMarcatori(prev => {
        const lst = [...(prev[tempo + 1] || [])];
        up ? lst.push(null) : lst.pop();
        return { ...prev, [tempo + 1]: lst };
      });
    } else {
      setGoalAvv(change);
      setPortieri(prev => {
        const lst = [...(prev[tempo + 1] || [])];
        up ? lst.push(null) : lst.pop();
        return { ...prev, [tempo + 1]: lst };
      });
    }
  };
  // invio form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dataOra = new Date(`${formData.data}T${formData.ora}`).toISOString();
    const totCasa = isMCcasa
      ? goalMC.reduce((a, b) => a + b, 0)
      : goalAvv.reduce((a, b) => a + b, 0);
    const totOsp = isMCcasa
      ? goalAvv.reduce((a, b) => a + b, 0)
      : goalMC.reduce((a, b) => a + b, 0);

    const { data: partita, error } = await supabase
      .from('partite')
      .insert([{
        stagione_id:       formData.stagione_id,
        stato:             formData.stato,
        squadra_casa_id:   formData.squadra_casa_id,
        squadra_ospite_id: formData.squadra_ospite_id,
        campionato_torneo: formData.campionato_torneo.trim(),
        nome_torneo:       formData.nome_torneo || null,
        luogo_torneo:      formData.luogo_torneo || null,
        data_ora:  dataOra,
        goal_a:    totCasa,
        goal_b:    totOsp,
        goal_a1:   goalMC[0],
        goal_a2:   goalMC[1],
        goal_a3:   goalMC[2],
        goal_a4:   goalMC[3],
        goal_b1:   goalAvv[0],
        goal_b2:   goalAvv[1],
        goal_b3:   goalAvv[2],
        goal_b4:   goalAvv[3]
      }])
      .select()
      .single();

    if (error || !partita) {
      setLoading(false);
      return alert('Errore: ' + error?.message);
    }

    if (formData.stato === 'Giocata') {
      // presenze
      const pres = formazione.map(pid => ({
        partita_id: partita.id,
        giocatore_stagione_id: pid,
        stagione_id: formData.stagione_id
      }));
      if (pres.length) {
        await supabase.from('presenze').insert(pres);
      }

      // marcatori Montecarlo
      const marc = Object.entries(marcatori).flatMap(([tempo, lst]) =>
        lst.filter(Boolean).map(pid => ({
          partita_id: partita.id,
          giocatore_stagione_id: pid!,
          periodo: +tempo,
          stagione_id: formData.stagione_id,
          squadra_segnante_id: MONTE_ID
        }))
      );

      // portieri subiscono
      const subs = Object.entries(portieri).flatMap(([tempo, lst]) =>
        lst.filter(Boolean).map(pid => ({
          partita_id: partita.id,
          periodo: +tempo,
          stagione_id: formData.stagione_id,
          squadra_segnante_id: isMCcasa
            ? formData.squadra_ospite_id
            : formData.squadra_casa_id,
          portiere_subisce_id: pid
        }))
      );

      const toInsert = [...marc, ...subs];
      if (toInsert.length) {
        await supabase.from('marcatori').insert(toInsert);
      }
    }

    setLoading(false);
    navigate('/calendario');
  };

  const portieriInFormazione = giocatori.filter(
    g => g.ruolo?.toLowerCase() === 'portiere' && formazione.includes(g.id)
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto bg-white/85 rounded-2xl shadow-montecarlo p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Data & Ora */}
          <div className="grid grid-cols-2 gap-4">
            <input
              type="date"
              required
              className="w-full border rounded px-4 py-2"
              value={formData.data}
              onChange={e => setFormData({ ...formData, data: e.target.value })}
            />
            <input
              type="time"
              required
              className="w-full border rounded px-4 py-2"
              value={formData.ora}
              onChange={e => setFormData({ ...formData, ora: e.target.value })}
            />
          </div>

          {/* Stagione */}
          <select
            required
            className="w-full border rounded px-4 py-2"
            value={formData.stagione_id}
            onChange={e => setFormData({ ...formData, stagione_id: e.target.value })}
          >
            <option value="">Stagione</option>
            {stagioni.map(s => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>

          {/* Squadre */}
          <div className="grid grid-cols-2 gap-4">
            <select
              required
              className="w-full border rounded px-4 py-2"
              value={formData.squadra_casa_id}
              onChange={e => setFormData({ ...formData, squadra_casa_id: e.target.value })}
            >
              <option value="">Casa</option>
              {squadreOrd.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
            <select
              required
              className="w-full border rounded px-4 py-2"
              value={formData.squadra_ospite_id}
              onChange={e => setFormData({ ...formData, squadra_ospite_id: e.target.value })}
            >
              <option value="">Ospite</option>
              {squadreOrd.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>

          {/* Stato & Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <select
              className="w-full border rounded px-4 py-2"
              value={formData.stato}
              onChange={e => setFormData({ ...formData, stato: e.target.value })}
            >
              <option value="DaGiocare">Da Giocare</option>
              <option value="Giocata">Giocata</option>
            </select>
            <select
  required
  className="w-full border rounded px-4 py-2"
  value={formData.campionato_torneo}
  onChange={e => setFormData({ ...formData, campionato_torneo: e.target.value })}
>
  <option value="Campionato">Campionato</option>
  <option value="Torneo">Torneo</option>
  <option value="Amichevole">Amichevole</option>
  <option value="Allenamento">Allenamento</option> {/* ✅ nuova opzione */}
</select>

          </div>

          {/* Campionato: giornata */}
          {formData.campionato_torneo === 'Campionato' && (
            <input
              type="text"
              placeholder="Giornata (es. 5ª giornata)"
              className="w-full border rounded px-4 py-2"
              value={formData.nome_torneo}
              onChange={e => setFormData({ ...formData, nome_torneo: e.target.value })}
            />
          )}

          {/* Torneo: nome + luogo */}
          {formData.campionato_torneo === 'Torneo' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome torneo
                </label>
                <input
                  type="text"
                  placeholder="Inserisci il nome del torneo"
                  className="w-full border rounded px-4 py-2"
                  value={formData.nome_torneo}
                  onChange={e => setFormData({ ...formData, nome_torneo: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Luogo torneo
                </label>
                <input
                  type="text"
                  placeholder="Inserisci il luogo del torneo"
                  className="w-full border rounded px-4 py-2"
                  value={formData.luogo_torneo}
                  onChange={e => setFormData({ ...formData, luogo_torneo: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Formazione */}
          {formData.stato === 'Giocata' && (
            <button
              type="button"
              onClick={() => setShowFormazione(v => !v)}
              className="w-full py-2 border rounded bg-gray-100 hover:bg-gray-200"
            >
              {showFormazione ? 'Nascondi Formazione' : 'Formazione'}
            </button>
          )}
          {showFormazione && (
            <div className="max-h-48 overflow-auto border p-2 rounded">
              {giocatori.map(g => (
                <label key={g.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formazione.includes(g.id)}
                    onChange={e =>
                      setFormazione(prev =>
                        e.target.checked
                          ? [...prev, g.id]
                          : prev.filter(x => x !== g.id)
                      )
                    }
                  />
                  <span>{g.cognome} {g.nome} ({g.ruolo})</span>
                </label>
              ))}
            </div>
          )}

          {/* Dettagli Giocata */}
          {formData.stato === 'Giocata' && (
            <>
              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                className="w-full py-2 border rounded bg-gray-100 hover:bg-gray-200"
              >
                {showAdvanced ? 'Nascondi Dettagli' : 'Dettagli Giocata'}
              </button>

              {showAdvanced && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    {[0, 1, 2, 3].map(t => (
                      <div key={t}>
                        <h4 className="font-medium mb-2">{t + 1}° Tempo</h4>

                        {/* CASA */}
                        <div className="mb-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-montecarlo-secondary">{homeName}</span>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => handleGoal(t, isMCcasa ? 'MC' : 'AVV', false)}
                                className="btn-goal"
                              >
                                −
                              </button>
                              <span>{isMCcasa ? goalMC[t] : goalAvv[t]}</span>
                              <button
                                type="button"
                                onClick={() => handleGoal(t, isMCcasa ? 'MC' : 'AVV', true)}
                                className="btn-goal"
                              >
                                ＋
                              </button>
                            </div>
                          </div>
                          {/* dropdown SOLO se qui c'è Montecarlo */}
                          {isMCcasa && (marcatori[t + 1] || []).map((pid, i) => (
                            <select
                              key={i}
                              className="w-full border rounded px-2 py-1 mb-2"
                              value={pid || ''}
                              onChange={e =>
                                setMarcatori(m => {
                                  const lst = [...(m[t + 1] || [])];
                                  lst[i] = e.target.value || null;
                                  return { ...m, [t + 1]: lst };
                                })
                              }
                            >
                              <option value="">-- Marcatore --</option>
                              {giocatori
                                .filter(g => formazione.includes(g.id))
                                .map(g => (
                                  <option key={g.id} value={g.id}>
                                    {g.cognome} {g.nome}
                                  </option>
                                ))}
                            </select>
                          ))}
                          {!isMCcasa && (portieri[t + 1] || []).map((pid, i) => (
                            <select
                              key={i}
                              className="w-full border rounded px-2 py-1 mb-2"
                              value={pid || ''}
                              onChange={e =>
                                setPortieri(m => {
                                  const lst = [...(m[t + 1] || [])];
                                  lst[i] = e.target.value || null;
                                  return { ...m, [t + 1]: lst };
                                })
                              }
                            >
                              <option value="">-- Portiere subisce --</option>
                              {portieriInFormazione.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.cognome} {p.nome}
                                </option>
                              ))}
                            </select>
                          ))}
                        </div>

                        {/* OSPITE */}
                        <div className="flex justify-between items-center">
                          <span className="text-montecarlo-secondary">{awayName}</span>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleGoal(t, isMCcasa ? 'AVV' : 'MC', false)}
                              className="btn-goal"
                            >
                              −
                            </button>
                            <span>{isMCcasa ? goalAvv[t] : goalMC[t]}</span>
                            <button
                              type="button"
                              onClick={() => handleGoal(t, isMCcasa ? 'AVV' : 'MC', true)}
                              className="btn-goal"
                            >
                              ＋
                            </button>
                          </div>
                        </div>
                        {/* dropdown qui se Montecarlo è in trasferta */}
                        {!isMCcasa && (marcatori[t + 1] || []).map((pid, i) => (
                          <select
                            key={i}
                            className="w-full border rounded px-2 py-1 mb-2"
                            value={pid || ''}
                            onChange={e =>
                              setMarcatori(m => {
                                const lst = [...(m[t + 1] || [])];
                                lst[i] = e.target.value || null;
                                return { ...m, [t + 1]: lst };
                              })
                            }
                          >
                            <option value="">-- Marcatore --</option>
                            {giocatori
                              .filter(g => formazione.includes(g.id))
                              .map(g => (
                                <option key={g.id} value={g.id}>
                                  {g.cognome} {g.nome}
                                </option>
                              ))}
                          </select>
                        ))}
                        {isMCcasa && (portieri[t + 1] || []).map((pid, i) => (
                          <select
                            key={i}
                            className="w-full border rounded px-2 py-1 mb-2"
                            value={pid || ''}
                            onChange={e =>
                              setPortieri(m => {
                                const lst = [...(m[t + 1] || [])];
                                lst[i] = e.target.value || null;
                                return { ...m, [t + 1]: lst };
                              })
                            }
                          >
                            <option value="">-- Portiere subisce --</option>
                            {portieriInFormazione.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.cognome} {p.nome}
                              </option>
                            ))}
                          </select>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Azioni */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/calendario')}
              className="px-6 py-2 border rounded"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-montecarlo-accent text-white rounded disabled:opacity-50"
            >
              {loading ? 'Salvo…' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
