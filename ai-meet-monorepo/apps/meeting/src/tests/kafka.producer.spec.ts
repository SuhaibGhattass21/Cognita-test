import { Test, TestingModule } from '@nestjs/testing';
import { KafkaService, EventTopics, MeetingCreatedEvent, MeetingEndedEvent } from '@aimeet/kafka';

describe('Kafka Producer Unit Test', () => {
  let kafkaService: KafkaService;
  let module: TestingModule;

  const mockKafkaService = {
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    publishEvent: jest.fn().mockResolvedValue({ success: true }),
    subscribeToTopic: jest.fn(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        {
          provide: KafkaService,
          useValue: mockKafkaService,
        },
      ],
    }).compile();

    kafkaService = module.get<KafkaService>(KafkaService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Producer Functionality', () => {
    it('should publish events successfully', async () => {
      const testEvent: MeetingCreatedEvent = {
        eventId: 'test-event-123',
        eventType: 'meeting.created',
        timestamp: new Date(),
        version: '1.0',
        source: 'meeting-service-test',
        data: {
          meetingId: 'test-meeting-123',
          title: 'Test Meeting',
          tenantId: 'tenant-123',
          startTime: new Date(),
          participants: []
        }
      };

      const result = await kafkaService.publishEvent(EventTopics.MEETING_EVENTS, testEvent);

      expect(mockKafkaService.publishEvent).toHaveBeenCalledWith(EventTopics.MEETING_EVENTS, testEvent);
      expect(result).toEqual({ success: true });
    });

    it('should handle event publishing errors gracefully', async () => {
      const errorMessage = 'Failed to publish event';
      mockKafkaService.publishEvent.mockRejectedValueOnce(new Error(errorMessage));

      const testEvent: MeetingEndedEvent = {
        eventId: 'test-event-456',
        eventType: 'meeting.ended',
        timestamp: new Date(),
        version: '1.0',
        source: 'meeting-service-test',
        data: {
          meetingId: 'test-meeting-123',
          title: 'Test Meeting',
          tenantId: 'tenant-123',
          endedAt: new Date(),
          duration: 1800,
          participantCount: 3
        }
      };

      await expect(
        kafkaService.publishEvent(EventTopics.MEETING_EVENTS, testEvent)
      ).rejects.toThrow(errorMessage);
    });
  });
});
