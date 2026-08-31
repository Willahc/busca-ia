import { NextRequest } from "next/server";
import {
  createCaseId,
  createSourceId,
  OfficialStatus,
  Provenance,
} from "@/domain";
import { getApplicationContainer } from "@/infrastructure";
import {
  handleHttpError,
  jsonSuccess,
  toCaseDto,
  updateOfficialStatusSchema,
} from "@/app/api/_shared";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
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

    const container = getApplicationContainer();
    const updatedCase = await container.useCases.updateOfficialStatus.execute({
      caseId: createCaseId(caseId),
      newOfficialStatus: validated.officialStatus as OfficialStatus,
      provenance,
    });

    return jsonSuccess(toCaseDto(updatedCase), 200);
  } catch (error) {
    return handleHttpError(error);
  }
}