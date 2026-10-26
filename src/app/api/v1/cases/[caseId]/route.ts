import { NextRequest } from "next/server";
import { createCaseId, createSourceId } from "@/domain";
import { ENTITY_RESOLUTION_CASE_CANDIDATE_FACT } from "@/intelligence";
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, PERMISSIONS } from "@/security";
import {
  executeProtectedCommand,
  jsonSuccess,
  toCaseDto,
  toFactDto,
  toTipDto,
} from "@/app/api/_shared";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await context.params;

  return executeProtectedCommand(
    request,
    {
      permission: PERMISSIONS.CASE_ADMIN_ACCESS,
      action: AUDIT_ACTIONS.CASE_READ,
      resourceType: AUDIT_RESOURCE_TYPES.CASE,
      caseId,
    },
    async ({ container }) => {
      const caseEntity = await container.repositories.caseRepository.findById(
        createCaseId(caseId)
      );
      if (
        !caseEntity ||
        !caseEntity.id.startsWith("SIM-") ||
        !caseEntity.personId.startsWith("SIM-") ||
        !caseEntity.missingEventId.startsWith("SIM-")
      ) {
        return jsonSuccess({ case: null, facts: [], tips: [] }, 404);
      }

      const [facts, tips] = await Promise.all([
        container.repositories.factRepository.findBySubjectId(caseEntity.personId),
        container.repositories.tipRepository.findByCaseId(caseEntity.id),
      ]);
      const syntheticFacts = [];
      for (const fact of facts) {
        if (fact.epistemicStatus !== "SYNTHETIC") {
          continue;
        }
        const source = await container.repositories.sourceRepository.findById(
          createSourceId(fact.provenance.sourceId)
        );
        if (source?.isSynthetic) {
          syntheticFacts.push(fact);
        }
      }

      if (!syntheticFacts.some((fact) => fact.attribute === "display_name")) {
        return jsonSuccess({ case: null, facts: [], tips: [] }, 404);
      }

      const caseFacts = await container.repositories.factRepository.findBySubjectId(
        caseEntity.id
      );
      const candidates = [];
      for (const fact of caseFacts) {
        if (
          fact.attribute !== ENTITY_RESOLUTION_CASE_CANDIDATE_FACT ||
          fact.epistemicStatus !== "SYNTHETIC" ||
          typeof fact.value !== "string" ||
          !fact.value.startsWith("SIM-")
        ) {
          continue;
        }
        const linkSource = await container.repositories.sourceRepository.findById(
          createSourceId(fact.provenance.sourceId)
        );
        if (!linkSource?.isSynthetic) {
          continue;
        }

        const candidateFacts = await container.repositories.factRepository.findBySubjectId(
          fact.value
        );
        const nameFact = candidateFacts.find(
          (candidateFact) =>
            candidateFact.attribute === "display_name" &&
            candidateFact.epistemicStatus === "SYNTHETIC" &&
            typeof candidateFact.value === "string"
        );
        if (!nameFact) {
          continue;
        }
        const nameSource = await container.repositories.sourceRepository.findById(
          createSourceId(nameFact.provenance.sourceId)
        );
        if (nameSource?.isSynthetic) {
          candidates.push({ personId: fact.value, displayName: String(nameFact.value) });
        }
      }

      const syntheticTips = [];
      for (const tip of tips) {
        const source = await container.repositories.sourceRepository.findById(
          createSourceId(tip.sourceId)
        );
        if (source?.isSynthetic) {
          syntheticTips.push(tip);
        }
      }

      return jsonSuccess({
        case: toCaseDto(caseEntity),
        facts: syntheticFacts.map(toFactDto),
        tips: syntheticTips.map(toTipDto),
        candidates,
      });
    }
  );
}
