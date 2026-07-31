# AITokenLens — Prototype Design

**Date:** 2026-07-31
**Status:** Approved (prototype scope)
**Name:** AITokenLens (repo: Bit-Pulse-AI/AITokenLens).

## What this is

A clickable demo prototype of a centralized AI spend / token-cost tracking platform for CFOs and finance teams. Mock data only, no credentials, no backend. Audience: investors and design-partner CFOs. The demo narrative: **"the surprise bill you caught in time."**

Backed by three research passes (see `ai-spend-tracking-research-report.md` in the parent workspace): market validation, competitor pricing (Vertice/Vantage/Finout), and a full API integration map (Azure AI Foundry, agent platforms, model providers, SaaS seats, gateways).

## Approach

Vite + React + TypeScript SPA, no backend. All data from a deterministic seeded mock-data generator, so the demo is reproducible run-to-run. Rationale: for an investor demo the UI *is* the product; the connector story is told with a coverage-matrix screen, not real plumbing.

Rejected alternatives: Next.js full-stack with simulated connector routes (double the work, no visible demo benefit); single-file HTML (fast but not credible as a product prototype).

## The five views

1. **Overview** — total AI spend MTD, forecast vs budget, spend split across the three layers (cloud AI / SaaS AI seats / bespoke APIs), provider breakdown, 90-day trend, anomaly ticker.
2. **People** — the differentiator screen: per-person cost table with roles (engineering managers, designers, business owners), tool mix per person (Claude Code, ChatGPT, Copilot, bespoke apps), per-person drill-down.
3. **Agents** — where agents live: per-agent cost across Bedrock, Azure AI Foundry, Copilot Studio, with one seeded **runaway-agent-loop anomaly** that blew a daily budget — the story moment.
4. **Alerts & Budgets** — budget bars per team, alert feed (threshold breach, anomaly, commitment at-risk), model-choice recommendations with dollar savings (grounded in the verified 50–90% optimization headroom).
5. **Connectors** — coverage matrix from the research: Tier 1 full-API (Bedrock, Anthropic, GitHub Copilot, OpenAI, Azure exports), allocation-grade (M365 Copilot), CSV-import (ChatGPT Enterprise, Copilot Studio). Honesty about locked consoles as a sales asset.

## Data model

Deterministic generator (`src/data/generate.ts`, fixed seed) producing ~90 days of records:

- `Person` — name, role, team, tools used
- `Provider` / `Model` — real names and list prices from the research
- `Agent` — name, platform (Bedrock / Foundry / Copilot Studio), owner
- `SpendRecord` — date, layer (cloud | saas-seat | bespoke-api), provider, model, person?, agent?, team, tokens in/out, cost
- `Budget` — scope (team/agent/person), monthly limit
- `Alert` — type, severity, timestamp, linked entity, narrative text

Seeded story beats: (a) a runaway agent loop on day −3 that tripled one agent's daily cost; (b) one team trending 40% over budget; (c) a model right-sizing recommendation worth ~$3K/mo.

## Stack & conventions

- Vite + React + TypeScript, Recharts for charts, CSS following the dataviz design guidance (light/dark aware).
- Light tests: data-generator unit tests (determinism, totals reconcile) + CI build check (GitHub Actions).
- No routing library needed beyond a simple tab/nav state (or react-router if cleaner).

## Out of scope (YAGNI)

Real connectors, auth, persistence, backend, deployment. The prototype must run with `npm install && npm run dev` and nothing else.
