import { Test, TestingModule } from '@nestjs/testing';
import { MeetingService } from './meeting.service';
import { KafkaService } from '@aimeet/kafka';
import { DatabaseService } from '@aimeet/db';

const mockPrismaClient = {
  meeting: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  participant: {
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockKafkaService = {
  publishEvent: jest.fn().mockResolvedValue({ success: true }),
};

const mockDatabaseService = {
  getClient: jest.fn().mockReturnValue(mockPrismaClient),
};

describe('MeetingService', () => {
  let service: MeetingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingService,
        { provide: KafkaService, useValue: mockKafkaService },
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<MeetingService>(MeetingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMeeting', () => {
    it('should create a meeting successfully', async () => {
      const mockResult = {
        id: 'meeting-456',
        title: 'Test Meeting',
        tenantId: 'tenant-123',
        startTime: new Date(),
        endTime: null,
        status: 'ACTIVE',
        participants: [],
      };

      mockPrismaClient.meeting.create.mockResolvedValue(mockResult);

      const result = await service.createMeeting({
        title: 'Test Meeting',
        tenantId: 'tenant-123',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('meeting-456');
    });
  });
});
