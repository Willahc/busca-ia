import { CaseId } from "@/domain";
import { TimelineEvent } from "./timeline-event";

export class Timeline {
  readonly caseId: CaseId;
  readonly events: readonly TimelineEvent[];

  constructor(caseId: CaseId, events: readonly TimelineEvent[] = []) {
    this.caseId = caseId;
    this.events = Object.freeze([...events]);
  }

  getDatedEvents(): readonly TimelineEvent[] {
    return this.events.filter((e) => e.isDated);
  }

  getUndatedEvents(): readonly TimelineEvent[] {
    return this.events.filter((e) => !e.isDated);
  }

  getEventById(eventId: string): TimelineEvent | null {
    return this.events.find((e) => e.eventId === eventId) ?? null;
  }
}