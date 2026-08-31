import { MissingEventId, PersonId } from "../shared/entity-id";
import { Fact } from "../fact/fact";
import { DomainInvariantError, EntityValidationError } from "../shared/domain-errors";

export interface MissingEventProps {
  readonly id: MissingEventId;
  readonly personId: PersonId;
  readonly facts?: readonly Fact[];
  readonly createdAt?: Date;
}

/**
 * Immutable Entity representing the event and circumstances of disappearance.
 *
 * Tolerates incomplete or emerging temporal/spatial knowledge.
 */
export class MissingEvent {
  readonly id: MissingEventId;
  readonly personId: PersonId;
  readonly facts: readonly Fact[];
  readonly createdAt: Date;

  constructor(props: MissingEventProps) {
    if (!props.id) {
      throw new EntityValidationError("MissingEvent must have a valid MissingEventId.");
    }
    if (!props.personId) {
      throw new EntityValidationError("MissingEvent must have an associated PersonId.");
    }

    this.id = props.id;
    this.personId = props.personId;
    this.createdAt = props.createdAt ? new Date(props.createdAt.getTime()) : new Date();

    const factsList = props.facts ? [...props.facts] : [];
    for (const fact of factsList) {
      if (fact.subjectId !== this.id) {
        throw new DomainInvariantError(
          `Fact subjectId '${fact.subjectId}' does not match MissingEvent id '${this.id}'.`
        );
      }
    }
    this.facts = Object.freeze(factsList);

    Object.freeze(this);
  }

  addFact(fact: Fact): MissingEvent {
    if (fact.subjectId !== this.id) {
      throw new DomainInvariantError(
        `Cannot associate Fact for subject '${fact.subjectId}' with MissingEvent '${this.id}'.`
      );
    }

    const filtered = this.facts.filter((f) => f.attribute !== fact.attribute || f.id === fact.id);
    const updatedFacts = [...filtered.filter((f) => f.id !== fact.id), fact];

    return new MissingEvent({
      id: this.id,
      personId: this.personId,
      facts: updatedFacts,
      createdAt: this.createdAt,
    });
  }

  getFact(attribute: string): Fact | undefined {
    return this.facts.find((f) => f.attribute === attribute);
  }

  getAllFacts(): readonly Fact[] {
    return this.facts;
  }
}