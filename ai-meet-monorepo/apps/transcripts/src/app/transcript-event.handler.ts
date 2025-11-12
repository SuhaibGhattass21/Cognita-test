import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KafkaService, EventTopics, MeetingCreatedEvent, MeetingEndedEvent, TranscriptStartedEvent, TranscriptCompletedEvent } from '@aimeet/kafka';
import { PrismaClient as TranscriptsPrismaClient } from '.prisma/transcripts-client';
import { DatabaseService } from '@aimeet/db';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TranscriptEventHandler implements OnModuleInit {
  private readonly logger = new Logger(TranscriptEventHandler.name);
  private prisma!: TranscriptsPrismaClient; // Definite assignment assertion

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly databaseService: DatabaseService
  ) {
    // Prisma client initialization moved to onModuleInit
  }

  async onModuleInit() {
    this.logger.log('Initializing TranscriptEventHandler...');
    this.prisma = this.databaseService.getClient('transcripts') as TranscriptsPrismaClient;
    this.logger.log('Transcripts database client initialized');
    
    // Subscribe to meeting events
    await this.kafkaService.subscribeToTopic(EventTopics.MEETING_EVENTS, this.handleEvent.bind(this));
    this.logger.log('Transcript event handler initialized and subscribed to meeting events');
  }

  private async handleEvent(event: any, metadata: any): Promise<void> {
    try {
      switch (event.eventType) {
        case 'meeting.created':
          await this.handleMeetingCreated(event as MeetingCreatedEvent, metadata);
          break;
        case 'meeting.ended':
          await this.handleMeetingEnded(event as MeetingEndedEvent, metadata);
          break;
        default:
          this.logger.debug(`Unhandled event type: ${event.eventType}`);
      }
    } catch (error) {
      this.logger.error(`Error handling event ${event.eventType}:`, error);
    }
  }

  async handleMeetingCreated(event: MeetingCreatedEvent, _metadata: any): Promise<void> {
    this.logger.log(`Processing meeting.created event for meeting: ${event.data.meetingId}`);

    try {
      // Create meeting reference
      const meetingReference = await this.prisma.meetingReference.create({
        data: {
          meetingId: event.data.meetingId,
          meetingTitle: event.data.title,
          startTime: event.data.startTime,
          participantNames: event.data.participants.map(p => p.name),
          status: 'ACTIVE',
          metadata: {
            tenantId: event.data.tenantId,
            eventId: event.eventId,
            eventTimestamp: event.timestamp
          }
        }
      });

      // Create transcript session
      const transcriptSession = await this.prisma.transcriptSession.create({
        data: {
          meetingId: event.data.meetingId,
          meetingTitle: event.data.title,
          tenantId: event.data.tenantId,
          participantCount: event.data.participants.length,
          status: 'INITIALIZING'
        }
      });

      // Update meeting reference with session ID
      await this.prisma.meetingReference.update({
        where: { id: meetingReference.id },
        data: { sessionId: transcriptSession.id }
      });

      this.logger.log(`[transcripts] Stored new transcript session for meeting_id=${event.data.meetingId}`);

  console.log(`Transcript session initialized for meeting: ${event.data.title}`);
  console.log(`   - Transcript ID: ${transcriptSession.id}`);
  console.log(`   - Meeting ID: ${event.data.meetingId}`);
  console.log(`   - Participants: ${event.data.participants.length}`);

      // Publish transcript started event
      const transcriptStartedEvent: TranscriptStartedEvent = {
        eventId: uuidv4(),
        eventType: 'transcript.started',
        timestamp: new Date(),
        version: '1.0',
        source: 'transcripts-service',
        data: {
          transcriptId: transcriptSession.id,
          meetingId: event.data.meetingId,
          tenantId: event.data.tenantId,
          startedAt: transcriptSession.startedAt,
          participantCount: event.data.participants.length
        }
      };

      await this.kafkaService.publishEvent(EventTopics.TRANSCRIPT_EVENTS, transcriptStartedEvent);
      this.logger.log(`[transcripts] Produced event transcript.started -> Kafka`);

    } catch (error) {
      this.logger.error(`Failed to handle meeting.created event:`, error);
    }
  }

  async handleMeetingEnded(event: MeetingEndedEvent, _metadata: any): Promise<void> {
    this.logger.log(`Processing meeting.ended event for meeting: ${event.data.meetingId}`);

    try {
      // Find the transcript session
      const transcriptSession = await this.prisma.transcriptSession.findUnique({
        where: { meetingId: event.data.meetingId }
      });

      if (!transcriptSession) {
        this.logger.warn(`No transcript session found for meeting: ${event.data.meetingId}`);
        return;
      }

      // Update transcript session as completed
      const completedSession = await this.prisma.transcriptSession.update({
        where: { id: transcriptSession.id },
        data: {
          status: 'COMPLETED',
          completedAt: event.data.endedAt,
          participantCount: event.data.participantCount
        }
      });

      // Update meeting reference
      await this.prisma.meetingReference.update({
        where: { meetingId: event.data.meetingId },
        data: {
          endTime: event.data.endedAt,
          status: 'ENDED'
        }
      });

  console.log(`Transcript finalized for meeting: ${event.data.title}`);
  console.log(`   - Duration: ${event.data.duration} seconds`);
  console.log(`   - Storage: transcripts/${event.data.tenantId}/${event.data.meetingId}/final.json`);
  console.log(`   - Participants analyzed: ${event.data.participantCount}`);

      // Publish transcript completed event
      const transcriptCompletedEvent: TranscriptCompletedEvent = {
        eventId: uuidv4(),
        eventType: 'transcript.completed',
        timestamp: new Date(),
        version: '1.0',
        source: 'transcripts-service',
        data: {
          transcriptId: completedSession.id,
          meetingId: event.data.meetingId,
          tenantId: event.data.tenantId,
          completedAt: event.data.endedAt,
          duration: event.data.duration,
          participantCount: event.data.participantCount,
          storageLocation: `transcripts/${event.data.tenantId}/${event.data.meetingId}/final.json`
        }
      };

      await this.kafkaService.publishEvent(EventTopics.TRANSCRIPT_EVENTS, transcriptCompletedEvent);
      this.logger.log(`[transcripts] Produced event transcript.completed -> Kafka`);

    } catch (error) {
      this.logger.error(`Failed to handle meeting.ended event:`, error);
    }
  }

  // Utility method to get transcript session by meeting ID
  async getTranscriptSession(meetingId: string) {
    return await this.prisma.transcriptSession.findUnique({
      where: { meetingId },
      include: {
        transcripts: true,
        wordSegments: true
      }
    });
  }

  // Utility method to get all transcript sessions
  async getAllTranscriptSessions() {
    return await this.prisma.transcriptSession.findMany({
      include: {
        transcripts: true,
        wordSegments: true
      },
      orderBy: { startedAt: 'desc' }
    });
  }
}