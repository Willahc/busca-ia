import { NextRequest } from "next/server";
import { createSourceId, SourceType } from "@/domain";
import { getApplicationContainer } from "@/infrastructure";
import {
  handleHttpError,
  jsonSuccess,
  registerSourceSchema,
  toSourceDto,
} from "@/app/api/_shared";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerSourceSchema.parse(body);

    const container = getApplicationContainer();
    const source = await container.useCases.registerSource.execute({
      id: createSourceId(validated.sourceId),
      type: validated.type as SourceType,
      label: validated.label,
      externalReference: validated.externalReference,
    });

    return jsonSuccess(toSourceDto(source), 201);
  } catch (error) {
    return handleHttpError(error);
  }
}