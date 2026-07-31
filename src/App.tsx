import { useEffect, useMemo, useState } from "react";
import "./theme.css";
import { generateDataset } from "./data/generate";
import AgentsView from "./views/AgentsView";
import AlertsView from "./views/AlertsView";
import ConnectorsView from "./views/ConnectorsView";
import OverviewView from "./views/OverviewView";
import PeopleView from "./views/PeopleView";

const VIEWS = ["Overview", "People", "Agents", "Alerts & Budgets", "Connectors"] as const;
type View = (typeof VIEWS)[number];
type Theme = "auto" | "light" | "dark";

const slug = (v: View) => v.toLowerCase().replace(/[^a-z]+/g, "-");
const fromHash = (): View =>
  VIEWS.find((v) => `#${slug(v)}` === window.location.hash) ?? "Overview";

export default function App() {
  const data = useMemo(() => generateDataset(), []);
  const [view, setViewState] = useState<View>(fromHash);
  const [theme, setTheme] = useState<Theme>("auto");

  const setView = (v: View) => {
    setViewState(v);
    window.history.replaceState(null, "", `#${slug(v)}`);
  };

  useEffect(() => {
    const onHash = () => setViewState(fromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <>
      <header className="masthead">
        <div className="masthead-row">
          <h1 className="wordmark">
            AIToken<em>Lens</em>
          </h1>
          <span className="masthead-meta">
            AI spend ledger · Acme Corp · July 2026
          </span>
        </div>
        <hr className="double-rule" />
        <nav className="nav" aria-label="Views">
          {VIEWS.map((v) => (
            <button key={v} aria-current={view === v} onClick={() => setView(v)}>
              {v}
            </button>
          ))}
          <span className="spacer" />
          <button
            className="theme-toggle"
            onClick={() =>
              setTheme(theme === "auto" ? "dark" : theme === "dark" ? "light" : "auto")
            }
            aria-label="Cycle color theme"
          >
            theme: {theme}
          </button>
        </nav>
      </header>

      <main className="page">
        {view === "Overview" && <OverviewView data={data} />}
        {view === "People" && <PeopleView data={data} />}
        {view === "Agents" && (
          <AgentsView data={data} onOpenAlerts={() => setView("Alerts & Budgets")} />
        )}
        {view === "Alerts & Budgets" && <AlertsView data={data} />}
        {view === "Connectors" && <ConnectorsView />}
      </main>
    </>
  );
}
