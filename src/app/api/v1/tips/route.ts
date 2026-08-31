import { NextRequest } from "next/server";
import {
  createCaseId,
  createSourceId,
  createTipId,
  Provenance,
} from "@/domain";
import { getApplicationContainer } from "@/infrastructure";
import {
  handleHttpError,
  jsonSuccess,
  registerTipSchema,
  toTipDto,
} from "@/app/api/_shared";

export async function POST(request: NextRequest) {
  try {
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

    const container = getApplicationContainer();
    const tip = await container.useCases.registerTip.execute({
      id: createTipId(validated.tipId),
      caseId: createCaseId(validated.caseId),
      sourceId,
      originalText: validated.originalText, // Preserved verbatim
      receivedAt: validated.receivedAt ? new Date(validated.receivedAt) : new Date(),
      provenance,
    });

    return jsonSuccess(toTipDto(tip), 201);
  } catch (error) {
    return handleHttpError(error);
  }
}