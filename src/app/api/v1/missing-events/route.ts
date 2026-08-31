import { NextRequest } from "next/server";
import { createMissingEventId, createPersonId } from "@/domain";
import { getApplicationContainer } from "@/infrastructure";
import {
  handleHttpError,
  jsonSuccess,
  registerMissingEventSchema,
  toMissingEventDto,
} from "@/app/api/_shared";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerMissingEventSchema.parse(body);

    const container = getApplicationContainer();
    const event = await container.useCases.registerMissingEvent.execute({
      id: createMissingEventId(validated.missingEventId),
      personId: createPersonId(validated.personId),
    });

    return jsonSuccess(toMissingEventDto(event), 201);
  } catch (error) {
    return handleHttpError(error);
  }
}