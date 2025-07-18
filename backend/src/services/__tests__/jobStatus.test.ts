import { JobStatusService, JobStatusInfo } from '../jobStatus';
import { QueueService, JobData } from '../queue';

// Mock QueueService
jest.mock('../queue');

describe('JobStatusService', () => {
  let jobStatusService: JobStatusService;
  let mockQueueService: jest.Mocked<QueueService>;
  let mockVideoQueue: any;
  let mockChannelQueue: any;

  beforeEach(() => {
    mockVideoQueue = {
      getWaiting: jest.fn(),
      getActive: jest.fn(),
      getCompleted: jest.fn(),
      getFailed: jest.fn(),
      getDelayed: jest.fn(),
    };

    mockChannelQueue = {
      getWaiting: jest.fn(),
      getActive: jest.fn(),
      getCompleted: jest.fn(),
      getFailed: jest.fn(),
      getDelayed: jest.fn(),
    };

    mockQueueService = {
      getJobStatus: jest.fn(),
      getQueueStats: jest.fn(),
      getVideoIndexingQueue: jest.fn().mockReturnValue(mockVideoQueue),
      getChannelIndexingQueue: jest.fn().mockReturnValue(mockChannelQueue),
      removeJob: jest.fn(),
    } as any;

    (QueueService.getInstance as jest.Mock).mockReturnValue(mockQueueService);

    jobStatusService = JobStatusService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (JobStatusService as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = JobStatusService.getInstance();
      const instance2 = JobStatusService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('getJobStatus', () => {
    it('should return job status for existing job', async () => {
      const mockJob = {
        id: '123',
        data: { channelId: 'test-channel', videoId: 'test-video' },
        timestamp: Date.now(),
        processedOn: null,
        finishedOn: null,
        failedReason: null,
        attemptsMade: 0,
        opts: { attempts: 3 },
        progress: jest.fn().mockReturnValue({ percentage: 50, message: 'Processing' }),
      };

      mockQueueService.getJobStatus.mockResolvedValue(mockJob as any);

      const result = await jobStatusService.getJobStatus('123', 'video');

      expect(mockQueueService.getJobStatus).toHaveBeenCalledWith('123', 'video');
      expect(result).toMatchObject({
        id: '123',
        type: 'video',
        status: 'waiting',
        data: mockJob.data,
        attempts: 0,
        maxAttempts: 3,
      });
    });

    it('should return null for non-existent job', async () => {
      mockQueueService.getJobStatus.mockResolvedValue(null);

      const result = await jobStatusService.getJobStatus('non-existent', 'video');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockQueueService.getJobStatus.mockRejectedValue(new Error('Database error'));

      const result = await jobStatusService.getJobStatus('123', 'video');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error getting job status for 123:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getChannelIndexingStatus', () => {
    it('should return jobs for a specific channel', async () => {
      const mockChannelJob = {
        id: '1',
        data: { channelId: 'test-channel' },
        timestamp: Date.now(),
        processedOn: Date.now(),
        finishedOn: null,
        failedReason: null,
        attemptsMade: 1,
        opts: { attempts: 3 },
        progress: jest.fn().mockReturnValue({ percentage: 75, message: 'Processing' }),
      };

      const mockVideoJob = {
        id: '2',
        data: { channelId: 'test-channel', videoId: 'video1' },
        timestamp: Date.now(),
        processedOn: Date.now(),
        finishedOn: null,
        failedReason: null,
        attemptsMade: 1,
        opts: { attempts: 3 },
        progress: jest.fn().mockReturnValue({ percentage: 25, message: 'Extracting subtitles' }),
      };

      // Mock the queue methods to return jobs for the channel
      mockChannelQueue.getWaiting.mockResolvedValue([]);
      mockChannelQueue.getActive.mockResolvedValue([mockChannelJob]);
      mockChannelQueue.getCompleted.mockResolvedValue([]);
      mockChannelQueue.getFailed.mockResolvedValue([]);
      mockChannelQueue.getDelayed.mockResolvedValue([]);

      mockVideoQueue.getWaiting.mockResolvedValue([]);
      mockVideoQueue.getActive.mockResolvedValue([mockVideoJob]);
      mockVideoQueue.getCompleted.mockResolvedValue([]);
      mockVideoQueue.getFailed.mockResolvedValue([]);
      mockVideoQueue.getDelayed.mockResolvedValue([]);

      const result = await jobStatusService.getChannelIndexingStatus('test-channel');

      expect(result).toHaveLength(2);
      expect(result[0]?.type).toBe('channel');
      expect(result[0]?.status).toBe('active');
      expect(result[1]?.type).toBe('video');
      expect(result[1]?.status).toBe('active');
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockChannelQueue.getWaiting.mockRejectedValue(new Error('Queue error'));

      const result = await jobStatusService.getChannelIndexingStatus('test-channel');

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error getting channel indexing status for test-channel:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getQueueSummary', () => {
    it('should return queue statistics summary', async () => {
      const videoStats = { waiting: 2, active: 1, completed: 5, failed: 1, delayed: 0 };
      const channelStats = { waiting: 1, active: 0, completed: 3, failed: 0, delayed: 0 };

      mockQueueService.getQueueStats
        .mockResolvedValueOnce(videoStats)
        .mockResolvedValueOnce(channelStats);

      const result = await jobStatusService.getQueueSummary();

      expect(result).toEqual({
        video: videoStats,
        channel: channelStats,
      });
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockQueueService.getQueueStats.mockRejectedValue(new Error('Queue error'));

      const result = await jobStatusService.getQueueSummary();

      expect(result).toEqual({
        video: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        channel: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      });

      consoleSpy.mockRestore();
    });
  });

  describe('getActiveJobs', () => {
    it('should return all active jobs', async () => {
      const mockActiveVideoJob = {
        id: '1',
        data: { channelId: 'test-channel', videoId: 'video1' },
        timestamp: Date.now(),
        processedOn: Date.now(),
        finishedOn: null,
        failedReason: null,
        attemptsMade: 1,
        opts: { attempts: 3 },
        progress: jest.fn().mockReturnValue({ percentage: 50, message: 'Processing' }),
      };

      mockChannelQueue.getActive.mockResolvedValue([]);
      mockVideoQueue.getActive.mockResolvedValue([mockActiveVideoJob]);

      const result = await jobStatusService.getActiveJobs();

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('video');
      expect(result[0]?.status).toBe('active');
    });
  });

  describe('getFailedJobs', () => {
    it('should return all failed jobs', async () => {
      const mockFailedVideoJob = {
        id: '1',
        data: { channelId: 'test-channel', videoId: 'video1' },
        timestamp: Date.now(),
        processedOn: Date.now(),
        finishedOn: Date.now(),
        failedReason: 'Subtitle extraction failed',
        attemptsMade: 3,
        opts: { attempts: 3 },
        progress: jest.fn().mockReturnValue(null),
      };

      mockChannelQueue.getFailed.mockResolvedValue([]);
      mockVideoQueue.getFailed.mockResolvedValue([mockFailedVideoJob]);

      const result = await jobStatusService.getFailedJobs();

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('video');
      expect(result[0]?.status).toBe('failed');
      expect(result[0]?.failedReason).toBe('Subtitle extraction failed');
    });
  });

  describe('retryJob', () => {
    it('should retry a job successfully', async () => {
      const mockJob = {
        retry: jest.fn(),
      };

      mockQueueService.getJobStatus.mockResolvedValue(mockJob as any);

      const result = await jobStatusService.retryJob('123', 'video');

      expect(mockQueueService.getJobStatus).toHaveBeenCalledWith('123', 'video');
      expect(mockJob.retry).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false for non-existent job', async () => {
      mockQueueService.getJobStatus.mockResolvedValue(null);

      const result = await jobStatusService.retryJob('non-existent', 'video');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockQueueService.getJobStatus.mockRejectedValue(new Error('Queue error'));

      const result = await jobStatusService.retryJob('123', 'video');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error retrying job 123:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('removeJob', () => {
    it('should remove a job successfully', async () => {
      mockQueueService.removeJob.mockResolvedValue(undefined);

      const result = await jobStatusService.removeJob('123', 'video');

      expect(mockQueueService.removeJob).toHaveBeenCalledWith('123', 'video');
      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockQueueService.removeJob.mockRejectedValue(new Error('Queue error'));

      const result = await jobStatusService.removeJob('123', 'video');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error removing job 123:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});