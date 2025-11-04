import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import { BaseEvent, EventProducerResult, EventTopics } from './events/event.types';

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
}

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private isConnected = false;

  constructor(private readonly config: KafkaConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      ssl: config.ssl,
      sasl: config.sasl as any, // Type assertion to handle KafkaJS type constraints
      logLevel: logLevel.WARN,
      retry: {
        initialRetryTime: 300,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
    });

    this.consumer = this.kafka.consumer({
      groupId: config.groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  async onModuleInit() {
    try {
      await this.connect();
      this.logger.log('Kafka service initialized successfully');
    } catch (error) {
      this.logger.warn('Failed to initialize Kafka service during startup - will retry on first use', error);
      // Don't throw error to allow service to start without Kafka
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.producer.connect();
      await this.consumer.connect();
      this.isConnected = true;
      this.logger.log('Successfully connected to Kafka');
    } catch (error) {
      this.logger.error('Failed to connect to Kafka', error);
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      this.isConnected = false;
      this.logger.log('Disconnected from Kafka');
    } catch (error) {
      this.logger.error('Error disconnecting from Kafka', error);
    }
  }

  async publishEvent<T extends BaseEvent>(
    topic: EventTopics,
    event: T,
    key?: string
  ): Promise<EventProducerResult> {
    try {
      // Ensure we're connected before publishing
      if (!this.isConnected) {
        this.logger.log('Kafka not connected, attempting to connect...');
        await this.connect();
      }

      const message = {
        key: key || event.eventId,
        value: JSON.stringify(event),
        headers: {
          eventType: event.eventType,
          source: event.source,
          version: event.version,
          timestamp: event.timestamp.toISOString(),
        },
      };

      const result = await this.producer.send({
        topic,
        messages: [message],
      });

      this.logger.log(`Event published successfully: ${event.eventType} to topic ${topic}`);
      
      return {
        success: true,
        partition: result[0].partition,
        offset: result[0].baseOffset,
      };
    } catch (error) {
      this.logger.error(`Failed to publish event ${event.eventType} to topic ${topic}`, error);
      this.isConnected = false; // Mark as disconnected on error
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async subscribeToTopic(
    topic: EventTopics,
    handler: (event: BaseEvent, metadata: any) => Promise<void>
  ): Promise<void> {
    try {
      await this.consumer.subscribe({ topic, fromBeginning: false });
      
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }: any) => {
          try {
            const event = JSON.parse(message.value?.toString() || '{}');
            const metadata = {
              topic,
              partition,
              offset: message.offset,
              headers: message.headers,
              timestamp: message.timestamp,
            };

            await handler(event, metadata);
            this.logger.debug(`Successfully processed event from topic ${topic}`);
          } catch (error) {
            this.logger.error(`Error processing message from topic ${topic}`, error);
            // Implement dead letter queue logic here if needed
          }
        },
      });

      this.logger.log(`Successfully subscribed to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic ${topic}`, error);
      throw error;
    }
  }

  async subscribeToMultipleTopics(
    topics: EventTopics[],
    handler: (event: BaseEvent, metadata: any) => Promise<void>
  ): Promise<void> {
    try {
      for (const topic of topics) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
      }
      
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }: any) => {
          try {
            const event = JSON.parse(message.value?.toString() || '{}');
            const metadata = {
              topic,
              partition,
              offset: message.offset,
              headers: message.headers,
              timestamp: message.timestamp,
            };

            await handler(event, metadata);
            this.logger.debug(`Successfully processed event from topic ${topic}`);
          } catch (error) {
            this.logger.error(`Error processing message from topic ${topic}`, error);
          }
        },
      });

      this.logger.log(`Successfully subscribed to topics: ${topics.join(', ')}`);
    } catch (error) {
      this.logger.error('Failed to subscribe to topics', error);
      throw error;
    }
  }

  async createTopics(topics: Array<{ topic: string; numPartitions?: number; replicationFactor?: number }>): Promise<void> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      await admin.createTopics({
        topics: topics.map(t => ({
          topic: t.topic,
          numPartitions: t.numPartitions || 3,
          replicationFactor: t.replicationFactor || 1,
        })),
      });
      
      await admin.disconnect();
      this.logger.log(`Created topics: ${topics.map(t => t.topic).join(', ')}`);
    } catch (error) {
      this.logger.error('Failed to create topics', error);
      throw error;
    }
  }

  async getConnectionStatus(): Promise<boolean> {
    return this.isConnected;
  }
}