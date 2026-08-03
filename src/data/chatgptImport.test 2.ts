import { describe, expect, test } from "vitest";
import { generateDataset } from "./generate";
import { mergeChatgptImport, parseChatgptCsv, usersToRecords } from "./chatgptImport";

const CSV = `Email,Name,Department,Status,Last Active
ava@acme.com,Ava Chen,Engineering,active,2026-07-30
"doe, jon"@acme.com,"Doe, Jon",Design,active,2026-07-29
sam@acme.com,Sam Ortiz,Marketing,invited,
lee@acme.com,Lee Park,Engineering,deactivated,2026-06-01
mia@acme.com,Mia Novak,Finance,active,2026-07-31
`;

describe("parseChatgptCsv", () => {
  test("parses rows with quoted fields and preserves status", () => {
    const users = parseChatgptCsv(CSV);
    expect(users).toHaveLength(5); // all rows parse; active-only filtering happens in usersToRecords
    const jon = users.find((u) => u.name === "Doe, Jon");
    expect(jon).toBeDefined();
    expect(jon!.department).toBe("Design");
  });

  test("is tolerant of column order and header case", () => {
    const alt = "status,EMAIL,name\nactive,zoe@acme.com,Zoe\n";
    const users = parseChatgptCsv(alt);
    expect(users).toEqual([
      { email: "zoe@acme.com", name: "Zoe", department: "", status: "active", lastActive: "" },
    ]);
  });

  test("throws a friendly error when required columns are missing", () => {
    expect(() => parseChatgptCsv("foo,bar\n1,2\n")).toThrow(/email/i);
  });
});

describe("usersToRecords", () => {
  test("only active members get seat costs; monthly total = seats × price", () => {
    const users = parseChatgptCsv(CSV);
    const records = usersToRecords(users, "2026-07");
    const people = new Set(records.map((r) => r.personId));
    expect(people.size).toBe(3); // active only
    const total = records.reduce((s, r) => s + r.cost, 0);
    expect(total).toBeCloseTo(3 * 60, 1); // 3 active seats × $60/mo list price
    expect(records.every((r) => r.provider === "chatgpt-enterprise")).toBe(true);
  });
});

describe("mergeChatgptImport", () => {
  test("replaces mock chatgpt-enterprise spend and adds imported people", () => {
    const base = generateDataset();
    const users = parseChatgptCsv(CSV);
    const merged = mergeChatgptImport(base, users, "2026-07");
    const mock = base.records.filter((r) => r.provider === "chatgpt-enterprise");
    const now = merged.records.filter((r) => r.provider === "chatgpt-enterprise");
    expect(now.length).toBeLessThan(mock.length);
    expect(now.every((r) => r.personId?.startsWith("csv-"))).toBe(true);
    // department mapping: Engineering doesn't match a team → Unattributed; Design/Finance match
    const imported = merged.people.filter((p) => p.id.startsWith("csv-"));
    expect(imported).toHaveLength(3);
    expect(imported.find((p) => p.name === "Doe, Jon")!.team).toBe("Design");
    expect(imported.find((p) => p.name === "Ava Chen")!.team).toBe("Unattributed");
    // non-chatgpt records untouched
    const other = (d: typeof base) =>
      d.records.filter((r) => r.provider !== "chatgpt-enterprise").reduce((s, r) => s + r.cost, 0);
    expect(other(merged)).toBeCloseTo(other(base), 4);
  });
});
