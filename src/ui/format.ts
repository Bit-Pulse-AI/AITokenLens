export const usd = (n: number): string =>
  n >= 10_000
    ? `$${(n / 1000).toFixed(1)}K`
    : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const usdFull = (n: number): string =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const pct = (n: number): string => `${Math.round(n * 100)}%`;

export const shortDate = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};

export const LAYER_LABEL = {
  cloud: "Cloud AI",
  "saas-seat": "SaaS seats",
  "bespoke-api": "Bespoke APIs",
} as const;

export const LAYER_VAR = {
  cloud: "var(--series-cloud)",
  "saas-seat": "var(--series-seat)",
  "bespoke-api": "var(--series-api)",
} as const;
