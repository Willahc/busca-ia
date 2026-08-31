import { NextRequest } from "next/server";
import { createPersonId } from "@/domain";
import { getApplicationContainer } from "@/infrastructure";
import {
  handleHttpError,
  jsonSuccess,
  registerPersonSchema,
  toPersonDto,
} from "@/app/api/_shared";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerPersonSchema.parse(body);

    const container = getApplicationContainer();
    const person = await container.useCases.registerPerson.execute({
      id: createPersonId(validated.personId),
    });

    return jsonSuccess(toPersonDto(person), 201);
  } catch (error) {
    return handleHttpError(error);
  }
}