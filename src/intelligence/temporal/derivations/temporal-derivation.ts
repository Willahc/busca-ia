import { EpistemicStatus, FactId } from "@/domain";
import { TemporalPrecision } from "../precision/temporal-precision";
import { TemporalInterval } from "../model/temporal-interval";
import { TemporalPoint } from "../model/temporal-point";

export interface TemporalDerivationProps {
  readonly derivationId: string;
  readonly derivedAttribute: string;
  readonly temporalExpression: TemporalPoint | TemporalInterval;
  readonly precision: TemporalPrecision;
  readonly epistemicStatus: EpistemicStatus;
  readonly sourceFactIds?: readonly FactId[];
  readonly sourceEventIds?: readonly string[];
  readonly explanation: string;
}

export class TemporalDerivation {
  readonly derivationId: string;
  readonly derivedAttribute: string;
  readonly temporalExpression: TemporalPoint | TemporalInterval;
  readonly precision: TemporalPrecision;
  readonly epistemicStatus: EpistemicStatus;
  readonly sourceFactIds: readonly FactId[];
  readonly sourceEventIds: readonly string[];
  readonly explanation: string;

  constructor(props: TemporalDerivationProps) {
    this.derivationId = props.derivationId;
    this.derivedAttribute = props.derivedAttribute;
    this.temporalExpression = props.temporalExpression;
    this.precision = props.precision;
    this.epistemicStatus = props.epistemicStatus;
    this.sourceFactIds = props.sourceFactIds ?? [];
    this.sourceEventIds = props.sourceEventIds ?? [];
    this.explanation = props.explanation;
  }
}