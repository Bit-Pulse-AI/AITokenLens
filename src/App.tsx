import { generateDataset } from "./data/generate";

const data = generateDataset();
const month = data.generatedAt.slice(0, 7);
const mtd = data.records
  .filter((r) => r.date.startsWith(month))
  .reduce((s, r) => s + r.cost, 0);

export default function App() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>AITokenLens</h1>
      <p>Centralized AI spend &amp; token-cost tracking — prototype (M1 foundation).</p>
      <p>
        Seeded dataset: {data.people.length} people, {data.agents.length} agents,{" "}
        {data.records.length.toLocaleString()} spend records over {data.days} days.
      </p>
      <p>
        AI spend, month to date:{" "}
        <strong>${Math.round(mtd).toLocaleString()}</strong> — dashboard views land in M2.
      </p>
    </main>
  );
}
