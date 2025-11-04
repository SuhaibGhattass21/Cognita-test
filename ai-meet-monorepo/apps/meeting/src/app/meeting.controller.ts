import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { MeetingService } from './meeting.service';
import { DatabaseService } from '@aimeet/db';

export interface CreateMeetingDto {
  title: string;
  tenantId: string;
  participantEmails?: string[];
}

export interface JoinMeetingDto {
  meetingId: string;
  userId: string;
  userName: string;
}

@Controller('api/v1/meetings')
export class MeetingController {
  constructor(
    private readonly meetingService: MeetingService,
    private readonly databaseService: DatabaseService
  ) {}

  @Get('health')
  async health() {
    return { status: 'ok', service: 'meeting', timestamp: new Date().toISOString() };
  }

  @Get('health/db')
  async healthDb() {
    try {
      const dbHealth = await this.databaseService.getHealthStatus('meeting');
      return dbHealth;
    } catch (error) {
      return {
        service: 'meeting',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  @Post()
  async createMeeting(@Body() createMeetingDto: CreateMeetingDto) {
    return this.meetingService.createMeeting(createMeetingDto);
  }

  @Get()
  async listMeetings() {
    return this.meetingService.getAllMeetings();
  }

  @Get(':id')
  async getMeeting(@Param('id') id: string) {
    return this.meetingService.getMeeting(id);
  }

  @Post(':id/join')
  async joinMeeting(@Param('id') id: string, @Body() joinMeetingDto: JoinMeetingDto) {
    return this.meetingService.joinMeeting(id, joinMeetingDto);
  }

  @Post(':id/leave')
  async leaveMeeting(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.meetingService.leaveMeeting(id, body.userId);
  }

  @Delete(':id')
  async deleteMeeting(@Param('id') id: string) {
    await this.meetingService.endMeeting(id);
    return { message: 'Meeting ended successfully' };
  }
}