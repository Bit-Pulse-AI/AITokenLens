# Contributing to AITokenLens

Thanks for your interest in contributing.

## Before you start

- Read the [Code of Conduct](CODE_OF_CONDUCT.md).
- For security issues follow [SECURITY.md](SECURITY.md) — **never** open a public
  issue for a vulnerability.
- For anything beyond a small fix, open an issue first.

## Development setup

```bash
npm install
npm run dev      # http://localhost:5173
```

## Checks that must pass

```bash
npm test         # vitest suite
npm run lint     # tsc -b --noEmit
npm run build
```

## The seeded dataset is load-bearing

`src/data/generate.ts` produces a deterministic 90-day dataset, and the test
suite asserts three story beats hold:

1. a runaway agent loop three days before the end, above 3× the median;
2. one team roughly 40% over budget;
3. a right-sizing opportunity worth at least $2.5K/month.

If you change the generator, run `npm test` — those assertions are what stop the
demo from silently losing its narrative. Do not weaken a failing assertion to
make a change pass; fix the generator instead.

Two related rules:

- **Keep it deterministic.** No `Math.random()` without the seeded generator, no
  wall-clock dates outside the dataset's anchor. A non-reproducible dashboard is
  not demonstrable.
- **Recommendations are computed, never hardcoded.** Savings figures come from
  usage × list-price deltas in `computeRecommendations`. A hardcoded dollar
  figure will be rejected.

## Pricing data

Anthropic model prices in the dataset are real list prices; other vendors' are
plausible mocks and labelled as such. If you update a real price, cite the
vendor's public pricing page in the pull request.

## Charts and theme

Visuals use a CVD-validated categorical palette, with the three spend layers
pinned to fixed palette slots so a series keeps its colour across views. When
adding a chart, reuse the existing palette tokens rather than picking new colours,
and check both light and dark themes before opening the pull request.

## Coding conventions

- TypeScript throughout; `npm run lint` must pass clean.
- React function components with hooks; no class components.
- Match the surrounding style rather than reformatting untouched code.

## Pull requests

1. Branch from `main` with a descriptive name.
2. One concern per pull request.
3. Imperative commit subjects; explain *why* in the body.
4. For anything visual, include a before/after screenshot — `node scripts/screenshots.mjs`
   captures all views headless.

By contributing, you agree that your contributions are licensed under the
Apache License 2.0.
