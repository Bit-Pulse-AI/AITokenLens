import type {
  Agent,
  Alert,
  Budget,
  Dataset,
  ModelPrice,
  Person,
  Provider,
  ProviderId,
  Recommendation,
  SpendRecord,
  Team,
} from "./types";

/** Fixed demo horizon: 90 days ending on the last day of a month, so
 * month-to-date equals a full month and budget math is easy to narrate. */
const END_DATE = "2026-07-31";
const DAYS = 90;
const SEED = 20260731;

/** mulberry32 — tiny deterministic PRNG. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PROVIDERS: Provider[] = [
  { id: "aws-bedrock", name: "AWS Bedrock", layer: "cloud" },
  { id: "azure-ai-foundry", name: "Azure AI Foundry", layer: "cloud" },
  { id: "google-vertex", name: "Google Vertex AI", layer: "cloud" },
  { id: "openai-api", name: "OpenAI API", layer: "bespoke-api" },
  { id: "anthropic-api", name: "Anthropic API", layer: "bespoke-api" },
  { id: "chatgpt-enterprise", name: "ChatGPT Enterprise", layer: "saas-seat" },
  { id: "m365-copilot", name: "Microsoft 365 Copilot", layer: "saas-seat" },
  { id: "github-copilot", name: "GitHub Copilot", layer: "saas-seat" },
  { id: "copilot-studio", name: "Microsoft Copilot Studio", layer: "saas-seat" },
];

/** Anthropic prices are real list prices ($/MTok); others are plausible mocks. */
const MODELS: ModelPrice[] = [
  { id: "claude-opus-5", vendor: "Anthropic", inputPerM: 5, outputPerM: 25, tier: "frontier" },
  { id: "claude-sonnet-5", vendor: "Anthropic", inputPerM: 3, outputPerM: 15, tier: "frontier" },
  { id: "claude-haiku-4-5", vendor: "Anthropic", inputPerM: 1, outputPerM: 5, tier: "mini" },
  { id: "gpt-5.2", vendor: "OpenAI", inputPerM: 1.25, outputPerM: 10, tier: "frontier" },
  { id: "gpt-5.2-mini", vendor: "OpenAI", inputPerM: 0.25, outputPerM: 2, tier: "mini" },
  { id: "gemini-3-pro", vendor: "Google", inputPerM: 2, outputPerM: 12, tier: "frontier" },
  { id: "gemini-3-flash", vendor: "Google", inputPerM: 0.3, outputPerM: 2.5, tier: "mini" },
];

/** Monthly seat list prices, USD. */
const SEAT_PRICES: Partial<Record<ProviderId, number>> = {
  "chatgpt-enterprise": 60,
  "m365-copilot": 30,
  "github-copilot": 39,
};

const FIRST = ["Ava", "Liam", "Maya", "Noah", "Zoe", "Ethan", "Ines", "Kai", "Lena", "Marco", "Priya", "Tomas", "Yuki", "Omar", "Sofia", "Dani", "Ruth", "Felix", "Nina", "Jonas", "Aisha", "Leo", "Mira", "Sam"];
const TEAMS: Team[] = ["Platform Engineering", "Product Engineering", "Design", "Marketing", "Sales Ops", "Finance"];

function buildPeople(): Person[] {
  const spec: Array<[Team, Person["role"], Person["seats"], number]> = [
    ["Platform Engineering", "Engineering Manager", ["github-copilot", "chatgpt-enterprise"], 1],
    ["Platform Engineering", "Software Engineer", ["github-copilot", "chatgpt-enterprise"], 4],
    ["Product Engineering", "Engineering Manager", ["github-copilot", "chatgpt-enterprise"], 1],
    ["Product Engineering", "Software Engineer", ["github-copilot", "chatgpt-enterprise"], 6],
    ["Design", "Designer", ["chatgpt-enterprise", "m365-copilot"], 4],
    ["Marketing", "Marketing Manager", ["chatgpt-enterprise", "m365-copilot"], 3],
    ["Sales Ops", "Business Owner", ["m365-copilot"], 3],
    ["Finance", "Data Analyst", ["m365-copilot", "chatgpt-enterprise"], 2],
  ];
  const people: Person[] = [];
  let i = 0;
  for (const [team, role, seats, count] of spec) {
    for (let n = 0; n < count; n++) {
      people.push({ id: `p${i + 1}`, name: FIRST[i % FIRST.length], role, team, seats });
      i++;
    }
  }
  return people;
}

const AGENTS: Agent[] = [
  { id: "ag-invoice", name: "invoice-reconciler", platform: "AWS Bedrock", ownerId: "p22", modelId: "claude-sonnet-5", workload: "reconciliation" },
  { id: "ag-docsum", name: "doc-summarizer", platform: "AWS Bedrock", ownerId: "p2", modelId: "claude-opus-5", workload: "summarization" },
  { id: "ag-support", name: "support-triage", platform: "Azure AI Foundry", ownerId: "p7", modelId: "gpt-5.2", workload: "support" },
  { id: "ag-extract", name: "contract-extractor", platform: "Azure AI Foundry", ownerId: "p23", modelId: "gpt-5.2", workload: "extraction" },
  { id: "ag-review", name: "pr-review-bot", platform: "AWS Bedrock", ownerId: "p1", modelId: "claude-sonnet-5", workload: "codegen" },
  { id: "ag-hr", name: "hr-helpdesk", platform: "Copilot Studio", ownerId: "p19", modelId: "gpt-5.2-mini", workload: "support" },
];

