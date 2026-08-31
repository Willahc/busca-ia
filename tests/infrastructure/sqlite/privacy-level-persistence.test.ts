import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import {
  Case,
  createCaseId,
  createMissingEventId,
  createPersonId,
  MissingEvent,
  Person,
  PrivacyLevel,
  PRIVACY_LEVELS,
} from "@/domain";
import {
  createSqliteConnection,
  SqliteCaseRepository,
  SqliteMissingEventRepository,
  SqlitePersonRepository,
} from "@/infrastructure";

describe("Security Check 2: Privacy Level Persistence Roundtrip", () => {
  let db: Database.Database;
  let caseRepo: SqliteCaseRepository;
  let personRepo: SqlitePersonRepository;
  let eventRepo: SqliteMissingEventRepository;

  beforeEach(() => {
    db = createSqliteConnection({ dbPath: ":memory:" });
    caseRepo = new SqliteCaseRepository(db);
    personRepo = new SqlitePersonRepository(db);
    eventRepo = new SqliteMissingEventRepository(db);
  });

  afterEach(() => {
    if (db) db.close();
  });

  const privacyLevels: PrivacyLevel[] = [
    PRIVACY_LEVELS.PUBLIC,
    PRIVACY_LEVELS.RESTRICTED,
    PRIVACY_LEVELS.CONFIDENTIAL,
    PRIVACY_LEVELS.LAW_ENFORCEMENT_ONLY,
    PRIVACY_LEVELS.SEALED,
  ];

  privacyLevels.forEach((level) => {
    it(`should persist and retrieve Case with privacyLevel = ${level} with exact fidelity`, async () => {
      const personId = createPersonId(`PERSON-${level}`);
      const missingEventId = createMissingEventId(`EVENT-${level}`);
      const caseId = createCaseId(`CASE-${level}`);

      await personRepo.save(new Person({ id: personId }));
      await eventRepo.save(new MissingEvent({ id: missingEventId, personId }));

      const caseToSave = new Case({
        id: caseId,
        personId,
        missingEventId,
        privacyLevel: level,
      });

      await caseRepo.save(caseToSave);

      const loadedCase = await caseRepo.findById(caseId);
      expect(loadedCase).not.toBeNull();
      expect(loadedCase?.id).toBe(caseId);
      expect(loadedCase?.privacyLevel).toBe(level);
      expect(loadedCase?.personId).toBe(personId);
      expect(loadedCase?.missingEventId).toBe(missingEventId);
    });
  });
});