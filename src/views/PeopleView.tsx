import { useMemo, useState } from "react";
import type { Dataset } from "../data/types";
import { personSummaries, type PersonSummary } from "../lib/aggregate";
import Sparkline from "../ui/Sparkline";
import { LAYER_VAR, shortDate, usdFull } from "../ui/format";

type SortKey = "name" | "role" | "team" | "mtdCost";

function DrillDown({ row, providerLayer }: { row: PersonSummary; providerLayer: Map<string, keyof typeof LAYER_VAR> }) {
  const max = row.byProvider[0]?.cost ?? 1;
  return (
    <div className="card">
      <h2>Person</h2>
      <p className="drill-title">{row.name}</p>
      <p className="sub">{row.role} · {row.team} · {usdFull(Math.round(row.mtdCost))} MTD</p>

      <h2 style={{ marginTop: 14 }}>Spend by tool · MTD</h2>
      {row.byProvider.map((p) => (
        <div className="split-row" key={p.provider}>
          <span className="split-label">{p.name}</span>
          <span className="bar-track" style={{ background: "color-mix(in oklab, var(--ink) 6%, transparent)" }}>
            <span
              style={{
                width: `${(p.cost / max) * 100}%`,
                background: LAYER_VAR[providerLayer.get(p.provider)!],
              }}
            />
          </span>
          <span className="split-val">{usdFull(Math.round(p.cost))}</span>
        </div>
      ))}

      {row.byModel.length > 0 && (
        <>
          <h2 style={{ marginTop: 14 }}>By model · MTD</h2>
          {row.byModel.map((m) => (
            <div className="split-row" key={m.modelId}>
              <span className="split-label" style={{ fontVariantNumeric: "tabular-nums" }}>{m.modelId}</span>
              <span className="split-val" style={{ marginLeft: "auto" }}>{usdFull(Math.round(m.cost))}</span>
            </div>
          ))}
        </>
      )}

      <h2 style={{ marginTop: 14 }}>Daily trend · 90 days</h2>
      <p className="sub">
        {shortDate(row.daily[0].date)} – {shortDate(row.daily[row.daily.length - 1].date)}
      </p>
      <Sparkline points={row.daily} />
    </div>
  );
}

export default function PeopleView({ data }: { data: Dataset }) {
  const [team, setTeam] = useState("All teams");
  const [role, setRole] = useState("All roles");
  const [sort, setSort] = useState<SortKey>("mtdCost");
  const [asc, setAsc] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const all = useMemo(() => personSummaries(data), [data]);
  const providerLayer = useMemo(
    () => new Map(data.providers.map((p) => [p.id as string, p.layer])),
    [data],
  );
  const teams = ["All teams", ...new Set(data.people.map((p) => p.team))];
  const roles = ["All roles", ...new Set(data.people.map((p) => p.role))];

  const rows = useMemo(() => {
    const filtered = all.filter(
      (r) => (team === "All teams" || r.team === team) && (role === "All roles" || r.role === role),
    );
    const dir = asc ? 1 : -1;
    return [...filtered].sort((a, b) =>
      sort === "mtdCost"
        ? dir * (a.mtdCost - b.mtdCost)
        : dir * String(a[sort]).localeCompare(String(b[sort])),
    );
  }, [all, team, role, sort, asc]);

  const selectedRow = rows.find((r) => r.personId === selected) ?? rows[0];

  const header = (key: SortKey, label: string, num = false) => (
    <th
      className={num ? "num" : undefined}
      aria-sort={sort === key ? (asc ? "ascending" : "descending") : undefined}
      onClick={() => (sort === key ? setAsc(!asc) : (setSort(key), setAsc(key !== "mtdCost")))}
    >
      {label} {sort === key ? (asc ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div className="grid two-col">
      <div className="card">
        <h2>People · MTD cost</h2>
        <p className="sub">Seats + bespoke API usage attributed to each person. Click a row to drill down.</p>
        <div className="filters">
          <select value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Filter by team">
            {teams.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
            {roles.map((r) => <option key={r}>{r}</option>)}
          </select>
          <span className="count">{rows.length} of {all.length} people</span>
        </div>
        <table>
          <thead>
            <tr>
              {header("name", "Name")}
              {header("role", "Role")}
              {header("team", "Team")}
              <th>Tools</th>
              {header("mtdCost", "MTD cost", true)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.personId}
                className={selectedRow?.personId === r.personId ? "selected" : undefined}
                onClick={() => setSelected(r.personId)}
                style={{ cursor: "pointer" }}
              >
                <td><b>{r.name}</b></td>
                <td>{r.role}</td>
                <td>{r.team}</td>
                <td>
                  {r.byProvider.slice(0, 3).map((p) => (
                    <span className="chip" key={p.provider}>{p.name}</span>
                  ))}
                </td>
                <td className="num">{usdFull(Math.round(r.mtdCost))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRow && <DrillDown row={selectedRow} providerLayer={providerLayer} />}
    </div>
  );
}
