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

interface TiroRigore {
  id: string;
  giocatore_stagione_id: string | null;
  portiere_stagione_id: string | null;
  squadra_id: string;
  ordine: number;
  esito: "segnato" | "sbagliato";
}

interface Cartellino {
  id: string;
  giocatore_stagione_id: string;
  tipo: "giallo" | "rosso";
  periodo: number;
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
// 1. Assist per ogni goal e per ogni tempo
const [assistPerTempo, setAssistPerTempo] = useState<string[][]>([[], [], [], []]);
const [portieriPerTempo, setPortieriPerTempo] = useState<string[][]>([[], [], [], []]);
  const [giocatoriStagione, setGiocatoriStagione] = useState<Giocatore[]>([]);
  const [portieriStagione, setPortieriStagione] = useState<Giocatore[]>([]);
  const [showFormazione, setShowFormazione] = useState(false);
  const [minutiGiocati, setMinutiGiocati] = useState<Record<string, number>>({});
  const [haSupplementari, setHaSupplementari] = useState(false);
  const [rigoriCasa, setRigoriCasa] = useState(0);
const [rigoriOspite, setRigoriOspite] = useState(0);
const [haRigori, setHaRigori] = useState(false);
const [mostraRigori, setMostraRigori] = useState(false);
const [tiriRigori, setTiriRigori] = useState<TiroRigore[]>([]);
const [rigoriDaEliminare, setRigoriDaEliminare] = useState<string[]>([]);
const [cartellini, setCartellini] = useState<Cartellino[]>([]);
const [cartelliniDaEliminare, setCartelliniDaEliminare] = useState<string[]>([]);
  


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
        setGoalCasa([
  p.goal_a1 || 0,
  p.goal_a2 || 0,
  p.goal_a3 || 0,
  p.goal_a4 || 0,
]);

setGoalOspite([
  p.goal_b1 || 0,
  p.goal_b2 || 0,
  p.goal_b3 || 0,
  p.goal_b4 || 0,
]);

setRigoriCasa(p.rigori_a || 0);
setRigoriOspite(p.rigori_b || 0);
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

const { data: minutiSupplementari } = await supabase
  .from("minuti_giocati")
  .select("run_index")
  .eq("partita_id", id)
  .in("run_index", [3, 4])
  .limit(1);

  // 🔹 Carico i cartellini già registrati nella partita
const { data: cartelliniPartita } = await supabase
  .from("cartellini")
  .select("id, giocatore_stagione_id, tipo, periodo")
  .eq("partita_id", id);

if (cartelliniPartita) {
  setCartellini(cartelliniPartita as Cartellino[]);
}

setHaSupplementari(!!minutiSupplementari?.length);
const { data: rigoriPartita } = await supabase
  .from("rigori_partita")
  .select("id, giocatore_stagione_id, portiere_stagione_id, squadra_id, ordine, esito")
  .eq("partita_id", id)
  .order("ordine", { ascending: true });

if (rigoriPartita) {
  setTiriRigori(rigoriPartita as TiroRigore[]);
  setHaRigori(rigoriPartita.length > 0);
}


