import { NextRequest } from "next/server";
import { createSourceId, SourceType } from "@/domain";
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, PERMISSIONS } from "@/security";
import {
  executeProtectedCommand,
  jsonSuccess,
  registerSourceSchema,
  toSourceDto,
} from "@/app/api/_shared";

export async function POST(request: NextRequest) {
  return executeProtectedCommand(
    request,
    {
      permission: PERMISSIONS.SOURCE_CREATE,
      action: AUDIT_ACTIONS.SOURCE_CREATE,
      resourceType: AUDIT_RESOURCE_TYPES.SOURCE,
    },
    async ({ container }) => {
      const body = await request.json();
      const validated = registerSourceSchema.parse(body);

      const source = await container.useCases.registerSource.execute({
        id: createSourceId(validated.sourceId),
        type: validated.type as SourceType,
        label: validated.label,
        externalReference: validated.externalReference,
      });

      return jsonSuccess(toSourceDto(source), 201);
    }
  );
}