import { QueueManager } from '../QueueManager';
import { videoIndexingQueue, channelIndexingQueue } from '../../config/queue';

// Mock Bull queue
jest.mock('../../config/queue', () => ({
  videoIndexingQueue: {
    add: jest.fn(),
    getJob: jest.fn(),
    getJobs: jest.fn(),
    getWaiting: jest.fn(),
    getActive: jest.fn(),
    getCompleted: jest.fn(),
    getFailed: jest.fn(),
    getDelayed: jest.fn(),
    getPaused: jest.fn(),
    clean: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
  },
  channelIndexingQueue: {
    add: jest.fn(),
    getJob: jest.fn(),
    getJobs: jest.fn(),
    getWaiting: jest.fn(),
    getActive: jest.fn(),
    getCompleted: jest.fn(),
    getFailed: jest.fn(),
    getDelayed: jest.fn(),
    getPaused: jest.fn(),
    clean: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
  },
}));

describe('QueueManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addVideoIndexingJob', () => {
    it('should add a video indexing job with default options', async () => {
      const mockJob = { id: '123' };
      (videoIndexingQueue.add as jest.Mock).mockResolvedValue(mockJob);

      const data = { videoId: 'test-video-id', channelId: 'test-channel-id' };
      const result = await QueueManager.addVideoIndexingJob(data);

      expect(videoIndexingQueue.add).toHaveBeenCalledWith('index-video', data, {
        priority: 0,
        delay: 0,
      });
      expect(result).toBe(mockJob);
    });

    it('should add a video indexing job with custom options', async () => {
      const mockJob = { id: '123' };
      (videoIndexingQueue.add as jest.Mock).mockResolvedValue(mockJob);

      const data = { videoId: 'test-video-id', channelId: 'test-channel-id', priority: 5 };
      const options = { delay: 1000 };
      const result = await QueueManager.addVideoIndexingJob(data, options);

      expect(videoIndexingQueue.add).toHaveBeenCalledWith('index-video', data, {
        priority: 5,
        delay: 1000,
      });
      expect(result).toBe(mockJob);
    });
  });

  describe('addChannelIndexingJob', () => {
    it('should add a channel indexing job with default options', async () => {
      const mockJob = { id: '456' };
      (channelIndexingQueue.add as jest.Mock).mockResolvedValue(mockJob);

      const data = { channelId: 'test-channel-id' };
      const result = await QueueManager.addChannelIndexingJob(data);

      expect(channelIndexingQueue.add).toHaveBeenCalledWith('index-channel', data, {
        priority: 0,
        delay: 0,
      });
      expect(result).toBe(mockJob);
    });
  });

  describe('getJobStatus', () => {
    it('should return job status for existing video job', async () => {
      const mockJob = {
        id: '123',
        timestamp: Date.now(),
        processedOn: Date.now(),
        finishedOn: Date.now(),
        attemptsMade: 1,
        opts: { attempts: 3 },
        progress: { total: 100, completed: 50, percentage: 50, currentStep: 'processing' },
        returnvalue: { success: true, message: 'Job completed' },
        failedReason: null,
        getState: jest.fn().mockResolvedValue('active'),
      };

      (videoIndexingQueue.getJob as jest.Mock).mockResolvedValue(mockJob);

      const result = await QueueManager.getJobStatus('123', 'video');

      expect(videoIndexingQueue.getJob).toHaveBeenCalledWith('123');
      expect(result).toMatchObject({
        id: '123',
        state: 'active',
        progress: { total: 100, completed: 50, percentage: 50, currentStep: 'processing' },
        result: { success: true, message: 'Job completed' },
        error: null,
        attemptsMade: 1,
        maxAttempts: 3,
      });
    });

    it('should return null for non-existent job', async () => {
      (videoIndexingQueue.getJob as jest.Mock).mockResolvedValue(null);

      const result = await QueueManager.getJobStatus('non-existent', 'video');

      expect(result).toBeNull();
    });
  });

  describe('getChannelJobs', () => {
    it('should return jobs for a specific channel', async () => {
      const mockVideoJobs = [
        {
          id: '1',
          data: { channelId: 'test-channel', videoId: 'video1' },
          timestamp: Date.now(),
          processedOn: null,
          finishedOn: null,
          attemptsMade: 0,
          opts: { attempts: 3 },
          progress: null,
          returnvalue: null,
          failedReason: null,
          getState: jest.fn().mockResolvedValue('waiting'),
        },
      ];

      const mockChannelJobs = [
        {
          id: '2',
          data: { channelId: 'test-channel' },
          timestamp: Date.now(),
          processedOn: null,
          finishedOn: null,
          attemptsMade: 0,
          opts: { attempts: 3 },
          progress: null,
          returnvalue: null,
          failedReason: null,
          getState: jest.fn().mockResolvedValue('waiting'),
        },
      ];

      (videoIndexingQueue.getJobs as jest.Mock).mockResolvedValue(mockVideoJobs);
      (channelIndexingQueue.getJobs as jest.Mock).mockResolvedValue(mockChannelJobs);

      const result = await QueueManager.getChannelJobs('test-channel');

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('1');
      expect(result[1]?.id).toBe('2');
    });
  });

  describe('cancelJob', () => {
    it('should cancel an existing job', async () => {
      const mockJob = {
        remove: jest.fn().mockResolvedValue(undefined),
      };

      (videoIndexingQueue.getJob as jest.Mock).mockResolvedValue(mockJob);

      const result = await QueueManager.cancelJob('123', 'video');

      expect(videoIndexingQueue.getJob).toHaveBeenCalledWith('123');
      expect(mockJob.remove).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false for non-existent job', async () => {
      (videoIndexingQueue.getJob as jest.Mock).mockResolvedValue(null);

      const result = await QueueManager.cancelJob('non-existent', 'video');

      expect(result).toBe(false);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      (videoIndexingQueue.getWaiting as jest.Mock).mockResolvedValue([1, 2]);
      (videoIndexingQueue.getActive as jest.Mock).mockResolvedValue([1]);
      (videoIndexingQueue.getCompleted as jest.Mock).mockResolvedValue([1, 2, 3]);
      (videoIndexingQueue.getFailed as jest.Mock).mockResolvedValue([1]);
      (videoIndexingQueue.getDelayed as jest.Mock).mockResolvedValue([]);
      (videoIndexingQueue.getPaused as jest.Mock).mockResolvedValue([]);

      const result = await QueueManager.getQueueStats('video');

      expect(result).toEqual({
        waiting: 2,
        active: 1,
        completed: 3,
        failed: 1,
        delayed: 0,
        paused: 0,
        total: 7,
      });
    });
  });

  describe('cleanQueues', () => {
    it('should clean old jobs from both queues', async () => {
      (videoIndexingQueue.clean as jest.Mock).mockResolvedValue(undefined);
      (channelIndexingQueue.clean as jest.Mock).mockResolvedValue(undefined);

      await QueueManager.cleanQueues();

      expect(videoIndexingQueue.clean).toHaveBeenCalledTimes(2);
      expect(channelIndexingQueue.clean).toHaveBeenCalledTimes(2);
    });
  });

  describe('pauseQueue and resumeQueue', () => {
    it('should pause and resume video queue', async () => {
      (videoIndexingQueue.pause as jest.Mock).mockResolvedValue(undefined);
      (videoIndexingQueue.resume as jest.Mock).mockResolvedValue(undefined);

      await QueueManager.pauseQueue('video');
      await QueueManager.resumeQueue('video');

      expect(videoIndexingQueue.pause).toHaveBeenCalled();
      expect(videoIndexingQueue.resume).toHaveBeenCalled();
    });
  });
});