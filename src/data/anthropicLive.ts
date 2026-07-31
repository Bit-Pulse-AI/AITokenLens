import { MODELS } from "./generate";
import type { Dataset, SpendRecord } from "./types";

/** Raw shapes from the Anthropic Admin Usage & Cost API (documented fields
 * only; extra fields pass through untouched). */
export interface UsageReportRaw {
  data: Array<{
    starting_at: string;
    ending_at: string;
    results: Array<{
      model: string;
      uncached_input_tokens: number;
      cache_read_input_tokens: number;
      cache_creation?: Record<string, number>;
      output_tokens: number;
      service_tier?: string;
    }>;
  }>;
}

export interface CostReportRaw {
  data: Array<{
    starting_at: string;
    ending_at: string;
    results: Array<{ currency: string; amount: string; description?: string }>;
  }>;
}

export interface LiveSnapshot {
  fetchedAt: string;
  usage: UsageReportRaw;
  cost?: CostReportRaw;
}

const CACHE_READ_FACTOR = 0.1; // cache reads bill at ~10% of input price
const CACHE_WRITE_FACTOR = 1.25; // 5m cache writes bill at 1.25x input price

/** Estimate a result's cost from list prices — used to apportion the billed
 * daily total across models, and as the whole cost when no cost report exists. */
function estimateCost(r: UsageReportRaw["data"][number]["results"][number]): number {
  const price = MODELS.find((m) => m.id === r.model);
  if (!price) return 0;
  const cacheWrite = Object.values(r.cache_creation ?? {}).reduce((s, n) => s + n, 0);
  return (
    (r.uncached_input_tokens / 1e6) * price.inputPerM +
    (r.cache_read_input_tokens / 1e6) * price.inputPerM * CACHE_READ_FACTOR +
    (cacheWrite / 1e6) * price.inputPerM * CACHE_WRITE_FACTOR +
    (r.output_tokens / 1e6) * price.outputPerM
  );
}

/** Map raw Admin API reports to SpendRecords. When the cost report is
 * present, each day's records are scaled so they sum exactly to the billed
 * amount (invoice-grade reconciliation); otherwise costs are list-price
 * estimates. */
export function mapAnthropicLive(
  usage: UsageReportRaw,
  cost?: CostReportRaw,
): SpendRecord[] {
  const billedByDay = new Map<string, number>();
  for (const bucket of cost?.data ?? []) {
    const date = bucket.starting_at.slice(0, 10);
    const cents = bucket.results.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    billedByDay.set(date, (billedByDay.get(date) ?? 0) + cents / 100);
  }

  const records: SpendRecord[] = [];
  for (const bucket of usage.data) {
    const date = bucket.starting_at.slice(0, 10);
    const estimates = bucket.results.map(estimateCost);
    const estimateTotal = estimates.reduce((s, n) => s + n, 0);
    const billed = billedByDay.get(date);
    for (let i = 0; i < bucket.results.length; i++) {
      const r = bucket.results[i];
      const cacheWrite = Object.values(r.cache_creation ?? {}).reduce((s, n) => s + n, 0);
      const tokensIn = r.uncached_input_tokens + r.cache_read_input_tokens + cacheWrite;
      let recordCost: number;
      if (billed !== undefined) {
        // Apportion the billed total by estimated share; if no model priced,
        // split evenly so billed dollars are never dropped.
        const share = estimateTotal > 0 ? estimates[i] / estimateTotal : 1 / bucket.results.length;
        recordCost = billed * share;
      } else {
        recordCost = estimates[i];
      }
      records.push({
        date,
        layer: "bespoke-api",
        provider: "anthropic-api",
        team: "Unattributed",
        modelId: r.model,
        tokensIn,
        tokensOut: r.output_tokens,
        cost: recordCost,
      });
    }
  }
  return records;
}

/** Swap the mock anthropic-api records for live ones; everything else —
 * people, agents, budgets, other providers — stays untouched. */
export function mergeLiveAnthropic(base: Dataset, live: SpendRecord[]): Dataset {
  return {
    ...base,
    records: [...base.records.filter((r) => r.provider !== "anthropic-api"), ...live],
  };
}
