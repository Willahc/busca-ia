import { NextRequest } from "next/server";
import { createMissingEventId, createPersonId } from "@/domain";
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, PERMISSIONS } from "@/security";
import {
  executeProtectedCommand,
  jsonSuccess,
  registerMissingEventSchema,
  toMissingEventDto,
} from "@/app/api/_shared";

export async function POST(request: NextRequest) {
  return executeProtectedCommand(
    request,
    {
      permission: PERMISSIONS.MISSING_EVENT_CREATE,
      action: AUDIT_ACTIONS.MISSING_EVENT_CREATE,
      resourceType: AUDIT_RESOURCE_TYPES.MISSING_EVENT,
    },
    async ({ container }) => {
      const body = await request.json();
      const validated = registerMissingEventSchema.parse(body);

      const event = await container.useCases.registerMissingEvent.execute({
        id: createMissingEventId(validated.missingEventId),
        personId: createPersonId(validated.personId),
      });

      return jsonSuccess(toMissingEventDto(event), 201);
    }
  );
}