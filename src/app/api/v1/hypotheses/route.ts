import { NextRequest } from "next/server";
import {
  createCaseId,
  createEvidenceId,
  createHypothesisId,
} from "@/domain";
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, PERMISSIONS } from "@/security";
import {
  createHypothesisSchema,
  executeProtectedCommand,
  jsonSuccess,
  toHypothesisDto,
} from "@/app/api/_shared";

export async function POST(request: NextRequest) {
  const cloned = request.clone();
  let bodyCaseId: string | undefined;
  try {
    const rawBody = await cloned.json();
    bodyCaseId = typeof rawBody?.caseId === "string" ? rawBody.caseId : undefined;
  } catch {
    // Body parsing handled inside
  }

  return executeProtectedCommand(
    request,
    {
      permission: PERMISSIONS.HYPOTHESIS_CREATE,
      action: AUDIT_ACTIONS.HYPOTHESIS_CREATE,
      resourceType: AUDIT_RESOURCE_TYPES.HYPOTHESIS,
      caseId: bodyCaseId,
    },
    async ({ container }) => {
      const body = await request.json();
      const validated = createHypothesisSchema.parse(body);

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
    }
  );
}