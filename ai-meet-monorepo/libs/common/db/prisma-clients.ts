import { PrismaClient } from '.prisma/meeting-client';
import { PrismaClient as TranscriptsPrismaClient } from '.prisma/transcripts-client';

export type ServiceType = 'meeting' | 'transcripts';

export interface DatabaseConfig {
  url: string;
  service: ServiceType;
}

/**
 * Creates a Prisma client for the specified service
 * @param service - The service type ('meeting' or 'transcripts')
 * @returns PrismaClient instance for the service
 */
export function createPrismaClient(service: ServiceType) {
  const url = process.env[`DATABASE_URL_${service.toUpperCase()}`] || process.env['DATABASE_URL'];
  
  if (!url) {
    throw new Error(`Database URL not found for service: ${service}. Please set DATABASE_URL or DATABASE_URL_${service.toUpperCase()}`);
  }

  if (service === 'meeting') {
    return new PrismaClient({
      datasources: {
        db: { url }
      },
      log: process.env['NODE_ENV'] === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error']
    });
  } else if (service === 'transcripts') {
    return new TranscriptsPrismaClient({
      datasources: {
        db: { url }
      },
      log: process.env['NODE_ENV'] === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error']
    });
  }
  
  throw new Error(`Unknown service type: ${service}`);
}

/**
 * Meeting service Prisma client singleton
 */
let meetingPrisma: PrismaClient | null = null;

export function getMeetingPrismaClient(): PrismaClient {
  if (!meetingPrisma) {
    meetingPrisma = createPrismaClient('meeting') as PrismaClient;
  }
  return meetingPrisma;
}

/**
 * Transcripts service Prisma client singleton
 */
let transcriptsPrisma: TranscriptsPrismaClient | null = null;

export function getTranscriptsPrismaClient(): TranscriptsPrismaClient {
  if (!transcriptsPrisma) {
    transcriptsPrisma = createPrismaClient('transcripts') as TranscriptsPrismaClient;
  }
  return transcriptsPrisma;
}

/**
 * Cleanup function to disconnect all clients
 */
export async function disconnectAllClients() {
  const promises: Promise<void>[] = [];
  
  if (meetingPrisma) {
    promises.push(meetingPrisma.$disconnect());
    meetingPrisma = null;
  }
  
  if (transcriptsPrisma) {
    promises.push(transcriptsPrisma.$disconnect());
    transcriptsPrisma = null;
  }
  
  await Promise.all(promises);
}