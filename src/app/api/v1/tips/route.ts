import { NextRequest } from "next/server";
import {
  createCaseId,
  createSourceId,
  createTipId,
  Provenance,
} from "@/domain";
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, PERMISSIONS } from "@/security";
import {
  executeProtectedCommand,
  jsonSuccess,
  registerTipSchema,
  toTipDto,
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
      permission: PERMISSIONS.TIP_CREATE,
      action: AUDIT_ACTIONS.TIP_CREATE,
      resourceType: AUDIT_RESOURCE_TYPES.TIP,
      caseId: bodyCaseId,
    },
    async ({ container }) => {
      const body = await request.json();
      const validated = registerTipSchema.parse(body);

      const sourceId = createSourceId(validated.sourceId);

      const provenance = validated.provenance
        ? new Provenance({
            sourceId: createSourceId(validated.provenance.sourceId),
            observedAt: validated.provenance.observedAt
              ? new Date(validated.provenance.observedAt)
              : undefined,
            recordedAt: validated.provenance.recordedAt
              ? new Date(validated.provenance.recordedAt)
              : new Date(),
            recordedBy: validated.provenance.recordedBy,
            note: validated.provenance.note,
          })
        : new Provenance({
            sourceId,
            recordedAt: validated.receivedAt ? new Date(validated.receivedAt) : new Date(),
            recordedBy: "PUBLIC_PORTAL",
          });

      const tip = await container.useCases.registerTip.execute({
        id: createTipId(validated.tipId),
        caseId: createCaseId(validated.caseId),
        sourceId,
        originalText: validated.originalText,
        receivedAt: validated.receivedAt ? new Date(validated.receivedAt) : new Date(),
        provenance,
      });

      return jsonSuccess(toTipDto(tip), 201);
    }
  );
}