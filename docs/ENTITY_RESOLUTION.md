# Entity Resolution

## Objective and epistemic boundary

Gate 8 introduces a deterministic, pairwise analytical engine for comparing two person records. It reports compatibility, mismatch, missing information, discriminative strength, and explicit contradictions. It never confirms identity.

`COMPATIBLE` means only that the configured minimum of informative attributes matched and no hard contradiction was found. It does not mean `SAME_PERSON`, does not promote a Fact, and does not authorize a Person merge.

## Candidate and assertion model

`EntityResolutionCandidate` is an analytical projection and does not replace the canonical `Person`. A candidate contains:

- a candidate identifier and optional `PersonId`;
- controlled attributes;
- every `AttributeAssertion` available for each attribute;
- source references;
- candidate issues.

Each assertion retains its `factId`, `sourceId`, original epistemic status, and value. The engine never promotes `UNVERIFIED`, `DERIVED`, `HYPOTHESIS`, or `SYNTHETIC` assertions. It does not select an assertion based on recency or numeric confidence.

Multiple assertions are compared as sets and are never silently collapsed. Two incompatible confirmed assertions for a single-valued attribute produce `INTERNAL_ATTRIBUTE_CONFLICT`. Such a conflict requires human review and prevents the conflicted attribute from producing a cross-candidate hard conclusion. `DISTINCTIVE_MARK` is multi-valued; different structured marks are independent rather than contradictory.

## Controlled Fact registry

Only the following Fact attributes are recognized:

| Fact attribute | Analytical attribute | Discriminative power |
| --- | --- | --- |
| `person.full_name` | `FULL_NAME` | `MEDIUM` |
| `person.birth_date` | `BIRTH_DATE` | `HIGH` when exact/day; `MEDIUM` at lower precision |
| `person.sex` | `SEX` | `LOW` |
| `person.mother_name` | `MOTHER_NAME` | `HIGH` |
| `person.father_name` | `FATHER_NAME` | `HIGH` |
| `person.nationality` | `NATIONALITY` | `LOW` |
| `person.distinctive_mark` | `DISTINCTIVE_MARK` | `VERY_HIGH` for an exact structured-code match |

Arbitrary Fact attribute strings are ignored. Height is intentionally excluded until a canonical unit and a non-arbitrary comparison rule exist. Distinctive marks accept structured codes such as `SCAR_LEFT_FOREARM`; free descriptions are not interpreted.

Because the canonical `Case` currently has one principal `Person`, an additional comparison candidate must be bound to the case by `case.entity_resolution_candidate_person_id`. The binding Fact must be `CONFIRMED`, or `SYNTHETIC` for isolated fixtures. This avoids database-wide Person access and keeps the comparison case-scoped without changing the Domain model.

## Normalization

Text normalization is pure and deterministic: trim; Unicode `NFKD`; accent folding; typographic apostrophe/dash canonicalization; locale-aware case folding; whitespace collapse; and whitespace normalization around apostrophes.

Meaningful punctuation and tokens are retained. The engine does not infer nicknames, phonetics, misspellings, token deletion, or edit-distance equivalence. `José Silva` and `José da Silva` do not match automatically.

## Comparison outcomes and date precision

Every comparison has one explicit outcome:

- `MATCH`: deterministic equality under the attribute rule;
- `PARTIAL_MATCH`: birth-date precision containment, such as `1992-12` and `1992-12-15`;
- `MISMATCH`: asserted, comparable values differ;
- `UNKNOWN`: one or both values are absent or invalid;
- `NOT_APPLICABLE`: the pair does not express opposition, such as two different multi-valued marks.

`UNKNOWN` is neither a match nor a contradiction.

Birth dates reuse Gate 7 `TemporalPoint` parsing and preserve `YEAR`, `MONTH`, and `DAY` precision. Overlapping lower-precision dates are partial matches. Only two non-overlapping exact/day assertions that are both `CONFIRMED` produce `HARD` contradiction `CONFIRMED_EXACT_BIRTH_DATE_CONFLICT`. Unknown, partial, or unverified values never create that hard contradiction.

Sex, nationality, and structured marks use controlled exact comparison. Names use conservative normalized equality. No inference is made from a person's name to sex or family relationship.

## Discrimination and contradictions

Discriminative power is categorical: `LOW`, `MEDIUM`, `HIGH`, or `VERY_HIGH`. There are no numeric weights and categories are not summed or averaged.

Contradiction severity is `NONE`, `SOFT`, or `HARD`. Gate 8 uses a deliberately narrow hard rule: confirmed exact birth-date conflict. Other mismatches remain explicit but do not independently invalidate compatibility. No soft rule is introduced without a domain-justified threshold.

Source semantics remain represented by canonical provenance and `Source` type. Gate 8 does not invent numeric source-trust coefficients.

## Conclusions

- `INCOMPATIBLE`: at least one explicit hard contradiction exists.
- `COMPATIBLE`: at least one exact high/very-high match and at least two distinct informative matched attributes exist, with no mismatches or issues.
- `REQUIRES_HUMAN_REVIEW`: relevant evidence is mixed/ambiguous or internal/invalid assertions require review.
- `INSUFFICIENT_DATA`: there is not enough discriminative information. A matching low-power attribute such as sex is insufficient.

All conclusions are analytical and HTTP-successful. Insufficient data returns `200`, not a validation error.

## Privacy, audit, and persistence

The API DTO omits compared values and returns only categorical outcomes, reason codes, provenance Fact IDs, and epistemic statuses. It never returns raw evidence/tip text or descriptive source notes.

Comparison requires `ENTITY_RESOLUTION_COMPARE`, case scope, and the case privacy policy. `ANALYST`, `LAW_ENFORCEMENT`, and `CASE_MANAGER` receive the permission; `SYSTEM_ADMIN` and NGO/operator roles do not. `SEALED` remains fail-closed. Audit records action, actor, request, case/pair identifiers, outcome, and reason without storing the analytical result.

Results are calculated on demand and are not persisted. Person, Facts, and Case remain unchanged.

## Explicit exclusions and future scaling

Gate 8 contains no global score, probability, fuzzy matching, machine learning, biometrics, images, NLP, LLM, embeddings, vector search, automatic merge, automatic confirmation, global ranking, or real case data.

Blocking, candidate generation, probabilistic linkage, large-scale matching, mass `N x N` comparison, and versioned analytical-result persistence remain future-gate concerns. Gate 8 compares exactly one authorized pair per request.
