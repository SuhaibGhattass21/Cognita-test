export interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: Date;
  version: string;
  source: string;
  traceId?: string;
}

export interface EventMetadata {
  partition?: number;
  key?: string;
  headers?: Record<string, string>;
}

export interface EventHandler<T extends BaseEvent> {
  handle(event: T, metadata?: EventMetadata): Promise<void>;
}

export enum EventTopics {
  MEETING_EVENTS = 'meeting.events',
  MEETING_CREATED = 'meeting.created',
  MEETING_ENDED = 'meeting.ended',
  MEETING_PARTICIPANT_JOINED = 'meeting.participant.joined',
  MEETING_PARTICIPANT_LEFT = 'meeting.participant.left',
  TRANSCRIPT_EVENTS = 'transcript.events',
  TRANSCRIPT_STARTED = 'transcript.started',
  TRANSCRIPT_CHUNK_PROCESSED = 'transcript.chunk.processed',
  TRANSCRIPT_COMPLETED = 'transcript.completed',
  TRANSCRIPT_FAILED = 'transcript.failed',
}

export interface EventProducerResult {
  success: boolean;
  partition?: number;
  offset?: string;
  error?: string;
}