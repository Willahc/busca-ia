import { NextRequest } from "next/server";
import {
  createFactId,
  createSourceId,
  EpistemicStatus,
  Provenance,
} from "@/domain";
import { getApplicationContainer } from "@/infrastructure";
import {
  addFactSchema,
  handleHttpError,
  jsonSuccess,
  toFactDto,
} from "@/app/api/_shared";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = addFactSchema.parse(body);

    const provenance = new Provenance({
      sourceId: createSourceId(validated.provenance.sourceId),
      observedAt: validated.provenance.observedAt
        ? new Date(validated.provenance.observedAt)
        : undefined,
      recordedAt: validated.provenance.recordedAt
        ? new Date(validated.provenance.recordedAt)
        : new Date(),
      recordedBy: validated.provenance.recordedBy,
      parentFactIds: validated.provenance.parentFactIds
        ? validated.provenance.parentFactIds.map((id) => createFactId(id))
        : undefined,
      note: validated.provenance.note,
    });

    const container = getApplicationContainer();
    const fact = await container.useCases.addFact.execute({
      id: createFactId(validated.factId),
      subjectId: validated.subjectId,
      attribute: validated.attribute,
      value: validated.value,
      epistemicStatus: validated.epistemicStatus as EpistemicStatus,
      provenance,
      confidence: validated.confidence,
    });

    return jsonSuccess(toFactDto(fact), 201);
  } catch (error) {
    return handleHttpError(error);
  }
}