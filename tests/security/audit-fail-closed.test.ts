import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as postSource } from "@/app/api/v1/sources/route";
import { createAppContainer, resetApplicationContainer } from "@/infrastructure";

describe("Security Check 1: Audit Fail-Closed Behavior", () => {
  beforeEach(() => {
    resetApplicationContainer();
    globalThis.__buscaIaAppContainer = createAppContainer({ dbPath: ":memory:" });
  });

  afterEach(() => {
    resetApplicationContainer();
  });

  it("should fail closed and return 500 error if AuditRepository.save fails on a protected operation", async () => {
    const container = globalThis.__buscaIaAppContainer!;

    // Force AuditRepository.save to reject/throw an error
    container.repositories.auditRepository.save = async () => {
      throw new Error("Audit storage disk I/O failure");
    };

    const req = new NextRequest("http://localhost/api/v1/sources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": "OFFICER-001",
        "x-actor-roles": "LAW_ENFORCEMENT",
        "x-request-id": "REQ-AUDIT-FAIL-001",
      },
      body: JSON.stringify({
        sourceId: "SRC-FAIL-CLOSED-001",
        type: "OFFICIAL_RECORD",
        label: "Source Under Test",
      }),
    });

    const response = await postSource(req);

    // Assert that the operation NEVER reports success (not 200/201)
    expect(response.status).not.toBe(200);
    expect(response.status).not.toBe(201);
    expect(response.status).toBe(500);

    const json = await response.json();
    expect(json).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  });
});