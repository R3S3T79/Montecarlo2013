// src/pages/tornei/NuovoTorneo/ModificaRisultatoEliminazione.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";

interface Squadra {
  id: string;
  nome: string;
  logo_url: string | null;
}

interface MatchRecord {
  id: string;
  squadra_casa: string | null;
  squadra_ospite: string | null;
  gol_casa: number;
  gol_ospite: number;
  rigori_vincitore: string | null;
  data_match: string | null;
  match_number: number;
  round_number: number;
  next_match_id: string | null;
}

export default function ModificaRisultatoEliminazione() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [teams, setTeams] = useState<{ [key: string]: Squadra }>({});
  const [goal1, setGoal1] = useState(0);
  const [goal2, setGoal2] = useState(0);
  const [rigoriVincitore, setRigoriVincitore] = useState<string | null>(null);
  const [dataOra, setDataOra] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: m } = await supabase
        .from("tornei_eliminazione")
        .select(
          "id, squadra_casa, squadra_ospite, gol_casa, gol_ospite, rigori_vincitore, data_match, match_number, round_number, next_match_id"
        )
        .eq("id", id)
        .single();
      if (!m) {
        navigate(-1);
        return;
      }
      setMatch(m);
      setGoal1(m.gol_casa);
      setGoal2(m.gol_ospite);
      setRigoriVincitore(m.rigori_vincitore);
      setDataOra(m.data_match ? m.data_match.slice(0, 16) : "");

      const ids = [m.squadra_casa, m.squadra_ospite].filter(Boolean) as string[];
      if (ids.length) {
        const { data: sqs } = await supabase
          .from("squadre")
          .select("id,nome,logo_url")
          .in("id", ids);
        if (sqs) {
          const map: { [key: string]: Squadra } = {};
          sqs.forEach((s) => (map[s.id] = s));
          setTeams(map);
        }
      }
      setLoading(false);
    })();
  }, [id, navigate]);

  const handleSaveResults = async () => {
    if (!match || !id) return;
    setSaving(true);

    let winner_id: string | null = null;
    if (goal1 > goal2) winner_id = match.squadra_casa;
    else if (goal2 > goal1) winner_id = match.squadra_ospite;
    else winner_id = rigoriVincitore;

    const updates = {
      gol_casa: goal1,
      gol_ospite: goal2,
      rigori_vincitore: goal1 === goal2 ? rigoriVincitore : null,
      data_match: dataOra ? `${dataOra}:00` : null,
      vincitore: winner_id,
    };

    const { error: saveErr } = await supabase
      .from("tornei_eliminazione")
      .update(updates)
      .eq("id", id);

    if (!saveErr && winner_id && match.next_match_id) {
      const campo = match.match_number % 2 === 1 ? "squadra_casa" : "squadra_ospite";
      await supabase
        .from("tornei_eliminazione")
        .update({ [campo]: winner_id })
        .eq("id", match.next_match_id);
    }

    setSaving(false);
    if (saveErr) {
      alert("Errore salvataggio: " + saveErr.message);
    } else {
      navigate(-1);
    }
  };

  const handleSaveDateOnly = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase
      .from("tornei_eliminazione")
      .update({ data_match: dataOra ? `${dataOra}:00` : null })
      .eq("id", id);
    setSaving(false);
    if (error) {
      alert("Errore salvataggio data: " + error.message);
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-2">
        <div className="rounded-xl border border-gray-200 bg-white/90 px-6 py-4 shadow-montecarlo">
          <div className="text-sm font-semibold text-montecarlo-secondary">
            Caricamento…
          </div>
        </div>
      </div>
    );
  }

  if (!match?.squadra_casa || !match?.squadra_ospite) {
    return (
      <div className="min-h-screen mt-2 w-full px-2 pb-6 box-border">
        <div className="max-w-md mx-auto overflow-hidden rounded-xl border border-gray-200 bg-white/90 shadow-montecarlo">
          <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

          <div className="p-6 text-center">
            <p className="font-medium text-gray-700">
              Le squadre non sono ancora definite per questa partita.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const casa = teams[match.squadra_casa]!;
  const ospite = teams[match.squadra_ospite]!;

  return (
    <div className="min-h-screen mt-2 w-full px-2 pb-6 box-border">
      <div className="w-full max-w-md mx-auto">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-montecarlo">

          <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

          <div className="p-4 sm:p-6 space-y-5">

            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Modifica Risultato
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Aggiorna risultato, rigori e data dell'incontro
              </p>
            </div>

            {/* CASA */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                Casa
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {casa.logo_url && (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100">
                      <img
                        src={casa.logo_url}
                        alt={casa.nome}
                        className="h-9 w-9 rounded-full object-contain"
                      />
                    </div>
                  )}

                  <span
                    className={`truncate font-semibold ${
                      goal1 === goal2 && rigoriVincitore === match.squadra_casa
                        ? "text-green-600"
                        : "text-gray-900"
                    }`}
                  >
                    {casa.nome}{" "}
                    {goal1 === goal2 &&
                      rigoriVincitore === match.squadra_casa &&
                      "🏆"}
                  </span>
                </div>

                <input
                  type="number"
                  min={0}
                  value={goal1}
                  onChange={(e) => setGoal1(+e.currentTarget.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-11 w-16 shrink-0 rounded-lg border border-gray-300 bg-white text-center text-xl font-bold text-gray-900 outline-none transition focus:border-montecarlo-secondary focus:ring-2 focus:ring-red-200"
                />
              </div>
            </div>

            {/* OSPITE */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                Ospite
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {ospite.logo_url && (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100">
                      <img
                        src={ospite.logo_url}
                        alt={ospite.nome}
                        className="h-9 w-9 rounded-full object-contain"
                      />
                    </div>
                  )}

                  <span
                    className={`truncate font-semibold ${
                      goal1 === goal2 && rigoriVincitore === match.squadra_ospite
                        ? "text-green-600"
                        : "text-gray-900"
                    }`}
                  >
                    {ospite.nome}{" "}
                    {goal1 === goal2 &&
                      rigoriVincitore === match.squadra_ospite &&
                      "🏆"}
                  </span>
                </div>

                <input
                  type="number"
                  min={0}
                  value={goal2}
                  onChange={(e) => setGoal2(+e.currentTarget.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-11 w-16 shrink-0 rounded-lg border border-gray-300 bg-white text-center text-xl font-bold text-gray-900 outline-none transition focus:border-montecarlo-secondary focus:ring-2 focus:ring-red-200"
                />
              </div>
            </div>

            {/* RIGORI */}
            {goal1 === goal2 && (
              <div className="rounded-xl border border-red-100 bg-red-50/60 p-3">
                <span className="block text-sm font-semibold text-gray-800 mb-2">
                  Vincitore ai rigori
                </span>

                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-gray-100">
                    <input
                      type="radio"
                      name="rigori"
                      checked={rigoriVincitore === match.squadra_casa}
                      onChange={() => setRigoriVincitore(match.squadra_casa!)}
                      className="accent-red-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {casa.nome}
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-gray-100">
                    <input
                      type="radio"
                      name="rigori"
                      checked={rigoriVincitore === match.squadra_ospite}
                      onChange={() => setRigoriVincitore(match.squadra_ospite!)}
                      className="accent-red-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {ospite.nome}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* DATA & ORA */}
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-gray-700">
                Data &amp; Ora Incontro
              </label>

              <input
                type="datetime-local"
                value={dataOra}
                onChange={(e) => setDataOra(e.currentTarget.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-montecarlo-secondary focus:ring-2 focus:ring-red-200"
              />
            </div>

            {/* PULSANTI */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleSaveResults}
                disabled={saving}
                className="w-full rounded-lg bg-gradient-to-br from-[#d61f1f] to-[#f45e5e] py-2.5 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Salva Risultato e Data"}
              </button>

              <button
                onClick={handleSaveDateOnly}
                disabled={saving}
                className="w-full rounded-lg border border-red-200 bg-red-50 py-2.5 font-semibold text-montecarlo-secondary transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Salva Solo Data"}
              </button>

              <button
                onClick={() => navigate(-1)}
                disabled={saving}
                className="w-full rounded-lg border border-gray-200 bg-gray-100 py-2.5 font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
              >
                Indietro
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}