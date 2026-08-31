import { NextRequest } from "next/server";
import { createPersonId } from "@/domain";
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, PERMISSIONS } from "@/security";
import {
  executeProtectedCommand,
  jsonSuccess,
  registerPersonSchema,
  toPersonDto,
} from "@/app/api/_shared";

export async function POST(request: NextRequest) {
  return executeProtectedCommand(
    request,
    {
      permission: PERMISSIONS.PERSON_CREATE,
      action: AUDIT_ACTIONS.PERSON_CREATE,
      resourceType: AUDIT_RESOURCE_TYPES.PERSON,
    },
    async ({ container }) => {
      const body = await request.json();
      const validated = registerPersonSchema.parse(body);

      const person = await container.useCases.registerPerson.execute({
        id: createPersonId(validated.personId),
      });

      return jsonSuccess(toPersonDto(person), 201);
    }
  );
}