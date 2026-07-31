import type { Dataset } from "../data/types";
import { agentSummaries } from "../lib/aggregate";
import Sparkline from "../ui/Sparkline";
import { shortDate, usdFull } from "../ui/format";

export default function AgentsView({
  data,
  onOpenAlerts,
}: {
  data: Dataset;
  onOpenAlerts: () => void;
}) {
  const agents = agentSummaries(data);
  const mtdTotal = agents.reduce((s, a) => s + a.mtdCost, 0);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
        <h2 style={{ margin: 0 }}>Where agents live</h2>
        <span className="sub" style={{ margin: 0 }}>
          {agents.length} production agents across AWS Bedrock, Azure AI Foundry, and Copilot
          Studio · {usdFull(Math.round(mtdTotal))} MTD
        </span>
      </div>

      <div className="agent-grid">
        {agents.map((a) => (
          <div className={`card agent-card ${a.anomaly ? "agent-anomaly" : ""}`} key={a.agentId}>
            {a.anomaly && (
              <div className="anomaly-banner">
                <span className="sev sev-critical">▲ runaway loop</span>
                <span>
                  {shortDate(a.anomaly.date)} · {usdFull(Math.round(a.anomaly.cost))} in one day ·{" "}
                  {a.anomaly.ratio.toFixed(1)}× median
                </span>
                <button className="link-btn" onClick={onOpenAlerts}>
                  View alert →
                </button>
              </div>
            )}
            <div className="agent-head">
              <div>
                <p className="drill-title">{a.name}</p>
                <p className="sub" style={{ margin: 0 }}>
                  {a.platform} · owned by {a.ownerName} ({a.team})
                </p>
              </div>
              <div className="agent-cost">
                <span className="kpi-value" style={{ fontSize: 24, margin: 0 }}>
                  {usdFull(Math.round(a.mtdCost))}
                </span>
                <span className="kpi-note">MTD</span>
              </div>
            </div>
            <div style={{ margin: "6px 0 10px" }}>
              <span className="chip">{a.modelId}</span>
              <span className="chip">{a.workload}</span>
            </div>
            <Sparkline
              points={a.daily}
              highlight={a.anomaly?.date}
              stroke={a.anomaly ? "var(--status-critical)" : "var(--series-cloud)"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
