// src/pages/VotazioniPartita.tsx
// Data creazione chat: 18/08/2025
// Rev: doppia media voti utenti+mister + fix safe access + vista voti_giocatori_dettaglio

// =======================================
// 1. Import
// =======================================
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Star } from "lucide-react";

// =======================================
// 2. Tipi
// =======================================
type Convocato = {
  giocatore_uid: string;
  nome: string | null;
  cognome: string | null;
  foto_url: string | null;
};

type VotoRow = {
  giocatore_id: string;
  voto: number;
};

// =======================================
// 3. Component
// =======================================
export default function VotazioniPartita(): JSX.Element {
  const { id: partitaId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // ---------------------------------------
  // 3.1 State
  // ---------------------------------------
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const [statoPartita, setStatoPartita] = useState<string | null>(null);
  const [stagioneId, setStagioneId] = useState<string | null>(null);
  const [convocati, setConvocati] = useState<Convocato[]>([]);
  const [voti, setVoti] = useState<Record<string, number>>({});
  const [doppieMedie, setDoppieMedie] = useState<
    Record<string, { mediaUtenti: number | null; mediaMister: number | null }>
  >({});

  // ---------------------------------------
  // 3.2 Effects — Carica info partita + convocati + voti
  // ---------------------------------------
  useEffect(() => {
    if (!partitaId || !user) return;

    (async () => {
      setLoading(true);
      setErrore(null);
      try {
        // 1) Info partita
        const { data: p, error: pErr } = await supabase
          .from("partite")
          .select("stato, stagione_id")
          .eq("id", partitaId)
          .single();

        if (pErr) throw pErr;
        setStatoPartita(p?.stato ?? null);
        setStagioneId(p?.stagione_id ?? null);

        // 2) Convocati
        const { data: pres, error: presErr } = await supabase
          .from("presenze")
          .select("giocatore_uid")
          .eq("partita_id", partitaId);

        if (presErr) throw presErr;

        const ids: string[] =
          (pres
            ?.map((r: { giocatore_uid: string | null }) => r.giocatore_uid)
            .filter(Boolean) as string[]) ?? [];

        if (ids.length === 0) {
          setConvocati([]);
        } else {
          // 3) Anagrafiche
          const { data: gsv, error: gsvErr } = await supabase
            .from("v_stat_giocatore_stagione")
            .select("giocatore_uid, nome, cognome, foto_url")
            .eq("stagione_id", p?.stagione_id)
            .in("giocatore_uid", ids)
            .order("cognome", { ascending: true });

          if (gsvErr) throw gsvErr;

          const conv: Convocato[] = (gsv ?? []).map((r: any) => ({
            giocatore_uid: r.giocatore_uid,
            nome: r.nome ?? null,
            cognome: r.cognome ?? null,
            foto_url: r.foto_url ?? null,
          }));

          setConvocati(conv);

          // 3b) Medie utenti + mister dalla vista
          const { data: medie, error: mErr } = await supabase
            .from("voti_giocatori_dettaglio")
            .select("giocatore_id, media_voto, numero_voti, role")
            .eq("partita_id", partitaId)
            .in("giocatore_id", ids);

          if (mErr) throw mErr;

          if (medie) {
            const map: Record<
              string,
              {
                sommaUtenti: number;
                countUtenti: number;
                sommaMister: number;
                countMister: number;
              }
            > = {};

            medie.forEach((r: any) => {
              if (!map[r.giocatore_id]) {
                map[r.giocatore_id] = {
                  sommaUtenti: 0,
                  countUtenti: 0,
                  sommaMister: 0,
                  countMister: 0,
                };
              }

              if (r.role === "mister") {
                map[r.giocatore_id].sommaMister += Number(r.media_voto);
                map[r.giocatore_id].countMister += Number(r.numero_voti);
              } else {
                map[r.giocatore_id].sommaUtenti += Number(r.media_voto);
                map[r.giocatore_id].countUtenti += Number(r.numero_voti);
              }
            });

            const dm: Record<
              string,
              { mediaUtenti: number | null; mediaMister: number | null }
            > = {};
            Object.keys(map).forEach((gid) => {
              dm[gid] = {
                mediaUtenti:
                  map[gid].countUtenti > 0
                    ? map[gid].sommaUtenti / map[gid].countUtenti
                    : null,
                mediaMister:
                  map[gid].countMister > 0
                    ? map[gid].sommaMister / map[gid].countMister
                    : null,
              };
            });
            setDoppieMedie(dm);
          }
        }

        // 4) Voti già inseriti dall’utente corrente
        const { data: votes, error: vErr } = await supabase
          .from("voti_giocatori")
          .select("giocatore_id, voto")
          .eq("partita_id", partitaId)
          .eq("user_id", user.id);

        if (vErr) throw vErr;

        const iniziali: Record<string, number> = {};
        (votes as VotoRow[] | null)?.forEach((r) => {
          iniziali[r.giocatore_id] = r.voto;
        });
        setVoti(iniziali);
      } catch (e: any) {
        setErrore(e?.message ?? "Errore di caricamento");
      } finally {
        setLoading(false);
      }
    })();
  }, [partitaId, user]);

  // ---------------------------------------
  // 3.3 Helpers
  // ---------------------------------------
  // Tutti i convocati hanno un voto valido?
  const tuttiVotati = useMemo(() => {
    if (!convocati.length) return false;
    return convocati.every((g) => {
      const v = voti[g.giocatore_uid];
      return typeof v === "number" && v >= 3 && v <= 10;
    });
  }, [convocati, voti]);

  const onChangeVoto = (giocatoreId: string, value: string) => {
    const v = Number(value);
    setVoti((prev) => ({ ...prev, [giocatoreId]: v }));
  };

  const onSalva = async () => {
    if (!partitaId || !user) return;
    if (!tuttiVotati) {
      setErrore("Devi votare tutti i convocati (voto 4–10).");
      return;
    }
    setErrore(null);
    setSalvando(true);

    try {
      const payload = convocati.map((g) => ({
        partita_id: partitaId,
        giocatore_id: g.giocatore_uid,
        user_id: user.id,
        voto: voti[g.giocatore_uid],
      }));

      const { error } = await supabase.from("voti_giocatori").upsert(payload, {
        onConflict: "partita_id,giocatore_id,user_id",
      });

      if (error) throw error;

      navigate(`/partita/${partitaId}`, { replace: true });
    } catch (e: any) {
      setErrore(e?.message ?? "Errore durante il salvataggio");
    } finally {
      setSalvando(false);
    }
  };

  const votoDisabilitato: boolean =
    !!statoPartita && statoPartita !== "Giocata";

  // ---------------------------------------
  // 3.4 Render
  // ---------------------------------------
  return (
    <div className="min-h-screen p-2 sm:p-2">
      <div className="max-w-3xl mx-auto bg-white/0 rounded-xl shadow-montecarlo p-4 sm:p-6">
        {votoDisabilitato && (
          <div className="mb-4 p-3 rounded bg-yellow-50 text-yellow-800 text-sm">
            Le votazioni sono abilitate solo per partite con stato{" "}
            <strong>Giocata</strong>.
          </div>
        )}

        {loading ? (
          <div>Caricamento…</div>
        ) : errore ? (
          <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
            {errore}
          </div>
        ) : convocati.length === 0 ? (
          <div className="text-montecarlo-neutral">
            Nessun convocato trovato per questa partita.
          </div>
        ) : (
          <>
            {/* Lista convocati */}
            <div className="space-y-3">
              {convocati.map((g) => (
                <div
                  key={g.giocatore_uid}
                  className="flex items-center justify-between border rounded-lg px-3 py-2 bg-white/90"
                >
                  {/* Dati giocatore */}
                  <div className="flex items-center gap-3">
                    {g.foto_url ? (
                      <img
                        src={g.foto_url}
                        alt="foto"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xs text-white">
                        ?
                      </div>
                    )}
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium">{g.cognome ?? ""}</span>
                      <span className="text-sm text-gray-600">
                        {g.nome ?? ""}
                      </span>
                    </div>
                  </div>

                  {/* Voto + medie (stelle una sopra l'altra) */}
                  <div className="flex items-center gap-3">
                    <select
                      className="border rounded-md px-2 py-1 text-sm"
                      value={voti[g.giocatore_uid] ?? ""}
                      onChange={(e) =>
                        onChangeVoto(g.giocatore_uid, e.target.value)
                      }
                      disabled={votoDisabilitato}
                    >
                      <option value="">Voto</option>
                      {Array.from({ length: 15 }, (_, i) => 3 + i * 0.5).map(
                        (v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        )
                      )}
                    </select>

                    {/* Container verticale per le medie */}
                    <div className="flex flex-col items-start text-sm text-gray-700">
                      {/* Media voti utenti */}
                      <span className="flex items-center">
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 mr-1" />
                        {doppieMedie[g.giocatore_uid]?.mediaUtenti != null
                          ? doppieMedie[
                              g.giocatore_uid
                            ]!.mediaUtenti!.toFixed(1)
                          : "-"}
                      </span>

                      {/* Media voti mister */}
                      <span className="flex items-center">
                        <Star className="w-5 h-5 text-blue-400 fill-blue-400 mr-1" />
                        {doppieMedie[g.giocatore_uid]?.mediaMister != null
                          ? doppieMedie[
                              g.giocatore_uid
                            ]!.mediaMister!.toFixed(1)
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Azioni */}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => navigate(`/partita/${partitaId}`)}
                className="px-3 py-2 rounded border text-sm hover:bg-gray-50"
                disabled={salvando}
              >
                Annulla
              </button>
              <button
                onClick={onSalva}
                disabled={salvando || votoDisabilitato || !tuttiVotati}
                className={`px-4 py-2 rounded text-white text-sm font-semibold ${
                  salvando || votoDisabilitato || !tuttiVotati
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-montecarlo-red-600 hover:bg-montecarlo-red-700"
                }`}
              >
                {salvando ? "Salvataggio…" : "Salva voti"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
