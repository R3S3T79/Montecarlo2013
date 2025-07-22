// src/pages/NuovaPartitaPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface Squadra { id: string; nome: string; }
interface Stagione { id: string; nome: string; }
interface Giocatore { id: string; nome: string; cognome: string; }

export default function NuovaPartitaPage() {
  const [squadre, setSquadre] = useState<Squadra[]>([]);
  const [stagioni, setStagioni] = useState<Stagione[]>([]);
  const [giocatori, setGiocatori] = useState<Giocatore[]>([]);
  const [formazione, setFormazione] = useState<string[]>([]);
  const [goalMC, setGoalMC] = useState([0, 0, 0, 0]);
  const [goalAvv, setGoalAvv] = useState([0, 0, 0, 0]);
  const [marcatori, setMarcatori] = useState<{ [tempo: number]: (string | null)[] }>({});
  const [mostraFormazione, setMostraFormazione] = useState(true);
  const [tempiVisible, setTempiVisible] = useState([false, false, false, false]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    stagione_id: '',
    stato: 'DaGiocare',
    data: '',
    ora: '',
    squadra_casa_id: '',
    squadra_ospite_id: '',
    campionato_torneo: 'campionato',
    luogo_torneo: ''
  });

  const montecarloId = '5bca3e07-974a-4d12-9208-d85975906fe4';
  const navigate = useNavigate();
  const isMontecarloCasa = formData.squadra_casa_id === montecarloId;

  const otherTeamName =
    formData.squadra_casa_id &&
    formData.squadra_ospite_id
      ? (
          isMontecarloCasa
            ? squadre.find(s => s.id === formData.squadra_ospite_id)?.nome
            : squadre.find(s => s.id === formData.squadra_casa_id)?.nome
        ) || ''
      : '';

  useEffect(() => {
    supabase.from('squadre').select('id, nome').order('nome').then(({ data }) => {
      if (data) setSquadre(data);
    });

    supabase.from('stagioni').select('id, nome').order('data_inizio', { ascending: false }).then(({ data }) => {
      if (data) setStagioni(data);
    });

    supabase.from('giocatori').select('*').then(({ data }) => {
      if (data) setGiocatori(data);
    });
  }, []);

  const squadreOrdinate = React.useMemo(() => {
    const copia = [...squadre];
    const idx = copia.findIndex(s => s.id === montecarloId);
    if (idx !== -1) {
      const [mc] = copia.splice(idx, 1);
      copia.unshift(mc);
    }
    return copia;
  }, [squadre]);

  const handleGoal = (tempo: number, squadra: 'MC' | 'AVV', increment: boolean) => {
    const update = (arr: number[]) =>
      arr.map((v, i) => i === tempo ? Math.max(0, v + (increment ? 1 : -1)) : v);

    if (squadra === 'MC') {
      setGoalMC(prev => update(prev));
      setMarcatori(prev => {
        const list = [...(prev[tempo + 1] || [])];
        if (increment) list.push(null);
        else list.pop();
        return { ...prev, [tempo + 1]: list };
      });
    } else {
      setGoalAvv(prev => update(prev));
    }
  };

  const handleMarcatoreChange = (tempo: number, idx: number, pid: string) => {
    setMarcatori(prev => {
      const list = [...(prev[tempo] || [])];
      list[idx] = pid;
      return { ...prev, [tempo]: list };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dataOra = new Date(`${formData.data}T${formData.ora}`).toISOString();
    const { data: partitaInserita, error } = await supabase
      .from('partite')
      .insert([
        {
          stagione_id: formData.stagione_id,
          data_ora: dataOra,
          stato: formData.stato,
          squadra_casa_id: formData.squadra_casa_id,
          squadra_ospite_id: formData.squadra_ospite_id,
          campionato_torneo: formData.campionato_torneo,
          luogo_torneo: formData.luogo_torneo || null,
          goal_a: isMontecarloCasa ? goalMC.reduce((s, v) => s + v, 0) : goalAvv.reduce((s, v) => s + v, 0),
          goal_b: isMontecarloCasa ? goalAvv.reduce((s, v) => s + v, 0) : goalMC.reduce((s, v) => s + v, 0),
          goal_a1: isMontecarloCasa ? goalMC[0] : goalAvv[0],
          goal_a2: isMontecarloCasa ? goalMC[1] : goalAvv[1],
          goal_a3: isMontecarloCasa ? goalMC[2] : goalAvv[2],
          goal_a4: isMontecarloCasa ? goalMC[3] : goalAvv[3],
          goal_b1: isMontecarloCasa ? goalAvv[0] : goalMC[0],
          goal_b2: isMontecarloCasa ? goalAvv[1] : goalMC[1],
          goal_b3: isMontecarloCasa ? goalAvv[2] : goalMC[2],
          goal_b4: isMontecarloCasa ? goalAvv[3] : goalMC[3],
        }
      ])
      .select()
      .single();

    if (error || !partitaInserita) {
      setLoading(false);
      return alert('Errore salvataggio partita: ' + error?.message);
    }

    if (formData.stato === 'Giocata') {
      const presArr = formazione.map(pid => ({
        partita_id: partitaInserita.id,
        giocatore_id: pid,
      }));
      if (presArr.length)
        await supabase.from('presenze').upsert(presArr, { onConflict: ['partita_id', 'giocatore_id'] });

      const marcArr = Object.entries(marcatori).flatMap(([tempo, lista]) =>
        lista.filter(pid => pid).map(pid => ({
          partita_id: partitaInserita.id,
          giocatore_id: pid!,
          periodo: parseInt(tempo),
        }))
      );
      if (marcArr.length)
        await supabase.from('marcatori').insert(marcArr);
    }

    setLoading(false);
    navigate('/calendario');
  };

  return (
    <div className="min-h-screen bg-gradient-montecarlo-light py-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-montecarlo">
        <h2 className="text-2xl font-bold mb-6 text-center text-montecarlo-secondary">Nuova Partita</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Data e Ora */}
          <div className="grid grid-cols-2 gap-4">
            <input type="date" required className="input-mc" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} />
            <input type="time" required className="input-mc" value={formData.ora} onChange={e => setFormData({ ...formData, ora: e.target.value })} />
          </div>

          {/* Stagione */}
          <select required className="input-mc" value={formData.stagione_id} onChange={e => setFormData({ ...formData, stagione_id: e.target.value })}>
            <option value="">Seleziona stagione</option>
            {stagioni.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>

          {/* Squadre */}
          <select required className="input-mc" value={formData.squadra_casa_id} onChange={e => setFormData({ ...formData, squadra_casa_id: e.target.value })}>
            <option value="">Squadra Casa</option>
            {squadreOrdinate.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>

          <select required className="input-mc" value={formData.squadra_ospite_id} onChange={e => setFormData({ ...formData, squadra_ospite_id: e.target.value })}>
            <option value="">Squadra Ospite</option>
            {squadreOrdinate.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>

          {/* Stato */}
          {formData.squadra_casa_id && formData.squadra_ospite_id && (
            <select className="input-mc" value={formData.stato} onChange={e => setFormData({ ...formData, stato: e.target.value })}>
              <option value="DaGiocare">DaGiocare</option>
              <option value="Giocata">Giocata</option>
            </select>
          )}

          {/* Tipo partita */}
          <select required className="input-mc" value={formData.campionato_torneo} onChange={e => setFormData({ ...formData, campionato_torneo: e.target.value })}>
            <option value="campionato">Campionato</option>
            <option value="torneo">Torneo</option>
            <option value="amichevole">Amichevole</option>
          </select>

          {/* Luogo torneo */}
          {formData.campionato_torneo === 'torneo' && (
            <input type="text" className="input-mc" placeholder="Luogo (opzionale)" value={formData.luogo_torneo} onChange={e => setFormData({ ...formData, luogo_torneo: e.target.value })} />
          )}

          {/* Se Giocata: mostra sezione avanzata */}
          {formData.stato === 'Giocata' && (
            <>
              <button type="button" className="btn-mc-gray" onClick={() => setMostraFormazione(prev => !prev)}>
                {mostraFormazione ? 'Nascondi Formazione' : 'Mostra Formazione'}
              </button>

              {mostraFormazione && (
                <div className="space-y-1">
                  <h4 className="text-xl font-semibold">Formazione Montecarlo</h4>
                  {giocatori.map(g => (
                    <label key={g.id} className="block">
                      <input type="checkbox" className="mr-2" checked={formazione.includes(g.id)} onChange={e => setFormazione(prev => e.target.checked ? [...prev, g.id] : prev.filter(pid => pid !== g.id))} />
                      {g.cognome} {g.nome}
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-4">
                {[0, 1, 2, 3].map(t => (
                  <label key={t} className="flex items-center text-lg">
                    <input type="checkbox" className="mr-2 w-5 h-5" checked={tempiVisible[t]} onChange={e => {
                      const newVis = [...tempiVisible];
                      newVis[t] = e.target.checked;
                      setTempiVisible(newVis);
                    }} />
                    <span>{t + 1}° Tempo</span>
                  </label>
                ))}
              </div>

              {([0, 1, 2, 3] as const).map(t => tempiVisible[t] && (
                <div key={t} className="mt-6">
                  <h5 className="text-xl font-bold mb-2">{t + 1}° Tempo</h5>

                  {/* Goal Montecarlo */}
                  <div className="mb-2">
                    <span className="font-medium text-montecarlo-secondary">Montecarlo</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleGoal(t, 'MC', false)} className="btn-goal">−</button>
                      <span className="text-lg">{goalMC[t]}</span>
                      <button type="button" onClick={() => handleGoal(t, 'MC', true)} className="btn-goal">＋</button>
                    </div>
                  </div>

                  {/* Goal Avversario */}
                  <div className="mb-4">
                    <span className="font-medium text-montecarlo-secondary">{otherTeamName || 'Avversari'}</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleGoal(t, 'AVV', false)} className="btn-goal">−</button>
                      <span className="text-lg">{goalAvv[t]}</span>
                      <button type="button" onClick={() => handleGoal(t, 'AVV', true)} className="btn-goal">＋</button>
                    </div>
                  </div>

                  {/* Marcatori */}
                  {(marcatori[t + 1] || []).map((pid, i) => (
                    <select key={i} className="input-mc mb-2" value={pid || ''} onChange={e => handleMarcatoreChange(t + 1, i, e.target.value)}>
                      <option value="">-- Seleziona marcatore --</option>
                      {giocatori.filter(g => formazione.includes(g.id)).map(g => (
                        <option key={g.id} value={g.id}>{g.cognome} {g.nome}</option>
                      ))}
                    </select>
                  ))}
                </div>
              ))}
            </>
          )}

          {/* Pulsanti */}
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={() => navigate('/calendario')} className="btn-mc-gray">Annulla</button>
            <button type="submit" disabled={loading} className="btn-mc-primary">{loading ? 'Salvataggio...' : 'Salva'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
