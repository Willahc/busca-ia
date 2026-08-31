import { PersonId } from "../shared/entity-id";
import { Fact } from "../fact/fact";
import { EPISTEMIC_STATUS } from "../shared/epistemic-status";
import { DomainInvariantError, EntityValidationError } from "../shared/domain-errors";

export interface PersonProps {
  readonly id: PersonId;
  readonly facts?: readonly Fact[];
  readonly createdAt?: Date;
}

/**
 * Immutable Entity representing an investigational person identity.
 *
 * Does not require complete profile data (tolerates incomplete identities).
 */
export class Person {
  readonly id: PersonId;
  readonly facts: readonly Fact[];
  readonly createdAt: Date;

  constructor(props: PersonProps) {
    if (!props.id) {
      throw new EntityValidationError("Person must have a valid PersonId.");
    }

    this.id = props.id;
    this.createdAt = props.createdAt ? new Date(props.createdAt.getTime()) : new Date();

    const factsList = props.facts ? [...props.facts] : [];
    for (const fact of factsList) {
      if (fact.subjectId !== this.id) {
        throw new DomainInvariantError(
          `Fact subjectId '${fact.subjectId}' does not match Person id '${this.id}'.`
        );
      }
    }
    this.facts = Object.freeze(factsList);

    Object.freeze(this);
  }

  addFact(fact: Fact): Person {
    if (fact.subjectId !== this.id) {
      throw new DomainInvariantError(
        `Cannot associate Fact for subject '${fact.subjectId}' with Person '${this.id}'.`
      );
    }

    // Replace previous fact for the same attribute or append new
    const filtered = this.facts.filter((f) => f.attribute !== fact.attribute || f.id === fact.id);
    const updatedFacts = [...filtered.filter((f) => f.id !== fact.id), fact];

    return new Person({
      id: this.id,
      facts: updatedFacts,
      createdAt: this.createdAt,
    });
  }

  getFact(attribute: string): Fact | undefined {
    return this.facts.find((f) => f.attribute === attribute);
  }

  getConfirmedFacts(): readonly Fact[] {
    return this.facts.filter((f) => f.epistemicStatus === EPISTEMIC_STATUS.CONFIRMED);
  }

  getAllFacts(): readonly Fact[] {
    return this.facts;
  }
}