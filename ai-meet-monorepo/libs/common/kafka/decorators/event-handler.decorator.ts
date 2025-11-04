import { SetMetadata } from '@nestjs/common';

export const EVENT_HANDLER_METADATA = 'EVENT_HANDLER_METADATA';

export interface EventHandlerMetadata {
  topic: string;
  groupId?: string;
  retryAttempts?: number;
  deadLetterTopic?: string;
}

/**
 * Decorator to mark a method as an event handler for specific Kafka topics
 * @param metadata Event handler configuration
 */
export const EventHandler = (metadata: EventHandlerMetadata) =>
  SetMetadata(EVENT_HANDLER_METADATA, metadata);

/**
 * Convenience decorators for specific event types
 */
export const MeetingEventHandler = (topic: string, options?: Omit<EventHandlerMetadata, 'topic'>) =>
  EventHandler({ topic, groupId: 'meeting-service-group', ...options });

export const TranscriptEventHandler = (topic: string, options?: Omit<EventHandlerMetadata, 'topic'>) =>
  EventHandler({ topic, groupId: 'transcripts-service-group', ...options });