const AGENT_PROVIDER: Record<Agent["platform"], ProviderId> = {
  "AWS Bedrock": "aws-bedrock",
  "Azure AI Foundry": "azure-ai-foundry",
  "Copilot Studio": "copilot-studio",
};

/** Average daily token volume per agent (input, output). */
const AGENT_VOLUME: Record<string, [number, number]> = {
  "ag-invoice": [9_000_000, 700_000],
  "ag-docsum": [14_000_000, 1_600_000],
  "ag-support": [10_000_000, 2_000_000],
  "ag-extract": [8_000_000, 900_000],
  "ag-review": [6_000_000, 1_200_000],
  "ag-hr": [0, 0], // credit-billed, no token telemetry (Copilot Studio has no consumption API)
};

function dates(): string[] {
  const end = new Date(`${END_DATE}T00:00:00Z`);
  const out: string[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86_400_000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const isWeekend = (iso: string) => {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return dow === 0 || dow === 6;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function tokenCost(model: ModelPrice, tIn: number, tOut: number): number {
  return (tIn / 1_000_000) * model.inputPerM + (tOut / 1_000_000) * model.outputPerM;
}

export function generateDataset(): Dataset {
  const rand = prng(SEED);
  const people = buildPeople();
  const days = dates();
  const spikeDate = days[days.length - 4]; // day −3: the runaway-loop story beat
  const modelById = new Map(MODELS.map((m) => [m.id, m]));
  const records: SpendRecord[] = [];

  // --- SaaS seats: flat daily allocation of the monthly seat price ---
  for (const person of people) {
    for (const seat of person.seats) {
      const monthly = SEAT_PRICES[seat]!;
      for (const date of days) {
        records.push({
          date,
          layer: "saas-seat",
          provider: seat,
          team: person.team,
          personId: person.id,
          cost: round2(monthly / 30),
        });
      }
    }
  }

  // --- Bespoke API usage: engineers/analysts calling model APIs directly ---
  for (const person of people) {
    const heavy = person.role === "Software Engineer" || person.role === "Data Analyst";
    if (!heavy && person.role !== "Engineering Manager") continue;
    const scale = heavy ? 1 : 0.35;
    const provider: ProviderId = person.team === "Finance" ? "openai-api" : "anthropic-api";
    const modelId = provider === "openai-api" ? "gpt-5.2" : "claude-sonnet-5";
    const model = modelById.get(modelId)!;
    for (const date of days) {
      const damp = isWeekend(date) ? 0.15 : 1;
      const noise = 0.7 + rand() * 0.6;
      const tIn = Math.round(900_000 * scale * damp * noise);
      const tOut = Math.round(160_000 * scale * damp * noise);
      if (tIn === 0) continue;
      records.push({
        date,
        layer: "bespoke-api",
        provider,
        team: person.team,
        personId: person.id,
        modelId,
        tokensIn: tIn,
        tokensOut: tOut,
        cost: tokenCost(model, tIn, tOut),
      });
    }
  }

  // --- Agents: daily platform usage; one seeded runaway loop on day −3 ---
  for (const agent of AGENTS) {
    const owner = people.find((p) => p.id === agent.ownerId)!;
    const provider = AGENT_PROVIDER[agent.platform];
    const [vIn, vOut] = AGENT_VOLUME[agent.id];
    for (const date of days) {
      const noise = 0.8 + rand() * 0.4;
      const spike = agent.id === "ag-invoice" && date === spikeDate ? 5 : 1;
      if (vIn === 0) {
        // Copilot Studio bills credits; no token telemetry available.
        records.push({
          date,
          layer: "saas-seat",
          provider,
          team: owner.team,
          agentId: agent.id,
          cost: round2(42 * noise),
        });
        continue;
      }
      const model = modelById.get(agent.modelId)!;
      const tIn = Math.round(vIn * noise * spike);
      const tOut = Math.round(vOut * noise * spike);
      records.push({
        date,
        layer: "cloud",
        provider,
        team: owner.team,
        agentId: agent.id,
        modelId: agent.modelId,
        tokensIn: tIn,
        tokensOut: tOut,
        cost: tokenCost(model, tIn, tOut),
      });
    }
  }

  // --- Budgets: derived from actuals so the story beats always hold ---
  const month = END_DATE.slice(0, 7);
  const monthSpendByTeam = new Map<Team, number>();
  for (const r of records) {
    if (r.date.startsWith(month)) {
      monthSpendByTeam.set(r.team, (monthSpendByTeam.get(r.team) ?? 0) + r.cost);
    }
  }
  const budgets: Budget[] = TEAMS.map((team) => {
    const spend = monthSpendByTeam.get(team) ?? 0;
    // Product Engineering runs ~40% over; everyone else has ~20% headroom.
    const limit = team === "Product Engineering" ? spend / 1.4 : spend * 1.2;
    return { scope: "team", id: team, monthlyLimit: Math.round(limit) };
  });

  // --- Alerts: the narrative feed ---
  const spikeCost = records
    .filter((r) => r.agentId === "ag-invoice" && r.date === spikeDate)
    .reduce((s, r) => s + r.cost, 0);
  const alerts: Alert[] = [
    {
      id: "al-1",
      type: "anomaly",
      severity: "critical",
      date: spikeDate,
      entityType: "agent",
      entityId: "ag-invoice",
      title: "Runaway agent loop: invoice-reconciler",
      narrative: `invoice-reconciler (AWS Bedrock) spent $${Math.round(spikeCost)} in one day — ~5x its normal run rate. A retry loop re-processed the same invoice batch 312 times before the daily threshold fired.`,
    },
    {
      id: "al-2",
      type: "budget-forecast",
      severity: "warning",
      date: END_DATE,
      entityType: "team",
      entityId: "Product Engineering",
      title: "Product Engineering ~40% over monthly budget",
      narrative:
        "Month-to-date spend is tracking ~40% above the team budget, driven by bespoke API usage and the pr-review-bot agent.",
    },
    {
      id: "al-3",
      type: "commitment-risk",
      severity: "info",
      date: END_DATE,
      entityType: "provider",
      entityId: "openai-api",
      title: "OpenAI commitment under-consumed",
      narrative:
        "The annual OpenAI commit is pacing at 78% of the committed volume — consider shifting batch workloads before the true-up date.",
    },
  ];

  return {
    generatedAt: END_DATE,
    days: DAYS,
    people,
    agents: AGENTS,
    providers: PROVIDERS,
    models: MODELS,
    records,
    budgets,
    alerts,
  };
}

/** Model-choice and workload optimizations, computed from actual mock usage
 * against list-price deltas (never hardcoded dollar figures). */
export function computeRecommendations(data: Dataset): Recommendation[] {
  const modelById = new Map(data.models.map((m) => [m.id, m]));
  const month = data.generatedAt.slice(0, 7);
  const recs: Recommendation[] = [];

  const monthlyAgentUsage = (agentId: string) => {
    let tIn = 0, tOut = 0, cost = 0;
    for (const r of data.records) {
      if (r.agentId === agentId && r.date.startsWith(month)) {
        tIn += r.tokensIn ?? 0;
        tOut += r.tokensOut ?? 0;
        cost += r.cost;
      }
    }
    return { tIn, tOut, cost };
  };

  // 1. Model right-sizing: low-complexity workloads on frontier models.
  for (const agent of data.agents) {
    if (agent.workload !== "summarization" && agent.workload !== "extraction") continue;
    const model = modelById.get(agent.modelId);
    if (!model || model.tier !== "frontier") continue;
    const mini = data.models.find((m) => m.vendor === model.vendor && m.tier === "mini");
    if (!mini) continue;
    const { tIn, tOut, cost } = monthlyAgentUsage(agent.id);
    const miniCost = tokenCost(mini, tIn, tOut);
    const savings = cost - miniCost;
    if (savings <= 0) continue;
    recs.push({
      id: `rec-rightsize-${agent.id}`,
      kind: "model-rightsizing",
      title: `Route ${agent.name} from ${model.id} to ${mini.id}`,
      detail: `${agent.workload} is a low-complexity workload; a mini-tier model handles it at a fraction of the cost.`,
      monthlySavings: round2(savings),
      entityId: agent.id,
    });
  }

  // 2. Batch API: extraction workloads are not latency-sensitive → 50% off.
  for (const agent of data.agents) {
    if (agent.workload !== "extraction") continue;
    const { cost } = monthlyAgentUsage(agent.id);
    if (cost <= 0) continue;
    recs.push({
      id: `rec-batch-${agent.id}`,
      kind: "batch-api",
      title: `Move ${agent.name} to the Batch API`,
      detail: "Extraction runs overnight; batch pricing cuts token costs by 50%.",
      monthlySavings: round2(cost * 0.5),
      entityId: agent.id,
    });
  }

  // 3. Prompt caching: support agents re-send large stable prompts.
  for (const agent of data.agents) {
    if (agent.workload !== "support") continue;
    const model = modelById.get(agent.modelId);
    if (!model) continue;
    const { tIn } = monthlyAgentUsage(agent.id);
    const inputCost = (tIn / 1_000_000) * model.inputPerM;
    const savings = inputCost * 0.6 * 0.9; // ~60% of input cacheable at ~90% discount
    if (savings <= 0) continue;
    recs.push({
      id: `rec-cache-${agent.id}`,
      kind: "prompt-caching",
      title: `Enable prompt caching for ${agent.name}`,
      detail: "The system prompt and knowledge context are stable across requests; cached reads bill at ~10% of input price.",
      monthlySavings: round2(savings),
      entityId: agent.id,
    });
  }

  return recs.sort((a, b) => b.monthlySavings - a.monthlySavings);
}
