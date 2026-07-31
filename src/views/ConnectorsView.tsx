import { CONNECTORS, TIER_META, type Connector, type ConnectorTier } from "../data/connectors";

const TIERS: ConnectorTier[] = ["full-api", "allocation", "csv-import"];

const STATUS_META = {
  connected: { label: "Connected", cls: "status-connected" },
  available: { label: "Available", cls: "status-available" },
  planned: { label: "Planned", cls: "status-planned" },
} as const;

function Cover({ value }: { value: boolean | "allocated" }) {
  if (value === true) return <span className="cover cover-yes" title="Direct from vendor data">●</span>;
  if (value === "allocated")
    return <span className="cover cover-alloc" title="Allocated: seat price × assignment × activity">◐</span>;
  return <span className="cover cover-no" title="Not available from this vendor">○</span>;
}

function TierSection({ tier, rows }: { tier: ConnectorTier; rows: Connector[] }) {
  const meta = TIER_META[tier];
  return (
    <div className="card">
      <h2>{meta.label}</h2>
      <p className="sub">{meta.blurb}</p>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Connector</th>
              <th>Status</th>
              <th>How we get the data</th>
              <th style={{ textAlign: "center" }}>Per-model</th>
              <th style={{ textAlign: "center" }}>Per-person</th>
              <th style={{ textAlign: "center" }}>Per-agent</th>
              <th>Freshness</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.name}>
                <td><b>{c.name}</b></td>
                <td>
                  <span className={`status-pill ${STATUS_META[c.status].cls}`}>
                    {STATUS_META[c.status].label}
                  </span>
                </td>
                <td style={{ color: "var(--ink-2)" }}>{c.mechanism}</td>
                <td style={{ textAlign: "center" }}><Cover value={c.perModel} /></td>
                <td style={{ textAlign: "center" }}><Cover value={c.perPerson} /></td>
                <td style={{ textAlign: "center" }}><Cover value={c.perAgent} /></td>
                <td style={{ color: "var(--ink-2)", whiteSpace: "nowrap" }}>{c.latency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ConnectorsView() {
  const connected = CONNECTORS.filter((c) => c.status === "connected").length;
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ display: "flex", alignItems: "baseline", gap: 18, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Coverage</h2>
        <span className="sub" style={{ margin: 0 }}>
          {connected} of {CONNECTORS.length} connectors live · honest tiering: where vendors lock
          data in admin consoles, we say so — and import it anyway.
        </span>
        <span className="legend" style={{ margin: "0 0 0 auto" }}>
          <span><span className="cover cover-yes">●</span> direct</span>
          <span><span className="cover cover-alloc">◐</span> allocated</span>
          <span><span className="cover cover-no">○</span> not available</span>
        </span>
      </div>
      {TIERS.map((tier) => (
        <TierSection key={tier} tier={tier} rows={CONNECTORS.filter((c) => c.tier === tier)} />
      ))}
    </div>
  );
}
