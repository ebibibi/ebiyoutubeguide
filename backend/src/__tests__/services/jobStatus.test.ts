import { JobStatusService } from '../../services/jobStatus';
import { QueueService } from '../../services/queue';

// Mock QueueService
jest.mock('../../services/queue');

describe('JobStatusService', () => {
  let jobStatusService: JobStatusService;
  let mockQueueService: jest.Mocked<QueueService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock QueueService methods
    mockQueueService = {
      getJobStatus: jest.fn(),
      getQueueStats: jest.fn(),
      getVideoIndexingQueue: jest.fn(),
      getChannelIndexingQueue: jest.fn(),
      removeJob: jest.fn(),
    } as any;

    (QueueService.getInstance as jest.Mock).mockReturnValue(mockQueueService);

    jobStatusService = JobStatusService.getInstance();
  });

  describe('getJobStatus', () => {
    it('should return job status info for existing job', async () => {
      const mockJob = {
        id: 'job-1',
        data: { channelId: 'test-channel', videoId: 'test-video' },
        timestamp: Date.now(),
        processedOn: null,
        finishedOn: null,
        failedReason: null,
        attemptsMade: 0,
        opts: { attempts: 3 },
        progress: jest.fn().mockReturnValue({ percentage: 50, message: 'Processing' }),
      };

      mockQueueService.getJobStatus.mockResolvedValue(mockJob);

      const result = await jobStatusService.getJobStatus('job-1', 'video');

      expect(result).toMatchObject({
        id: 'job-1',
        type: 'video',
        status: 'waiting',
        data: { channelId: 'test-channel', videoId: 'test-video' },
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
      mockQueueService.getJobStatus.mockRejectedValue(new Error('Queue error'));

      const result = await jobStatusService.getJobStatus('job-1', 'video');

      expect(result).toBeNull();
    });
  });

  describe('getQueueSummary', () => {
    it('should return queue statistics summary', async () => {
      const videoStats = {
        waiting: 5,
        active: 2,
        completed: 10,
        failed: 1,
        delayed: 0,
      };

      const channelStats = {
        waiting: 2,
        active: 1,
        completed: 3,
        failed: 0,
        delayed: 1,
      };

      mockQueueService.getQueueStats
        .mockResolvedValueOnce(videoStats)
        .mockResolvedValueOnce(channelStats);

      const result = await jobStatusService.getQueueSummary();

      expect(result).toEqual({
        video: videoStats,
        channel: channelStats,
      });
    });

    it('should return default stats on error', async () => {
      mockQueueService.getQueueStats.mockRejectedValue(new Error('Queue error'));

      const result = await jobStatusService.getQueueSummary();

      expect(result).toEqual({
        video: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        channel: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      });
    });
  });

  describe('getActiveJobs', () => {
    it('should return active jobs from both queues', async () => {
      const mockVideoQueue = {
        getActive: jest.fn().mockResolvedValue([
          {
            id: 'video-job-1',
            data: { channelId: 'test-channel', videoId: 'video-1' },
            timestamp: Date.now(),
            processedOn: Date.now(),
            finishedOn: null,
            failedReason: null,
            attemptsMade: 1,
            opts: { attempts: 3 },
            progress: jest.fn().mockReturnValue({ percentage: 75, message: 'Processing video' }),
          },
        ]),
      };

      const mockChannelQueue = {
        getActive: jest.fn().mockResolvedValue([
          {
            id: 'channel-job-1',
            data: { channelId: 'test-channel' },
            timestamp: Date.now(),
            processedOn: Date.now(),
            finishedOn: null,
            failedReason: null,
            attemptsMade: 0,
            opts: { attempts: 2 },
            progress: jest.fn().mockReturnValue({ percentage: 25, message: 'Processing channel' }),
          },
        ]),
      };

      mockQueueService.getVideoIndexingQueue.mockReturnValue(mockVideoQueue as any);
      mockQueueService.getChannelIndexingQueue.mockReturnValue(mockChannelQueue as any);

      const result = await jobStatusService.getActiveJobs();

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('channel');
      expect(result[0].status).toBe('active');
      expect(result[1].type).toBe('video');
      expect(result[1].status).toBe('active');
    });

    it('should handle errors gracefully', async () => {
      mockQueueService.getVideoIndexingQueue.mockImplementation(() => {
        throw new Error('Queue error');
      });

      const result = await jobStatusService.getActiveJobs();

      expect(result).toEqual([]);
    });
  });

  describe('getFailedJobs', () => {
    it('should return failed jobs from both queues', async () => {
      const mockVideoQueue = {
        getFailed: jest.fn().mockResolvedValue([
          {
            id: 'failed-video-job',
            data: { channelId: 'test-channel', videoId: 'video-1' },
            timestamp: Date.now(),
            processedOn: Date.now(),
            finishedOn: Date.now(),
            failedReason: 'Subtitle extraction failed',
            attemptsMade: 3,
            opts: { attempts: 3 },
            progress: jest.fn().mockReturnValue({ percentage: 50, message: 'Failed' }),
          },
        ]),
      };

      const mockChannelQueue = {
        getFailed: jest.fn().mockResolvedValue([]),
      };

      mockQueueService.getVideoIndexingQueue.mockReturnValue(mockVideoQueue as any);
      mockQueueService.getChannelIndexingQueue.mockReturnValue(mockChannelQueue as any);

      const result = await jobStatusService.getFailedJobs();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('video');
      expect(result[0].status).toBe('failed');
      expect(result[0].failedReason).toBe('Subtitle extraction failed');
    });
  });

  describe('retryJob', () => {
    it('should retry existing job successfully', async () => {
      const mockJob = {
        retry: jest.fn(),
      };

      mockQueueService.getJobStatus.mockResolvedValue(mockJob as any);

      const result = await jobStatusService.retryJob('job-1', 'video');

      expect(mockJob.retry).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false for non-existent job', async () => {
      mockQueueService.getJobStatus.mockResolvedValue(null);

      const result = await jobStatusService.retryJob('non-existent', 'video');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockQueueService.getJobStatus.mockRejectedValue(new Error('Queue error'));

      const result = await jobStatusService.retryJob('job-1', 'video');

      expect(result).toBe(false);
    });
  });

  describe('removeJob', () => {
    it('should remove job successfully', async () => {
      mockQueueService.removeJob.mockResolvedValue();

      const result = await jobStatusService.removeJob('job-1', 'video');

      expect(mockQueueService.removeJob).toHaveBeenCalledWith('job-1', 'video');
      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockQueueService.removeJob.mockRejectedValue(new Error('Remove error'));

      const result = await jobStatusService.removeJob('job-1', 'video');

      expect(result).toBe(false);
    });
  });
});