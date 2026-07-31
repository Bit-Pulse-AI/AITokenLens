import { describe, expect, test } from "vitest";
import { generateDataset } from "../data/generate";
import {
  dailyLayerSeries,
  monthRecords,
  personSummaries,
  providerTotals,
  teamBudgetStatus,
} from "./aggregate";

const data = generateDataset();
const grandMtd = monthRecords(data).reduce((s, r) => s + r.cost, 0);

describe("dailyLayerSeries", () => {
  test("one point per day, layer values sum to the grand total", () => {
    const series = dailyLayerSeries(data);
    expect(series.length).toBe(data.days);
    const sum = series.reduce(
      (s, p) => s + p.cloud + p["saas-seat"] + p["bespoke-api"],
      0,
    );
    const total = data.records.reduce((s, r) => s + r.cost, 0);
    expect(sum).toBeCloseTo(total, 4);
  });
});

describe("providerTotals", () => {
  test("month-to-date provider totals sum to the MTD grand total", () => {
    const totals = providerTotals(data);
    const sum = totals.reduce((s, p) => s + p.cost, 0);
    expect(sum).toBeCloseTo(grandMtd, 4);
    // sorted descending
    for (let i = 1; i < totals.length; i++) {
      expect(totals[i].cost).toBeLessThanOrEqual(totals[i - 1].cost);
    }
  });
});

describe("personSummaries", () => {
  test("covers every person; per-person costs sum to person-attributed MTD spend", () => {
    const rows = personSummaries(data);
    expect(rows.length).toBe(data.people.length);
    const sum = rows.reduce((s, r) => s + r.mtdCost, 0);
    const expected = monthRecords(data)
      .filter((r) => r.personId)
      .reduce((s, r) => s + r.cost, 0);
    expect(sum).toBeCloseTo(expected, 4);
  });

  test("per-person provider split sums to that person's total", () => {
    const rows = personSummaries(data);
    for (const row of rows.slice(0, 5)) {
      const split = row.byProvider.reduce((s, p) => s + p.cost, 0);
      expect(split).toBeCloseTo(row.mtdCost, 4);
    }
  });
});

describe("teamBudgetStatus", () => {
  test("flags the seeded over-budget team and computes utilization", () => {
    const status = teamBudgetStatus(data);
    const over = status.find((s) => s.team === "Product Engineering")!;
    expect(over.utilization).toBeGreaterThan(1.3);
    for (const s of status) {
      expect(s.spend).toBeGreaterThan(0);
      expect(s.limit).toBeGreaterThan(0);
    }
  });
});

describe("agentSummaries", () => {
  test("covers every agent; flags exactly the runaway agent with spike date", async () => {
    const { agentSummaries } = await import("./aggregate");
    const rows = agentSummaries(data);
    expect(rows.length).toBe(data.agents.length);
    const flagged = rows.filter((r) => r.anomaly);
    expect(flagged.length).toBe(1);
    expect(flagged[0].name).toBe("invoice-reconciler");
    const dates = [...new Set(data.records.map((r) => r.date))].sort();
    expect(flagged[0].anomaly!.date).toBe(dates[dates.length - 4]);
    expect(flagged[0].anomaly!.ratio).toBeGreaterThan(3);
  });

  test("agent MTD costs sum to agent-attributed MTD spend", async () => {
    const { agentSummaries } = await import("./aggregate");
    const rows = agentSummaries(data);
    const sum = rows.reduce((s, r) => s + r.mtdCost, 0);
    const expected = monthRecords(data)
      .filter((r) => r.agentId)
      .reduce((s, r) => s + r.cost, 0);
    expect(sum).toBeCloseTo(expected, 4);
  });
});
