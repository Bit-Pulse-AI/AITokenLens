import type { Dataset, Layer, ProviderId, SpendRecord, Team } from "../data/types";

export interface DayPoint {
  date: string;
  cloud: number;
  "saas-seat": number;
  "bespoke-api": number;
}

export const monthRecords = (data: Dataset): SpendRecord[] => {
  const month = data.generatedAt.slice(0, 7);
  return data.records.filter((r) => r.date.startsWith(month));
};

export function dailyLayerSeries(data: Dataset): DayPoint[] {
  const byDate = new Map<string, DayPoint>();
  for (const r of data.records) {
    let p = byDate.get(r.date);
    if (!p) {
      p = { date: r.date, cloud: 0, "saas-seat": 0, "bespoke-api": 0 };
      byDate.set(r.date, p);
    }
    p[r.layer] += r.cost;
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface ProviderTotal {
  provider: ProviderId;
  name: string;
  layer: Layer;
  cost: number;
}

export function providerTotals(data: Dataset): ProviderTotal[] {
  const sums = new Map<ProviderId, number>();
  for (const r of monthRecords(data)) {
    sums.set(r.provider, (sums.get(r.provider) ?? 0) + r.cost);
  }
  return data.providers
    .filter((p) => sums.has(p.id))
    .map((p) => ({ provider: p.id, name: p.name, layer: p.layer, cost: sums.get(p.id)! }))
    .sort((a, b) => b.cost - a.cost);
}

export interface PersonSummary {
  personId: string;
  name: string;
  role: string;
  team: Team;
  mtdCost: number;
  byProvider: Array<{ provider: ProviderId; name: string; cost: number }>;
  byModel: Array<{ modelId: string; cost: number }>;
  daily: Array<{ date: string; cost: number }>;
}

export function personSummaries(data: Dataset): PersonSummary[] {
  const mtd = monthRecords(data);
  const providerName = new Map(data.providers.map((p) => [p.id, p.name]));
  return data.people
    .map((person) => {
      const mine = mtd.filter((r) => r.personId === person.id);
      const byProvider = new Map<ProviderId, number>();
      const byModel = new Map<string, number>();
      for (const r of mine) {
        byProvider.set(r.provider, (byProvider.get(r.provider) ?? 0) + r.cost);
        if (r.modelId) byModel.set(r.modelId, (byModel.get(r.modelId) ?? 0) + r.cost);
      }
      const dailyMap = new Map<string, number>();
      for (const r of data.records) {
        if (r.personId === person.id) {
          dailyMap.set(r.date, (dailyMap.get(r.date) ?? 0) + r.cost);
        }
      }
      return {
        personId: person.id,
        name: person.name,
        role: person.role,
        team: person.team,
        mtdCost: mine.reduce((s, r) => s + r.cost, 0),
        byProvider: [...byProvider.entries()]
          .map(([provider, cost]) => ({ provider, name: providerName.get(provider)!, cost }))
          .sort((a, b) => b.cost - a.cost),
        byModel: [...byModel.entries()]
          .map(([modelId, cost]) => ({ modelId, cost }))
          .sort((a, b) => b.cost - a.cost),
        daily: [...dailyMap.entries()]
          .map(([date, cost]) => ({ date, cost }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      };
    })
    .sort((a, b) => b.mtdCost - a.mtdCost);
}

export interface BudgetStatus {
  team: Team;
  spend: number;
  limit: number;
  utilization: number;
}

export function teamBudgetStatus(data: Dataset): BudgetStatus[] {
  const mtd = monthRecords(data);
  return data.budgets
    .map((b) => {
      const spend = mtd.filter((r) => r.team === b.id).reduce((s, r) => s + r.cost, 0);
      return { team: b.id, spend, limit: b.monthlyLimit, utilization: spend / b.monthlyLimit };
    })
    .sort((a, b) => b.utilization - a.utilization);
}

export interface AgentSummary {
  agentId: string;
  name: string;
  platform: string;
  ownerName: string;
  team: Team;
  modelId: string;
  workload: string;
  mtdCost: number;
  daily: Array<{ date: string; cost: number }>;
  /** Set when the agent's worst day exceeds 3x its median daily cost. */
  anomaly?: { date: string; cost: number; ratio: number };
}

export function agentSummaries(data: Dataset): AgentSummary[] {
  const mtd = monthRecords(data);
  const personName = new Map(data.people.map((p) => [p.id, p.name]));
  const personTeam = new Map(data.people.map((p) => [p.id, p.team]));
  return data.agents
    .map((agent) => {
      const dailyMap = new Map<string, number>();
      for (const r of data.records) {
        if (r.agentId === agent.id) {
          dailyMap.set(r.date, (dailyMap.get(r.date) ?? 0) + r.cost);
        }
      }
      const daily = [...dailyMap.entries()]
        .map(([date, cost]) => ({ date, cost }))
        .sort((a, b) => a.date.localeCompare(b.date));
      const costs = daily.map((d) => d.cost).sort((a, b) => a - b);
      const median = costs[Math.floor(costs.length / 2)] ?? 0;
      const worst = daily.reduce((m, d) => (d.cost > m.cost ? d : m), daily[0]);
      const ratio = median > 0 ? worst.cost / median : 0;
      return {
        agentId: agent.id,
        name: agent.name,
        platform: agent.platform,
        ownerName: personName.get(agent.ownerId) ?? agent.ownerId,
        team: personTeam.get(agent.ownerId)!,
        modelId: agent.modelId,
        workload: agent.workload,
        mtdCost: mtd.filter((r) => r.agentId === agent.id).reduce((s, r) => s + r.cost, 0),
        daily,
        anomaly: ratio > 3 ? { date: worst.date, cost: worst.cost, ratio } : undefined,
      };
    })
    .sort((a, b) => b.mtdCost - a.mtdCost);
}
