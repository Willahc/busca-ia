import { NextRequest } from "next/server";
import {
  createCaseId,
  createMissingEventId,
  createPersonId,
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