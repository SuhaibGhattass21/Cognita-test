import { Injectable } from '@nestjs/common';
import { BlobServiceClient } from '@azure/storage-blob';

interface TranscriptData {
  meetingId: string;
  segments: any[];
  metadata: {
    totalDuration: number;
    participantCount: number;
    language: string;
    processingTime: number;
  };
}

@Injectable()
export class StorageService {
  private blobServiceClient: BlobServiceClient | null = null;
  private containerName = 'transcripts';

  constructor() {
    this.initializeStorage();
  }

  private async initializeStorage() {
    try {
      const connectionString = process.env['AZURE_STORAGE_CONNECTION_STRING'];
      if (connectionString) {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        console.log('Azure Blob Storage initialized');
      } else {
        console.log('Azure Storage not configured, using local storage simulation');
      }
    } catch (error) {
      console.error('Failed to initialize Azure Storage:', error);
    }
  }

  async storeTranscript(meetingId: string, transcript: TranscriptData): Promise<{ success: boolean; blobName?: string }> {
    try {
      const blobName = `${meetingId}/transcript-${Date.now()}.json`;
      const transcriptData = JSON.stringify(transcript, null, 2);

      if (this.blobServiceClient) {
        // Store in Azure Blob Storage
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        
        // Ensure container exists
        await containerClient.createIfNotExists({
          access: 'blob'
        });

        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        await blockBlobClient.upload(transcriptData, transcriptData.length, {
          blobHTTPHeaders: {
            blobContentType: 'application/json'
          },
          metadata: {
            meetingId,
            timestamp: new Date().toISOString(),
            segmentCount: transcript.segments.length.toString()
          }
        });

        console.log(`Stored transcript in Azure Blob: ${blobName}`);
      } else {
        // Simulate local storage
        console.log(`Simulated storage of transcript: ${blobName}`);
        console.log(`Content: ${transcriptData.substring(0, 100)}...`);
      }

      return { success: true, blobName };
    } catch (error) {
      console.error('Error storing transcript:', error);
      return { success: false };
    }
  }

  async getTranscript(meetingId: string): Promise<TranscriptData | null> {
    try {
      if (this.blobServiceClient) {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        
        // List blobs with the meeting ID prefix
        const blobs = containerClient.listBlobsFlat({
          prefix: `${meetingId}/transcript-`
        });

        // Get the latest transcript
        let latestBlob = null;
        let latestTimestamp = 0;

        for await (const blob of blobs) {
          const timestamp = this.extractTimestampFromBlobName(blob.name);
          if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
            latestBlob = blob;
          }
        }

        if (latestBlob) {
          const blockBlobClient = containerClient.getBlockBlobClient(latestBlob.name);
          const downloadResponse = await blockBlobClient.download();
          const downloadedContent = await this.streamToString(downloadResponse.readableStreamBody!);
          
          console.log(`Retrieved transcript from Azure Blob: ${latestBlob.name}`);
          return JSON.parse(downloadedContent) as TranscriptData;
        }
      } else {
        // Simulate retrieval failure
        console.log(`Simulated transcript retrieval for meeting: ${meetingId}`);
      }

      return null;
    } catch (error) {
      console.error('Error retrieving transcript:', error);
      return null;
    }
  }

  async generateDownloadUrl(meetingId: string): Promise<string> {
    try {
      if (this.blobServiceClient) {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        const blobName = `${meetingId}/transcript-latest.json`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        // Generate SAS URL for download (valid for 1 hour)
        const sasUrl = await blockBlobClient.generateSasUrl({
          permissions: 'r' as any,
          expiresOn: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        });

        console.log(`Generated download URL for meeting: ${meetingId}`);
        return sasUrl;
      } else {
        // Return simulated URL
        const simulatedUrl = `https://example.blob.core.windows.net/transcripts/${meetingId}/transcript.json?sv=simulated`;
        console.log(`Generated simulated download URL: ${simulatedUrl}`);
        return simulatedUrl;
      }
    } catch (error) {
      console.error('Error generating download URL:', error);
      throw error;
    }
  }

  async exportTranscript(meetingId: string, transcript: TranscriptData, format: 'txt' | 'pdf' | 'docx'): Promise<string> {
    try {
      let content = '';
      const timestamp = new Date().toISOString();

      switch (format) {
        case 'txt':
          content = this.generateTextFormat(transcript);
          break;
        case 'pdf':
          content = this.generatePdfPlaceholder(transcript);
          break;
        case 'docx':
          content = this.generateDocxPlaceholder(transcript);
          break;
      }

      const exportBlobName = `${meetingId}/exports/transcript-${timestamp}.${format}`;

      if (this.blobServiceClient) {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(exportBlobName);
        
        await blockBlobClient.upload(content, content.length, {
          blobHTTPHeaders: {
            blobContentType: this.getContentType(format)
          }
        });

        console.log(`Exported transcript as ${format}: ${exportBlobName}`);
        return await this.generateDownloadUrl(meetingId);
      } else {
        console.log(`Simulated export as ${format}: ${exportBlobName}`);
        return `https://example.blob.core.windows.net/transcripts/${exportBlobName}`;
      }
    } catch (error) {
      console.error(`Error exporting transcript as ${format}:`, error);
      throw error;
    }
  }

  private extractTimestampFromBlobName(blobName: string): number {
    const match = blobName.match(/transcript-(\d+)\.json$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private async streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      readableStream.on('data', (data) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      });
      readableStream.on('end', () => {
        resolve(Buffer.concat(chunks).toString());
      });
      readableStream.on('error', reject);
    });
  }

  private generateTextFormat(transcript: TranscriptData): string {
    let text = `Meeting Transcript\n`;
    text += `Meeting ID: ${transcript.meetingId}\n`;
    text += `Generated: ${new Date().toISOString()}\n`;
    text += `Total Duration: ${transcript.metadata.totalDuration} seconds\n\n`;

    transcript.segments.forEach((segment) => {
      const timestamp = new Date(segment.timestamp).toISOString();
      text += `[${timestamp}] ${segment.speakerName || 'Unknown'}: ${segment.text}\n`;
    });

    return text;
  }

  private generatePdfPlaceholder(transcript: TranscriptData): string {
    // In production, use a PDF library like jsPDF or puppeteer
    return `PDF export placeholder for meeting ${transcript.meetingId}`;
  }

  private generateDocxPlaceholder(transcript: TranscriptData): string {
    // In production, use a DOCX library like docx or officegen
    return `DOCX export placeholder for meeting ${transcript.meetingId}`;
  }

  private getContentType(format: string): string {
    switch (format) {
      case 'txt':
        return 'text/plain';
      case 'pdf':
        return 'application/pdf';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      default:
        return 'application/octet-stream';
    }
  }
}