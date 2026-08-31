import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET as healthGet } from "@/app/api/health/route";
import { GET as readinessGet } from "@/app/api/readiness/route";
import {
  createAppContainer,
  resetApplicationContainer,
} from "@/infrastructure";

describe("Health & Readiness Endpoints", () => {
  beforeEach(() => {
    resetApplicationContainer();
    globalThis.__buscaIaAppContainer = createAppContainer({ dbPath: ":memory:" });
  });

  afterEach(() => {
    resetApplicationContainer();
  });

  it("1. GET /api/health should return 200 and status ok without touching database", async () => {
    const res = await healthGet();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ status: "ok" });
  });

  it("2. GET /api/readiness should return 200 when database and migrations are operational", async () => {
    const res = await readinessGet();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ status: "ready", database: "ready" });
  });

  it("3. GET /api/readiness should return 503 when database is closed or unavailable", async () => {
    // Close the DB to simulate outage
    globalThis.__buscaIaAppContainer?.db.close();

    const res = await readinessGet();
    expect(res.status).toBe(503);

    const json = await res.json();
    expect(json).toEqual({ status: "unready", database: "error" });
  });
});