/* Fetch org-level usage & cost from the Anthropic Admin API and snapshot the
 * raw responses for the dashboard's live overlay.
 *
 *   ANTHROPIC_ADMIN_KEY=sk-ant-admin-... node scripts/fetch-anthropic.mjs
 *
 * The key is read from the environment only (use a gitignored .env / shell
 * export); it is never written to disk or logged. Output goes to
 * public/live/anthropic.json (gitignored). */
import { mkdirSync, writeFileSync } from "node:fs";

const KEY = process.env.ANTHROPIC_ADMIN_KEY;
if (!KEY) {
  console.error(
    "Missing ANTHROPIC_ADMIN_KEY. Create an Admin API key in the Anthropic Console\n" +
      "(Settings → Organization → API keys → Admin key), then:\n" +
      "  ANTHROPIC_ADMIN_KEY=sk-ant-admin-... node scripts/fetch-anthropic.mjs",
  );
  process.exit(1);
}

const BASE = "https://api.anthropic.com";
const HEADERS = { "x-api-key": KEY, "anthropic-version": "2023-06-01" };
const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

/** GET with cursor pagination; merges `data` arrays across pages. */
async function fetchReport(path, params) {
  const data = [];
  let page;
  for (let i = 0; i < 20; i++) {
    const url = new URL(path, BASE);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (page) url.searchParams.set("page", page);
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${path} → HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    const json = await res.json();
    data.push(...(json.data ?? []));
    if (!json.has_more || !json.next_page) return { data };
    page = json.next_page;
  }
  return { data };
}

try {
  console.log("Fetching usage report (1d buckets, grouped by model)…");
  const usage = await fetchReport("/v1/organizations/usage_report/messages", {
    starting_at: since,
    bucket_width: "1d",
    "group_by[]": "model",
    limit: "31",
  });
  console.log(`  ${usage.data.length} day buckets`);

  let cost;
  try {
    console.log("Fetching cost report…");
    cost = await fetchReport("/v1/organizations/cost_report", {
      starting_at: since,
      limit: "31",
    });
    console.log(`  ${cost.data.length} day buckets`);
  } catch (e) {
    console.warn(`  cost report unavailable (${e.message.slice(0, 120)}); using list-price estimates`);
  }

  mkdirSync("public/live", { recursive: true });
  const snapshot = { fetchedAt: new Date().toISOString(), usage, cost };
  writeFileSync("public/live/anthropic.json", JSON.stringify(snapshot, null, 1));
  console.log("Wrote public/live/anthropic.json — reload the dashboard to see live data.");
} catch (e) {
  console.error(`Fetch failed: ${e.message}`);
  process.exit(1);
}
