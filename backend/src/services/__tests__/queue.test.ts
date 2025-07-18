import Bull from 'bull';
import { QueueService, JobData, JobProgress, JobResult } from '../queue';
import { config } from '../../config';

// Mock Bull
jest.mock('bull');

describe('QueueService', () => {
  let mockVideoQueue: any;
  let mockChannelQueue: any;
  let queueService: QueueService;

  beforeEach(() => {
    mockVideoQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
      getWaiting: jest.fn(),
      getActive: jest.fn(),
      getCompleted: jest.fn(),
      getFailed: jest.fn(),
      getDelayed: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      clean: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
      process: jest.fn(),
    };

    mockChannelQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
      getWaiting: jest.fn(),
      getActive: jest.fn(),
      getCompleted: jest.fn(),
      getFailed: jest.fn(),
      getDelayed: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      clean: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
      process: jest.fn(),
    };

    (Bull as jest.MockedClass<typeof Bull>).mockImplementation((name: string) => {
      if (name === 'video-indexing') {
        return mockVideoQueue;
      } else if (name === 'channel-indexing') {
        return mockChannelQueue;
      }
      throw new Error(`Unexpected queue name: ${name}`);
    });

    queueService = QueueService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (QueueService as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = QueueService.getInstance();
      const instance2 = QueueService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should create queues with correct configuration', () => {
      expect(Bull).toHaveBeenCalledWith('video-indexing', {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
        },
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 100,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      expect(Bull).toHaveBeenCalledWith('channel-indexing', {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
        },
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: 50,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      });
    });

    it('should setup event handlers for both queues', () => {
      expect(mockVideoQueue.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockVideoQueue.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockVideoQueue.on).toHaveBeenCalledWith('progress', expect.any(Function));

      expect(mockChannelQueue.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockChannelQueue.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockChannelQueue.on).toHaveBeenCalledWith('progress', expect.any(Function));
    });
  });

  describe('addVideoIndexingJob', () => {
    it('should add a video indexing job with default options', async () => {
      const mockJob = { id: '123' };
      mockVideoQueue.add.mockResolvedValue(mockJob);

      const jobData: JobData = {
        channelId: 'test-channel',
        videoId: 'test-video',
      };

      const result = await queueService.addVideoIndexingJob(jobData);

      expect(mockVideoQueue.add).toHaveBeenCalledWith('index-video', jobData, {
        priority: 0,
        delay: 0,
      });
      expect(result).toBe(mockJob);
    });

    it('should add a video indexing job with custom options', async () => {
      const mockJob = { id: '123' };
      mockVideoQueue.add.mockResolvedValue(mockJob);

      const jobData: JobData = {
        channelId: 'test-channel',
        videoId: 'test-video',
        priority: 5,
      };

      const options = { delay: 1000 };

      const result = await queueService.addVideoIndexingJob(jobData, options);

      expect(mockVideoQueue.add).toHaveBeenCalledWith('index-video', jobData, {
        priority: 5,
        delay: 1000,
      });
      expect(result).toBe(mockJob);
    });
  });

  describe('addChannelIndexingJob', () => {
    it('should add a channel indexing job with default options', async () => {
      const mockJob = { id: '456' };
      mockChannelQueue.add.mockResolvedValue(mockJob);

      const jobData: JobData = {
        channelId: 'test-channel',
      };

      const result = await queueService.addChannelIndexingJob(jobData);

      expect(mockChannelQueue.add).toHaveBeenCalledWith('index-channel', jobData, {
        priority: 0,
        delay: 0,
      });
      expect(result).toBe(mockJob);
    });
  });

  describe('getJobStatus', () => {
    it('should get video job status', async () => {
      const mockJob = { id: '123', data: { videoId: 'test-video' } };
      mockVideoQueue.getJob.mockResolvedValue(mockJob);

      const result = await queueService.getJobStatus('123', 'video');

      expect(mockVideoQueue.getJob).toHaveBeenCalledWith('123');
      expect(result).toBe(mockJob);
    });

    it('should get channel job status', async () => {
      const mockJob = { id: '456', data: { channelId: 'test-channel' } };
      mockChannelQueue.getJob.mockResolvedValue(mockJob);

      const result = await queueService.getJobStatus('456', 'channel');

      expect(mockChannelQueue.getJob).toHaveBeenCalledWith('456');
      expect(result).toBe(mockJob);
    });

    it('should return null for non-existent job', async () => {
      mockVideoQueue.getJob.mockResolvedValue(null);

      const result = await queueService.getJobStatus('non-existent', 'video');

      expect(result).toBeNull();
    });
  });

  describe('getQueueStats', () => {
    it('should return video queue statistics', async () => {
      mockVideoQueue.getWaiting.mockResolvedValue([1, 2]);
      mockVideoQueue.getActive.mockResolvedValue([1]);
      mockVideoQueue.getCompleted.mockResolvedValue([1, 2, 3]);
      mockVideoQueue.getFailed.mockResolvedValue([1]);
      mockVideoQueue.getDelayed.mockResolvedValue([]);

      const result = await queueService.getQueueStats('video');

      expect(result).toEqual({
        waiting: 2,
        active: 1,
        completed: 3,
        failed: 1,
        delayed: 0,
      });
    });

    it('should return channel queue statistics', async () => {
      mockChannelQueue.getWaiting.mockResolvedValue([1]);
      mockChannelQueue.getActive.mockResolvedValue([]);
      mockChannelQueue.getCompleted.mockResolvedValue([1, 2]);
      mockChannelQueue.getFailed.mockResolvedValue([]);
      mockChannelQueue.getDelayed.mockResolvedValue([1]);

      const result = await queueService.getQueueStats('channel');

      expect(result).toEqual({
        waiting: 1,
        active: 0,
        completed: 2,
        failed: 0,
        delayed: 1,
      });
    });
  });

  describe('queue management', () => {
    it('should pause video queue', async () => {
      await queueService.pauseQueue('video');
      expect(mockVideoQueue.pause).toHaveBeenCalled();
    });

    it('should resume video queue', async () => {
      await queueService.resumeQueue('video');
      expect(mockVideoQueue.resume).toHaveBeenCalled();
    });

    it('should pause channel queue', async () => {
      await queueService.pauseQueue('channel');
      expect(mockChannelQueue.pause).toHaveBeenCalled();
    });

    it('should resume channel queue', async () => {
      await queueService.resumeQueue('channel');
      expect(mockChannelQueue.resume).toHaveBeenCalled();
    });
  });

  describe('job management', () => {
    it('should remove a video job', async () => {
      const mockJob = { remove: jest.fn() };
      mockVideoQueue.getJob.mockResolvedValue(mockJob);

      await queueService.removeJob('123', 'video');

      expect(mockVideoQueue.getJob).toHaveBeenCalledWith('123');
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should retry failed video jobs', async () => {
      const mockJob1 = { retry: jest.fn() };
      const mockJob2 = { retry: jest.fn() };
      mockVideoQueue.getFailed.mockResolvedValue([mockJob1, mockJob2]);

      await queueService.retryFailedJobs('video');

      expect(mockVideoQueue.getFailed).toHaveBeenCalled();
      expect(mockJob1.retry).toHaveBeenCalled();
      expect(mockJob2.retry).toHaveBeenCalled();
    });

    it('should clean video queue', async () => {
      await queueService.cleanQueue('video', 5000, 'completed');

      expect(mockVideoQueue.clean).toHaveBeenCalledWith(5000, 'completed');
    });

    it('should clean both completed and failed jobs when no status specified', async () => {
      await queueService.cleanQueue('video', 5000);

      expect(mockVideoQueue.clean).toHaveBeenCalledWith(5000, 'completed');
      expect(mockVideoQueue.clean).toHaveBeenCalledWith(5000, 'failed');
    });
  });

  describe('queue access', () => {
    it('should return video indexing queue instance', () => {
      const queue = queueService.getVideoIndexingQueue();
      expect(queue).toBe(mockVideoQueue);
    });

    it('should return channel indexing queue instance', () => {
      const queue = queueService.getChannelIndexingQueue();
      expect(queue).toBe(mockChannelQueue);
    });
  });

  describe('shutdown', () => {
    it('should close both queues', async () => {
      await queueService.close();

      expect(mockVideoQueue.close).toHaveBeenCalled();
      expect(mockChannelQueue.close).toHaveBeenCalled();
    });
  });

  describe('event handlers', () => {
    it('should log completed video jobs', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Get the completed event handler
      const completedHandler = mockVideoQueue.on.mock.calls.find(
        (call: any) => call[0] === 'completed'
      )[1];

      const mockJob = { id: '123' };
      const mockResult: JobResult = { success: true, message: 'Job completed successfully' };

      completedHandler(mockJob, mockResult);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Video indexing job 123 completed:',
        'Job completed successfully'
      );

      consoleSpy.mockRestore();
    });

    it('should log failed video jobs', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Get the failed event handler
      const failedHandler = mockVideoQueue.on.mock.calls.find(
        (call: any) => call[0] === 'failed'
      )[1];

      const mockJob = { id: '123' };
      const mockError = new Error('Job failed');

      failedHandler(mockJob, mockError);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Video indexing job 123 failed:',
        'Job failed'
      );

      consoleSpy.mockRestore();
    });

    it('should log job progress', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Get the progress event handler
      const progressHandler = mockVideoQueue.on.mock.calls.find(
        (call: any) => call[0] === 'progress'
      )[1];

      const mockJob = { id: '123' };
      const mockProgress: JobProgress = { 
        percentage: 50, 
        message: 'Processing video' 
      };

      progressHandler(mockJob, mockProgress);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Video indexing job 123 progress: 50% - Processing video'
      );

      consoleSpy.mockRestore();
    });
  });
});