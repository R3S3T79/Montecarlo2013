// src/pages/tornei/NuovoTorneo/EditGironeUnicoPartita.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';

interface Partita {
  id: string;
  squadra_casa: string;
  squadra_ospite: string;
  gol_casa: number;
  gol_ospite: number;
  data_match: string | null;
  giocata: boolean;
  rigori_vincitore: string | null;
}

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

export default function EditGironeUnicoPartita() {
  const { matchId } = useParams();
  const navigate = useNavigate();

  const [partita, setPartita] = useState<Partita | null>(null);
  const [teams, setTeams] = useState<{ [key: string]: Squadra }>({}); // <-- sostituito Record
  const [scoreCasa, setScoreCasa] = useState(0);
  const [scoreOspite, setScoreOspite] = useState(0);
  const [dataOra, setDataOra] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rigoriVincitore, setRigoriVincitore] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;

    (async () => {
      const { data: p } = await supabase
        .from('tornei_gironeunico')
        .select('*')
        .eq('id', matchId)
        .single();

      if (!p) {
        navigate(-1);
        return;
      }

      setPartita(p);
      setScoreCasa(p.gol_casa ?? 0);
      setScoreOspite(p.gol_ospite ?? 0);
      setDataOra(p.data_match ? p.data_match.slice(0, 16) : '');
      setRigoriVincitore(p.rigori_vincitore || null);

      const { data: teamData } = await supabase
        .from('squadre')
        .select('id, nome, logo_url')
        .in('id', [p.squadra_casa, p.squadra_ospite]);

      if (teamData) {
        const map: { [key: string]: Squadra } = {}; // <-- sostituito Record
        teamData.forEach(t => (map[t.id] = t));
        setTeams(map);
      }

      setLoading(false);
    })();
  }, [matchId]);

  const handleSaveResults = async () => {
    if (!partita) return;
    setSaving(true);

    const { error } = await supabase
      .from('tornei_gironeunico')
      .update({
        gol_casa: scoreCasa,
        gol_ospite: scoreOspite,
        giocata: true,
        data_match: dataOra ? `${dataOra}:00` : null,
        rigori_vincitore: rigoriVincitore,
      })
      .eq('id', partita.id);

    setSaving(false);
    if (error) {
      alert('Errore salvataggio: ' + error.message);
    } else {
      navigate(-1);
    }
  };

  const handleSaveDateOnly = async () => {
    if (!partita) return;
    setSaving(true);

    const { error } = await supabase
      .from('tornei_gironeunico')
      .update({
        data_match: dataOra ? `${dataOra}:00` : null,
      })
      .eq('id', partita.id);

    setSaving(false);
    if (error) {
      alert('Errore salvataggio data: ' + error.message);
    } else {
      navigate(-1);
    }
  };

  const handleRigoriChange = (squadraId: string) => {
    if (rigoriVincitore === squadraId) {
      setRigoriVincitore(null);
    } else {
      setRigoriVincitore(squadraId);
    }
  };

  if (loading) return <p className="text-center py-6">Caricamento…</p>;
  if (!partita || !teams[partita.squadra_casa] || !teams[partita.squadra_ospite]) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow">
        <p className="text-center">Le squadre non sono ancora definite per questa partita.</p>
      </div>
    );
  }

  const casa = teams[partita.squadra_casa];
  const ospite = teams[partita.squadra_ospite];

  return (
    <div className="max-w-md mx-auto mt-2 p-6 bg-white/85 rounded-lg shadow space-y-6">
      

      {/* CASA */}
      <div className="text-xs text-gray-500 uppercase mb-1">Casa</div>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
        <div className="flex items-center space-x-2">
          {casa.logo_url && <img src={casa.logo_url} alt={casa.nome} className="w-8 h-8 rounded-full" />}
          <span className="font-medium">{casa.nome}</span>
        </div>
        <input
          type="number"
          min={0}
          value={scoreCasa}
          onChange={e => setScoreCasa(+e.currentTarget.value)}
          onFocus={e => e.currentTarget.select()}
          className="w-16 text-center border rounded text-xl font-bold hover:ring-2 hover:ring-blue-300"
        />
      </div>

      {/* OSPITE */}
      <div className="text-xs text-gray-500 uppercase mb-1">Ospite</div>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
        <div className="flex items-center space-x-2">
          {ospite.logo_url && <img src={ospite.logo_url} alt={ospite.nome} className="w-8 h-8 rounded-full" />}
          <span className="font-medium">{ospite.nome}</span>
        </div>
        <input
          type="number"
          min={0}
          value={scoreOspite}
          onChange={e => setScoreOspite(+e.currentTarget.value)}
          onFocus={e => e.currentTarget.select()}
          className="w-16 text-center border rounded text-xl font-bold hover:ring-2 hover:ring-blue-300"
        />
      </div>

      {/* RIGORI */}
      {scoreCasa === scoreOspite && (
        <div className="space-y-2">
          <div className="text-base font-semibold text-gray-700">Vincitore ai rigori</div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={rigoriVincitore === casa.id}
              onChange={() => handleRigoriChange(casa.id)}
            />
            <span>{casa.nome}</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={rigoriVincitore === ospite.id}
              onChange={() => handleRigoriChange(ospite.id)}
            />
            <span>{ospite.nome}</span>
          </label>
        </div>
      )}

      {/* DATA & ORA */}
      <div>
        <label className="block mb-1 font-medium">Data & Ora Incontro</label>
        <input
          type="datetime-local"
          value={dataOra}
          onChange={e => setDataOra(e.currentTarget.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* PULSANTI */}
      <div className="space-y-3">
        <button
          onClick={handleSaveResults}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Salvataggio…' : 'Salva Risultato e Data'}
        </button>
        <button
          onClick={handleSaveDateOnly}
          disabled={saving}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Salvataggio…' : 'Salva Solo Data'}
        </button>
      </div>
    </div>
  );
}
