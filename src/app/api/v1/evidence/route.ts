import { NextRequest } from "next/server";
import {
  createCaseId,
  createEvidenceId,
  createSourceId,
  EpistemicStatus,
  Provenance,
} from "@/domain";
import { getApplicationContainer } from "@/infrastructure";
import {
  addEvidenceSchema,
  handleHttpError,
  jsonSuccess,
  toEvidenceDto,
} from "@/app/api/_shared";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = addEvidenceSchema.parse(body);

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
    const evidence = await container.useCases.addEvidence.execute({
      id: createEvidenceId(validated.evidenceId),
      caseId: createCaseId(validated.caseId),
      sourceId: createSourceId(validated.sourceId),
      description: validated.description,
      epistemicStatus: validated.epistemicStatus as EpistemicStatus | undefined,
      provenance,
      createdAt: validated.createdAt ? new Date(validated.createdAt) : undefined,
    });

    return jsonSuccess(toEvidenceDto(evidence), 201);
  } catch (error) {
    return handleHttpError(error);
  }
}