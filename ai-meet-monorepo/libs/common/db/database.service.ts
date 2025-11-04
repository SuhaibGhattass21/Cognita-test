import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createPrismaClient, ServiceType, disconnectAllClients } from './prisma-clients';
import { PrismaClient } from '.prisma/meeting-client';
import { PrismaClient as TranscriptsPrismaClient } from '.prisma/transcripts-client';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private clients = new Map<ServiceType, any>();

  async onModuleInit() {
    this.logger.log('Initializing database connections...');
    
    // Initialize connections based on environment
    const serviceType = this.detectServiceType();
    if (serviceType) {
      await this.initializeClient(serviceType);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting database clients...');
    await disconnectAllClients();
  }

  /**
   * Get database client for specific service
   */
  getClient(service: ServiceType) {
    if (!this.clients.has(service)) {
      const client = createPrismaClient(service);
      this.clients.set(service, client);
    }
    return this.clients.get(service);
  }

  /**
   * Test database connection
   */
  async testConnection(service: ServiceType): Promise<{ connected: boolean; error?: string }> {
    try {
      const client = this.getClient(service);
      await client.$queryRaw`SELECT 1`;
      return { connected: true };
    } catch (error) {
      this.logger.error(`Database connection test failed for ${service}:`, error);
      return { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get database health status
   */
  async getHealthStatus(service: ServiceType) {
    const start = Date.now();
    const result = await this.testConnection(service);
    const responseTime = Date.now() - start;

    return {
      service,
      status: result.connected ? 'healthy' : 'unhealthy',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      error: result.error
    };
  }

  private detectServiceType(): ServiceType | null {
    // Detect service type from environment or other means
    if (process.env['DATABASE_URL']?.includes('meeting_db')) {
      return 'meeting';
    }
    if (process.env['DATABASE_URL']?.includes('transcripts_db')) {
      return 'transcripts';
    }
    return null;
  }

  private async initializeClient(service: ServiceType) {
    try {
      const client = this.getClient(service);
      await client.$connect();
      this.logger.log(`Connected to ${service} database`);
    } catch (error) {
      this.logger.error(`Failed to connect to ${service} database:`, error);
      throw error;
    }
  }
}