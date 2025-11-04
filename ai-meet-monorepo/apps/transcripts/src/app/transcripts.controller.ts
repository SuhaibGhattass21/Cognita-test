import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { TranscriptsService } from './transcripts.service';
import { DatabaseService } from '@aimeet/db';

export interface CreateTranscriptDto {
  meetingId: string;
  audioChunk: string; // base64 encoded audio
  timestamp: number;
  speakerId?: string;
}

export interface TranscriptSearchDto {
  meetingId?: string;
  dateFrom?: string;
  dateTo?: string;
  text?: string;
}

@Controller('api/v1/transcripts')
export class TranscriptsController {
  constructor(
    private readonly transcriptsService: TranscriptsService,
    private readonly databaseService: DatabaseService
  ) {}

  @Get('health')
  async health() {
    return { status: 'ok', service: 'transcripts', timestamp: new Date().toISOString() };
  }

  @Get('health/db')
  async healthDb() {
    try {
      const dbHealth = await this.databaseService.getHealthStatus('transcripts');
      return dbHealth;
    } catch (error) {
      return {
        service: 'transcripts',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  @Post()
  async createTranscript(@Body() createTranscriptDto: CreateTranscriptDto) {
    return this.transcriptsService.processAudioChunk(createTranscriptDto);
  }

  @Get(':meetingId')
  async getTranscripts(@Param('meetingId') meetingId: string) {
    return this.transcriptsService.getTranscriptsByMeetingId(meetingId);
  }

  @Get()
  async searchTranscripts(@Query() searchDto: TranscriptSearchDto) {
    return this.transcriptsService.searchTranscripts(searchDto);
  }

  @Get(':meetingId/download')
  async downloadTranscript(@Param('meetingId') meetingId: string) {
    return this.transcriptsService.downloadTranscript(meetingId);
  }

  @Post(':meetingId/export')
  async exportTranscript(
    @Param('meetingId') meetingId: string,
    @Body() options: { format: 'txt' | 'pdf' | 'docx' }
  ) {
    return this.transcriptsService.exportTranscript(meetingId, options.format);
  }
}