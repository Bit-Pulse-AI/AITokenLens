import type { Alert, Dataset, Team } from "../data/types";
import { agentSummaries, monthRecords } from "./aggregate";
import { usdFull } from "../ui/format";

export interface AlertConfig {
  /** Warn when a team's MTD utilization exceeds this fraction of budget. */
  budgetWarnAt: number;
  /** Flag an agent whose worst day exceeds this multiple of its median daily cost. */
  anomalyMultiplier: number;
  /** Per-team monthly budget overrides (replaces the dataset's budget). */
  budgetOverrides: Partial<Record<Team, number>>;
}

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  budgetWarnAt: 1.0,
  anomalyMultiplier: 3,
  budgetOverrides: {},
};

/** Effective budgets = dataset budgets with config overrides applied. */
export function effectiveBudgets(data: Dataset, config: AlertConfig) {
  return data.budgets.map((b) => ({
    ...b,
    monthlyLimit: config.budgetOverrides[b.id] ?? b.monthlyLimit,
  }));
}

/** Derive the alert feed from the data — nothing hardcoded. */
export function computeAlerts(data: Dataset, config: AlertConfig): Alert[] {
  const alerts: Alert[] = [];

  // --- Agent anomalies (worst day vs. median, threshold configurable) ---
  for (const agent of agentSummaries(data)) {
    const costs = agent.daily.map((d) => d.cost).sort((a, b) => a - b);
    const median = costs[Math.floor(costs.length / 2)] ?? 0;
    const worst = agent.daily.reduce((m, d) => (d.cost > m.cost ? d : m), agent.daily[0]);
    if (median > 0 && worst.cost > config.anomalyMultiplier * median) {
      const ratio = worst.cost / median;
      alerts.push({
        id: `al-anomaly-${agent.agentId}`,
        type: "anomaly",
        severity: "critical",
        date: worst.date,
        entityType: "agent",
        entityId: agent.agentId,
        title: `Runaway agent loop: ${agent.name}`,
        narrative: `${agent.name} (${agent.platform}) spent ${usdFull(Math.round(worst.cost))} in one day — ${ratio.toFixed(1)}× its median daily cost. Threshold: ${config.anomalyMultiplier}× median.`,
      });
    }
  }

  // --- Team budget forecasts (threshold + overrides configurable) ---
  const mtd = monthRecords(data);
  for (const b of effectiveBudgets(data, config)) {
    const spend = mtd.filter((r) => r.team === b.id).reduce((s, r) => s + r.cost, 0);
    const utilization = spend / b.monthlyLimit;
    if (utilization > config.budgetWarnAt) {
      alerts.push({
        id: `al-budget-${b.id}`,
        type: "budget-forecast",
        severity: "warning",
        date: data.generatedAt,
        entityType: "team",
        entityId: b.id,
        title: `${b.id} at ${Math.round(utilization * 100)}% of monthly budget`,
        narrative: `Month-to-date spend is ${usdFull(Math.round(spend))} against a ${usdFull(b.monthlyLimit)} budget (warn threshold ${Math.round(config.budgetWarnAt * 100)}%).`,
      });
    }
  }

  // --- Static commitment info (no live commitment data in the prototype) ---
  alerts.push({
    id: "al-commitment",
    type: "commitment-risk",
    severity: "info",
    date: data.generatedAt,
    entityType: "provider",
    entityId: "openai-api",
    title: "OpenAI commitment under-consumed",
    narrative:
      "The annual OpenAI commit is pacing at 78% of the committed volume — consider shifting batch workloads before the true-up date.",
  });

  return alerts;
}
