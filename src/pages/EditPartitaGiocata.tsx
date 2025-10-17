// src/pages/EditPartitaGiocata.tsx
// Data creazione chat: 2025-08-03 (rev: reinserito pulsante Formazione e box selezione)

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

interface Giocatore {
  id: string;
  nome: string;
  cognome: string;
  ruolo?: string | null;
}

export default function EditPartitaGiocata() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [stagioneId, setStagioneId] = useState<string>("");
  const [data, setData] = useState("");
  const [ora, setOra] = useState("");
  const [squadraCasa, setSquadraCasa] = useState("");
  const [squadraOspite, setSquadraOspite] = useState("");
  const [squadre, setSquadre] = useState<{ id: string; nome: string }[]>([]);
  const [formazione, setFormazione] = useState<string[]>([]);
  const [goalCasa, setGoalCasa] = useState<number[]>([0, 0, 0, 0]);
  const [goalOspite, setGoalOspite] = useState<number[]>([0, 0, 0, 0]);
  const [marcatoriPerTempo, setMarcatoriPerTempo] = useState<string[][]>([[], [], [], []]);
  const [portieriPerTempo, setPortieriPerTempo] = useState<string[][]>([[], [], [], []]);
  const [giocatoriStagione, setGiocatoriStagione] = useState<Giocatore[]>([]);
  const [portieriStagione, setPortieriStagione] = useState<Giocatore[]>([]);
  const [showFormazione, setShowFormazione] = useState(false);
  const [minutiGiocati, setMinutiGiocati] = useState<Record<string, number>>({});


  const [tipoCompetizione, setTipoCompetizione] = useState<string>("");
  const [nomeTorneo, setNomeTorneo] = useState<string>("");

  const getNomeSquadra = (sid: string) =>
    squadre.find((s) => s.id === sid)?.nome || "";
  const isMontecarlo = (sid: string) =>
    getNomeSquadra(sid).toLowerCase() === "montecarlo";

  useEffect(() => {
    async function fetchData() {
      if (!id) return;

      const { data: p } = await supabase.from("partite").select("*").eq("id", id).single();
      if (p) {
        setStagioneId(p.stagione_id);
        const dt = new Date(p.data_ora);
        setData(dt.toISOString().split("T")[0]);
        setOra(dt.toTimeString().slice(0, 5));
        setSquadraCasa(p.squadra_casa_id);
        setSquadraOspite(p.squadra_ospite_id);
        setGoalCasa([p.goal_a1, p.goal_a2, p.goal_a3, p.goal_a4]);
        setGoalOspite([p.goal_b1, p.goal_b2, p.goal_b3, p.goal_b4]);
        setTipoCompetizione(p.campionato_torneo || "");
        setNomeTorneo(p.nome_torneo || "");
      }

      const { data: sq } = await supabase.from("squadre").select("id,nome");
      if (sq) {
        const mc = sq.find((x) => x.nome.toLowerCase() === "montecarlo");
        const others = sq
          .filter((x) => x.id !== mc?.id)
          .sort((a, b) => a.nome.localeCompare(b.nome));
        setSquadre(mc ? [mc, ...others] : sq);
      }

      let gsData: Giocatore[] = [];
      if (p?.stagione_id) {
        const { data: gs } = await supabase
          .from("giocatori_stagioni_view")
          .select("id,nome,cognome,ruolo")
          .eq("stagione_id", p.stagione_id)
          .order("cognome", { ascending: true })
          .order("nome", { ascending: true });

        if (gs) {
          gsData = gs.map((g) => ({
            id: g.id,
            nome: g.nome,
            cognome: g.cognome,
            ruolo: g.ruolo,
          }));
          setGiocatoriStagione(gsData);
        }
      }

      const { data: pr } = await supabase
        .from("presenze")
        .select("giocatore_stagione_id")
        .eq("partita_id", id);
      if (pr?.length) {
        setFormazione(pr.map((r) => r.giocatore_stagione_id));
      } else {
        setFormazione(gsData.map((g) => g.id));
      }

      // 🔹 Carico minuti giocati (in minuti) da minuti_giocati_totali
const { data: min } = await supabase
  .from("minuti_giocati_totali")
  .select("giocatore_stagione_id, tempo_giocato_sec")
  .eq("partita_id", id);

if (min) {
  setMinutiGiocati(
    Object.fromEntries(
      min.map((m) => [m.giocatore_stagione_id, Math.round((m.tempo_giocato_sec || 0) / 60)])
    )
  );
}


      const { data: md } = await supabase
        .from("marcatori")
        .select("periodo, giocatore_stagione_id, portiere_subisce_id")
        .eq("partita_id", id);
      if (md) {
        const marcArr: string[][] = [[], [], [], []];
        const portArr: string[][] = [[], [], [], []];
        md.forEach((m) => {
          if (m.periodo >= 1 && m.periodo <= 4) {
            if (m.giocatore_stagione_id) marcArr[m.periodo - 1].push(m.giocatore_stagione_id);
            if (m.portiere_subisce_id) portArr[m.periodo - 1].push(m.portiere_subisce_id);
          }
        });
        setMarcatoriPerTempo(marcArr);
        setPortieriPerTempo(portArr);
      }
    }
    fetchData();
  }, [id]);

  useEffect(() => {
    setPortieriStagione(
      giocatoriStagione.filter(
        (g) => g.ruolo?.toLowerCase() === "portiere" && formazione.includes(g.id)
      )
    );
  }, [giocatoriStagione, formazione]);

  const toggleForm = () => setShowFormazione((v) => !v);

  const handleChangeGoal = (t: number, lato: "casa" | "ospite", valore: string) => {
    const v = parseInt(valore) || 0;
    if (lato === "casa") {
      const gc = [...goalCasa];
      gc[t] = v;
      setGoalCasa(gc);
    } else {
      const go = [...goalOspite];
      go[t] = v;
      setGoalOspite(go);
    }
    const sid = lato === "casa" ? squadraCasa : squadraOspite;

    if (isMontecarlo(sid)) {
      setMarcatoriPerTempo((prev) => {
        const up = prev.map((arr) => [...arr]);
        up[t] = up[t].slice(0, v);
        while (up[t].length < v) up[t].push("");
        return up;
      });
    } else {
      setPortieriPerTempo((prev) => {
        const up = prev.map((arr) => [...arr]);
        up[t] = up[t].slice(0, v);
        while (up[t].length < v) up[t].push("");
        return up;
      });
    }
  };

  const handleMarcatore = (t: number, idx: number, gid: string) => {
    setMarcatoriPerTempo((prev) => {
      const up = prev.map((arr) => [...arr]);
      up[t][idx] = gid;
      return up;
    });
  };

  const handleAnnulla = () => navigate(`/partita/${id}`);

  const handleSalva = async () => {
    const totalA = goalCasa.reduce((a, b) => a + b, 0);
    const totalB = goalOspite.reduce((a, b) => a + b, 0);

    await supabase
      .from("partite")
      .update({
        data_ora: new Date(`${data}T${ora}`),
        squadra_casa_id: squadraCasa,
        squadra_ospite_id: squadraOspite,
        campionato_torneo: tipoCompetizione,
        nome_torneo: nomeTorneo,
        goal_a1: goalCasa[0],
        goal_a2: goalCasa[1],
        goal_a3: goalCasa[2],
        goal_a4: goalCasa[3],
        goal_b1: goalOspite[0],
        goal_b2: goalOspite[1],
        goal_b3: goalOspite[2],
        goal_b4: goalOspite[3],
        goal_a: totalA,
        goal_b: totalB,
      })
      .eq("id", id);

    await supabase.from("marcatori").delete().eq("partita_id", id);

    const nuoviMarc: any[] = [];
    for (let i = 0; i < 4; i++) {
      const periodo = i + 1;

      for (const gid of marcatoriPerTempo[i]) {
        if (!gid) continue;
        const { data: info } = await supabase
          .from("giocatori_stagioni_view")
          .select("giocatore_uid")
          .eq("id", gid)
          .single();
        if (!info) continue;
        const squadraSegnante = isMontecarlo(squadraCasa) ? squadraCasa : squadraOspite;
        nuoviMarc.push({
          partita_id: id!,
          giocatore_stagione_id: gid,
          giocatore_uid: info.giocatore_uid,
          periodo,
          stagione_id: stagioneId,
          squadra_segnante_id: squadraSegnante,
          portiere_subisce_id: null,
        });
      }

      for (const pid of portieriPerTempo[i]) {
        if (!pid) continue;
        const squadraSegnante = !isMontecarlo(squadraCasa) ? squadraCasa : squadraOspite;
        nuoviMarc.push({
          partita_id: id!,
          giocatore_stagione_id: null,
          giocatore_uid: null,
          periodo,
          stagione_id: stagioneId,
          squadra_segnante_id: squadraSegnante,
          portiere_subisce_id: pid,
        });
      }
    }
    if (nuoviMarc.length) {
      await supabase.from("marcatori").insert(nuoviMarc);
    }

    await supabase.from("presenze").delete().eq("partita_id", id).eq("stagione_id", stagioneId);
    if (formazione.length) {
      const nuovePres = formazione.map((gid) => ({
        partita_id: id!,
        giocatore_stagione_id: gid,
        stagione_id: stagioneId,
      }));
      await supabase.from("presenze").insert(nuovePres);
    }

    // 🔹 Salvo i minuti giocati totali
await supabase.from("minuti_giocati_totali").delete().eq("partita_id", id);
const nuoviMinuti = Object.entries(minutiGiocati).map(([gid, min]) => ({
  partita_id: id!,
  giocatore_stagione_id: gid,
  tempo_giocato_sec: (min || 0) * 60,
}));
if (nuoviMinuti.length)
  await supabase.from("minuti_giocati_totali").insert(nuoviMinuti);


    navigate(`/partita/${id}`);
  };

  return (
    <div className="min-h-screen pt-2 px-2 pb-6">
      <div className="min-h-screen p-4 sm:p-6 bg-white/70">

        {/* Data e Ora compatti */}
        <div className="grid grid-cols-2 sm:grid-cols-[150px_100px] gap-4 mb-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700">Data</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full p-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Ora</label>
            <input
              type="time"
              value={ora}
              onChange={(e) => setOra(e.target.value)}
              className="w-full p-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>

        {/* Squadre */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Squadra Casa</label>
            <select
              value={squadraCasa}
              onChange={(e) => setSquadraCasa(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            >
              {squadre.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Squadra Ospite</label>
            <select
              value={squadraOspite}
              onChange={(e) => setSquadraOspite(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            >
              {squadre.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Competizione */}
        <div className="grid grid-cols-1 sm:grid-cols-[200px_auto] gap-4 mb-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">Competizione</label>
            <select
  value={tipoCompetizione}
  onChange={(e) => setTipoCompetizione(e.target.value)}
  className="w-full p-2 border border-gray-300 rounded text-sm"
>
  <option value="">-- Seleziona --</option>
  <option value="Campionato">Campionato</option>
  <option value="Torneo">Torneo</option>
  <option value="Amichevole">Amichevole</option>
  <option value="Allenamento">Allenamento</option> {/* ✅ nuovo valore */}
</select>


          </div>
          {tipoCompetizione !== "Amichevole" && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome torneo / giornata</label>
              <input
                type="text"
                value={nomeTorneo}
                onChange={(e) => setNomeTorneo(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
          )}
        </div>

        {/* Pulsante Formazione */}
        <div className="flex justify-center sm:justify-end mb-6">
          <button
            type="button"
            onClick={toggleForm}
            className="bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] text-white hover:opacity-90 px-4 py-2 rounded text-sm w-full sm:w-auto"
          >
            Formazione
          </button>
        </div>

        {/* Box Formazione */}
        {showFormazione && (
          <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-800">Formazione schierata</h3>
              <div className="flex items-center space-x-3">
                <label className="text-sm text-gray-600 flex items-center">
                  <input
                    type="checkbox"
                    checked={formazione.length === giocatoriStagione.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormazione(giocatoriStagione.map((g) => g.id));
                      } else {
                        setFormazione([]);
                      }
                    }}
                    className="w-5 h-5 accent-rose-500 mr-2 shrink-0"
                  />
                  <span>Tutti</span>
                </label>
                <button
                  onClick={toggleForm}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Chiudi
                </button>
              </div>
            </div>

            <div className="max-h-60 overflow-auto space-y-2">
              {giocatoriStagione.map((g) => (
  <div key={g.id} className="flex items-center justify-between py-1 border-b border-gray-100">
    <label className="flex items-center space-x-3 text-lg">
      <input
        type="checkbox"
        checked={formazione.includes(g.id)}
        onChange={(e) => {
          const sel = e.target.checked;
          setFormazione((prev) =>
            sel ? [...prev, g.id] : prev.filter((x) => x !== g.id)
          );
        }}
        className="w-6 h-6 accent-rose-500 mr-2 shrink-0"
      />
      <span>{g.cognome} {g.nome}</span>
    </label>

    {/* 🔹 Input minuti giocati */}
    <div className="flex items-center space-x-1">
      <input
        type="number"
        className="w-16 border border-gray-300 rounded p-1 text-sm text-center"
        value={minutiGiocati[g.id] || 0}
        onChange={(e) =>
          setMinutiGiocati((prev) => ({
            ...prev,
            [g.id]: parseInt(e.target.value) || 0,
          }))
        }
      />
      <span className="text-xs text-gray-600">min</span>
    </div>
  </div>
))}

            </div>
          </div>
        )}

        {/* Tempi */}
        {[0, 1, 2, 3].map((t) => (
          <div key={t} className="bg-gray-50 p-4 rounded mb-4 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">{t + 1}° Tempo</h3>

            {/* Casa */}
            <div className="grid grid-cols-[180px_1fr] items-center mb-2">
              <label className="font-bold text-gray-800">{getNomeSquadra(squadraCasa)}:</label>
              <input
                type="number"
                value={goalCasa[t]}
                onChange={(e) => handleChangeGoal(t, "casa", e.target.value)}
                className="w-20 p-1 border border-gray-300 rounded text-sm"
                onFocus={(e) => e.target.select()}
              />
            </div>
            {isMontecarlo(squadraCasa) &&
              marcatoriPerTempo[t].map((m, i) => (
                <select
                  key={i}
                  value={m}
                  onChange={(e) => handleMarcatore(t, i, e.target.value)}
                  className="w-full sm:w-60 mb-2 p-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">-- Seleziona marcatore --</option>
                  {giocatoriStagione
                    .filter((g) => formazione.includes(g.id))
                    .map((pl) => (
                      <option key={pl.id} value={pl.id}>{pl.cognome} {pl.nome}</option>
                    ))}
                </select>
              ))}
            {!isMontecarlo(squadraCasa) &&
              portieriPerTempo[t].map((pid, i) => (
                <select
                  key={i}
                  value={pid}
                  onChange={(e) => {
                    const gid = e.target.value;
                    setPortieriPerTempo((prev) => {
                      const up = prev.map((arr) => [...arr]);
                      up[t][i] = gid;
                      return up;
                    });
                  }}
                  className="w-full sm:w-60 mb-2 p-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">-- Seleziona portiere --</option>
                  {portieriStagione.map((pl) => (
                    <option key={pl.id} value={pl.id}>{pl.cognome} {pl.nome}</option>
                  ))}
                </select>
              ))}

            {/* Ospite */}
            <div className="grid grid-cols-[180px_1fr] items-center mt-2">
              <label className="font-bold text-gray-800">{getNomeSquadra(squadraOspite)}:</label>
              <input
                type="number"
                value={goalOspite[t]}
                onChange={(e) => handleChangeGoal(t, "ospite", e.target.value)}
                className="w-20 p-1 border border-gray-300 rounded text-sm"
                onFocus={(e) => e.target.select()}
              />
            </div>
            {isMontecarlo(squadraOspite) &&
              marcatoriPerTempo[t].map((m, i) => (
                <select
                  key={i}
                  value={m}
                  onChange={(e) => handleMarcatore(t, i, e.target.value)}
                  className="w-full sm:w-60 mb-2 p-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">-- Seleziona marcatore --</option>
                  {giocatoriStagione
                    .filter((g) => formazione.includes(g.id))
                    .map((pl) => (
                      <option key={pl.id} value={pl.id}>{pl.cognome} {pl.nome}</option>
                    ))}
                </select>
              ))}
            {!isMontecarlo(squadraOspite) &&
              portieriPerTempo[t].map((pid, i) => (
                <select
                  key={i}
                  value={pid}
                  onChange={(e) => {
                    const gid = e.target.value;
                    setPortieriPerTempo((prev) => {
                      const up = prev.map((arr) => [...arr]);
                      up[t][i] = gid;
                      return up;
                    });
                  }}
                  className="w-full sm:w-60 mb-2 p-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">-- Seleziona portiere --</option>
                  {portieriStagione.map((pl) => (
                    <option key={pl.id} value={pl.id}>{pl.cognome} {pl.nome}</option>
                  ))}
                </select>
              ))}
          </div>
        ))}

        {/* Azioni */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handleAnnulla}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
          >
            Annulla
          </button>
          <button
            onClick={handleSalva}
            className="bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] text-white px-4 py-2 rounded"
          >
            Salva modifiche
          </button>
        </div>
      </div>
    </div>
  );
}
