import { describe, expect, it } from "vitest";
import {
  normalizeControlledCode,
  normalizeText,
} from "@/intelligence/entity-resolution";

describe("Entity Resolution: deterministic normalization", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeText("  Maria   de  Souza ")).toBe("MARIA DE SOUZA");
  });

  it("folds accents without changing tokens", () => {
    expect(normalizeText("José da Silva")).toBe("JOSE DA SILVA");
  });

  it("normalizes canonically equivalent Unicode", () => {
    expect(normalizeText("Jose\u0301")).toBe(normalizeText("José"));
  });

  it("canonicalizes controlled punctuation variants but retains punctuation", () => {
    expect(normalizeText("D’Ávila – Teste")).toBe("D'AVILA - TESTE");
    expect(normalizeText("ANA-MARIA")).not.toBe(normalizeText("ANA MARIA"));
  });

  it("treats empty, null and non-text values as unknown", () => {
    expect(normalizeText("   ")).toBeNull();
    expect(normalizeText(null)).toBeNull();
    expect(normalizeText(undefined)).toBeNull();
  });

  it("accepts structured codes and rejects free descriptions", () => {
    expect(normalizeControlledCode(" scar_left_forearm ")).toBe("SCAR_LEFT_FOREARM");
    expect(normalizeControlledCode("scar on left forearm")).toBeNull();
  });
});
