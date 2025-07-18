import { WorkerService } from '../worker';
import { QueueService, JobData, JobResult } from '../queue';
import { Job } from 'bull';

// Mock QueueService
jest.mock('../queue');

describe('WorkerService', () => {
  let workerService: WorkerService;
  let mockQueueService: jest.Mocked<QueueService>;
  let mockVideoQueue: any;
  let mockChannelQueue: any;

  beforeEach(() => {
    mockVideoQueue = {
      process: jest.fn(),
    };

    mockChannelQueue = {
      process: jest.fn(),
    };

    mockQueueService = {
      getVideoIndexingQueue: jest.fn().mockReturnValue(mockVideoQueue),
      getChannelIndexingQueue: jest.fn().mockReturnValue(mockChannelQueue),
      close: jest.fn(),
    } as any;

    (QueueService.getInstance as jest.Mock).mockReturnValue(mockQueueService);

    workerService = WorkerService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (WorkerService as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = WorkerService.getInstance();
      const instance2 = WorkerService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should setup workers for both queues', () => {
      expect(mockVideoQueue.process).toHaveBeenCalledWith('index-video', 5, expect.any(Function));
      expect(mockChannelQueue.process).toHaveBeenCalledWith('index-channel', 2, expect.any(Function));
    });
  });

  describe('video indexing worker', () => {
    let videoProcessor: (job: Job<JobData>) => Promise<JobResult>;

    beforeEach(() => {
      // Get the video processor function
      videoProcessor = mockVideoQueue.process.mock.calls.find(
        (call: any) => call[0] === 'index-video'
      )[2];
    });

    it('should process video indexing job successfully', async () => {
      const mockJob = {
        data: {
          videoId: 'test-video-id',
          channelId: 'test-channel-id',
        },
        progress: jest.fn(),
      } as any;

      const result = await videoProcessor(mockJob);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully indexed video test-video-id');
      expect(result.data).toMatchObject({
        videoId: 'test-video-id',
        channelId: 'test-channel-id',
      });

      // Verify progress updates were called
      expect(mockJob.progress).toHaveBeenCalledTimes(4);
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 0,
        message: 'Starting video indexing',
        currentStep: 'initialization',
        totalSteps: 4,
        completedSteps: 0,
      });
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 100,
        message: 'Video indexing completed',
        currentStep: 'completed',
        totalSteps: 4,
        completedSteps: 4,
      });
    });

    it('should handle missing video ID', async () => {
      const mockJob = {
        data: {
          channelId: 'test-channel-id',
        },
        progress: jest.fn(),
      } as any;

      const result = await videoProcessor(mockJob);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Video ID is required');
      expect(result.errors).toContain('Video ID is required');
    });

    it('should handle processing errors', async () => {
      const mockJob = {
        data: {
          videoId: 'test-video-id',
          channelId: 'test-channel-id',
        },
        progress: jest.fn().mockRejectedValue(new Error('Progress update failed')),
      } as any;

      const result = await videoProcessor(mockJob);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to index video test-video-id');
    });
  });

  describe('channel indexing worker', () => {
    let channelProcessor: (job: Job<JobData>) => Promise<JobResult>;

    beforeEach(() => {
      // Get the channel processor function
      channelProcessor = mockChannelQueue.process.mock.calls.find(
        (call: any) => call[0] === 'index-channel'
      )[2];
    });

    it('should process channel indexing job successfully', async () => {
      const mockJob = {
        data: {
          channelId: 'test-channel-id',
        },
        progress: jest.fn(),
      } as any;

      const result = await channelProcessor(mockJob);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully started indexing for channel test-channel-id');
      expect(result.data).toMatchObject({
        channelId: 'test-channel-id',
      });

      // Verify progress updates were called
      expect(mockJob.progress).toHaveBeenCalledTimes(5);
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 0,
        message: 'Starting channel indexing',
        currentStep: 'initialization',
        totalSteps: 5,
        completedSteps: 0,
      });
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 100,
        message: 'Channel indexing completed',
        currentStep: 'completed',
        totalSteps: 5,
        completedSteps: 5,
      });
    });

    it('should handle missing channel ID', async () => {
      const mockJob = {
        data: {},
        progress: jest.fn(),
      } as any;

      const result = await channelProcessor(mockJob);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Channel ID is required');
      expect(result.errors).toContain('Channel ID is required');
    });

    it('should handle processing errors', async () => {
      const mockJob = {
        data: {
          channelId: 'test-channel-id',
        },
        progress: jest.fn().mockRejectedValue(new Error('Progress update failed')),
      } as any;

      const result = await channelProcessor(mockJob);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to index channel test-channel-id');
    });
  });

  describe('shutdown', () => {
    it('should close queue service', async () => {
      await workerService.shutdown();

      expect(mockQueueService.close).toHaveBeenCalled();
    });
  });
});