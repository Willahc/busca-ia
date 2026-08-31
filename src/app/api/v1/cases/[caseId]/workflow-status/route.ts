import { NextRequest } from "next/server";
import { createCaseId, WorkflowStatus } from "@/domain";
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, PERMISSIONS } from "@/security";
import {
  changeWorkflowStatusSchema,
  executeProtectedCommand,
  jsonSuccess,
  toCaseDto,
} from "@/app/api/_shared";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await context.params;

  return executeProtectedCommand(
    request,
    {
      permission: PERMISSIONS.CASE_WORKFLOW_UPDATE,
      action: AUDIT_ACTIONS.CASE_WORKFLOW_UPDATE,
      resourceType: AUDIT_RESOURCE_TYPES.CASE,
      caseId,
      resourceId: caseId,
    },
    async ({ container }) => {
      const body = await request.json();
      const validated = changeWorkflowStatusSchema.parse(body);

      const updatedCase = await container.useCases.changeCaseWorkflowStatus.execute({
        caseId: createCaseId(caseId),
        newWorkflowStatus: validated.workflowStatus as WorkflowStatus,
      });

      return jsonSuccess(toCaseDto(updatedCase), 200);
    }
  );
}