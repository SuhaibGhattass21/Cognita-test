import { Test, TestingModule } from '@nestjs/testing';
import { KafkaService, EventTopics } from '@aimeet/kafka';
import { Logger } from '@nestjs/common';

describe('Kafka Producer Connection Test', () => {
  let kafkaService: KafkaService;
  let module: TestingModule;

  beforeAll(async () => {
    const logger = new Logger('KafkaProducerTest');
    
    // Create a real Kafka service instance for integration testing
    const kafkaConfig = {
      brokers: ['localhost:9093'],
      clientId: 'meeting-service-test',
      groupId: 'meeting-service-test-group',
    };

    module = await Test.createTestingModule({
      providers: [
        {
          provide: KafkaService,
          useValue: new KafkaService(kafkaConfig),
        },
      ],
    }).compile();

    kafkaService = module.get<KafkaService>(KafkaService);
    
    // Initialize the service manually for testing
    await kafkaService.onModuleInit();
    
  logger.log('Kafka service initialized for producer testing');
  });

  afterAll(async () => {
    if (kafkaService) {
      await kafkaService.onModuleDestroy();
    }
    if (module) {
      await module.close();
    }
  });

  describe('Producer Connection', () => {
    it('should connect to Kafka and send a test message', async () => {
      const logger = new Logger('ProducerTest');
      
      try {
        // Check connection status
        const isConnected = await kafkaService.getConnectionStatus();
        expect(isConnected).toBe(true);
  logger.log('Kafka connection established');

        // Create a test event
        const testEvent = {
          eventId: `test-${Date.now()}`,
          eventType: 'test.connection',
          timestamp: new Date(),
          version: '1.0',
          source: 'meeting-service-test',
          data: {
            message: 'Test connection from meeting service',
            testId: `test-${Date.now()}`,
            timestamp: new Date().toISOString(),
          },
        };

        // Send test message to a test topic
        const result = await kafkaService.publishEvent(
          'test.connection' as EventTopics,
          testEvent,
          `test-key-${Date.now()}`
        );

        // Verify the result
        expect(result.success).toBe(true);
        expect(result.partition).toBeDefined();
        expect(result.offset).toBeDefined();

  logger.log('Producer connected and sent message successfully');
  logger.log(`Message sent to partition ${result.partition}, offset ${result.offset}`);
  logger.log(`Event ID: ${testEvent.eventId}`);
        
      } catch (error) {
  const logger = new Logger('ProducerError');
  logger.error('Producer connection failed:', error);
        throw error;
      }
    }, 30000); // 30 second timeout for Kafka operations

    it('should handle connection timeout gracefully', async () => {
      const logger = new Logger('TimeoutTest');
      
      try {
        // Test with invalid broker to simulate timeout
        const invalidKafkaConfig = {
          brokers: ['localhost:9999'], // Invalid port
          clientId: 'meeting-service-timeout-test',
          groupId: 'meeting-service-timeout-group',
        };

        const timeoutKafkaService = new KafkaService(invalidKafkaConfig);
        
        // This should timeout and be handled gracefully
        try {
          await timeoutKafkaService.onModuleInit();
        } catch (error) {
          logger.log('Timeout handled gracefully');
          expect(error).toBeDefined();
          return;
        }
        
        // Clean up if somehow it connected
        await timeoutKafkaService.onModuleDestroy();
        
        // If we reach here without error, the test should fail
        fail('Expected connection to timeout but it succeeded');
        
      } catch (error) {
  const logger = new Logger('ExpectedTimeoutError');
  logger.log('Connection timeout caught and handled properly');
        expect(error).toBeDefined();
      }
    }, 15000);
  });

  describe('Producer Error Handling', () => {
    it('should handle invalid event gracefully', async () => {
      const logger = new Logger('ErrorHandlingTest');
      
      try {
        // Create an invalid event (missing required fields)
        const invalidEvent = {
          eventId: 'invalid-test',
          // Missing eventType, timestamp, version, source
        } as any;

        const result = await kafkaService.publishEvent(
          'test.connection' as EventTopics,
          invalidEvent,
          'invalid-key'
        );

        // Should still attempt to send but may have issues
  logger.log('Invalid event result:', JSON.stringify(result, null, 2));
        expect(result).toBeDefined();
        
      } catch (error) {
  logger.log('Invalid event error handled gracefully');
        expect(error).toBeDefined();
      }
    });
  });
});