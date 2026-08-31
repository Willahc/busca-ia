import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? filesBelow(path) : [path];
  });
}

describe("Entity Resolution architecture boundary", () => {
  it("keeps the analytical engine independent from API and Infrastructure", () => {
    const root = resolve(process.cwd(), "src/intelligence/entity-resolution");
    const source = filesBelow(root)
      .filter((path) => path.endsWith(".ts"))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(source).not.toMatch(/from ["']next(?:\/|["'])/);
    expect(source).not.toMatch(/from ["']react(?:\/|["'])/);
    expect(source).not.toContain("@/infrastructure");
    expect(source).not.toContain("@/application");
    expect(source).not.toContain("better-sqlite3");
  });

  it("does not invert the Domain dependency toward Entity Resolution", () => {
    const root = resolve(process.cwd(), "src/domain");
    const source = filesBelow(root)
      .filter((path) => path.endsWith(".ts"))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(source).not.toContain("entity-resolution");
  });
});
