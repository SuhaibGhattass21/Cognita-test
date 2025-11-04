import { BaseEvent } from './event.types';

export interface MeetingCreatedEvent extends BaseEvent {
  eventType: 'meeting.created';
  data: {
    meetingId: string;
    title: string;
    tenantId: string;
    startTime: Date;
    participants: Array<{
      userId: string;
      name: string;
      email?: string | null;
      role: string;
    }>;
  };
}

export interface MeetingEndedEvent extends BaseEvent {
  eventType: 'meeting.ended';
  data: {
    meetingId: string;
    title: string;
    tenantId: string;
    endedAt: Date;
    duration: number; // in seconds
    participantCount: number;
  };
}

export interface MeetingParticipantJoinedEvent extends BaseEvent {
  eventType: 'meeting.participant.joined';
  data: {
    meetingId: string;
    tenantId: string;
    userId: string;
    name: string;
    joinedAt: Date;
  };
}

export interface MeetingParticipantLeftEvent extends BaseEvent {
  eventType: 'meeting.participant.left';
  data: {
    meetingId: string;
    tenantId: string;
    userId: string;
    name: string;
    leftAt: Date;
    duration: number; // in seconds
  };
}