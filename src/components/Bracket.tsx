// src/components/Bracket.tsx
import React, { useMemo, useEffect, useRef } from "react";
import { Team, MatchData } from "../types";

interface BracketProps {
  teams: Team[];
  matches: MatchData[];
  onEditResult: (matchId: string) => void;
}

const getTeam = (teams: Team[], id: string | null): Team | undefined =>
  id ? teams.find((t) => t.id === id) : undefined;

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
  // FIX: evitare Record a runtime -> usare annotazione con indice
  const labeled = useRef<{ [key: string]: MatchData & { displayLabel: string } }>({});

  const longestName = useMemo(() => {
    const allNames: string[] = [];
    matches.forEach((m) => {
      allNames.push(getTeam(teams, m.squadra_casa_id)?.nome || "");
      allNames.push(getTeam(teams, m.squadra_ospite_id)?.nome || "");
    });
    return allNames.reduce((a, b) => (a.length > b.length ? a : b), "");
  }, [teams, matches]);

  const textMeasureCanvas = useMemo(() => document.createElement("canvas").getContext("2d")!, []);
  textMeasureCanvas.font = "14px sans-serif";
  const measuredWidth = textMeasureCanvas.measureText(longestName).width;
  const dynamicBoxWidth = Math.min(300, Math.ceil(measuredWidth + 80));

  const BOX_W = dynamicBoxWidth;
  const BOX_H = 96;
  const V_GAP = 40;
  const COL_W = BOX_W + 60;

  const rounds = useMemo(() => {
    labeled.current = {};
    matches.forEach((m) => {
      labeled.current[m.id] = { ...m, displayLabel: "" };
    });

    const nextSet = new Set(matches.map((m) => m.next_match_id).filter(Boolean));

    const first = matches
      .filter((m) => !nextSet.has(m.id))
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
      const nextIds = Array.from(new Set(curr.map((m) => m.next_match_id).filter(Boolean)));
      const nextLevel = nextIds.map((nid) => {
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

  const getTop = (id: string, ri: number): number => {
    if (ri === 0) {
      const idx = rounds[0].findIndex((m) => m.id === id);
      return ((idx * 2 + 1) * (BOX_H + V_GAP)) / 2;
    }
    const parents = rounds[ri - 1].filter((m) => m.next_match_id === id);
    const ys = parents.map((p) => getTop(p.id, ri - 1));
    return ys.reduce((a, b) => a + b, 0) / ys.length;
  };

  const [size, setSize] = React.useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!rounds.length) return;
    const w = rounds.length * COL_W;
    let h = 0;
    rounds.forEach((lvl, ri) =>
      lvl.forEach((m) => {
        const bottom = getTop(m.id, ri) + BOX_H;
        h = Math.max(h, bottom);
      })
    );
    setSize({ width: w + BOX_H + 40, height: h + V_GAP + 40 });
  }, [rounds]);

  return (
    <div className="p-2 sm:p-4">
      <div className="overflow-x-auto overflow-y-hidden">
        <div className="flex justify-center min-w-max">
          <svg
            width={size.width}
            height={size.height}
            className="bg-transparent"
          >
            <defs>
              <linearGradient id="matchGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fff1f2" />
                <stop offset="100%" stopColor="#fee2e2" />
              </linearGradient>

              <filter id="shadow">
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="2"
                  floodColor="#000000"
                  floodOpacity="0.15"
                />
              </filter>
            </defs>

            {rounds.map((_, ri) => (
              <line
                key={`sep-${ri}`}
                x1={ri * COL_W - 20}
                y1={28}
                x2={ri * COL_W - 20}
                y2={size.height}
                stroke="#e5e7eb"
                strokeDasharray="5 5"
              />
            ))}

            <g>
              {rounds.slice(0, -1).map((lvl, ri) =>
                lvl.map((m) => {
                  if (!m.next_match_id) return null;
                  const x1 = ri * COL_W + BOX_W;
                  const y1 = getTop(m.id, ri) + BOX_H / 2;
                  const x2 = (ri + 1) * COL_W;
                  const y2 = getTop(m.next_match_id!, ri + 1) + BOX_H / 2;
                  const mid = x1 + (x2 - x1) / 2;
                  return (
                    <path
                      key={`${m.id}-line`}
                      d={`M${x1},${y1} L${mid},${y1} L${mid},${y2} L${x2},${y2}`}
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth={2}
                    />
                  );
                })
              )}
            </g>

            {rounds.map((lvl, ri) => (
              <React.Fragment key={ri}>
                <rect
                  x={ri * COL_W + 10}
                  y={2}
                  width={BOX_W - 20}
                  height={28}
                  rx={14}
                  ry={14}
                  fill="#fff1f2"
                  stroke="#fecaca"
                />

                <text
                  x={ri * COL_W + BOX_W / 2}
                  y={21}
                  textAnchor="middle"
                  className="text-xs font-bold uppercase"
                  fill="#b91c1c"
                >
                  {getPhaseName(ri, rounds.length)}
                </text>

                {lvl.map((m) => {
                  const top = getTop(m.id, ri);
                  const teamCasa = getTeam(teams, m.squadra_casa_id);
                  const teamOspite = getTeam(teams, m.squadra_ospite_id);
                  const parents = ri > 0
                    ? rounds[ri - 1].filter((p) => p.next_match_id === m.id)
                    : [];

                  const name1 = teamCasa?.nome || (parents[0]?.displayLabel ? `Vincente ${parents[0].displayLabel}` : "");
                  const name2 = teamOspite?.nome || (parents[1]?.displayLabel ? `Vincente ${parents[1].displayLabel}` : "");

                  const dot1 = m.gol_casa === m.gol_ospite && m.rigori_vincitore === m.squadra_casa_id ? "." : "";
                  const dot2 = m.gol_casa === m.gol_ospite && m.rigori_vincitore === m.squadra_ospite_id ? "." : "";

                  return (
                    <g
                      key={m.id}
                      transform={`translate(${ri * COL_W},${top})`}
                      onClick={() => onEditResult(m.id)}
                      style={{ filter: "url(#shadow)", cursor: "pointer" }}
                    >
                      <rect
                        x={0}
                        y={0}
                        width={BOX_W}
                        height={BOX_H}
                        rx={12}
                        ry={12}
                        fill="#ffffff"
                        stroke="#e5e7eb"
                        strokeWidth={1.5}
                      />

                      <rect
                        x={0}
                        y={0}
                        width={BOX_W}
                        height={28}
                        rx={12}
                        ry={12}
                        fill="url(#matchGradient)"
                      />

                      <rect
                        x={0}
                        y={20}
                        width={BOX_W}
                        height={8}
                        fill="url(#matchGradient)"
                      />

                      <text
                        x={10}
                        y={18}
                        className="text-xs font-bold"
                        fill="#b91c1c"
                      >
                        {m.displayLabel}
                      </text>

                      <text
                        x={BOX_W - 10}
                        y={18}
                        textAnchor="end"
                        className="text-xs"
                        fill="#6b7280"
                      >
                        {formatDate(m.data_ora)}
                      </text>

                      {teamCasa?.logo_url && (
                        <image
                          href={teamCasa.logo_url}
                          x={10}
                          y={36}
                          width={20}
                          height={20}
                          preserveAspectRatio="xMidYMid meet"
                        />
                      )}

                      <text
                        x={teamCasa?.logo_url ? 38 : 10}
                        y={50}
                        className="text-sm font-semibold"
                        fill="#1f2937"
                      >
                        {name1}
                      </text>

                      <text
                        x={BOX_W - 10}
                        y={50}
                        textAnchor="end"
                        className="text-base font-bold"
                        fill="#b91c1c"
                      >
                        {m.gol_casa}{dot1}
                      </text>

                      {teamOspite?.logo_url && (
                        <image
                          href={teamOspite.logo_url}
                          x={10}
                          y={64}
                          width={20}
                          height={20}
                          preserveAspectRatio="xMidYMid meet"
                        />
                      )}

                      <text
                        x={teamOspite?.logo_url ? 38 : 10}
                        y={78}
                        className="text-sm font-semibold"
                        fill="#1f2937"
                      >
                        {name2}
                      </text>

                      <text
                        x={BOX_W - 10}
                        y={78}
                        textAnchor="end"
                        className="text-base font-bold"
                        fill="#b91c1c"
                      >
                        {m.gol_ospite}{dot2}
                      </text>
                    </g>
                  );
                })}
              </React.Fragment>
            ))}

            {/* LOGO VINCITORE */}
            {(() => {
              const last = rounds[rounds.length - 1][0];
              if (!last || !last.vincitore_id) return null;
              const winner = getTeam(teams, last.vincitore_id);
              if (!winner?.logo_url) return null;
              const top = getTop(last.id, rounds.length - 1);
              const left = (rounds.length - 1) * COL_W + BOX_W + 14;

              return (
                <g transform={`translate(${left},${top})`}>
                  <rect
                    x={0}
                    y={0}
                    width={BOX_H}
                    height={BOX_H}
                    rx={14}
                    ry={14}
                    fill="#ffffff"
                    stroke="#fecaca"
                    strokeWidth={1.5}
                  />

                  <text
                    x={BOX_H / 2}
                    y={18}
                    textAnchor="middle"
                    className="text-[10px] font-bold uppercase"
                    fill="#b91c1c"
                  >
                    Vincitore
                  </text>

                  <image
                    href={winner.logo_url}
                    x={18}
                    y={26}
                    width={BOX_H - 36}
                    height={BOX_H - 36}
                    preserveAspectRatio="xMidYMid meet"
                  />
                </g>
              );
            })()}
          </svg>
        </div>
      </div>
    </div>
  );
}