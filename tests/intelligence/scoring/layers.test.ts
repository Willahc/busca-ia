import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? filesBelow(path) : [path];
  });
}

describe("Evidence Assessment architecture boundary", () => {
  it("depends only on pure Domain and Intelligence contracts", () => {
    const source = filesBelow(resolve(process.cwd(), "src/intelligence/scoring"))
      .filter((path) => path.endsWith(".ts"))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(source).not.toMatch(/from ["']next(?:\/|["'])/);
    expect(source).not.toMatch(/from ["']react(?:\/|["'])/);
    expect(source).not.toContain("@/infrastructure");
    expect(source).not.toContain("@/application");
    expect(source).not.toContain("better-sqlite3");
    expect(source).not.toMatch(/\b(fetch|WebSocket)\s*\(/);
  });

  it("contains no numeric score or probability model", () => {
    const source = filesBelow(resolve(process.cwd(), "src/intelligence/scoring"))
      .filter((path) => path.endsWith(".ts"))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(source).not.toMatch(/\b(probability|percentage|weightedAverage)\s*:/i);
    expect(source).not.toMatch(/score\s*:/i);
  });
});
