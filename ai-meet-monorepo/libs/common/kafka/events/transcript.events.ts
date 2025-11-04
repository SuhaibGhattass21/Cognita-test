import { BaseEvent } from './event.types';

export interface TranscriptStartedEvent extends BaseEvent {
  eventType: 'transcript.started';
  data: {
    transcriptId: string;
    meetingId: string;
    tenantId: string;
    startedAt: Date;
    participantCount: number;
  };
}

export interface TranscriptChunkProcessedEvent extends BaseEvent {
  eventType: 'transcript.chunk.processed';
  data: {
    transcriptId: string;
    meetingId: string;
    tenantId: string;
    chunkId: string;
    sequence: number;
    text: string;
    confidence: number;
    speakerName?: string;
    timestamp: Date;
  };
}

export interface TranscriptCompletedEvent extends BaseEvent {
  eventType: 'transcript.completed';
  data: {
    transcriptId: string;
    meetingId: string;
    tenantId: string;
    completedAt: Date;
    duration: number; // in seconds
    participantCount: number;
    storageLocation: string;
  };
}

export interface TranscriptFailedEvent extends BaseEvent {
  eventType: 'transcript.failed';
  data: {
    transcriptId: string;
    meetingId: string;
    tenantId: string;
    failedAt: Date;
    error: string;
    retryCount: number;
  };
}