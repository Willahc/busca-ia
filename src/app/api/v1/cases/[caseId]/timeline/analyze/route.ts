import { NextRequest } from "next/server";
import { createCaseId } from "@/domain";
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, PERMISSIONS } from "@/security";
import {
  executeProtectedCommand,
  jsonSuccess,
  toTemporalAnalysisResultDto,
} from "@/app/api/_shared";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await context.params;

  return executeProtectedCommand(
    request,
    {
      permission: PERMISSIONS.TIMELINE_ANALYZE,
      action: AUDIT_ACTIONS.TIMELINE_ANALYZE,
      resourceType: AUDIT_RESOURCE_TYPES.CASE,
      caseId,
      resourceId: caseId,
    },
    async ({ container }) => {
      const result = await container.useCases.analyzeCaseTimeline.execute({
        caseId: createCaseId(caseId),
      });

      return jsonSuccess(toTemporalAnalysisResultDto(result), 200);
    }
  );
}