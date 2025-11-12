import { Module } from '@nestjs/common';
import { TranscriptsController } from './transcripts.controller';
import { TranscriptsService } from './transcripts.service';
import { AudioProcessorService } from './audio-processor.service';
import { StorageService } from './storage.service';
import { TranscriptEventHandler } from './transcript-event.handler';
import { KafkaModule } from '@aimeet/kafka';
import { DatabaseModule } from '@aimeet/db';

@Module({
  imports: [
    DatabaseModule,
    KafkaModule.forRoot({
      // Use localhost:9092 by default for host-local runs; override by
      // setting KAFKA_BROKERS when running in Docker Compose (kafka:29092).
      brokers: (process.env['KAFKA_BROKERS'] || 'localhost:9092').split(','),
      clientId: process.env['KAFKA_CLIENT_ID'] || 'transcripts-service',
      groupId: process.env['KAFKA_GROUP_ID'] || 'transcripts-service-group',
    }),
  ],
  controllers: [TranscriptsController],
  providers: [TranscriptsService, AudioProcessorService, StorageService, TranscriptEventHandler],
})
export class AppModule {}