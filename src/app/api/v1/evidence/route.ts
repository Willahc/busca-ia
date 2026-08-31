import { NextRequest } from "next/server";
import {
  createCaseId,
  createEvidenceId,
  createSourceId,
  EpistemicStatus,
  Provenance,
} from "@/domain";
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, PERMISSIONS } from "@/security";
import {
  addEvidenceSchema,
  executeProtectedCommand,
  jsonSuccess,
  toEvidenceDto,
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
      permission: PERMISSIONS.EVIDENCE_CREATE,
      action: AUDIT_ACTIONS.EVIDENCE_CREATE,
      resourceType: AUDIT_RESOURCE_TYPES.EVIDENCE,
      caseId: bodyCaseId,
    },
    async ({ container }) => {
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
    }
  );
}