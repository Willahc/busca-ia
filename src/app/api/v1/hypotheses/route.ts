import { NextRequest } from "next/server";
import {
  createCaseId,
  createEvidenceId,
  createHypothesisId,
} from "@/domain";
import { getApplicationContainer } from "@/infrastructure";
import {
  createHypothesisSchema,
  handleHttpError,
  jsonSuccess,
  toHypothesisDto,
} from "@/app/api/_shared";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createHypothesisSchema.parse(body);

    const container = getApplicationContainer();
    const hypothesis = await container.useCases.createHypothesis.execute({
      id: createHypothesisId(validated.hypothesisId),
      caseId: createCaseId(validated.caseId),
      statement: validated.statement,
      supportingEvidenceIds: validated.supportingEvidenceIds
        ? validated.supportingEvidenceIds.map((id) => createEvidenceId(id))
        : undefined,
      contradictingEvidenceIds: validated.contradictingEvidenceIds
        ? validated.contradictingEvidenceIds.map((id) => createEvidenceId(id))
        : undefined,
      createdAt: validated.createdAt ? new Date(validated.createdAt) : undefined,
    });

    return jsonSuccess(toHypothesisDto(hypothesis), 201);
  } catch (error) {
    return handleHttpError(error);
  }
}