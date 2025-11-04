import { Injectable } from '@nestjs/common';
import { AudioProcessorService } from './audio-processor.service';
import { StorageService } from './storage.service';

export interface TranscriptSegment {
  id: string;
  meetingId: string;
  text: string;
  timestamp: number;
  duration: number;
  speakerId?: string;
  speakerName?: string;
  confidence: number;
  createdAt: Date;
}

export interface TranscriptData {
  meetingId: string;
  segments: TranscriptSegment[];
  metadata: {
    totalDuration: number;
    participantCount: number;
    language: string;
    processingTime: number;
  };
}

@Injectable()
export class TranscriptsService {
  private transcripts: Map<string, TranscriptData> = new Map();

  constructor(
    private audioProcessor: AudioProcessorService,
    private storage: StorageService,
  ) {}

  async processAudioChunk(data: {
    meetingId: string;
    audioChunk: string;
    timestamp: number;
    speakerId?: string;
  }): Promise<{ success: boolean; transcriptId?: string }> {
    try {
      console.log(`🎙️ Processing audio chunk for meeting ${data.meetingId}`);
      
      // Decode base64 audio
      const audioBuffer = Buffer.from(data.audioChunk, 'base64');
      
      // Process audio with speech-to-text (stubbed for now)
      const transcriptionResult = await this.audioProcessor.transcribeAudio(audioBuffer);
      
      if (!transcriptionResult.text) {
        return { success: false };
      }

      // Create transcript segment
      const segment: TranscriptSegment = {
        id: `${data.meetingId}-${Date.now()}`,
        meetingId: data.meetingId,
        text: transcriptionResult.text,
        timestamp: data.timestamp,
        duration: transcriptionResult.duration,
        speakerId: data.speakerId,
        speakerName: transcriptionResult.speakerName,
        confidence: transcriptionResult.confidence,
        createdAt: new Date(),
      };

      // Store in memory (in production, use database)
      if (!this.transcripts.has(data.meetingId)) {
        this.transcripts.set(data.meetingId, {
          meetingId: data.meetingId,
          segments: [],
          metadata: {
            totalDuration: 0,
            participantCount: 0,
            language: 'en',
            processingTime: 0,
          },
        });
      }

      const transcript = this.transcripts.get(data.meetingId)!;
      transcript.segments.push(segment);
      transcript.metadata.totalDuration += transcriptionResult.duration;

      // Store in Azure Blob Storage
      await this.storage.storeTranscript(data.meetingId, transcript);

      console.log(`✅ Transcribed: "${transcriptionResult.text.substring(0, 50)}..."`);
      return { success: true, transcriptId: segment.id };
    } catch (error) {
      console.error('❌ Error processing audio chunk:', error);
      return { success: false };
    }
  }

  async getTranscriptsByMeetingId(meetingId: string): Promise<TranscriptData | null> {
    // Try memory first, then storage
    let transcript = this.transcripts.get(meetingId);
    
    if (!transcript) {
      const storageResult = await this.storage.getTranscript(meetingId);
      if (storageResult !== null) {
        transcript = storageResult;
        this.transcripts.set(meetingId, transcript);
      }
    }
    
    return transcript || null;
  }

  async searchTranscripts(searchCriteria: {
    meetingId?: string;
    dateFrom?: string;
    dateTo?: string;
    text?: string;
  }): Promise<TranscriptSegment[]> {
    const results: TranscriptSegment[] = [];
    
    for (const transcript of this.transcripts.values()) {
      if (searchCriteria.meetingId && transcript.meetingId !== searchCriteria.meetingId) {
        continue;
      }
      
      for (const segment of transcript.segments) {
        if (searchCriteria.text) {
          const textMatch = segment.text.toLowerCase().includes(searchCriteria.text.toLowerCase());
          if (!textMatch) continue;
        }
        
        if (searchCriteria.dateFrom) {
          const fromDate = new Date(searchCriteria.dateFrom);
          if (segment.createdAt < fromDate) continue;
        }
        
        if (searchCriteria.dateTo) {
          const toDate = new Date(searchCriteria.dateTo);
          if (segment.createdAt > toDate) continue;
        }
        
        results.push(segment);
      }
    }
    
    return results.sort((a, b) => a.timestamp - b.timestamp);
  }

  async downloadTranscript(meetingId: string): Promise<{ downloadUrl: string } | null> {
    const transcript = await this.getTranscriptsByMeetingId(meetingId);
    if (!transcript) {
      return null;
    }
    
    const downloadUrl = await this.storage.generateDownloadUrl(meetingId);
    return { downloadUrl };
  }

  async exportTranscript(meetingId: string, format: 'txt' | 'pdf' | 'docx'): Promise<{ success: boolean; exportUrl?: string }> {
    const transcript = await this.getTranscriptsByMeetingId(meetingId);
    if (!transcript) {
      return { success: false };
    }
    
    // Generate formatted export (stubbed for now)
    const exportUrl = await this.storage.exportTranscript(meetingId, transcript, format);
    
    console.log(`📄 Exported transcript for meeting ${meetingId} as ${format}`);
    return { success: true, exportUrl };
  }
}