import { NextRequest } from "next/server";
import {
  createCaseId,
  createMissingEventId,
  createPersonId,
  createSourceId,
  OfficialStatus,
  PrivacyLevel,
  WorkflowStatus,
} from "@/domain";
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, PERMISSIONS } from "@/security";
import {
  createCaseSchema,
  executeProtectedCommand,
  jsonSuccess,
  toCaseDto,
} from "@/app/api/_shared";

export async function GET(request: NextRequest) {
  return executeProtectedCommand(
    request,
    {
      permission: PERMISSIONS.CASE_ADMIN_ACCESS,
      action: AUDIT_ACTIONS.CASE_LIST,
      resourceType: AUDIT_RESOURCE_TYPES.CASE,
    },
    async ({ container }) => {
      const cases = await container.repositories.caseRepository.findAll();
      const data = [];
      for (const caseEntity of cases) {
        if (
          caseEntity.privacyLevel === "SEALED" ||
          !caseEntity.id.startsWith("SIM-") ||
          !caseEntity.personId.startsWith("SIM-") ||
          !caseEntity.missingEventId.startsWith("SIM-")
        ) {
          continue;
        }

        const facts = await container.repositories.factRepository.findBySubjectId(
          caseEntity.personId
        );
        const nameFact = facts.find(
          (fact) =>
            fact.attribute === "display_name" &&
            fact.epistemicStatus === "SYNTHETIC" &&
            typeof fact.value === "string"
        );
        if (!nameFact) {
          continue;
        }

        const source = await container.repositories.sourceRepository.findById(
          createSourceId(nameFact.provenance.sourceId)
        );
        if (!source?.isSynthetic) {
          continue;
        }

        data.push({
          ...toCaseDto(caseEntity),
          displayName: String(nameFact.value),
        });
      }
      return jsonSuccess(data);
    }
  );
}

export async function POST(request: NextRequest) {
  return executeProtectedCommand(
    request,
    {
      permission: PERMISSIONS.CASE_CREATE,
      action: AUDIT_ACTIONS.CASE_CREATE,
      resourceType: AUDIT_RESOURCE_TYPES.CASE,
    },
    async ({ container }) => {
      const body = await request.json();
      const validated = createCaseSchema.parse(body);

      const createdCase = await container.useCases.createCase.execute({
        id: createCaseId(validated.caseId),
        personId: createPersonId(validated.personId),
        missingEventId: createMissingEventId(validated.missingEventId),
        workflowStatus: validated.workflowStatus as WorkflowStatus | undefined,
        officialStatus: validated.officialStatus as OfficialStatus | undefined,
        privacyLevel: validated.privacyLevel as PrivacyLevel | undefined,
        createdAt: validated.createdAt ? new Date(validated.createdAt) : undefined,
      });

      return jsonSuccess(toCaseDto(createdCase), 201);
    }
  );
}