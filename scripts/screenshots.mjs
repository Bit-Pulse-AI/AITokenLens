/* Capture demo screenshots of all five views using the locally installed
 * Chrome (no browser download). Requires the dev server on :5173:
 *   npm run dev &  →  node scripts/screenshots.mjs */
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const OUT = "docs/screenshots";

const SHOTS = [
  { hash: "overview", theme: "light" },
  { hash: "people", theme: "light" },
  { hash: "agents", theme: "light" },
  { hash: "alerts-budgets", theme: "light" },
  { hash: "connectors", theme: "light" },
  { hash: "overview", theme: "dark", name: "overview-dark" },
];

mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 2 });

for (const shot of SHOTS) {
  await page.goto(`${BASE}/#${shot.hash}`, { waitUntil: "networkidle0" });
  await page.evaluate((theme) => {
    if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  }, shot.theme);
  // Nudge the viewport so Recharts ResponsiveContainers re-measure at the
  // final layout — the initial headless measure can happen too early.
  await new Promise((r) => setTimeout(r, 600));
  const file = `${OUT}/${shot.name ?? shot.hash}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(`captured ${file}`);
}

await browser.close();
