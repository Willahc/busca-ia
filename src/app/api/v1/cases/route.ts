import { NextRequest } from "next/server";
import {
  createCaseId,
  createMissingEventId,
  createPersonId,
  OfficialStatus,
  WorkflowStatus,
} from "@/domain";
import { getApplicationContainer } from "@/infrastructure";
import {
  createCaseSchema,
  handleHttpError,
  jsonSuccess,
  toCaseDto,
} from "@/app/api/_shared";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createCaseSchema.parse(body);

    const container = getApplicationContainer();
    const createdCase = await container.useCases.createCase.execute({
      id: createCaseId(validated.caseId),
      personId: createPersonId(validated.personId),
      missingEventId: createMissingEventId(validated.missingEventId),
      workflowStatus: validated.workflowStatus as WorkflowStatus | undefined,
      officialStatus: validated.officialStatus as OfficialStatus | undefined,
      createdAt: validated.createdAt ? new Date(validated.createdAt) : undefined,
    });

    return jsonSuccess(toCaseDto(createdCase), 201);
  } catch (error) {
    return handleHttpError(error);
  }
}