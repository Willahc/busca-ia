import { describe, it, expect, beforeEach } from "vitest";
import { createSourceId, SOURCE_TYPES } from "@/domain";
import { RegisterSource, ConflictError } from "@/application";
import { InMemorySourceRepository } from "./in-memory";

describe("RegisterSource Use Case", () => {
  let sourceRepo: InMemorySourceRepository;
  let useCase: RegisterSource;

  beforeEach(() => {
    sourceRepo = new InMemorySourceRepository();
    useCase = new RegisterSource(sourceRepo);
  });

  it("1. should successfully register a valid Source", async () => {
    const sourceId = createSourceId("SOURCE-TEST-001");
    const source = await useCase.execute({
      id: sourceId,
      type: SOURCE_TYPES.OFFICIAL_RECORD,
      label: "Official Civil Registry",
      externalReference: "REG-REF-99",
    });

    expect(source.id).toBe(sourceId);
    expect(source.type).toBe(SOURCE_TYPES.OFFICIAL_RECORD);
    expect(source.label).toBe("Official Civil Registry");
    expect(source.isSynthetic).toBe(false);

    const saved = await sourceRepo.findById(sourceId);
    expect(saved).not.toBeNull();
    expect(saved?.id).toBe(sourceId);
  });

  it("2. should reject registering a duplicate sourceId with ConflictError", async () => {
    const sourceId = createSourceId("SOURCE-TEST-001");
    await useCase.execute({
      id: sourceId,
      type: SOURCE_TYPES.LAW_ENFORCEMENT,
      label: "Police Department Test",
    });

    await expect(
      useCase.execute({
        id: sourceId,
        type: SOURCE_TYPES.LAW_ENFORCEMENT,
        label: "Duplicate Police Department",
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });
});