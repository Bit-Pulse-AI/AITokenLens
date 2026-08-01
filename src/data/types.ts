/** The three spend layers a CFO needs in one place. */
export type Layer = "cloud" | "saas-seat" | "bespoke-api";

export type Role =
  | "Engineering Manager"
  | "Software Engineer"
  | "Designer"
  | "Business Owner"
  | "Data Analyst"
  | "Marketing Manager";

export type Team =
  | "Platform Engineering"
  | "Product Engineering"
  | "Design"
  | "Marketing"
  | "Sales Ops"
  | "Finance"
  | "Unattributed";

export type ProviderId =
  | "aws-bedrock"
  | "azure-ai-foundry"
  | "google-vertex"
  | "openai-api"
  | "anthropic-api"
  | "chatgpt-enterprise"
  | "m365-copilot"
  | "github-copilot"
  | "copilot-studio";

export type AgentPlatform = "AWS Bedrock" | "Azure AI Foundry" | "Copilot Studio";

export interface Provider {
  id: ProviderId;
  name: string;
  layer: Layer;
}

/** List prices in USD per million tokens. Anthropic prices are real list
 * prices; other vendors' are plausible mock figures for the demo. */
export interface ModelPrice {
  id: string;
  vendor: "Anthropic" | "OpenAI" | "Google";
  inputPerM: number;
  outputPerM: number;
  tier: "frontier" | "mini";
}

export interface Person {
  id: string;
  name: string;
  role: Role;
  team: Team;
  /** Seat-based tools this person holds a license for. */
  seats: ProviderId[];
}

export interface Agent {
  id: string;
  name: string;
  platform: AgentPlatform;
  ownerId: string;
  modelId: string;
  /** What the agent does — used by the model-choice recommender. */
  workload: "summarization" | "extraction" | "support" | "reconciliation" | "codegen";
}

export interface SpendRecord {
  /** ISO date, daily grain. */
  date: string;
  layer: Layer;
  provider: ProviderId;
  team: Team;
  cost: number;
  modelId?: string;
  personId?: string;
  agentId?: string;
  tokensIn?: number;
  tokensOut?: number;
}

export interface Budget {
  scope: "team";
  id: Team;
  monthlyLimit: number;
}

export type AlertType = "anomaly" | "budget-forecast" | "commitment-risk";
export type Severity = "critical" | "warning" | "info";

export interface Alert {
  id: string;
  type: AlertType;
  severity: Severity;
  date: string;
  entityType: "agent" | "team" | "provider";
  entityId: string;
  title: string;
  narrative: string;
}

export interface Recommendation {
  id: string;
  kind: "model-rightsizing" | "batch-api" | "prompt-caching";
  title: string;
  detail: string;
  monthlySavings: number;
  entityId: string;
}

export interface Dataset {
  generatedAt: string;
  days: number;
  people: Person[];
  agents: Agent[];
  providers: Provider[];
  models: ModelPrice[];
  records: SpendRecord[];
  budgets: Budget[];
  alerts: Alert[];
}
