import { NextRequest } from "next/server";
import { createCaseId, createPersonId } from "@/domain";
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, PERMISSIONS } from "@/security";
import {
  comparePersonCandidatesSchema,
  executeProtectedCommand,
  jsonSuccess,
  toEntityResolutionResultDto,
} from "@/app/api/_shared";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await context.params;

  return executeProtectedCommand(
    request,
    {
      permission: PERMISSIONS.ENTITY_RESOLUTION_COMPARE,
      action: AUDIT_ACTIONS.ENTITY_RESOLUTION_COMPARE,
      resourceType: AUDIT_RESOURCE_TYPES.CASE,
      caseId,
      resourceId: caseId,
    },
    async ({ container, setAuditResourceId }) => {
      const body = comparePersonCandidatesSchema.parse(await request.json());
      setAuditResourceId(
        `caseId=${caseId};leftPersonId=${body.leftPersonId};rightPersonId=${body.rightPersonId}`
      );
      const result = await container.useCases.comparePersonCandidates.execute({
        caseId: createCaseId(caseId),
        leftPersonId: createPersonId(body.leftPersonId),
        rightPersonId: createPersonId(body.rightPersonId),
      });

      return jsonSuccess(toEntityResolutionResultDto(result), 200);
    }
  );
}
