import type Database from "better-sqlite3";
import {
  AddEvidence,
  AddFact,
  CaseRepository,
  ChangeCaseWorkflowStatus,
  CreateCase,
  CreateHypothesis,
  EvidenceRepository,
  FactRepository,
  HypothesisRepository,
  MissingEventRepository,
  PersonRepository,
  RegisterMissingEvent,
  RegisterPerson,
  RegisterSource,
  RegisterTip,
  SourceRepository,
  TipRepository,
  UpdateOfficialStatus,
} from "@/application";
import { AuditRepository } from "@/security";
import {
  createSqliteConnection,
  SqliteAuditRepository,
  SqliteCaseRepository,
  SqliteConnectionOptions,
  SqliteEvidenceRepository,
  SqliteFactRepository,
  SqliteHypothesisRepository,
  SqliteMissingEventRepository,
  SqlitePersonRepository,
  SqliteSourceRepository,
  SqliteTipRepository,
} from "@/infrastructure";

export interface AppRepositories {
  readonly sourceRepository: SourceRepository;
  readonly personRepository: PersonRepository;
  readonly missingEventRepository: MissingEventRepository;
  readonly caseRepository: CaseRepository;
  readonly factRepository: FactRepository;
  readonly tipRepository: TipRepository;
  readonly evidenceRepository: EvidenceRepository;
  readonly hypothesisRepository: HypothesisRepository;
  readonly auditRepository: AuditRepository;
}

export interface AppUseCases {
  readonly registerSource: RegisterSource;
  readonly registerPerson: RegisterPerson;
  readonly registerMissingEvent: RegisterMissingEvent;
  readonly createCase: CreateCase;
  readonly addFact: AddFact;
  readonly registerTip: RegisterTip;
  readonly addEvidence: AddEvidence;
  readonly createHypothesis: CreateHypothesis;
  readonly changeCaseWorkflowStatus: ChangeCaseWorkflowStatus;
  readonly updateOfficialStatus: UpdateOfficialStatus;
}

export interface AppContainer {
  readonly db: Database.Database;
  readonly repositories: AppRepositories;
  readonly useCases: AppUseCases;
  checkReadiness(): { ready: boolean; error?: string };
  close(): void;
}

export function createAppContainer(options: SqliteConnectionOptions = {}): AppContainer {
  const db = createSqliteConnection(options);

  const sourceRepository = new SqliteSourceRepository(db);
  const personRepository = new SqlitePersonRepository(db);
  const missingEventRepository = new SqliteMissingEventRepository(db);
  const caseRepository = new SqliteCaseRepository(db);
  const factRepository = new SqliteFactRepository(db);
  const tipRepository = new SqliteTipRepository(db);
  const evidenceRepository = new SqliteEvidenceRepository(db);
  const hypothesisRepository = new SqliteHypothesisRepository(db);
  const auditRepository = new SqliteAuditRepository(db);

  const repositories: AppRepositories = {
    sourceRepository,
    personRepository,
    missingEventRepository,
    caseRepository,
    factRepository,
    tipRepository,
    evidenceRepository,
    hypothesisRepository,
    auditRepository,
  };

  const useCases: AppUseCases = {
    registerSource: new RegisterSource(sourceRepository),
    registerPerson: new RegisterPerson(personRepository),
    registerMissingEvent: new RegisterMissingEvent(missingEventRepository, personRepository),
    createCase: new CreateCase(caseRepository, personRepository, missingEventRepository),
    addFact: new AddFact(factRepository, sourceRepository),
    registerTip: new RegisterTip(tipRepository, caseRepository, sourceRepository),
    addEvidence: new AddEvidence(evidenceRepository, caseRepository, sourceRepository),
    createHypothesis: new CreateHypothesis(hypothesisRepository, caseRepository, evidenceRepository),
    changeCaseWorkflowStatus: new ChangeCaseWorkflowStatus(caseRepository),
    updateOfficialStatus: new UpdateOfficialStatus(caseRepository, sourceRepository),
  };

  return {
    db,
    repositories,
    useCases,
    checkReadiness(): { ready: boolean; error?: string } {
      try {
        const row = db.prepare("SELECT 1 as live").get() as { live: number } | undefined;
        if (row?.live !== 1) {
          return { ready: false, error: "Database returned unexpected ping result" };
        }
        const migRow = db.prepare("SELECT count(*) as count FROM schema_migrations").get() as { count: number } | undefined;
        if (!migRow || migRow.count < 1) {
          return { ready: false, error: "Migrations are not initialized" };
        }
        return { ready: true };
      } catch (err) {
        return { ready: false, error: err instanceof Error ? err.message : "Database check failed" };
      }
    },
    close(): void {
      if (db.open) {
        db.close();
      }
    },
  };
}

// Global Process-local singleton for Next.js route handlers
declare global {
  var __buscaIaAppContainer: AppContainer | undefined;
}

export function getApplicationContainer(): AppContainer {
  if (!globalThis.__buscaIaAppContainer) {
    globalThis.__buscaIaAppContainer = createAppContainer();
  }
  return globalThis.__buscaIaAppContainer;
}

export function resetApplicationContainer(): void {
  if (globalThis.__buscaIaAppContainer) {
    globalThis.__buscaIaAppContainer.close();
    globalThis.__buscaIaAppContainer = undefined;
  }
}