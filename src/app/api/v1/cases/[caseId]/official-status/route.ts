import { NextRequest } from "next/server";
import {
  createCaseId,
  createSourceId,
  OfficialStatus,
  Provenance,
} from "@/domain";
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, PERMISSIONS } from "@/security";
import {
  executeProtectedCommand,
  jsonSuccess,
  toCaseDto,
  updateOfficialStatusSchema,
} from "@/app/api/_shared";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await context.params;

  return executeProtectedCommand(
    request,
    {
      permission: PERMISSIONS.CASE_OFFICIAL_STATUS_UPDATE,
      action: AUDIT_ACTIONS.CASE_OFFICIAL_STATUS_UPDATE,
      resourceType: AUDIT_RESOURCE_TYPES.CASE,
      caseId,
      resourceId: caseId,
    },
    async ({ container }) => {
      const body = await request.json();
      const validated = updateOfficialStatusSchema.parse(body);

      const provenance = new Provenance({
        sourceId: createSourceId(validated.provenance.sourceId),
        observedAt: validated.provenance.observedAt
          ? new Date(validated.provenance.observedAt)
          : undefined,
        recordedAt: validated.provenance.recordedAt
          ? new Date(validated.provenance.recordedAt)
          : new Date(),
        recordedBy: validated.provenance.recordedBy,
        note: validated.provenance.note,
      });

      const updatedCase = await container.useCases.updateOfficialStatus.execute({
        caseId: createCaseId(caseId),
        newOfficialStatus: validated.officialStatus as OfficialStatus,
        provenance,
      });

      return jsonSuccess(toCaseDto(updatedCase), 200);
    }
  );
}