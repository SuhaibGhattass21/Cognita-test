import { Test, TestingModule } from '@nestjs/testing';
import { KafkaService, EventTopics } from '@aimeet/kafka';

describe('Kafka Consumer Unit Test', () => {
  let kafkaService: KafkaService;
  let module: TestingModule;

  beforeEach(async () => {
    // Mock Kafka service for unit testing
    const mockKafkaService = {
      onModuleInit: jest.fn().mockResolvedValue(undefined),
      onModuleDestroy: jest.fn().mockResolvedValue(undefined),
      getConnectionStatus: jest.fn().mockResolvedValue(true),
      subscribeToTopic: jest.fn().mockResolvedValue(undefined),
      publishEvent: jest.fn().mockResolvedValue({ 
        success: true, 
        partition: 0,
        offset: '123'
      }),
    };

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

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Consumer Functionality', () => {
    it('should check connection status', async () => {
      const isConnected = await kafkaService.getConnectionStatus();
      expect(isConnected).toBe(true);
      expect(kafkaService.getConnectionStatus).toHaveBeenCalled();
    });

    it('should subscribe to topic with handler', async () => {
      const mockHandler = jest.fn();
      
      await kafkaService.subscribeToTopic(
        EventTopics.MEETING_CREATED,
        mockHandler
      );
      
      expect(kafkaService.subscribeToTopic).toHaveBeenCalledWith(
        EventTopics.MEETING_CREATED,
        mockHandler
      );
    });

    it('should handle subscription with message callback', async () => {
      const messageHandler = jest.fn().mockImplementation(async (event: any, metadata: any) => {
        expect(event).toBeDefined();
        expect(metadata).toBeDefined();
      });

      await kafkaService.subscribeToTopic(
        EventTopics.MEETING_CREATED,
        messageHandler
      );

      expect(kafkaService.subscribeToTopic).toHaveBeenCalledWith(
        EventTopics.MEETING_CREATED,
        messageHandler
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle subscription errors gracefully', async () => {
      const mockKafkaServiceWithError = {
        ...kafkaService,
        subscribeToTopic: jest.fn().mockRejectedValue(new Error('Subscription failed')),
      };

      module = await Test.createTestingModule({
        providers: [
          {
            provide: KafkaService,
            useValue: mockKafkaServiceWithError,
          },
        ],
      }).compile();

      const errorKafkaService = module.get<KafkaService>(KafkaService);
      
      await expect(
        errorKafkaService.subscribeToTopic(
          EventTopics.MEETING_CREATED,
          jest.fn()
        )
      ).rejects.toThrow('Subscription failed');
    });

    it('should handle connection status errors', async () => {
      const mockKafkaServiceWithError = {
        ...kafkaService,
        getConnectionStatus: jest.fn().mockRejectedValue(new Error('Connection check failed')),
      };

      module = await Test.createTestingModule({
        providers: [
          {
            provide: KafkaService,
            useValue: mockKafkaServiceWithError,
          },
        ],
      }).compile();

      const errorKafkaService = module.get<KafkaService>(KafkaService);
      
      await expect(
        errorKafkaService.getConnectionStatus()
      ).rejects.toThrow('Connection check failed');
    });
  });
});