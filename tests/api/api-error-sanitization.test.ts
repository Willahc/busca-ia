import { describe, it, expect } from "vitest";
import { handleHttpError, jsonError, jsonSuccess } from "@/app/api/_shared";

describe("API Error Sanitization & Standard Response Envelopes", () => {
  it("35, 37, 38. should sanitize unexpected 500 errors and not leak stack trace, SQL query or filesystem paths", async () => {
    const dangerousError = new Error(
      "Fatal SQLite error: SELECT * FROM sensitive_table WHERE path = 'C:\\Users\\admin\\secret.db'\n    at Database.exec (/home/app/node_modules/better-sqlite3/index.js:42:10)"
    );

    const response = handleHttpError(dangerousError);
    expect(response.status).toBe(500);

    const json = await response.json();
    expect(json).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });

    const responseText = JSON.stringify(json);
    expect(responseText).not.toContain("C:\\Users");
    expect(responseText).not.toContain("SELECT *");
    expect(responseText).not.toContain("stack");
    expect(responseText).not.toContain(".db");
  });

  it("36. should format success responses inside { data: ... } envelope", async () => {
    const res = jsonSuccess({ id: "TEST-001" }, 201);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({ data: { id: "TEST-001" } });
  });

  it("36. should format error responses inside { error: { code, message, details? } } envelope", async () => {
    const res = jsonError("CUSTOM_CODE", "Custom message", 400, [{ field: "name", message: "Required" }]);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({
      error: {
        code: "CUSTOM_CODE",
        message: "Custom message",
        details: [{ field: "name", message: "Required" }],
      },
    });
  });
});