import { Module } from '@nestjs/common';
import { MeetingController } from './meeting.controller';
import { MeetingService } from './meeting.service';
import { WebRTCGateway } from './webrtc.gateway';
import { KafkaModule } from '@aimeet/kafka';
import { DatabaseModule } from '@aimeet/db';

@Module({
  imports: [
    DatabaseModule,
    KafkaModule.forRoot({
      // Prefer host-local broker when running services outside of Docker.
      // To run inside Docker Compose keep KAFKA_BROKERS=kafka:29092 in compose
      // env or override as needed.
      brokers: (process.env['KAFKA_BROKERS'] || 'localhost:9092').split(','),
      clientId: process.env['KAFKA_CLIENT_ID'] || 'meeting-service',
      groupId: process.env['KAFKA_GROUP_ID'] || 'meeting-service-group',
    }),
  ],
  controllers: [MeetingController],
  providers: [MeetingService, WebRTCGateway],
})
export class AppModule {}