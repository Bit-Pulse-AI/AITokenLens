/** Connector coverage matrix — the integration story from the research
 * report (Section 8, verified against vendor docs July 2026). Honest
 * tiering is the sales asset: every competitor faces the same locked
 * consoles in tier 3. */

export type ConnectorTier = "full-api" | "allocation" | "csv-import";

export interface Connector {
  name: string;
  tier: ConnectorTier;
  status: "connected" | "available" | "planned";
  mechanism: string;
  perModel: boolean;
  perPerson: boolean | "allocated";
  perAgent: boolean;
  latency: string;
}

export const TIER_META: Record<
  ConnectorTier,
  { label: string; blurb: string }
> = {
  "full-api": {
    label: "Tier 1 · Full API",
    blurb: "Billing-grade data pulled automatically — per-person or per-agent dollars with no manual steps.",
  },
  allocation: {
    label: "Tier 2 · Allocation-grade",
    blurb: "Usage and license APIs exist; per-person cost is seat price × assignment × activity.",
  },
  "csv-import": {
    label: "Tier 3 · CSV import",
    blurb: "The vendor keeps consumption data in its admin console — scheduled exports until an API ships. Every competitor faces the same wall.",
  },
};

export const CONNECTORS: Connector[] = [
  {
    name: "AWS Bedrock",
    tier: "full-api",
    status: "connected",
    mechanism: "CUR 2.0 exports + IAM-principal cost allocation",
    perModel: true,
    perPerson: true,
    perAgent: true,
    latency: "~24h billing · near-real-time tokens",
  },
  {
    name: "Anthropic API / Claude",
    tier: "full-api",
    status: "connected",
    mechanism: "Usage & Cost API + Enterprise Analytics + Claude Code Analytics",
    perModel: true,
    perPerson: true,
    perAgent: true,
    latency: "~5 min",
  },
  {
    name: "GitHub Copilot",
    tier: "full-api",
    status: "connected",
    mechanism: "Seats + usage-metrics reports + enhanced billing API",
    perModel: true,
    perPerson: true,
    perAgent: false,
    latency: "daily",
  },
  {
    name: "OpenAI API",
    tier: "full-api",
    status: "connected",
    mechanism: "Usage API (per-key tokens) + Costs API (per-project dollars)",
    perModel: true,
    perPerson: "allocated",
    perAgent: true,
    latency: "minutes",
  },
  {
    name: "Azure AI Foundry",
    tier: "full-api",
    status: "connected",
    mechanism: "Cost Management FOCUS exports + Azure Monitor token metrics",
    perModel: true,
    perPerson: "allocated",
    perAgent: false,
    latency: "8–24h billing · 1-min tokens",
  },
  {
    name: "Google Vertex AI",
    tier: "full-api",
    status: "available",
    mechanism: "BigQuery billing export + request labels",
    perModel: true,
    perPerson: false,
    perAgent: true,
    latency: "intra-day, no SLA",
  },
  {
    name: "LLM gateways (LiteLLM, OpenRouter…)",
    tier: "full-api",
    status: "available",
    mechanism: "Spend APIs + OpenTelemetry GenAI ingest",
    perModel: true,
    perPerson: true,
    perAgent: true,
    latency: "real-time",
  },
  {
    name: "Microsoft 365 Copilot",
    tier: "allocation",
    status: "connected",
    mechanism: "Graph usage reports + license APIs + price book",
    perModel: false,
    perPerson: "allocated",
    perAgent: false,
    latency: "~48h",
  },
  {
    name: "Gemini for Workspace",
    tier: "allocation",
    status: "available",
    mechanism: "Admin SDK Reports API + license assignment",
    perModel: false,
    perPerson: "allocated",
    perAgent: false,
    latency: "daily",
  },
  {
    name: "ChatGPT Enterprise",
    tier: "csv-import",
    status: "connected",
    mechanism: "Admin-console CSV export (no analytics API exists)",
    perModel: false,
    perPerson: "allocated",
    perAgent: false,
    latency: "on upload",
  },
  {
    name: "Microsoft Copilot Studio",
    tier: "csv-import",
    status: "connected",
    mechanism: "Azure meters + admin-center credit exports (no public API)",
    perModel: false,
    perPerson: false,
    perAgent: true,
    latency: "on upload",
  },
  {
    name: "Security Copilot",
    tier: "csv-import",
    status: "planned",
    mechanism: "Usage dashboard Excel export",
    perModel: false,
    perPerson: "allocated",
    perAgent: false,
    latency: "on upload",
  },
];
