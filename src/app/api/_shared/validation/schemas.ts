import { z } from "zod";
import {
  EPISTEMIC_STATUS,
  OFFICIAL_STATUS,
  PRIVACY_LEVELS,
  SOURCE_TYPES,
  WORKFLOW_STATUS,
} from "@/domain";

export const isoDateStringSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid ISO 8601 date string",
  });

export const idSchema = (prefix = "ID") =>
  z
    .string()
    .min(1, { message: `${prefix} cannot be empty` })
    .max(128, { message: `${prefix} exceeds maximum length of 128 characters` })
    .refine((val) => val.trim().length > 0, {
      message: `${prefix} cannot be only whitespace`,
    });

export const registerSourceSchema = z
  .object({
    sourceId: idSchema("sourceId"),
    type: z.enum(
      [
        SOURCE_TYPES.OFFICIAL_RECORD,
        SOURCE_TYPES.LAW_ENFORCEMENT,
        SOURCE_TYPES.HEALTH_INSTITUTION,
        SOURCE_TYPES.SOCIAL_ASSISTANCE,
        SOURCE_TYPES.NGO,
        SOURCE_TYPES.FAMILY,
        SOURCE_TYPES.AUTHENTICATED_CITIZEN,
        SOURCE_TYPES.ANONYMOUS_REPORT,
        SOURCE_TYPES.SYSTEM_DERIVATION,
        SOURCE_TYPES.SYNTHETIC_TEST,
      ],
      { message: "Invalid source type" }
    ),
    label: z
      .string()
      .min(1, { message: "label cannot be empty" })
      .max(500, { message: "label exceeds max length of 500 characters" })
      .refine((val) => val.trim().length > 0, { message: "label cannot be whitespace only" }),
    externalReference: z
      .string()
      .max(2000, { message: "externalReference exceeds max length of 2000 characters" })
      .optional(),
  })
  .strict();

export const registerPersonSchema = z
  .object({
    personId: idSchema("personId"),
  })
  .strict();

export const registerMissingEventSchema = z
  .object({
    missingEventId: idSchema("missingEventId"),
    personId: idSchema("personId"),
  })
  .strict();

export const createCaseSchema = z
  .object({
    caseId: idSchema("caseId"),
    personId: idSchema("personId"),
    missingEventId: idSchema("missingEventId"),
    workflowStatus: z
      .enum(
        [
          WORKFLOW_STATUS.DRAFT,
          WORKFLOW_STATUS.ACTIVE,
          WORKFLOW_STATUS.SUSPENDED,
          WORKFLOW_STATUS.CLOSED,
        ],
        { message: "Invalid workflowStatus" }
      )
      .optional(),
    officialStatus: z
      .enum(
        [
          OFFICIAL_STATUS.OFFICIALLY_MISSING,
          OFFICIAL_STATUS.OFFICIALLY_LOCATED,
          OFFICIAL_STATUS.STATUS_TO_VERIFY,
          OFFICIAL_STATUS.UNKNOWN,
        ],
        { message: "Invalid officialStatus" }
      )
      .optional(),
    privacyLevel: z
      .enum(
        [
          PRIVACY_LEVELS.PUBLIC,
          PRIVACY_LEVELS.RESTRICTED,
          PRIVACY_LEVELS.CONFIDENTIAL,
          PRIVACY_LEVELS.LAW_ENFORCEMENT_ONLY,
          PRIVACY_LEVELS.SEALED,
        ],
        { message: "Invalid privacyLevel" }
      )
      .optional(),
    createdAt: isoDateStringSchema.optional(),
  })
  .strict();

export const provenanceSchema = z
  .object({
    sourceId: idSchema("sourceId"),
    observedAt: isoDateStringSchema.nullable().optional(),
    recordedAt: isoDateStringSchema.optional(),
    recordedBy: z
      .string()
      .min(1, { message: "recordedBy cannot be empty" })
      .max(255, { message: "recordedBy exceeds max length of 255 characters" }),
    parentFactIds: z.array(idSchema("parentFactId")).optional(),
    note: z.string().max(2000, { message: "note exceeds max length of 2000 characters" }).optional(),
  })
  .strict();

