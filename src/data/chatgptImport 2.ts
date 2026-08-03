import type { Dataset, Person, SpendRecord, Team } from "./types";

/** One row of a ChatGPT Enterprise workspace-members export. */
export interface ImportedUser {
  email: string;
  name: string;
  department: string;
  status: string;
  lastActive: string;
}

const SEAT_PRICE = 60; // ChatGPT Enterprise list price, $/seat/month

const TEAMS: Team[] = [
  "Platform Engineering",
  "Product Engineering",
  "Design",
  "Marketing",
  "Sales Ops",
  "Finance",
];

/** Minimal CSV split with double-quote support. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Parse a workspace-members CSV. Tolerant of column order and header case;
 * requires at least an email column. */
export function parseChatgptCsv(text: string): ImportedUser[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("This file doesn't look like a members export (no data rows).");
  }
  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  const col = (name: string) => headers.indexOf(name);
  const emailIdx = col("email");
  if (emailIdx === -1) {
    throw new Error('No "email" column found — expected a ChatGPT Enterprise members export.');
  }
  const nameIdx = col("name");
  const deptIdx = col("department");
  const statusIdx = col("status");
  const lastIdx = col("lastactive");

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const pick = (i: number) => (i >= 0 ? (cells[i] ?? "") : "");
    return {
      email: pick(emailIdx),
      name: pick(nameIdx) || pick(emailIdx),
      department: pick(deptIdx),
      status: pick(statusIdx).toLowerCase(),
      lastActive: pick(lastIdx),
    };
  });
}

const daysInMonth = (month: string): number =>
  new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();

/** Daily seat-allocation records for the given month (YYYY-MM), active members only. */
export function usersToRecords(users: ImportedUser[], month: string): SpendRecord[] {
  const days = daysInMonth(month);
  const daily = SEAT_PRICE / days;
  const records: SpendRecord[] = [];
  for (const user of users) {
    if (user.status !== "active") continue;
    const team: Team = TEAMS.includes(user.department as Team)
      ? (user.department as Team)
      : "Unattributed";
    for (let d = 1; d <= days; d++) {
      records.push({
        date: `${month}-${String(d).padStart(2, "0")}`,
        layer: "saas-seat",
        provider: "chatgpt-enterprise",
        team,
        personId: `csv-${user.email}`,
        cost: daily,
      });
    }
  }
  return records;
}

/** Replace mock ChatGPT Enterprise spend with the imported allocation and
 * add imported members to the people table. */
export function mergeChatgptImport(
  base: Dataset,
  users: ImportedUser[],
  month: string,
): Dataset {
  const active = users.filter((u) => u.status === "active");
  const people: Person[] = active.map((u) => ({
    id: `csv-${u.email}`,
    name: u.name,
    role: "Member",
    team: TEAMS.includes(u.department as Team) ? (u.department as Team) : "Unattributed",
    seats: ["chatgpt-enterprise"],
  }));
  return {
    ...base,
    people: [...base.people, ...people],
    records: [
      ...base.records.filter((r) => r.provider !== "chatgpt-enterprise"),
      ...usersToRecords(users, month),
    ],
  };
}
