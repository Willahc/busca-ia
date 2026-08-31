import { CaseId } from "@/domain";
import { TimelineEvent } from "../model/timeline-event";
import { TemporalRelation } from "../relations/temporal-relation";
import { TemporalContradiction } from "../contradictions/temporal-contradiction";
import { TemporalGap } from "../gaps/temporal-gap";
import { TemporalDerivation } from "../derivations/temporal-derivation";

export type TemporalAnalysisStatus = "ANALYZED" | "INSUFFICIENT_TEMPORAL_DATA";

export interface TemporalAnalysisResultProps {
  readonly caseId: CaseId;
  readonly status: TemporalAnalysisStatus;
  readonly events: readonly TimelineEvent[];
  readonly relations: readonly TemporalRelation[];
  readonly contradictions: readonly TemporalContradiction[];
  readonly gaps: readonly TemporalGap[];
  readonly derivations: readonly TemporalDerivation[];
  readonly unresolvedEvents: readonly TimelineEvent[];
  readonly generatedAt?: Date;
}

export class TemporalAnalysisResult {
  readonly caseId: CaseId;
  readonly status: TemporalAnalysisStatus;
  readonly events: readonly TimelineEvent[];
  readonly relations: readonly TemporalRelation[];
  readonly contradictions: readonly TemporalContradiction[];
  readonly gaps: readonly TemporalGap[];
  readonly derivations: readonly TemporalDerivation[];
  readonly unresolvedEvents: readonly TimelineEvent[];
  readonly generatedAt?: Date;

  constructor(props: TemporalAnalysisResultProps) {
    this.caseId = props.caseId;
    this.status = props.status;
    this.events = Object.freeze([...props.events]);
    this.relations = Object.freeze([...props.relations]);
    this.contradictions = Object.freeze([...props.contradictions]);
    this.gaps = Object.freeze([...props.gaps]);
    this.derivations = Object.freeze([...props.derivations]);
    this.unresolvedEvents = Object.freeze([...props.unresolvedEvents]);
    this.generatedAt = props.generatedAt;
  }
}