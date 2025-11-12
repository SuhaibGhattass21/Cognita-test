import { Module, DynamicModule, Global } from '@nestjs/common';
import { KafkaService, KafkaConfig } from './kafka.service';

export interface KafkaModuleOptions {
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

@Global()
@Module({})
export class KafkaModule {
  static forRoot(options: KafkaModuleOptions): DynamicModule {
    const kafkaConfigProvider = {
      provide: 'KAFKA_CONFIG',
      useValue: options,
    };

    const kafkaServiceProvider = {
      provide: KafkaService,
      useFactory: (config: KafkaConfig) => new KafkaService(config),
      inject: ['KAFKA_CONFIG'],
    };

    return {
      module: KafkaModule,
      providers: [kafkaConfigProvider, kafkaServiceProvider],
      exports: [KafkaService],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<KafkaModuleOptions> | KafkaModuleOptions;
    inject?: any[];
  }): DynamicModule {
    const kafkaConfigProvider = {
      provide: 'KAFKA_CONFIG',
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const kafkaServiceProvider = {
      provide: KafkaService,
      useFactory: (config: KafkaConfig) => new KafkaService(config),
      inject: ['KAFKA_CONFIG'],
    };

    return {
      module: KafkaModule,
      providers: [kafkaConfigProvider, kafkaServiceProvider],
      exports: [KafkaService],
    };
  }

  static createKafkaConfig(): KafkaModuleOptions {
    return {
      // Default to localhost:9092 for host-based local runs. When running under
      // Docker Compose, set KAFKA_BROKERS=kafka:29092 (compose exposes broker
      // under that hostname). Allow override via environment variable.
      brokers: (process.env['KAFKA_BROKERS'] || 'localhost:9092').split(','),
      clientId: process.env['KAFKA_CLIENT_ID'] || 'aimeet-service',
      groupId: process.env['KAFKA_GROUP_ID'] || 'aimeet-group',
      ssl: process.env['KAFKA_SSL'] === 'true',
      sasl: process.env['KAFKA_USERNAME'] && process.env['KAFKA_PASSWORD'] 
        ? {
            mechanism: (process.env['KAFKA_SASL_MECHANISM'] as any) || 'plain',
            username: process.env['KAFKA_USERNAME'],
            password: process.env['KAFKA_PASSWORD'],
          }
        : undefined,
    };
  }
}