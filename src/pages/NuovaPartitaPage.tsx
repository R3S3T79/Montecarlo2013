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

  // L’ID di Montecarlo (viene preso direttamente dal codice)
  const montecarloId = '5bca3e07-974a-4d12-9208-d85975906fe4';
  const navigate = useNavigate();

  const isMontecarloCasa = formData.squadra_casa_id === montecarloId;

  // Nome della squadra avversaria (da mostrare al posto di “Avversari”)
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
    supabase
      .from('squadre')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => {
        if (data) setSquadre(data);
      });

    supabase
      .from('stagioni')
      .select('id, nome')
      .order('data_inizio', { ascending: false })
      .then(({ data }) => {
        if (data) setStagioni(data);
      });

    supabase
      .from('giocatori')
      .select('*')
      .then(({ data }) => {
        if (data) setGiocatori(data);
      });
  }, []);

  // ======= LOGICA PER SPOSTARE “Montecarlo” IN TESTA =======
  const squadreOrdinate: Squadra[] = React.useMemo(() => {
    if (!squadre || squadre.length === 0) return [];

    const copia = [...squadre];
    const idx = copia.findIndex(s => s.id === montecarloId);
    if (idx !== -1) {
      const [mc] = copia.splice(idx, 1);
      copia.unshift(mc);
    }
    return copia;
  }, [squadre]);
  // ========================================================

  const handleGoal = (
    tempo: number,
    squadra: 'MC' | 'AVV',
    increment: boolean
  ) => {
    const update = (arr: number[]) =>
      arr.map((v, i) =>
        i === tempo ? Math.max(0, v + (increment ? 1 : -1)) : v
      );

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

  const handleMarcatoreChange = (
    tempo: number,
    idx: number,
    pid: string
  ) => {
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
          goal_a: isMontecarloCasa
            ? goalMC.reduce((s, v) => s + v, 0)
            : goalAvv.reduce((s, v) => s + v, 0),
          goal_b: isMontecarloCasa
            ? goalAvv.reduce((s, v) => s + v, 0)
            : goalMC.reduce((s, v) => s + v, 0),
          goal_a1: isMontecarloCasa ? goalMC[0] : goalAvv[0],
          goal_a2: isMontecarloCasa ? goalMC[1] : goalAvv[1],
          goal_a3: isMontecarloCasa ? goalMC[2] : goalAvv[2],
          goal_a4: isMontecarloCasa ? goalMC[3] : goalAvv[3],
          goal_b1: isMontecarloCasa ? goalAvv[0] : goalMC[0],
          goal_b2: isMontecarloCasa ? goalAvv[1] : goalMC[1],
          goal_b3: isMontecarloCasa ? goalAvv[2] : goalMC[2],
          goal_b4: isMontecarloCasa ? goalAvv[3] : goalMC[3],
        },
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
        await supabase
          .from('presenze')
          .upsert(presArr, { onConflict: ['partita_id', 'giocatore_id'] });

      const marcArr = Object.entries(marcatori).flatMap(
        ([tempo, lista]) =>
          lista
            .filter(pid => pid)
            .map(pid => ({
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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-4">Nuova Partita</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Data e Ora */}
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            required
            className="border rounded px-3 py-2 text-lg"
            value={formData.data}
            onChange={e =>
              setFormData({ ...formData, data: e.target.value })
            }
          />
          <input
            type="time"
            required
            className="border rounded px-3 py-2 text-lg"
            value={formData.ora}
            onChange={e =>
              setFormData({ ...formData, ora: e.target.value })
            }
          />
        </div>

        {/* Stagione */}
        <select
          required
          className="border rounded px-3 py-2 text-lg"
          value={formData.stagione_id}
          onChange={e =>
            setFormData({ ...formData, stagione_id: e.target.value })
          }
        >
          <option value="">Seleziona stagione</option>
          {stagioni.map(s => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>

        {/* Squadra Casa (Montecarlo in testa) */}
        <select
          required
          className="border rounded px-3 py-2 text-lg"
          value={formData.squadra_casa_id}
          onChange={e =>
            setFormData({ ...formData, squadra_casa_id: e.target.value })
          }
        >
          <option value="">Squadra Casa</option>
          {squadreOrdinate.map(s => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>

        {/* Squadra Ospite (Montecarlo in testa) */}
        <select
          required
          className="border rounded px-3 py-2 text-lg"
          value={formData.squadra_ospite_id}
          onChange={e =>
            setFormData({ ...formData, squadra_ospite_id: e.target.value })
          }
        >
          <option value="">Squadra Ospite</option>
          {squadreOrdinate.map(s => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>

        {/* Stato (visibile solo se entrambe le squadre sono selezionate) */}
        {formData.squadra_casa_id && formData.squadra_ospite_id && (
          <select
            className="border rounded px-3 py-2 text-lg"
            value={formData.stato}
            onChange={e =>
              setFormData({ ...formData, stato: e.target.value })
            }
          >
            <option value="DaGiocare">DaGiocare</option>
            <option value="Giocata">Giocata</option>
          </select>
        )}

        {/* Campionato/Torneo */}
        <select
          required
          className="border rounded px-3 py-2 text-lg"
          value={formData.campionato_torneo}
          onChange={e =>
            setFormData({ ...formData, campionato_torneo: e.target.value })
          }
        >
          <option value="campionato">Campionato</option>
          <option value="torneo">Torneo</option>
          <option value="amichevole">Amichevole</option>
        </select>

        {/* Luogo (visibile solo per 'torneo') */}
        {formData.campionato_torneo === 'torneo' && (
          <input
            type="text"
            placeholder="Luogo (opzionale)"
            className="border rounded px-3 py-2 text-lg"
            value={formData.luogo_torneo}
            onChange={e =>
              setFormData({ ...formData, luogo_torneo: e.target.value })
            }
          />
        )}

        {formData.stato === 'Giocata' && (
          <div className="mt-6 space-y-5">
            {/* Pulsante Mostra/Nascondi Formazione */}
            <button
              type="button"
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-lg"
              onClick={() => setMostraFormazione(prev => !prev)}
            >
              {mostraFormazione ? 'Nascondi Formazione' : 'Mostra Formazione'}
            </button>

            {/* Formazione Montecarlo */}
            {mostraFormazione && (
              <div>
                <h4 className="text-xl font-bold mb-2">Formazione Montecarlo</h4>
                {giocatori.map(g => (
                  <label key={g.id} className="block text-lg mb-1">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={formazione.includes(g.id)}
                      onChange={e =>
                        setFormazione(prev =>
                          e.target.checked
                            ? [...prev, g.id]
                            : prev.filter(pid => pid !== g.id)
                        )
                      }
                    />
                    {g.cognome} {g.nome}
                  </label>
                ))}
              </div>
            )}

            {/* Checkbox per visualizzare i singoli tempi */}
            <div className="mt-4 flex space-x-4">
              {[0, 1, 2, 3].map(t => (
                <label key={t} className="flex items-center text-lg">
                  <input
                    type="checkbox"
                    className="mr-2 w-5 h-5"
                    checked={tempiVisible[t]}
                    onChange={e => {
                      const newVis = [...tempiVisible];
                      newVis[t] = e.target.checked;
                      setTempiVisible(newVis);
                    }}
                  />
                  <span>{t + 1}° Tempo</span>
                </label>
              ))}
            </div>

            {/* Sezioni per ogni tempo, rese visibili solo se checkbox corrispondente è selezionata */}
            {([0, 1, 2, 3] as const).map(t =>
              tempiVisible[t] ? (
                <div key={t} className="mt-6">
                  <h5 className="font-semibold text-2xl mb-3">{t + 1}° Tempo</h5>

                  {/* Riga Montecarlo: nome + controlli goal */}
                  <div className="grid grid-cols-[1fr_auto] items-center mb-2">
                    <span className="text-xl">Montecarlo</span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        className="px-4 py-2 border rounded text-xl"
                        onClick={() => handleGoal(t, 'MC', false)}
                      >
                        −
                      </button>
                      <span className="text-xl">{goalMC[t]}</span>
                      <button
                        type="button"
                        className="px-4 py-2 border rounded text-xl"
                        onClick={() => handleGoal(t, 'MC', true)}
                      >
                        ＋
                      </button>
                    </div>
                  </div>

                  {/* Riga Avversaria: nome + controlli goal */}
                  <div className="grid grid-cols-[1fr_auto] items-center mb-2">
                    <span className="text-xl">{otherTeamName || 'Avversari'}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        className="px-4 py-2 border rounded text-xl"
                        onClick={() => handleGoal(t, 'AVV', false)}
                      >
                        −
                      </button>
                      <span className="text-xl">{goalAvv[t]}</span>
                      <button
                        type="button"
                        className="px-4 py-2 border rounded text-xl"
                        onClick={() => handleGoal(t, 'AVV', true)}
                      >
                        ＋
                      </button>
                    </div>
                  </div>

                  {/* Selezione marcatori (ad altezze uniformi) */}
                  {(marcatori[t + 1] || []).map((pid, i) => (
                    <select
                      key={i}
                      className="border rounded px-4 py-2 text-xl w-full max-w-lg mb-2"
                      value={pid || ''}
                      onChange={e => handleMarcatoreChange(t + 1, i, e.target.value)}
                    >
                      <option value="">-- Seleziona marcatore --</option>
                      {giocatori
                        .filter(g => formazione.includes(g.id))
                        .map(g => (
                          <option key={g.id} value={g.id}>
                            {g.cognome} {g.nome}
                          </option>
                        ))}
                    </select>
                  ))}
                </div>
              ) : null
            )}
          </div>
        )}

        {/* Pulsanti Annulla/Salva */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            className="px-4 py-2 text-lg"
            onClick={() => navigate('/calendario')}
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded text-lg disabled:opacity-50"
          >
            {loading ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </form>
    </div>
  );
}
