import { NextRequest } from "next/server";
import {
  createFactId,
  createSourceId,
  EpistemicStatus,
  Provenance,
} from "@/domain";
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, PERMISSIONS } from "@/security";
import {
  addFactSchema,
  executeProtectedCommand,
  jsonSuccess,
  toFactDto,
} from "@/app/api/_shared";

export async function POST(request: NextRequest) {
  return executeProtectedCommand(
    request,
    {
      permission: PERMISSIONS.FACT_CREATE,
      action: AUDIT_ACTIONS.FACT_CREATE,
      resourceType: AUDIT_RESOURCE_TYPES.FACT,
    },
    async ({ container }) => {
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
    }
  );
}