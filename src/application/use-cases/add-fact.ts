import { EpistemicStatus, Fact, FactId, Provenance } from "@/domain";
import { FactRepository } from "../ports/fact-repository";
import { SourceRepository } from "../ports/source-repository";
import { ConflictError } from "../errors/conflict-error";
import { EntityNotFoundError } from "../errors/entity-not-found-error";

export interface AddFactInput<T = unknown> {
  readonly id: FactId;
  readonly subjectId: string;
  readonly attribute: string;
  readonly value: T;
  readonly epistemicStatus: EpistemicStatus;
  readonly provenance: Provenance;
  readonly confidence?: number;
}

export class AddFact {
  constructor(
    private readonly factRepository: FactRepository,
    private readonly sourceRepository: SourceRepository
  ) {}

  async execute<T = unknown>(input: AddFactInput<T>): Promise<Fact<T>> {
    const factExists = await this.factRepository.exists(input.id);
    if (factExists) {
      throw new ConflictError(`Fact with identifier '${input.id}' already exists.`);
    }

    const sourceExists = await this.sourceRepository.exists(input.provenance.sourceId);
    if (!sourceExists) {
      throw new EntityNotFoundError("Source", input.provenance.sourceId);
    }

    // Verify parent facts if specified in provenance
    if (input.provenance.parentFactIds && input.provenance.parentFactIds.length > 0) {
      for (const parentId of input.provenance.parentFactIds) {
        const parentExists = await this.factRepository.exists(parentId);
        if (!parentExists) {
          throw new EntityNotFoundError("Parent Fact", parentId);
        }
      }
    }

    const fact = new Fact<T>({
      id: input.id,
      subjectId: input.subjectId,
      attribute: input.attribute,
      value: input.value,
      epistemicStatus: input.epistemicStatus,
      provenance: input.provenance,
      confidence: input.confidence,
    });

    await this.factRepository.save(fact as Fact<unknown>);
    return fact;
  }
}