      const { data: md } = await supabase
        .from("marcatori")
.select("periodo, giocatore_stagione_id, assist_giocatore_stagione_id, portiere_subisce_id")
.eq("partita_id", id);
      if (md) {
  const marcArr: string[][] = [[], [], [], []];
  const assistArr: string[][] = [[], [], [], []];
  const portArr: string[][] = [[], [], [], []];
        md.forEach((m) => {
          if (m.periodo >= 1 && m.periodo <= 4) {
            if (m.giocatore_stagione_id) {
  marcArr[m.periodo - 1].push(m.giocatore_stagione_id);
  assistArr[m.periodo - 1].push(m.assist_giocatore_stagione_id || "");
}
            if (m.portiere_subisce_id) portArr[m.periodo - 1].push(m.portiere_subisce_id);
          }
        });
        setMarcatoriPerTempo(marcArr);
setAssistPerTempo(assistArr);
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

      setAssistPerTempo((prev) => {
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

  const handleChangeRigori = (
  lato: "casa" | "ospite",
  valore: string
) => {
  const nuovoTotale = Math.max(0, parseInt(valore) || 0);
  const squadraId = lato === "casa" ? squadraCasa : squadraOspite;

  setTiriRigori((prev) => {
    const tiriSquadra = prev.filter(
      (r) => r.squadra_id === squadraId
    );

    // Aggiungo i tiri mancanti
    if (nuovoTotale > tiriSquadra.length) {
      const quantiAggiungere = nuovoTotale - tiriSquadra.length;
      const nuovoArray = [...prev];

      for (let i = 0; i < quantiAggiungere; i++) {
        const ordineMassimo = nuovoArray
          .filter((r) => r.squadra_id === squadraId)
          .reduce((max, r) => Math.max(max, r.ordine), 0);

        nuovoArray.push({
  id: `nuovo-${squadraId}-${ordineMassimo + 1}-${Date.now()}-${i}`,
  giocatore_stagione_id: null,
  portiere_stagione_id: null,
  squadra_id: squadraId,
  ordine: ordineMassimo + 1,
  esito: "segnato",
});
      }

      return nuovoArray;
    }

    // Elimino gli ultimi tiri, indipendentemente dall'esito
    if (nuovoTotale < tiriSquadra.length) {
      const quantiRimuovere = tiriSquadra.length - nuovoTotale;

      const idsDaRimuovere = [...tiriSquadra]
        .sort((a, b) => b.ordine - a.ordine)
        .slice(0, quantiRimuovere)
        .map((r) => r.id);

      const idsEsistentiDaRimuovere = idsDaRimuovere.filter(
        (rid) => !rid.startsWith("nuovo-")
      );

      if (idsEsistentiDaRimuovere.length > 0) {
        setRigoriDaEliminare((prevIds) => [
          ...prevIds,
          ...idsEsistentiDaRimuovere.filter(
            (rid) => !prevIds.includes(rid)
          ),
        ]);
      }

      return prev.filter(
        (r) => !idsDaRimuovere.includes(r.id)
      );
    }

    return prev;
  });
};


  const handleAnnulla = () => navigate(`/partita/${id}`);

  const handleSalva = async () => {
    const totalA = goalCasa.reduce((a, b) => a + b, 0);
    const totalB = goalOspite.reduce((a, b) => a + b, 0);
        const totaleRigoriCasa = haRigori
      ? tiriRigori.filter(
          (r) => r.squadra_id === squadraCasa && r.esito === "segnato"
        ).length
      : rigoriCasa;

    const totaleRigoriOspite = haRigori
      ? tiriRigori.filter(
          (r) => r.squadra_id === squadraOspite && r.esito === "segnato"
        ).length
      : rigoriOspite;
    

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
        rigori_a: totaleRigoriCasa,
rigori_b: totaleRigoriOspite,
      })
      .eq("id", id);

    await supabase.from("marcatori").delete().eq("partita_id", id);

    const nuoviMarc: any[] = [];
    for (let i = 0; i < 4; i++) {
      const periodo = i + 1;

      for (const [idx, gid] of marcatoriPerTempo[i].entries()) {
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
  assist_giocatore_stagione_id: assistPerTempo[i][idx] || null,
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
// 🔹 Elimino i tiri dei rigori rimossi
if (rigoriDaEliminare.length > 0) {
  await supabase
    .from("rigori_partita")
    .delete()
    .in("id", rigoriDaEliminare);
}

// 🔹 Aggiorno o inserisco i singoli tiri dei rigori
for (const tiro of tiriRigori) {
  if (tiro.id.startsWith("nuovo-")) {
    await supabase
      .from("rigori_partita")
      .insert({
        partita_id: id!,
        stagione_id: stagioneId,
        giocatore_stagione_id: tiro.giocatore_stagione_id,
        portiere_stagione_id: tiro.portiere_stagione_id,
        squadra_id: tiro.squadra_id,
        ordine: tiro.ordine,
               esito: tiro.esito,
      });
  } else {
    await supabase
      .from("rigori_partita")
      .update({
        giocatore_stagione_id: tiro.giocatore_stagione_id,
        portiere_stagione_id: tiro.portiere_stagione_id,
        esito: tiro.esito,
      })
      .eq("id", tiro.id);
  }
}

// 1. Elimino i cartellini rimossi
if (cartelliniDaEliminare.length > 0) {
  await supabase
    .from("cartellini")
    .delete()
    .in("id", cartelliniDaEliminare);
}

// 2. Aggiorno o inserisco i cartellini
for (const cartellino of cartellini) {
  if (!cartellino.giocatore_stagione_id) continue;

  if (cartellino.id.startsWith("nuovo-")) {
    await supabase
      .from("cartellini")
.insert({
  partita_id: id!,
  stagione_id: stagioneId,
  giocatore_stagione_id: cartellino.giocatore_stagione_id,
  tipo: cartellino.tipo,
  periodo: cartellino.periodo,
});
  } else {
    await supabase
      .from("cartellini")
      .update({
        giocatore_stagione_id: cartellino.giocatore_stagione_id,
        tipo: cartellino.tipo,
      })
      .eq("id", cartellino.id);
  }
}

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
        {(haSupplementari ? [0, 1, 2, 3] : [0, 1]).map((t) => (
          <div key={t} className="bg-gray-50 p-4 rounded mb-4 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">
  {t === 0
    ? "1° Tempo"
    : t === 1
    ? "2° Tempo"
    : t === 2
    ? "1° Tempo Supplementare"
    : "2° Tempo Supplementare"}
</h3>

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
    <div key={i} className="flex flex-col sm:flex-row gap-2 mb-2">
      <select
        value={m}
        onChange={(e) => handleMarcatore(t, i, e.target.value)}
        className="w-full sm:w-60 p-2 border border-gray-300 rounded text-sm"
      >
        <option value="">-- Seleziona marcatore --</option>
        {giocatoriStagione
          .filter((g) => formazione.includes(g.id))
          .map((pl) => (
            <option key={pl.id} value={pl.id}>
              {pl.cognome} {pl.nome}
            </option>
          ))}
      </select>

      <select
        value={assistPerTempo[t][i] || ""}
        onChange={(e) => {
          const gid = e.target.value;

          setAssistPerTempo((prev) => {
            const up = prev.map((arr) => [...arr]);
            up[t][i] = gid;
            return up;
          });
        }}
        className="w-full sm:w-60 p-2 border border-gray-300 rounded text-sm"
      >
        <option value="">-- Nessun assist --</option>
        {giocatoriStagione
          .filter((g) => formazione.includes(g.id))
          .map((pl) => (
            <option key={pl.id} value={pl.id}>
              {pl.cognome} {pl.nome}
            </option>
          ))}
      </select>
    </div>
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
    <div key={i} className="flex flex-col sm:flex-row gap-2 mb-2">
      <select
        value={m}
        onChange={(e) => handleMarcatore(t, i, e.target.value)}
        className="w-full sm:w-60 p-2 border border-gray-300 rounded text-sm"
      >
        <option value="">-- Seleziona marcatore --</option>
        {giocatoriStagione
          .filter((g) => formazione.includes(g.id))
          .map((pl) => (
            <option key={pl.id} value={pl.id}>
              {pl.cognome} {pl.nome}
            </option>
          ))}
      </select>

      <select
        value={assistPerTempo[t][i] || ""}
        onChange={(e) => {
          const gid = e.target.value;

          setAssistPerTempo((prev) => {
            const up = prev.map((arr) => [...arr]);
            up[t][i] = gid;
            return up;
          });
        }}
        className="w-full sm:w-60 p-2 border border-gray-300 rounded text-sm"
      >
        <option value="">-- Nessun assist --</option>
        {giocatoriStagione
          .filter((g) => formazione.includes(g.id))
          .map((pl) => (
            <option key={pl.id} value={pl.id}>
              {pl.cognome} {pl.nome}
            </option>
          ))}
      </select>
    </div>
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

        {/* 1. Cartellini */}
<div className="flex justify-center mb-4">
  <button
    type="button"
    onClick={() =>
      setCartellini((prev) => [
        ...prev,
        {
  id: `nuovo-${Date.now()}`,
  giocatore_stagione_id: "",
  tipo: "giallo",
  periodo: 1,
},
      ])
    }
    className="bg-yellow-500 text-black px-4 py-2 rounded"
  >
    🟨 Aggiungi Cartellino
  </button>
</div>

{cartellini.length > 0 && (
  <div className="bg-gray-50 p-4 rounded mb-4 border border-gray-200">
    <h3 className="font-semibold text-gray-800 mb-3">Cartellini</h3>

    <div className="space-y-2">
      {cartellini.map((cartellino) => (
        <div
          key={cartellino.id}
          className="flex items-center gap-2"
        >
          <select
            value={cartellino.giocatore_stagione_id}
            onChange={(e) => {
              const gid = e.target.value;

              setCartellini((prev) =>
                prev.map((c) =>
                  c.id === cartellino.id
                    ? { ...c, giocatore_stagione_id: gid }
                    : c
                )
              );
            }}
            className="flex-1 p-2 border border-gray-300 rounded text-sm"
          >
            <option value="">-- Seleziona giocatore --</option>

            {giocatoriStagione
              .filter((g) => formazione.includes(g.id))
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.cognome} {g.nome}
                </option>
              ))}
          </select>

          <select
            value={cartellino.tipo}
            onChange={(e) => {
              const tipo = e.target.value as "giallo" | "rosso";

              setCartellini((prev) =>
                prev.map((c) =>
                  c.id === cartellino.id
                    ? { ...c, tipo }
                    : c
                )
              );
            }}
            className="p-2 border border-gray-300 rounded text-sm"
          >
            <option value="giallo">🟨 Giallo</option>
            <option value="rosso">🟥 Rosso</option>
          </select>
          <select
  value={cartellino.periodo}
  onChange={(e) => {
    const periodo = Number(e.target.value);

    setCartellini((prev) =>
      prev.map((c) =>
        c.id === cartellino.id
          ? { ...c, periodo }
          : c
      )
    );
  }}
  className="p-2 border border-gray-300 rounded text-sm"
>
  <option value={1}>1° Tempo</option>
  <option value={2}>2° Tempo</option>

  {haSupplementari && (
    <>
      <option value={3}>1° Supplementare</option>
      <option value={4}>2° Supplementare</option>
    </>
  )}
</select>
          <button
  type="button"
  onClick={() => {
    if (!cartellino.id.startsWith("nuovo-")) {
      setCartelliniDaEliminare((prev) =>
        prev.includes(cartellino.id)
          ? prev
          : [...prev, cartellino.id]
      );
    }

    setCartellini((prev) =>
      prev.filter((c) => c.id !== cartellino.id)
    );
  }}
  className="p-2 text-red-600 hover:text-red-800"
  aria-label="Elimina Cartellino"
>
  🗑️
</button>
        </div>
      ))}
    </div>
  </div>
)}

                {!haRigori && !mostraRigori && (
          <div className="flex justify-center mb-4">
            <button
              type="button"
              onClick={() => setMostraRigori(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded"
            >
              ⚽ Aggiungi Rigori
            </button>
          </div>
        )}

                {/* Rigori */}
        {(haRigori || mostraRigori) && (
          <div className="bg-gray-50 p-4 rounded mb-4 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">Rigori</h3>
                        <div className="mb-4 space-y-2">
              {tiriRigori.map((tiro) => {
                const squadraMontecarlo = isMontecarlo(tiro.squadra_id);

                return (
                  <div
                    key={tiro.id}
                    className="grid grid-cols-[180px_1fr] items-center gap-2"
                  >
                    <label
  className={`text-sm font-bold ${
    isMontecarlo(tiro.squadra_id)
      ? "text-green-600"
      : "text-red-600"
  }`}
>
  {getNomeSquadra(tiro.squadra_id)} - Rigore {tiro.ordine}
</label>

                    <div className="flex gap-2">
                      {squadraMontecarlo && (
                        
                        <select
                          value={tiro.giocatore_stagione_id || ""}
                          onChange={(e) => {
                            const gid = e.target.value;

                            setTiriRigori((prev) =>
                              prev.map((r) =>
                                r.id === tiro.id
                                  ? {
                                      ...r,
                                      giocatore_stagione_id: gid || null,
                                    }
                                  : r
                              )
                            );
                          }}
                          className="p-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">-- Rigorista --</option>

                          {giocatoriStagione.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.cognome} {g.nome}
                            </option>
                          ))}
                        </select>
                      )}
{!squadraMontecarlo && (
  <select
    value={tiro.portiere_stagione_id || ""}
    onChange={(e) => {
      const pid = e.target.value;

      setTiriRigori((prev) =>
        prev.map((r) =>
          r.id === tiro.id
            ? {
                ...r,
                portiere_stagione_id: pid || null,
              }
            : r
        )
      );
    }}
    className="p-1 border border-gray-300 rounded text-sm"
  >
    <option value="">-- Portiere --</option>

    {portieriStagione.map((g) => (
      <option key={g.id} value={g.id}>
        {g.cognome} {g.nome}
      </option>
    ))}
  </select>
)}
                      <select
                        value={tiro.esito}
                        onChange={(e) => {
                          const esito = e.target.value as
                            | "segnato"
                            | "sbagliato";

                          setTiriRigori((prev) =>
                            prev.map((r) =>
                              r.id === tiro.id
                                ? { ...r, esito }
                                : r
                            )
                          );
                        }}
                        className="p-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="segnato">⚽ Segnato</option>
                        <option value="sbagliato">❌ Sbagliato</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-[180px_1fr] items-center mb-2">
              <label className="font-bold text-gray-800">
                {getNomeSquadra(squadraCasa)}:
              </label>
              <input
                type="number"
                value={tiriRigori.filter((r) => r.squadra_id === squadraCasa).length}
                onChange={(e) => handleChangeRigori("casa", e.target.value)}
                className="w-20 p-1 border border-gray-300 rounded text-sm"
                onFocus={(e) => e.target.select()}
              />
            </div>

            <div className="grid grid-cols-[180px_1fr] items-center">
              <label className="font-bold text-gray-800">
                {getNomeSquadra(squadraOspite)}:
              </label>
              <input
                type="number"
                value={tiriRigori.filter((r) => r.squadra_id === squadraOspite).length}
                onChange={(e) => handleChangeRigori("ospite", e.target.value)}
                className="w-20 p-1 border border-gray-300 rounded text-sm"
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>
        )}

      

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