export const addFactSchema = z
  .object({
    factId: idSchema("factId"),
    subjectId: z.string().min(1, { message: "subjectId cannot be empty" }).max(128),
    attribute: z
      .string()
      .min(1, { message: "attribute cannot be empty" })
      .max(255, { message: "attribute exceeds max length of 255 characters" })
      .refine((val) => val.trim().length > 0, { message: "attribute cannot be whitespace only" }),
    value: z.unknown().refine((v) => v !== undefined, { message: "value is required" }),
    epistemicStatus: z.enum(
      [
        EPISTEMIC_STATUS.CONFIRMED,
        EPISTEMIC_STATUS.DERIVED,
        EPISTEMIC_STATUS.UNVERIFIED,
        EPISTEMIC_STATUS.HYPOTHESIS,
        EPISTEMIC_STATUS.SYNTHETIC,
      ],
      { message: "Invalid epistemicStatus" }
    ),
    provenance: provenanceSchema,
    confidence: z
      .number()
      .min(0.0, { message: "confidence must be >= 0.0" })
      .max(1.0, { message: "confidence must be <= 1.0" })
      .optional(),
  })
  .strict();

export const registerTipSchema = z
  .object({
    tipId: idSchema("tipId"),
    caseId: idSchema("caseId"),
    sourceId: idSchema("sourceId"),
    originalText: z
      .string()
      .min(1, { message: "originalText cannot be empty" })
      .max(10000, { message: "originalText exceeds max length of 10000 characters" })
      .refine((val) => val.trim().length > 0, { message: "originalText cannot be whitespace only" }),
    receivedAt: isoDateStringSchema.optional(),
    provenance: provenanceSchema.optional(),
  })
  .strict();

export const addEvidenceSchema = z
  .object({
    evidenceId: idSchema("evidenceId"),
    caseId: idSchema("caseId"),
    sourceId: idSchema("sourceId"),
    description: z
      .string()
      .min(1, { message: "description cannot be empty" })
      .max(5000, { message: "description exceeds max length of 5000 characters" })
      .refine((val) => val.trim().length > 0, { message: "description cannot be whitespace only" }),
    epistemicStatus: z
      .enum(
        [
          EPISTEMIC_STATUS.CONFIRMED,
          EPISTEMIC_STATUS.DERIVED,
          EPISTEMIC_STATUS.UNVERIFIED,
          EPISTEMIC_STATUS.HYPOTHESIS,
          EPISTEMIC_STATUS.SYNTHETIC,
        ],
        { message: "Invalid epistemicStatus" }
      )
      .optional(),
    provenance: provenanceSchema,
    createdAt: isoDateStringSchema.optional(),
  })
  .strict();

export const createHypothesisSchema = z
  .object({
    hypothesisId: idSchema("hypothesisId"),
    caseId: idSchema("caseId"),
    statement: z
      .string()
      .min(1, { message: "statement cannot be empty" })
      .max(5000, { message: "statement exceeds max length of 5000 characters" })
      .refine((val) => val.trim().length > 0, { message: "statement cannot be whitespace only" }),
    supportingEvidenceIds: z.array(idSchema("evidenceId")).optional(),
    contradictingEvidenceIds: z.array(idSchema("evidenceId")).optional(),
    createdAt: isoDateStringSchema.optional(),
  })
  .strict();

export const changeWorkflowStatusSchema = z
  .object({
    workflowStatus: z.enum(
      [
        WORKFLOW_STATUS.DRAFT,
        WORKFLOW_STATUS.ACTIVE,
        WORKFLOW_STATUS.SUSPENDED,
        WORKFLOW_STATUS.CLOSED,
      ],
      { message: "Invalid workflowStatus" }
    ),
  })
  .strict();

export const updateOfficialStatusSchema = z
  .object({
    officialStatus: z.enum(
      [
        OFFICIAL_STATUS.OFFICIALLY_MISSING,
        OFFICIAL_STATUS.OFFICIALLY_LOCATED,
        OFFICIAL_STATUS.STATUS_TO_VERIFY,
        OFFICIAL_STATUS.UNKNOWN,
      ],
      { message: "Invalid officialStatus" }
    ),
    provenance: provenanceSchema,
  })
  .strict();