import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Dataset } from "../data/types";
import {
  dailyLayerSeries,
  monthRecords,
  providerTotals,
  teamBudgetStatus,
} from "../lib/aggregate";
import { LAYER_LABEL, LAYER_VAR, pct, shortDate, usd, usdFull } from "../ui/format";

const SEV_ICON = { critical: "▲", warning: "◆", info: "●" } as const;

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + p.value, 0);
  return (
    <div className="viz-tooltip">
      <div className="t-date">{shortDate(String(label))}</div>
      {payload.map((p: any) => (
        <div className="t-row" key={p.dataKey}>
          <span>
            <span className="swatch" style={{ background: p.fill, display: "inline-block", width: 9, height: 9, borderRadius: 2, marginRight: 6 }} />
            {LAYER_LABEL[p.dataKey as keyof typeof LAYER_LABEL]}
          </span>
          <b>{usdFull(p.value)}</b>
        </div>
      ))}
      <div className="t-row" style={{ marginTop: 4, borderTop: "1px solid var(--grid)", paddingTop: 4 }}>
        <span>Total</span>
        <b>{usdFull(total)}</b>
      </div>
    </div>
  );
}

export default function OverviewView({ data }: { data: Dataset }) {
  const series = dailyLayerSeries(data);
  const providers = providerTotals(data);
  const budgets = teamBudgetStatus(data);
  const mtd = monthRecords(data).reduce((s, r) => s + r.cost, 0);
  const budgetTotal = budgets.reduce((s, b) => s + b.limit, 0);
  const budgetDelta = mtd - budgetTotal;
  const teamsOver = budgets.filter((b) => b.utilization > 1).length;
  const critical = data.alerts.filter((a) => a.severity === "critical").length;
  const layerShare = (["cloud", "saas-seat", "bespoke-api"] as const).map((layer) => ({
    layer,
    cost: monthRecords(data).filter((r) => r.layer === layer).reduce((s, r) => s + r.cost, 0),
  }));
  const topLayer = [...layerShare].sort((a, b) => b.cost - a.cost)[0];

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="ticker" role="list" aria-label="Alerts">
        {data.alerts.map((a) => (
          <span className="ticker-chip" role="listitem" key={a.id}>
            <span className={`sev sev-${a.severity}`}>
              {SEV_ICON[a.severity]} {a.severity}
            </span>
            <b>{a.title}</b>
          </span>
        ))}
      </div>

      <div className="grid kpis">
        <div className="card">
          <h2>AI spend · MTD</h2>
          <div className="kpi-value">{usdFull(Math.round(mtd))}</div>
          <div className="kpi-note">July 2026, all three layers</div>
        </div>
        <div className="card">
          <h2>Vs. total budget</h2>
          <div className={`kpi-value ${budgetDelta > 0 ? "delta-up-bad" : "delta-good"}`}>
            {budgetDelta > 0 ? "+" : "−"}{usd(Math.abs(budgetDelta))}
          </div>
          <div className="kpi-note">
            {pct(mtd / budgetTotal)} of {usd(budgetTotal)} budgeted · {teamsOver} team over
          </div>
        </div>
        <div className="card">
          <h2>Largest layer</h2>
          <div className="kpi-value">{LAYER_LABEL[topLayer.layer]}</div>
          <div className="kpi-note">{pct(topLayer.cost / mtd)} of monthly spend</div>
        </div>
        <div className="card">
          <h2>Open alerts</h2>
          <div className="kpi-value">{data.alerts.length}</div>
          <div className="kpi-note">
            <span className="sev sev-critical">▲ {critical} critical</span> · runaway agent loop
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Daily AI spend · last 90 days</h2>
        <p className="sub">Stacked by spend layer. Hover for exact figures.</p>
        <div className="legend">
          {(["cloud", "saas-seat", "bespoke-api"] as const).map((l) => (
            <span key={l}>
              <span className="swatch" style={{ background: LAYER_VAR[l] }} />
              {LAYER_LABEL[l]}
            </span>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tickLine={false}
              axisLine={{ stroke: "var(--baseline)" }}
              minTickGap={48}
            />
            <YAxis
              tickFormatter={(v: number) => usd(v)}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: "var(--baseline)" }} />
            <Area dataKey="cloud" stackId="1" isAnimationActive={false} fill="var(--series-cloud)" stroke="var(--surface)" strokeWidth={2} fillOpacity={1} />
            <Area dataKey="saas-seat" stackId="1" isAnimationActive={false} fill="var(--series-seat)" stroke="var(--surface)" strokeWidth={2} fillOpacity={1} />
            <Area dataKey="bespoke-api" stackId="1" isAnimationActive={false} fill="var(--series-api)" stroke="var(--surface)" strokeWidth={2} fillOpacity={1} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid two-col">
        <div className="card">
          <h2>Spend by provider · MTD</h2>
          <p className="sub">Colored by spend layer; every bar is labeled.</p>
          <ResponsiveContainer width="100%" height={providers.length * 34 + 24}>
            <BarChart data={providers} layout="vertical" margin={{ top: 0, right: 64, bottom: 0, left: 8 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={158}
                tickLine={false}
                axisLine={{ stroke: "var(--baseline)" }}
                tick={{ fill: "var(--ink-2)", fontSize: 12 }}
              />
              <Bar dataKey="cost" barSize={16} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {providers.map((p) => (
                  <Cell key={p.provider} fill={LAYER_VAR[p.layer]} />
                ))}
                <LabelList
                  dataKey="cost"
                  position="right"
                  formatter={(v: number) => usd(v)}
                  style={{ fill: "var(--ink)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Team budgets · MTD</h2>
          <p className="sub">Actual vs. monthly limit.</p>
          {budgets.map((b) => (
            <div className="split-row" key={b.team}>
              <span className="split-label">{b.team}</span>
              <span className="bar-track" style={{ background: "color-mix(in oklab, var(--ink) 6%, transparent)" }}>
                <span
                  style={{
                    width: `${Math.min(100, b.utilization * 100)}%`,
                    background: b.utilization > 1 ? "var(--status-critical)" : "var(--series-cloud)",
                  }}
                />
              </span>
              <span className="split-val">{pct(b.utilization)}</span>
            </div>
          ))}
          <p className="sub" style={{ marginTop: 10 }}>
            <span className="sev sev-critical">▲</span> Product Engineering is tracking{" "}
            {pct(budgets[0].utilization - 1)} over its monthly budget.
          </p>
        </div>
      </div>
    </div>
  );
}
