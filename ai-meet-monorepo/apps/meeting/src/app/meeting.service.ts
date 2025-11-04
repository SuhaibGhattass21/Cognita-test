import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { KafkaService, EventTopics, MeetingCreatedEvent, MeetingEndedEvent, MeetingParticipantJoinedEvent, MeetingParticipantLeftEvent } from '@aimeet/kafka';
import { PrismaClient } from '.prisma/meeting-client';
import { DatabaseService } from '@aimeet/db';

export interface CreateMeetingRequest {
  title: string;
  tenantId: string;
  participantEmails?: string[];
}

export interface Meeting {
  id: string;
  title: string;
  tenantId: string;
  startTime: Date;
  endTime?: Date | null;
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  participants: Participant[];
}

export interface Participant {
  id: string;
  userId: string;
  name: string;
  email?: string | null;
  role: 'HOST' | 'MODERATOR' | 'ATTENDEE' | 'OBSERVER';
  joinedAt?: Date | null;
  leftAt?: Date | null;
}

export interface JoinMeetingRequest {
  userId: string;
  userName: string;
}

@Injectable()
export class MeetingService implements OnModuleInit {
  private readonly logger = new Logger(MeetingService.name);
  private prisma!: PrismaClient; // Definite assignment assertion

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly databaseService: DatabaseService
  ) {
    // Prisma client initialization moved to onModuleInit
  }

  async onModuleInit() {
    this.logger.log('Initializing MeetingService...');
    this.prisma = this.databaseService.getClient('meeting') as PrismaClient;
    this.logger.log('Meeting database client initialized');
  }

  async createMeeting(data: CreateMeetingRequest): Promise<Meeting> {
    this.logger.log(`Creating meeting: ${data.title} for tenant: ${data.tenantId}`);
    
    // Save meeting to PostgreSQL
    const meeting = await this.prisma.meeting.create({
      data: {
        title: data.title,
        tenantId: data.tenantId,
        startTime: new Date(),
        status: 'ACTIVE',
        participants: {
          create: data.participantEmails?.map(email => ({
            userId: uuidv4(),
            name: email.split('@')[0], // Simple name extraction
            email: email,
            role: 'ATTENDEE'
          })) || []
        }
      },
      include: {
        participants: true
      }
    });

    this.logger.log(`[meeting-service] Saved meeting ${meeting.id} to PostgreSQL`);
    
    // Publish meeting created event to Kafka
    const event: MeetingCreatedEvent = {
      eventId: uuidv4(),
      eventType: 'meeting.created',
      timestamp: new Date(),
      version: '1.0',
      source: 'meeting-service',
      data: {
        meetingId: meeting.id,
        title: meeting.title,
        tenantId: meeting.tenantId,
        startTime: meeting.startTime,
        participants: meeting.participants.map(p => ({
          userId: p.userId,
          name: p.name,
          email: p.email,
          role: p.role
        }))
      }
    };

    try {
      const result = await this.kafkaService.publishEvent(EventTopics.MEETING_EVENTS, event);
      if (result.success) {
        this.logger.log(`[meeting-service] Produced event meeting.created -> Kafka`);
      } else {
        this.logger.error(`Failed to publish meeting.created event: ${result.error}`);
      }
    } catch (error) {
      this.logger.error('Error publishing meeting created event', error);
    }

    return {
      id: meeting.id,
      title: meeting.title,
      tenantId: meeting.tenantId,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      status: meeting.status as 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED',
      participants: meeting.participants.map(p => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        email: p.email,
        role: p.role as 'HOST' | 'MODERATOR' | 'ATTENDEE' | 'OBSERVER',
        joinedAt: p.joinedAt,
        leftAt: p.leftAt
      }))
    };
  }

  async getMeeting(id: string): Promise<Meeting | null> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: { participants: true }
    });

    if (!meeting) {
      return null;
    }

    return {
      id: meeting.id,
      title: meeting.title,
      tenantId: meeting.tenantId,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      status: meeting.status as 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED',
      participants: meeting.participants.map(p => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        email: p.email,
        role: p.role as 'HOST' | 'MODERATOR' | 'ATTENDEE' | 'OBSERVER',
        joinedAt: p.joinedAt,
        leftAt: p.leftAt
      }))
    };
  }

  async joinMeeting(meetingId: string, data: JoinMeetingRequest): Promise<void> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { participants: true }
    });

    if (!meeting) {
      throw new Error(`Meeting not found: ${meetingId}`);
    }

    // Check if participant already exists
    let participant = meeting.participants.find(p => p.userId === data.userId);
    
    if (participant) {
      // Update join time if participant rejoins
      participant = await this.prisma.participant.update({
        where: { id: participant.id },
        data: { joinedAt: new Date() }
      });
    } else {
      // Create new participant
      participant = await this.prisma.participant.create({
        data: {
          meetingId: meetingId,
          userId: data.userId,
          name: data.userName,
          role: 'ATTENDEE',
          joinedAt: new Date()
        }
      });
    }

    // Publish participant joined event
    const event: MeetingParticipantJoinedEvent = {
      eventId: uuidv4(),
      eventType: 'meeting.participant.joined',
      timestamp: new Date(),
      version: '1.0',
      source: 'meeting-service',
      data: {
        meetingId: meetingId,
        userId: participant.userId,
        name: participant.name,
        joinedAt: participant.joinedAt || new Date(),
        tenantId: meeting.tenantId
      }
    };

    try {
      const result = await this.kafkaService.publishEvent(EventTopics.MEETING_EVENTS, event);
      if (result.success) {
        this.logger.log(`[meeting-service] Produced event meeting.participant.joined -> Kafka (user: ${participant.name})`);
      }
    } catch (error) {
      this.logger.error('Error publishing participant joined event', error);
    }

    this.logger.log(`${participant.name} joined meeting: ${meeting.title}`);
  }

  async leaveMeeting(meetingId: string, userId: string): Promise<void> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { participants: true }
    });

    if (!meeting) {
      throw new Error(`Meeting not found: ${meetingId}`);
    }

    const participant = meeting.participants.find(p => p.userId === userId);
    if (!participant) {
      throw new Error(`Participant not found in meeting: ${userId}`);
    }

    const leftAt = new Date();
    const duration = participant.joinedAt 
      ? Math.floor((leftAt.getTime() - participant.joinedAt.getTime()) / 1000)
      : 0;

    // Update participant left time
    await this.prisma.participant.update({
      where: { id: participant.id },
      data: { leftAt: leftAt }
    });

    // Publish participant left event
    const event: MeetingParticipantLeftEvent = {
      eventId: uuidv4(),
      eventType: 'meeting.participant.left',
      timestamp: new Date(),
      version: '1.0',
      source: 'meeting-service',
      data: {
        meetingId: meetingId,
        userId: participant.userId,
        name: participant.name,
        leftAt: leftAt,
        duration: duration,
        tenantId: meeting.tenantId
      }
    };

    try {
      const result = await this.kafkaService.publishEvent(EventTopics.MEETING_EVENTS, event);
      if (result.success) {
        this.logger.log(`[meeting-service] Produced event meeting.participant.left -> Kafka (user: ${participant.name})`);
      }
    } catch (error) {
      this.logger.error('Error publishing participant left event', error);
    }

    this.logger.log(`${participant.name} left meeting: ${meeting.title}`);
  }

  async endMeeting(meetingId: string): Promise<void> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { participants: true }
    });

    if (!meeting) {
      throw new Error(`Meeting not found: ${meetingId}`);
    }

    const endedAt = new Date();
    const duration = Math.floor((endedAt.getTime() - meeting.startTime.getTime()) / 1000);

    // Update meeting status to ended
    await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { 
        status: 'ENDED',
        endTime: endedAt 
      }
    });

    // Publish meeting ended event
    const event: MeetingEndedEvent = {
      eventId: uuidv4(),
      eventType: 'meeting.ended',
      timestamp: new Date(),
      version: '1.0',
      source: 'meeting-service',
      data: {
        meetingId: meetingId,
        title: meeting.title,
        endedAt: endedAt,
        duration: duration,
        participantCount: meeting.participants.length,
        tenantId: meeting.tenantId
      }
    };

    try {
      const result = await this.kafkaService.publishEvent(EventTopics.MEETING_EVENTS, event);
      if (result.success) {
        this.logger.log(`[meeting-service] Produced event meeting.ended -> Kafka`);
      }
    } catch (error) {
      this.logger.error('Error publishing meeting ended event', error);
    }

    this.logger.log(`Meeting "${meeting.title}" ended. Duration: ${duration} seconds`);
  }

  async getAllMeetings(): Promise<Meeting[]> {
    const meetings = await this.prisma.meeting.findMany({
      include: { participants: true },
      orderBy: { startTime: 'desc' }
    });

    return meetings.map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      tenantId: meeting.tenantId,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      status: meeting.status as 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED',
      participants: meeting.participants.map(p => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        email: p.email,
        role: p.role as 'HOST' | 'MODERATOR' | 'ATTENDEE' | 'OBSERVER',
        joinedAt: p.joinedAt,
        leftAt: p.leftAt
      }))
    }));
  }
}