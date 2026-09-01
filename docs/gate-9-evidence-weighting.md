# Gate 9 — Evidence Weighting & Investigative Scoring

The Gate 9 engine produces a categorical `InvestigativeAssessment`. It does not
produce a global score, percentage, probability, candidate ranking, identity
confirmation, or automatic decision.

## Semantics

- Evidence strength is not truth.
- Source trust records origin context and never overrides a comparison outcome.
- Plausibility is distinct from discriminative power and information gain.
- Temporal compatibility is conservative (`LOW`) and never confirms identity.
- Unknown information is neutral: it supports and contradicts nothing.
- A valid hard contradiction blocks a compatible conclusion.
- Internal conflicts require human review.
- Many low-value signals cannot create adequate or strong coverage by volume.
- `COMPATIBLE_MEANINGFUL_EVIDENCE` means that meaningful investigative support
  is available. It does **not** mean that both records represent the same person.

The engine applies named semantic rules and never converts categorical strength
to numbers. Assessments are computed on demand and are not persisted.

## Core assessment model

- `EvidenceSignal` is the privacy-minimized unit produced from a Gate 8
  comparison or an applicable Gate 7 temporal result. It carries controlled
  outcome, epistemic status, provenance identifiers, and the dimensions below;
  it never carries compared raw values.
- `SignalType` distinguishes attribute support/mismatch, temporal compatibility
  or contradiction, internal conflict, source context, and insufficient data.
- `StrengthCategory` is categorical (`NEGLIGIBLE`, `LOW`, `MODERATE`, `STRONG`,
  `VERY_STRONG`) and is never converted into a numeric weight.
- `DiscriminativePower` reuses the Gate 8 categories `LOW`, `MEDIUM`, `HIGH`, and
  `VERY_HIGH`.
- `SourceTrust` is categorical origin context. It is neither truth nor an
  automatic comparison override.
- `Corroboration` distinguishes no support, one source, multiple sources,
  proven independent sources, and conflicting sources.
- `InformationGain` states how much a signal reduces the hypothesis space using
  the categories `LOW`, `MEDIUM`, `HIGH`, and `VERY_HIGH`.
- `DataSufficiency` uses `INSUFFICIENT`, `MINIMAL`, `ADEQUATE`, and
  `STRONG_COVERAGE`. Signal volume alone cannot improve coverage.

Soft and hard contradictions are summarized separately. Hard contradictions
dominate weak compatibility signals, while material mixtures, ambiguity, and
internal conflicts require human review. Epistemic status is preserved
conservatively: derived, unverified, hypothesis, and synthetic inputs cannot be
promoted by assessment.

Gate 8 remains authoritative for person-candidate comparison; Gate 9 converts
its comparisons without duplicating their underlying Facts. Gate 7 integration
is optional and subject to the pair-provenance limitation described below.

## Source type mapping

| Domain `SourceType` | `SourceTrustCategory` |
| --- | --- |
| `OFFICIAL_RECORD` | `OFFICIAL` |
| `LAW_ENFORCEMENT`, `HEALTH_INSTITUTION`, `SOCIAL_ASSISTANCE`, `NGO` | `INSTITUTIONAL` |
| `FAMILY` | `FIRST_PARTY` |
| `ANONYMOUS_REPORT` | `UNVERIFIED` |
| `SYSTEM_DERIVATION` | `SECONDARY` |
| `SYNTHETIC_TEST` | `SYNTHETIC` |
| `AUTHENTICATED_CITIZEN` | `UNKNOWN` |

`AUTHENTICATED_CITIZEN` is deliberately `UNKNOWN`: authentication proves who
submitted information, not whether that person directly witnessed the fact.

## Provenance and corroboration

Corroboration follows Fact roots through `parentFactIds`. Facts from one Source,
derived copies of one root Fact, and provenance with unresolved parents cannot
be marked as independent. If independence cannot be proven, the result is never
`INDEPENDENT_MULTI_SOURCE`.

Entity Resolution comparisons are converted once. The engine does not create
additional standalone Fact signals for the same comparison, and fingerprints
signals by provenance roots to prevent derived copies from inflating support.

## Temporal integration limitation

Gate 7 currently exposes case-wide temporal analysis, not a canonical
pair-specific analysis. The engine accepts an optional `TemporalAnalysisResult`
but only uses temporal relations or contradictions whose Fact provenance can be
linked to both candidate subjects. The composition root does not provide a
pair-specific temporal provider until that contract exists.

## API and privacy

`POST /api/v1/cases/{caseId}/evidence-assessment` is authorized for `ANALYST`,
`LAW_ENFORCEMENT`, and `CASE_MANAGER`. Case scope and privacy policies apply;
`SEALED` fails closed and `SYSTEM_ADMIN` has no automatic investigative access.

The response contains controlled categories, reason codes, and identifiers. It
omits compared values, Tip text, Evidence descriptions, document values, and
other raw investigative content. Audit stores only minimized operation metadata
and never the assessment body.
