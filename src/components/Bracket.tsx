// src/components/Bracket.tsx
import React, { useMemo, useEffect, useRef, useState } from "react";
import { Team, MatchData } from "../types";

interface BracketProps {
  teams: Team[];
  matches: MatchData[];
  onEditResult: (matchId: string) => void;
}

const getTeamName = (teams: Team[], id: string | null): string =>
  id ? teams.find((t) => t.id === id)?.nome || "" : "";

const getMatchLabel = (i: number): string =>
  String.fromCharCode(65 + i);

const getPhaseName = (ri: number, total: number): string => {
  const phases = [
    "Finale",
    "Semifinale",
    "Quarti di Finale",
    "Ottavi di Finale",
    "Sedicesimi di Finale",
    "Trentaduesimi di Finale",
  ];
  return phases[total - 1 - ri] || "";
};

const formatDate = (d?: string | null): string =>
  d ? new Date(d).toLocaleDateString("it-IT") : "";

export default function Bracket({ teams, matches, onEditResult }: BracketProps) {
  const labeled = useRef<Record<string, MatchData & { displayLabel: string }>>({});

  // 1) costruisco i livelli
  const rounds = useMemo(() => {
    labeled.current = {};
    // clono map
    matches.forEach(m => {
      labeled.current[m.id] = { ...m, displayLabel: "" };
    });
    const nextSet = new Set(
      matches.map(m => m.next_match_id).filter(Boolean)
    );
    // primo livello
    const first = matches
      .filter(m => !nextSet.has(m.id))
      .sort((a, b) => (a.ordine_fase ?? 0) - (b.ordine_fase ?? 0))
      .map((m, idx) => {
        const copy = { ...m, displayLabel: getMatchLabel(idx) };
        labeled.current[m.id] = copy;
        return copy;
      });
    const levels: (MatchData & { displayLabel: string })[][] = [first];
    let curr = first;
    let counter = first.length;
    while (curr.length > 1) {
      const nextIds = Array.from(
        new Set(curr.map(m => m.next_match_id).filter(Boolean))
      );
      const nextLevel = nextIds.map(nid => {
        const base = labeled.current[nid!];
        const copy = { ...base, displayLabel: getMatchLabel(counter++) };
        labeled.current[nid!] = copy;
        return copy;
      });
      levels.push(nextLevel);
      curr = nextLevel;
    }
    return levels;
  }, [matches]);

  // 2) misuro larghezza
  const [maxW, setMaxW] = useState(200);
  useEffect(() => {
    const texts: string[] = [];
    rounds.forEach((lvl, ri) =>
      lvl.forEach(m => {
        // prendo genitori
        const parents = ri
          ? rounds[ri - 1].filter(p => p.next_match_id === m.id)
          : [];
        // due nomi o fallback
        if (m.squadra_casa_id) {
          texts.push(getTeamName(teams, m.squadra_casa_id));
        } else if (parents[0]?.winner_id) {
          texts.push(getTeamName(teams, parents[0].winner_id));
        } else {
          texts.push(`Vincente ${parents[0]?.displayLabel}`);
        }
        if (m.squadra_ospite_id) {
          texts.push(getTeamName(teams, m.squadra_ospite_id));
        } else if (parents[1]?.winner_id) {
          texts.push(getTeamName(teams, parents[1].winner_id));
        } else {
          texts.push(`Vincente ${parents[1]?.displayLabel}`);
        }
      })
    );
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.font = getComputedStyle(document.body).font;
    const widest = Math.max(...texts.map(t => ctx.measureText(t).width), 0);
    setMaxW(Math.max(widest + 40, 200));
  }, [rounds, teams]);

  const MATCH_H = 80;
  const V_GAP = 40;
  const COL_W = maxW + 40;

  // 3) calcolo top
  const getTop = (id: string, ri: number): number => {
    if (ri === 0) {
      const idx = rounds[0].findIndex(m => m.id === id);
      return ((idx * 2 + 1) * (MATCH_H + V_GAP)) / 2;
    }
    const parents = rounds[ri - 1].filter(m => m.next_match_id === id);
    const ys = parents.map(p => getTop(p.id, ri - 1));
    return ys.reduce((a, b) => a + b, 0) / ys.length;
  };

  // 4) calcolo dimensione svg
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!rounds.length) return;
    const w = rounds.length * COL_W;
    let h = 0;
    rounds.forEach((lvl, ri) =>
      lvl.forEach(m => {
        const bottom = getTop(m.id, ri) + MATCH_H;
        h = Math.max(h, bottom);
      })
    );
    setSize({ width: w + MATCH_H + 20, height: h + V_GAP });
  }, [rounds, COL_W]);

  return (
    <div className="p-4">
      <div className="overflow-x-auto overflow-y-hidden">
        <div className="flex justify-center min-w-max">
          <svg
            width={size.width}
            height={size.height}
            className="bg-gray-50 p-6 rounded border"
          >
            {/* linee */}
            <g>
              {rounds.slice(0, -1).map((lvl, ri) =>
                lvl.map(m => {
                  if (!m.next_match_id) return null;
                  const x1 = ri * COL_W + maxW;
                  const y1 = getTop(m.id, ri) + MATCH_H / 2;
                  const x2 = (ri + 1) * COL_W;
                  const y2 =
                    getTop(m.next_match_id!, ri + 1) + MATCH_H / 2;
                  const mid = x1 + (x2 - x1) / 2;
                  return (
                    <path
                      key={`${m.id}-line`}
                      d={`M${x1},${y1} L${mid},${y1} L${mid},${y2} L${x2},${y2}`}
                      fill="none"
                      stroke="#A0A0A0"
                      strokeWidth={2}
                    />
                  );
                })
              )}
            </g>

            {/* caselle */}
            {rounds.map((lvl, ri) => (
              <React.Fragment key={ri}>
                {/* titolo fase */}
                <text
                  x={ri * COL_W + maxW / 2}
                  y={16}
                  textAnchor="middle"
                  className="text-sm font-semibold text-gray-700 uppercase"
                >
                  {getPhaseName(ri, rounds.length)}
                </text>

                {lvl.map(m => {
                  const top = getTop(m.id, ri);
                  // genitori
                  const parents = ri
                    ? rounds[ri - 1].filter(p => p.next_match_id === m.id)
                    : [];
                  // DETTAGLIO NOME 1
                  let name1: string;
                  if (m.squadra_casa_id) {
                    name1 = getTeamName(teams, m.squadra_casa_id);
                  } else if (parents[0]?.winner_id) {
                    name1 = getTeamName(teams, parents[0].winner_id);
                  } else {
                    name1 = `Vincente ${parents[0]?.displayLabel}`;
                  }
                  // DETTAGLIO NOME 2
                  let name2: string;
                  if (m.squadra_ospite_id) {
                    name2 = getTeamName(teams, m.squadra_ospite_id);
                  } else if (parents[1]?.winner_id) {
                    name2 = getTeamName(teams, parents[1].winner_id);
                  } else {
                    name2 = `Vincente ${parents[1]?.displayLabel}`;
                  }
                  // punto rigori
                  const dot1 =
                    m.goal_casa === m.goal_ospite &&
                    m.rigori_vincitore === m.squadra_casa_id
                      ? "."
                      : "";
                  const dot2 =
                    m.goal_casa === m.goal_ospite &&
                    m.rigori_vincitore === m.squadra_ospite_id
                      ? "."
                      : "";

                  return (
                    <g
                      key={m.id}
                      transform={`translate(${ri * COL_W},${top})`}
                      className="cursor-pointer"
                      onClick={() => onEditResult(m.id)}
                    >
                      {/* sfondo */}
                      <rect
                        x={0}
                        y={0}
                        width={maxW}
                        height={MATCH_H}
                        rx={12}
                        ry={12}
                        fill="#fff"
                        stroke="#e2e8f0"
                        strokeWidth={2}
                      />
                      {/* header */}
                      <rect
                        x={0}
                        y={0}
                        width={maxW}
                        height={24}
                        rx={8}
                        ry={8}
                        fill="#ebf8ff"
                      />
                      <text
                        x={8}
                        y={16}
                        className="text-xs font-bold text-gray-800"
                      >
                        {m.displayLabel}
                      </text>
                      <text
                        x={maxW - 8}
                        y={16}
                        textAnchor="end"
                        className="text-xs text-gray-800"
                      >
                        {formatDate(m.data_ora)}
                      </text>

                      {/* squadra1 */}
                      <text x={8} y={40} className="text-sm text-gray-800">
                        {name1}
                      </text>
                      <text
                        x={maxW - 8}
                        y={40}
                        textAnchor="end"
                        className="text-sm font-bold text-blue-600"
                      >
                        {m.goal_casa}
                        {dot1}
                      </text>

                      {/* squadra2 */}
                      <text x={8} y={64} className="text-sm text-gray-800">
                        {name2}
                      </text>
                      <text
                        x={maxW - 8}
                        y={64}
                        textAnchor="end"
                        className="text-sm font-bold text-blue-600"
                      >
                        {m.goal_ospite}
                        {dot2}
                      </text>
                    </g>
                  );
                })}
              </React.Fragment>
            ))}

            {/* logo vincitore finale */}
            {(() => {
              const last = rounds[rounds.length - 1][0];
              if (!last || !last.winner_id) return null;
              const winner = teams.find(t => t.id === last.winner_id);
              if (!winner?.logo_url) return null;
              const top = getTop(last.id, rounds.length - 1);
              const left = (rounds.length - 1) * COL_W + maxW + 10;
              return (
                <image
                  href={winner.logo_url}
                  x={left}
                  y={top}
                  width={MATCH_H}
                  height={MATCH_H}
                  preserveAspectRatio="xMidYMid slice"
                />
              );
            })()}
          </svg>
        </div>
      </div>
    </div>
  );
}