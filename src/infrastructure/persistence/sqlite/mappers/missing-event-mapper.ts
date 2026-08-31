import { createMissingEventId, createPersonId, Fact, MissingEvent } from "@/domain";

export interface MissingEventRow {
  missing_event_id: string;
  person_id: string;
  created_at: string;
}

export class MissingEventMapper {
  static toRow(event: MissingEvent): MissingEventRow {
    return {
      missing_event_id: event.id,
      person_id: event.personId,
      created_at: event.createdAt.toISOString(),
    };
  }

  static toDomain(row: MissingEventRow, facts: readonly Fact[] = []): MissingEvent {
    return new MissingEvent({
      id: createMissingEventId(row.missing_event_id),
      personId: createPersonId(row.person_id),
      facts,
      createdAt: new Date(row.created_at),
    });
  }
}