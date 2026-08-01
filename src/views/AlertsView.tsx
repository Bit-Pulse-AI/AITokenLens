import type { Dataset } from "../data/types";
import { computeRecommendations } from "../data/generate";
import { teamBudgetStatus } from "../lib/aggregate";
import { DEFAULT_ALERT_CONFIG, type AlertConfig } from "../lib/alerts";
import { pct, shortDate, usd, usdFull } from "../ui/format";

const SEV_ICON = { critical: "▲", warning: "◆", info: "●" } as const;
const SEV_RANK = { critical: 0, warning: 1, info: 2 } as const;
const KIND_LABEL = {
  "model-rightsizing": "Model right-sizing",
  "batch-api": "Batch API",
  "prompt-caching": "Prompt caching",
} as const;

export default function AlertsView({
  data,
  config,
  onConfigChange,
}: {
  data: Dataset;
  config: AlertConfig;
  onConfigChange: (c: AlertConfig) => void;
}) {
  const budgets = teamBudgetStatus(data);
  const recs = computeRecommendations(data);
  const totalSavings = recs.reduce((s, r) => s + r.monthlySavings, 0);
  const alerts = [...data.alerts].sort(
    (a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || b.date.localeCompare(a.date),
  );

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid two-col">
        <div className="card">
          <h2>Alert feed</h2>
          <p className="sub">Sorted by severity, then recency.</p>
          {alerts.map((a) => (
            <div className="alert-item" key={a.id}>
              <div className="alert-head">
                <span className={`sev sev-${a.severity}`}>
                  {SEV_ICON[a.severity]} {a.severity}
                </span>
                <b>{a.title}</b>
                <span className="alert-date">{shortDate(a.date)}</span>
              </div>
              <p className="alert-narrative">{a.narrative}</p>
              <span className="chip">
                {a.entityType}: {a.entityId}
              </span>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Team budgets · MTD</h2>
          <p className="sub">Actual vs. monthly limit.</p>
          {budgets.map((b) => (
            <div key={b.team} style={{ marginBottom: 10 }}>
              <div className="split-row" style={{ margin: 0 }}>
                <span className="split-label">{b.team}</span>
                <span
                  className="bar-track"
                  style={{ background: "color-mix(in oklab, var(--ink) 6%, transparent)" }}
                >
                  <span
                    style={{
                      width: `${Math.min(100, b.utilization * 100)}%`,
                      background:
                        b.utilization > 1 ? "var(--status-critical)" : "var(--series-cloud)",
                    }}
                  />
                </span>
                <span className="split-val">{pct(b.utilization)}</span>
              </div>
              <div className="kpi-note" style={{ paddingLeft: 2 }}>
                {usdFull(Math.round(b.spend))} of {usdFull(b.limit)}
                {b.utilization > 1 && (
                  <span className="sev sev-critical"> · ▲ {usd(b.spend - b.limit)} over</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Alert rules</h2>
        <p className="sub">
          Alerts recompute live from these thresholds and budgets — tune them and watch the
          ticker, KPIs, and anomaly badges follow. Saved in your browser.
        </p>
        <div className="rules-grid">
          <label className="rule">
            <span>Budget warning above</span>
            <span className="rule-input">
              <input
                type="number"
                min={10}
                step={5}
                value={Math.round(config.budgetWarnAt * 100)}
                onChange={(e) =>
                  onConfigChange({ ...config, budgetWarnAt: Number(e.target.value) / 100 })
                }
              />
              <span className="unit">% of budget</span>
            </span>
          </label>
          <label className="rule">
            <span>Agent anomaly above</span>
            <span className="rule-input">
              <input
                type="number"
                min={1.5}
                step={0.5}
                value={config.anomalyMultiplier}
                onChange={(e) =>
                  onConfigChange({ ...config, anomalyMultiplier: Number(e.target.value) })
                }
              />
              <span className="unit">× median daily cost</span>
            </span>
          </label>
          {budgets.map((b) => (
            <label className="rule" key={b.team}>
              <span>{b.team} budget</span>
              <span className="rule-input">
                <span className="unit">$</span>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={b.limit}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      budgetOverrides: {
                        ...config.budgetOverrides,
                        [b.team]: Number(e.target.value),
                      },
                    })
                  }
                />
                <span className="unit">/mo</span>
              </span>
            </label>
          ))}
        </div>
        <button
          className="import-btn"
          style={{ marginTop: 10 }}
          onClick={() => onConfigChange(DEFAULT_ALERT_CONFIG)}
        >
          Reset to defaults
        </button>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <h2 style={{ margin: 0 }}>Savings recommendations</h2>
          <span className="sub" style={{ margin: 0 }}>
            {usd(totalSavings)}/mo identified — computed from actual usage × list-price deltas
          </span>
        </div>
        <div className="rec-grid">
          {recs.map((r) => (
            <div className="rec-card" key={r.id}>
              <span className="chip">{KIND_LABEL[r.kind]}</span>
              <p className="rec-title">{r.title}</p>
              <p className="sub" style={{ margin: "2px 0 8px" }}>{r.detail}</p>
              <div className="rec-savings">
                <span className="kpi-value delta-good" style={{ fontSize: 26, margin: 0 }}>
                  {usd(r.monthlySavings)}
                </span>
                <span className="kpi-note">/month</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
