import { describe, expect, test } from "vitest";
import { generateDataset } from "./generate";
import { mapAnthropicLive, mergeLiveAnthropic } from "./anthropicLive";

/** Fixtures follow the documented Admin API shapes:
 * GET /v1/organizations/usage_report/messages (1d buckets, grouped by model)
 * GET /v1/organizations/cost_report (daily, amounts as decimal-string cents). */
const usageFixture = {
  data: [
    {
      starting_at: "2026-07-29T00:00:00Z",
      ending_at: "2026-07-30T00:00:00Z",
      results: [
        {
          model: "claude-opus-5",
          uncached_input_tokens: 2_000_000,
          cache_read_input_tokens: 1_000_000,
          cache_creation: { ephemeral_5m_input_tokens: 200_000, ephemeral_1h_input_tokens: 0 },
          output_tokens: 400_000,
          service_tier: "standard",
        },
        {
          model: "claude-haiku-4-5",
          uncached_input_tokens: 5_000_000,
          cache_read_input_tokens: 0,
          cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
          output_tokens: 900_000,
          service_tier: "batch",
        },
      ],
    },
    {
      starting_at: "2026-07-30T00:00:00Z",
      ending_at: "2026-07-31T00:00:00Z",
      results: [
        {
          model: "some-future-model",
          uncached_input_tokens: 1_000_000,
          cache_read_input_tokens: 0,
          cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 },
          output_tokens: 100_000,
          service_tier: "standard",
        },
      ],
    },
  ],
};

const costFixture = {
  data: [
    {
      starting_at: "2026-07-29T00:00:00Z",
      ending_at: "2026-07-30T00:00:00Z",
      results: [
        { currency: "USD", amount: "3050.00", description: "Claude usage" },
      ],
    },
    {
      starting_at: "2026-07-30T00:00:00Z",
      ending_at: "2026-07-31T00:00:00Z",
      results: [
        { currency: "USD", amount: "700.00", description: "Claude usage" },
      ],
    },
  ],
};

describe("mapAnthropicLive", () => {
  test("one record per model per day, on the bespoke-api layer", () => {
    const records = mapAnthropicLive(usageFixture, costFixture);
    expect(records.length).toBe(3);
    for (const r of records) {
      expect(r.provider).toBe("anthropic-api");
      expect(r.layer).toBe("bespoke-api");
      expect(r.tokensIn).toBeGreaterThan(0);
    }
    expect(records.map((r) => r.date)).toEqual(["2026-07-29", "2026-07-29", "2026-07-30"]);
  });

  test("daily costs reconcile exactly to the billed cost report (cents → dollars)", () => {
    const records = mapAnthropicLive(usageFixture, costFixture);
    const day1 = records.filter((r) => r.date === "2026-07-29").reduce((s, r) => s + r.cost, 0);
    const day2 = records.filter((r) => r.date === "2026-07-30").reduce((s, r) => s + r.cost, 0);
    expect(day1).toBeCloseTo(30.5, 6); // 3050.00 cents
    expect(day2).toBeCloseTo(7.0, 6);
  });

  test("unknown models don't crash and still carry cost", () => {
    const records = mapAnthropicLive(usageFixture, costFixture);
    const unknown = records.find((r) => r.modelId === "some-future-model");
    expect(unknown).toBeDefined();
    expect(unknown!.cost).toBeCloseTo(7.0, 6); // whole day billed to the only model
  });

  test("without a cost report, falls back to tokens × list price", () => {
    const records = mapAnthropicLive(usageFixture, undefined);
    const opus = records.find((r) => r.modelId === "claude-opus-5")!;
    // 2M uncached ×$5 + 1M cache-read ×$0.5 + 0.2M cache-write ×$6.25 + 0.4M out ×$25
    expect(opus.cost).toBeCloseTo(10 + 0.5 + 1.25 + 10, 4);
  });
});

describe("mergeLiveAnthropic", () => {
  test("replaces mock anthropic-api records, keeps everything else, totals shift accordingly", () => {
    const base = generateDataset();
    const live = mapAnthropicLive(usageFixture, costFixture);
    const merged = mergeLiveAnthropic(base, live);
    expect(merged.records.filter((r) => r.provider === "anthropic-api")).toHaveLength(live.length);
    const nonAnthropic = (d: typeof base) =>
      d.records.filter((r) => r.provider !== "anthropic-api").reduce((s, r) => s + r.cost, 0);
    expect(nonAnthropic(merged)).toBeCloseTo(nonAnthropic(base), 4);
    expect(merged.people).toEqual(base.people);
  });
});
