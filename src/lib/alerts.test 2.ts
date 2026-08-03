import { describe, expect, test } from "vitest";
import { generateDataset } from "../data/generate";
import { computeAlerts, DEFAULT_ALERT_CONFIG, type AlertConfig } from "./alerts";

const data = generateDataset();

describe("computeAlerts with default config", () => {
  const alerts = computeAlerts(data, DEFAULT_ALERT_CONFIG);

  test("reproduces the runaway-agent critical anomaly on day −3", () => {
    const anomaly = alerts.find((a) => a.type === "anomaly");
    expect(anomaly).toBeDefined();
    expect(anomaly!.severity).toBe("critical");
    expect(anomaly!.entityId).toBe("ag-invoice");
    const dates = [...new Set(data.records.map((r) => r.date))].sort();
    expect(anomaly!.date).toBe(dates[dates.length - 4]);
    expect(anomaly!.narrative).toMatch(/\$\d/); // narrative carries real numbers
  });

  test("flags exactly the over-budget team as a budget-forecast warning", () => {
    const budget = alerts.filter((a) => a.type === "budget-forecast");
    expect(budget).toHaveLength(1);
    expect(budget[0].entityId).toBe("Product Engineering");
    expect(budget[0].severity).toBe("warning");
  });
});

describe("config sensitivity", () => {
  test("anomalyMultiplier 10 drops the anomaly alert", () => {
    const cfg: AlertConfig = { ...DEFAULT_ALERT_CONFIG, anomalyMultiplier: 10 };
    expect(computeAlerts(data, cfg).filter((a) => a.type === "anomaly")).toHaveLength(0);
  });

  test("budgetWarnAt 0.5 flags every budgeted team", () => {
    const cfg: AlertConfig = { ...DEFAULT_ALERT_CONFIG, budgetWarnAt: 0.5 };
    const flagged = computeAlerts(data, cfg).filter((a) => a.type === "budget-forecast");
    expect(flagged.length).toBe(data.budgets.length);
  });

  test("budget overrides recompute utilization", () => {
    const cfg: AlertConfig = {
      ...DEFAULT_ALERT_CONFIG,
      budgetOverrides: { "Product Engineering": 10_000 },
    };
    const flagged = computeAlerts(data, cfg).filter((a) => a.type === "budget-forecast");
    expect(flagged.find((a) => a.entityId === "Product Engineering")).toBeUndefined();
  });
});
