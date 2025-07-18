import { QueueService, JobData } from '../../services/queue';

// Mock Redis connection
jest.mock('../../config/redis');
jest.mock('bull');

const mockBull = require('bull');

describe('QueueService', () => {
  let queueService: QueueService;
  let mockVideoQueue: any;
  let mockChannelQueue: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Bull queue instances
    mockVideoQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
      getWaiting: jest.fn().mockResolvedValue([]),
      getActive: jest.fn().mockResolvedValue([]),
      getCompleted: jest.fn().mockResolvedValue([]),
      getFailed: jest.fn().mockResolvedValue([]),
      getDelayed: jest.fn().mockResolvedValue([]),
      pause: jest.fn(),
      resume: jest.fn(),
      clean: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
    };

    mockChannelQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
      getWaiting: jest.fn().mockResolvedValue([]),
      getActive: jest.fn().mockResolvedValue([]),
      getCompleted: jest.fn().mockResolvedValue([]),
      getFailed: jest.fn().mockResolvedValue([]),
      getDelayed: jest.fn().mockResolvedValue([]),
      pause: jest.fn(),
      resume: jest.fn(),
      clean: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
    };

    // Mock Bull constructor to return our mock queues
    mockBull.mockImplementation((name: string) => {
      if (name === 'video-indexing') {
        return mockVideoQueue;
      } else if (name === 'channel-indexing') {
        return mockChannelQueue;
      }
      return {};
    });

    queueService = QueueService.getInstance();
  });

  describe('addVideoIndexingJob', () => {
    it('should add a video indexing job with correct data', async () => {
      const jobData: JobData = {
        channelId: 'test-channel',
        videoId: 'test-video',
        priority: 1,
      };

      const mockJob = { id: 'job-1', data: jobData };
      mockVideoQueue.add.mockResolvedValue(mockJob);

      const result = await queueService.addVideoIndexingJob(jobData);

      expect(mockVideoQueue.add).toHaveBeenCalledWith(
        'index-video',
        jobData,
        expect.objectContaining({
          priority: 1,
          delay: 0,
        })
      );
      expect(result).toEqual(mockJob);
    });

    it('should use default priority when not specified', async () => {
      const jobData: JobData = {
        channelId: 'test-channel',
        videoId: 'test-video',
      };

      const mockJob = { id: 'job-1', data: jobData };
      mockVideoQueue.add.mockResolvedValue(mockJob);

      await queueService.addVideoIndexingJob(jobData);

      expect(mockVideoQueue.add).toHaveBeenCalledWith(
        'index-video',
        jobData,
        expect.objectContaining({
          priority: 0,
          delay: 0,
        })
      );
    });
  });

  describe('addChannelIndexingJob', () => {
    it('should add a channel indexing job with correct data', async () => {
      const jobData: JobData = {
        channelId: 'test-channel',
        priority: 2,
      };

      const mockJob = { id: 'job-2', data: jobData };
      mockChannelQueue.add.mockResolvedValue(mockJob);

      const result = await queueService.addChannelIndexingJob(jobData);

      expect(mockChannelQueue.add).toHaveBeenCalledWith(
        'index-channel',
        jobData,
        expect.objectContaining({
          priority: 2,
          delay: 0,
        })
      );
      expect(result).toEqual(mockJob);
    });
  });

  describe('getJobStatus', () => {
    it('should get video job status', async () => {
      const mockJob = { id: 'job-1', data: { channelId: 'test' } };
      mockVideoQueue.getJob.mockResolvedValue(mockJob);

      const result = await queueService.getJobStatus('job-1', 'video');

      expect(mockVideoQueue.getJob).toHaveBeenCalledWith('job-1');
      expect(result).toEqual(mockJob);
    });

    it('should get channel job status', async () => {
      const mockJob = { id: 'job-2', data: { channelId: 'test' } };
      mockChannelQueue.getJob.mockResolvedValue(mockJob);

      const result = await queueService.getJobStatus('job-2', 'channel');

      expect(mockChannelQueue.getJob).toHaveBeenCalledWith('job-2');
      expect(result).toEqual(mockJob);
    });
  });

  describe('getQueueStats', () => {
    it('should return video queue statistics', async () => {
      mockVideoQueue.getWaiting.mockResolvedValue([1, 2]);
      mockVideoQueue.getActive.mockResolvedValue([1]);
      mockVideoQueue.getCompleted.mockResolvedValue([1, 2, 3]);
      mockVideoQueue.getFailed.mockResolvedValue([]);
      mockVideoQueue.getDelayed.mockResolvedValue([1]);

      const stats = await queueService.getQueueStats('video');

      expect(stats).toEqual({
        waiting: 2,
        active: 1,
        completed: 3,
        failed: 0,
        delayed: 1,
      });
    });

    it('should return channel queue statistics', async () => {
      mockChannelQueue.getWaiting.mockResolvedValue([1]);
      mockChannelQueue.getActive.mockResolvedValue([]);
      mockChannelQueue.getCompleted.mockResolvedValue([1, 2]);
      mockChannelQueue.getFailed.mockResolvedValue([1]);
      mockChannelQueue.getDelayed.mockResolvedValue([]);

      const stats = await queueService.getQueueStats('channel');

      expect(stats).toEqual({
        waiting: 1,
        active: 0,
        completed: 2,
        failed: 1,
        delayed: 0,
      });
    });
  });

  describe('queue management', () => {
    it('should pause video queue', async () => {
      await queueService.pauseQueue('video');
      expect(mockVideoQueue.pause).toHaveBeenCalled();
    });

    it('should resume channel queue', async () => {
      await queueService.resumeQueue('channel');
      expect(mockChannelQueue.resume).toHaveBeenCalled();
    });

    it('should clean completed jobs from video queue', async () => {
      await queueService.cleanQueue('video', 5000, 'completed');
      expect(mockVideoQueue.clean).toHaveBeenCalledWith(5000, 'completed');
    });

    it('should clean both completed and failed jobs when no status specified', async () => {
      await queueService.cleanQueue('channel', 3000);
      expect(mockChannelQueue.clean).toHaveBeenCalledWith(3000, 'completed');
      expect(mockChannelQueue.clean).toHaveBeenCalledWith(3000, 'failed');
    });
  });

  describe('removeJob', () => {
    it('should remove a job when it exists', async () => {
      const mockJob = { remove: jest.fn() };
      mockVideoQueue.getJob.mockResolvedValue(mockJob);

      await queueService.removeJob('job-1', 'video');

      expect(mockVideoQueue.getJob).toHaveBeenCalledWith('job-1');
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should handle non-existent job gracefully', async () => {
      mockVideoQueue.getJob.mockResolvedValue(null);

      await expect(queueService.removeJob('non-existent', 'video')).resolves.not.toThrow();
    });
  });

  describe('retryFailedJobs', () => {
    it('should retry all failed jobs in video queue', async () => {
      const mockFailedJob1 = { retry: jest.fn() };
      const mockFailedJob2 = { retry: jest.fn() };
      mockVideoQueue.getFailed.mockResolvedValue([mockFailedJob1, mockFailedJob2]);

      await queueService.retryFailedJobs('video');

      expect(mockFailedJob1.retry).toHaveBeenCalled();
      expect(mockFailedJob2.retry).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close both queues', async () => {
      await queueService.close();

      expect(mockVideoQueue.close).toHaveBeenCalled();
      expect(mockChannelQueue.close).toHaveBeenCalled();
    });
  });
});