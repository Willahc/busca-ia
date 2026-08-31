import { createSourceId, Source, SourceType } from "@/domain";

export interface SourceRow {
  source_id: string;
  type: string;
  label: string;
  external_reference: string | null;
  is_synthetic: number;
  created_at: string;
}

export class SourceMapper {
  static toRow(source: Source): SourceRow {
    return {
      source_id: source.id,
      type: source.type,
      label: source.label,
      external_reference: source.externalReference ?? null,
      is_synthetic: source.isSynthetic ? 1 : 0,
      created_at: new Date().toISOString(),
    };
  }

  static toDomain(row: SourceRow): Source {
    return new Source({
      id: createSourceId(row.source_id),
      type: row.type as SourceType,
      label: row.label,
      externalReference: row.external_reference ?? undefined,
      isSynthetic: row.is_synthetic === 1,
    });
  }
}