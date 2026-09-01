import { NextRequest } from "next/server";
import { createCaseId, createPersonId } from "@/domain";
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, PERMISSIONS } from "@/security";
import {
  assessPersonCandidateEvidenceSchema,
  executeProtectedCommand,
  jsonSuccess,
  toInvestigativeAssessmentDto,
} from "@/app/api/_shared";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await context.params;

  return executeProtectedCommand(
    request,
    {
      permission: PERMISSIONS.EVIDENCE_ASSESSMENT_RUN,
      action: AUDIT_ACTIONS.EVIDENCE_ASSESSMENT_RUN,
      resourceType: AUDIT_RESOURCE_TYPES.CASE,
      caseId,
      resourceId: caseId,
    },
    async ({ container, setAuditResourceId }) => {
      const body = assessPersonCandidateEvidenceSchema.parse(await request.json());
      setAuditResourceId(
        `caseId=${caseId};leftPersonId=${body.leftPersonId};rightPersonId=${body.rightPersonId}`
      );
      const assessment = await container.useCases.assessPersonCandidateEvidence.execute({
        caseId: createCaseId(caseId),
        leftPersonId: createPersonId(body.leftPersonId),
        rightPersonId: createPersonId(body.rightPersonId),
      });
      return jsonSuccess(toInvestigativeAssessmentDto(assessment), 200);
    }
  );
}
