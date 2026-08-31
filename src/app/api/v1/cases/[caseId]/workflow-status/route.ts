import { NextRequest } from "next/server";
import { createCaseId, WorkflowStatus } from "@/domain";
import { getApplicationContainer } from "@/infrastructure";
import {
  changeWorkflowStatusSchema,
  handleHttpError,
  jsonSuccess,
  toCaseDto,
} from "@/app/api/_shared";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const body = await request.json();
    const validated = changeWorkflowStatusSchema.parse(body);

    const container = getApplicationContainer();
    const updatedCase = await container.useCases.changeCaseWorkflowStatus.execute({
      caseId: createCaseId(caseId),
      newWorkflowStatus: validated.workflowStatus as WorkflowStatus,
    });

    return jsonSuccess(toCaseDto(updatedCase), 200);
  } catch (error) {
    return handleHttpError(error);
  }
}