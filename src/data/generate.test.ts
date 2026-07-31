import { describe, expect, test } from "vitest";
import { computeRecommendations, generateDataset } from "./generate";
import type { Dataset } from "./types";

const total = (records: Dataset["records"]) =>
  records.reduce((sum, r) => sum + r.cost, 0);

describe("generateDataset determinism", () => {
  test("two runs produce byte-identical data", () => {
    const a = generateDataset();
    const b = generateDataset();
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  test("covers ~90 days ending at the fixed demo date", () => {
    const data = generateDataset();
    expect(data.days).toBe(90);
    const dates = [...new Set(data.records.map((r) => r.date))].sort();
    expect(dates.length).toBe(90);
    expect(dates[dates.length - 1]).toBe(data.generatedAt);
  });
});

describe("reconciliation", () => {
  test("per-layer sums partition the grand total", () => {
    const data = generateDataset();
    const grand = total(data.records);
    const byLayer =
      total(data.records.filter((r) => r.layer === "cloud")) +
      total(data.records.filter((r) => r.layer === "saas-seat")) +
      total(data.records.filter((r) => r.layer === "bespoke-api"));
    expect(byLayer).toBeCloseTo(grand, 6);
    expect(grand).toBeGreaterThan(0);
  });

  test("every record references known entities", () => {
    const data = generateDataset();
    const people = new Set(data.people.map((p) => p.id));
    const agents = new Set(data.agents.map((a) => a.id));
    const providers = new Set(data.providers.map((p) => p.id));
    const models = new Set(data.models.map((m) => m.id));
    for (const r of data.records) {
      expect(providers.has(r.provider)).toBe(true);
      if (r.personId) expect(people.has(r.personId)).toBe(true);
      if (r.agentId) expect(agents.has(r.agentId)).toBe(true);
      if (r.modelId) expect(models.has(r.modelId)).toBe(true);
      expect(r.personId || r.agentId).toBeTruthy();
      expect(r.cost).toBeGreaterThanOrEqual(0);
    }
  });

  test("token-based records price out to tokens × list price", () => {
    const data = generateDataset();
    const priceOf = new Map(data.models.map((m) => [m.id, m]));
    const tokenRecords = data.records.filter((r) => r.tokensIn !== undefined);
    expect(tokenRecords.length).toBeGreaterThan(0);
    for (const r of tokenRecords) {
      const price = priceOf.get(r.modelId!)!;
      const expected =
        (r.tokensIn! / 1_000_000) * price.inputPerM +
        (r.tokensOut! / 1_000_000) * price.outputPerM;
      expect(r.cost).toBeCloseTo(expected, 6);
    }
  });
});

describe("seeded story beats", () => {
  test("a runaway agent spike (>3x median daily cost) exists 3 days before the end, with a critical anomaly alert", () => {
    const data = generateDataset();
    const spikes = data.agents.filter((agent) => {
      const daily = data.records
        .filter((r) => r.agentId === agent.id)
        .reduce((m, r) => m.set(r.date, (m.get(r.date) ?? 0) + r.cost), new Map<string, number>());
      const costs = [...daily.values()].sort((x, y) => x - y);
      if (costs.length < 10) return false;
      const median = costs[Math.floor(costs.length / 2)];
      return Math.max(...costs) > 3 * median;
    });
    expect(spikes.length).toBeGreaterThanOrEqual(1);

    const anomaly = data.alerts.find((a) => a.type === "anomaly");
    expect(anomaly).toBeDefined();
    expect(anomaly!.severity).toBe("critical");
    expect(spikes.map((s) => s.id)).toContain(anomaly!.entityId);
    const dates = [...new Set(data.records.map((r) => r.date))].sort();
    expect(anomaly!.date).toBe(dates[dates.length - 4]); // day −3
  });

  test("one team is trending ≥30% over its monthly budget, with a budget alert", () => {
    const data = generateDataset();
    // generatedAt is the last day of the month, so month-to-date = full month.
    const month = data.generatedAt.slice(0, 7);
    const over = data.budgets.filter((b) => {
      const spend = total(
        data.records.filter((r) => r.team === b.id && r.date.startsWith(month)),
      );
      return spend > 1.3 * b.monthlyLimit;
    });
    expect(over.length).toBeGreaterThanOrEqual(1);
    const alert = data.alerts.find((a) => a.type === "budget-forecast");
    expect(alert).toBeDefined();
    expect(over.map((b) => b.id)).toContain(alert!.entityId);
  });

  test("model right-sizing recommendation worth ≥$2.5K/mo exists, computed from usage", () => {
    const data = generateDataset();
    const recs = computeRecommendations(data);
    expect(recs.length).toBeGreaterThanOrEqual(3);
    const kinds = new Set(recs.map((r) => r.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(3);
    const rightsizing = recs.find((r) => r.kind === "model-rightsizing");
    expect(rightsizing).toBeDefined();
    expect(rightsizing!.monthlySavings).toBeGreaterThanOrEqual(2500);
  });
});
