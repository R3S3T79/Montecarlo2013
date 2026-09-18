// src/components/PronosticiPartita.tsx

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// 1. TIPI

type Pronostico = '1' | 'X' | '2' | '1X' | 'X2';

interface PronosticiPartitaProps {
  partitaId: string;
}

interface Partita {
  id: string;
  stagione_id: string;
  data_ora: string;
  stato: string;
}

interface PronosticoEsistente {
  id: string;
  pronostico: Pronostico;
  goal_casa: number | null;
  goal_ospite: number | null;
  punti: number;
}

interface ClassificaRow {
  user_id: string;
  username: string;
  pronostici_giocati: number;
  punti: number;
  risultati_esatti: number;
}

// 2. COMPONENTE

export default function PronosticiPartita({
  partitaId,
}: PronosticiPartitaProps) {
  const [partita, setPartita] = useState<Partita | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [pronostico, setPronostico] = useState<Pronostico | null>(null);
  const [goalCasa, setGoalCasa] = useState('');
  const [goalOspite, setGoalOspite] = useState('');

  const [pronosticoId, setPronosticoId] = useState<string | null>(null);
  const [punti, setPunti] = useState(0);

  const [classifica, setClassifica] = useState<ClassificaRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);
  const [messaggio, setMessaggio] = useState('');
  const [errore, setErrore] = useState('');
  const [mostraRegole, setMostraRegole] = useState(false);

  // 3. CARICAMENTO DATI

  useEffect(() => {
    const caricaDati = async () => {
      setLoading(true);
      setErrore('');

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setUserId(null);
          setLoading(false);
          return;
        }

        setUserId(user.id);

        const { data: partitaData, error: partitaError } = await supabase
          .from('partite')
          .select('id, stagione_id, data_ora, stato')
          .eq('id', partitaId)
          .single();

        if (partitaError) {
          throw partitaError;
        }

        setPartita(partitaData);

        const { data: pronosticoData, error: pronosticoError } = await supabase
          .from('pronostici_partite')
          .select('id, pronostico, goal_casa, goal_ospite, punti')
          .eq('partita_id', partitaId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (pronosticoError) {
          throw pronosticoError;
        }

        if (pronosticoData) {
          const esistente = pronosticoData as PronosticoEsistente;

          setPronosticoId(esistente.id);
          setPronostico(esistente.pronostico);
          setGoalCasa(
            esistente.goal_casa !== null ? String(esistente.goal_casa) : ''
          );
          setGoalOspite(
            esistente.goal_ospite !== null
              ? String(esistente.goal_ospite)
              : ''
          );
          setPunti(esistente.punti);
        }

        const { data: classificaData, error: classificaError } = await supabase
          .from('v_classifica_pronostici')
          .select(
            'user_id, username, pronostici_giocati, punti, risultati_esatti'
          )
          .eq('stagione_id', partitaData.stagione_id)
          .order('punti', { ascending: false })
          .order('risultati_esatti', { ascending: false })
          .order('username', { ascending: true })
          .limit(5);

        if (classificaError) {
          throw classificaError;
        }

        setClassifica((classificaData || []) as ClassificaRow[]);
      } catch (error) {
        console.error('Errore caricamento pronostici:', error);
        setErrore('Impossibile caricare i pronostici.');
      } finally {
        setLoading(false);
      }
    };

    caricaDati();
  }, [partitaId]);

  // 4. CONTROLLO CHIUSURA PRONOSTICO

  const pronosticoChiuso =
    !partita ||
    partita.stato !== 'DaGiocare' ||
    !partita.data_ora ||
    new Date() >= new Date(partita.data_ora);

  // 5. SALVATAGGIO PRONOSTICO

  const salvaPronostico = async () => {
    if (!userId || !partita) {
      return;
    }

    setErrore('');
    setMessaggio('');

    if (!pronostico) {
      setErrore('Seleziona 1, X, 2, 1X oppure X2.');
      return;
    }

    if ((goalCasa === '') !== (goalOspite === '')) {
      setErrore(
        'Per il risultato esatto devi inserire entrambi i punteggi.'
      );
      return;
    }

    let goalCasaNumero: number | null = null;
    let goalOspiteNumero: number | null = null;

    if (goalCasa !== '' && goalOspite !== '') {
      goalCasaNumero = Number(goalCasa);
      goalOspiteNumero = Number(goalOspite);

      if (
        !Number.isInteger(goalCasaNumero) ||
        !Number.isInteger(goalOspiteNumero) ||
        goalCasaNumero < 0 ||
        goalOspiteNumero < 0
      ) {
        setErrore('Inserisci un risultato esatto valido.');
        return;
      }
    }

    setSalvataggio(true);

    try {
      if (pronosticoId) {
        const { error } = await supabase
          .from('pronostici_partite')
          .update({
            pronostico,
            goal_casa: goalCasaNumero,
            goal_ospite: goalOspiteNumero,
          })
          .eq('id', pronosticoId)
          .eq('user_id', userId);

        if (error) {
          throw error;
        }

        setMessaggio('Pronostico aggiornato.');
      } else {
        const { data, error } = await supabase
          .from('pronostici_partite')
          .insert({
            partita_id: partitaId,
            user_id: userId,
            pronostico,
            goal_casa: goalCasaNumero,
            goal_ospite: goalOspiteNumero,
          })
          .select('id, punti')
          .single();

        if (error) {
          throw error;
        }

        setPronosticoId(data.id);
        setPunti(data.punti);
        setMessaggio('Pronostico salvato.');
      }
    } catch (error) {
      console.error('Errore salvataggio pronostico:', error);
      setErrore('Impossibile salvare il pronostico.');
    } finally {
      setSalvataggio(false);
    }
  };

  // 6. MEDAGLIA CLASSIFICA

  const posizioneClassifica = (index: number) => {
    if (index === 0) {
      return '🥇';
    }

    if (index === 1) {
      return '🥈';
    }

    if (index === 2) {
      return '🥉';
    }

    return `${index + 1}°`;
  };

  // 7. CARICAMENTO

  if (loading) {
    return (
      <div className="w-full rounded-xl bg-black/40 p-3 text-center text-sm text-white">
        Caricamento pronostici...
      </div>
    );
  }

  // 8. UTENTE NON AUTENTICATO

  if (!userId) {
    return null;
  }

  // 9. COMPONENTE GRAFICO

  return (
    <div className="w-full space-y-3">
      <div className="rounded-xl border-l-4 border-red-600 bg-black/45 px-3 py-3 shadow-lg backdrop-blur-sm">
        <h2 className="text-center text-base font-bold text-white">
          🎯 FAI IL TUO PRONOSTICO
        </h2>

        <div className="mt-1 text-center">
          <button
            type="button"
            onClick={() => setMostraRegole((prev) => !prev)}
            className="text-xs text-white/70 underline underline-offset-2 transition hover:text-white"
          >
            ⓘ Come funziona?
          </button>
        </div>

        {mostraRegole && (
          <div className="mx-auto mt-2 max-w-md rounded-lg bg-white/10 px-3 py-2 text-xs leading-5 text-white/90">
            <div className="font-bold text-white">Regole e punteggio</div>

            <div>Pronostico 1 / X / 2 corretto: 3 punti</div>
            <div>Doppia chance 1X / X2 corretta: 1 punto</div>
            <div>Risultato esatto: +5 punti</div>

            <div className="mt-1 text-white/70">
              Il risultato esatto è facoltativo e si somma ai punti del
              pronostico. Puoi modificare la giocata fino al calcio d'inizio.
            </div>
          </div>
        )}

        <div className="mx-auto mt-3 grid max-w-sm grid-cols-5 gap-1.5">
          {(['1', 'X', '2', '1X', 'X2'] as Pronostico[]).map((valore) => (
            <button
              key={valore}
              type="button"
              disabled={pronosticoChiuso}
              onClick={() => setPronostico(valore)}
              className={`rounded-lg px-1 py-1.5 text-sm font-bold transition ${
                pronostico === valore
                  ? 'bg-red-600 text-white shadow'
                  : 'bg-white/90 text-black hover:bg-white'
              } ${
                pronosticoChiuso
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer'
              }`}
            >
              {valore}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <div className="mb-1.5 text-center text-xs font-semibold text-white">
            Risultato esatto
            <span className="ml-1 font-normal text-white/60">
              (facoltativo)
            </span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <input
              type="number"
              min="0"
              inputMode="numeric"
              disabled={pronosticoChiuso}
              value={goalCasa}
              onChange={(e) => setGoalCasa(e.target.value)}
              className="h-8 w-11 rounded-md border border-white/30 bg-white text-center text-sm font-bold text-black outline-none focus:border-red-600"
            />

            <span className="text-sm font-bold text-white">-</span>

            <input
              type="number"
              min="0"
              inputMode="numeric"
              disabled={pronosticoChiuso}
              value={goalOspite}
              onChange={(e) => setGoalOspite(e.target.value)}
              className="h-8 w-11 rounded-md border border-white/30 bg-white text-center text-sm font-bold text-black outline-none focus:border-red-600"
            />
          </div>
        </div>

        {!pronosticoChiuso && (
          <div className="mt-3 text-center">
            <button
              type="button"
              disabled={salvataggio}
              onClick={salvaPronostico}
              className="rounded-lg bg-red-600 px-5 py-2 text-xs font-bold text-white shadow transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvataggio
                ? 'SALVATAGGIO...'
                : pronosticoId
                  ? 'AGGIORNA PRONOSTICO'
                  : 'CONFERMA PRONOSTICO'}
            </button>
          </div>
        )}

        {pronosticoChiuso && pronosticoId && (
          <div className="mx-auto mt-3 max-w-sm rounded-lg bg-white/10 px-3 py-2 text-center text-xs text-white">
            🔒 Pronostico chiuso
            {partita?.stato === 'Giocata' && (
              <div className="mt-1 font-bold">
                Punti ottenuti: {punti}
              </div>
            )}
          </div>
        )}

        {pronosticoChiuso && !pronosticoId && (
          <div className="mx-auto mt-3 max-w-sm rounded-lg bg-white/10 px-3 py-2 text-center text-xs text-white">
            🔒 Pronostici chiusi
          </div>
        )}

        {messaggio && (
          <div className="mt-2 text-center text-xs font-semibold text-green-400">
            {messaggio}
          </div>
        )}

        {errore && (
          <div className="mt-2 text-center text-xs font-semibold text-red-400">
            {errore}
          </div>
        )}
      </div>

      <div className="rounded-xl border-l-4 border-red-600 bg-black/45 px-3 py-3 shadow-lg backdrop-blur-sm">
        <h2 className="mb-2 text-center text-sm font-bold text-white">
          🏆 CLASSIFICA PRONOSTICI
        </h2>

        {classifica.length === 0 ? (
          <div className="py-1 text-center text-xs text-white/70">
            La classifica inizierà con i primi pronostici.
          </div>
        ) : (
          <div className="mx-auto max-w-md space-y-1.5">
            {classifica.map((utente, index) => (
              <div
                key={utente.user_id}
                className="flex items-center justify-between rounded-lg bg-white/90 px-3 py-2 text-sm text-black"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-6 shrink-0 text-center font-bold">
                    {posizioneClassifica(index)}
                  </span>

                  <span className="truncate font-semibold">
                    {utente.username}
                  </span>
                </div>

                <span className="ml-2 shrink-0 text-xs font-bold text-red-600">
                  {utente.punti} pt
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}