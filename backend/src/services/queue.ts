import Bull, { Queue, Job, JobOptions } from 'bull';
import { config } from '../config';

export interface JobData {
  channelId: string;
  videoId?: string;
  priority?: number;
  metadata?: Record<string, any>;
}

export interface JobProgress {
  percentage: number;
  message: string;
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
}

export interface JobResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
}

export class QueueService {
  private static instance: QueueService;
  private videoIndexingQueue: Queue<JobData>;
  private channelIndexingQueue: Queue<JobData>;

  private constructor() {
    const redisConfig: any = {
      host: config.redis.host,
      port: config.redis.port,
    };

    if (config.redis.password) {
      redisConfig.password = config.redis.password;
    }

    // Create queues with different priorities
    this.videoIndexingQueue = new Bull('video-indexing', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 50, // Keep last 50 completed jobs
        removeOnFail: 100,    // Keep last 100 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.channelIndexingQueue = new Bull('channel-indexing', {
      redis: redisConfig,
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

    this.setupEventHandlers();
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  private setupEventHandlers(): void {
    // Video indexing queue events
    this.videoIndexingQueue.on('completed', (job: Job<JobData>, result: JobResult) => {
      console.log(`Video indexing job ${job.id} completed:`, result.message);
    });

    this.videoIndexingQueue.on('failed', (job: Job<JobData>, err: Error) => {
      console.error(`Video indexing job ${job.id} failed:`, err.message);
    });

    this.videoIndexingQueue.on('progress', (job: Job<JobData>, progress: JobProgress) => {
      console.log(`Video indexing job ${job.id} progress: ${progress.percentage}% - ${progress.message}`);
    });

    // Channel indexing queue events
    this.channelIndexingQueue.on('completed', (job: Job<JobData>, result: JobResult) => {
      console.log(`Channel indexing job ${job.id} completed:`, result.message);
    });

    this.channelIndexingQueue.on('failed', (job: Job<JobData>, err: Error) => {
      console.error(`Channel indexing job ${job.id} failed:`, err.message);
    });

    this.channelIndexingQueue.on('progress', (job: Job<JobData>, progress: JobProgress) => {
      console.log(`Channel indexing job ${job.id} progress: ${progress.percentage}% - ${progress.message}`);
    });
  }

  // Video indexing methods
  public async addVideoIndexingJob(
    jobData: JobData,
    options?: JobOptions
  ): Promise<Job<JobData>> {
    const jobOptions: JobOptions = {
      priority: jobData.priority || 0,
      delay: options?.delay || 0,
      ...options,
    };

    return this.videoIndexingQueue.add('index-video', jobData, jobOptions);
  }

  public async addChannelIndexingJob(
    jobData: JobData,
    options?: JobOptions
  ): Promise<Job<JobData>> {
    const jobOptions: JobOptions = {
      priority: jobData.priority || 0,
      delay: options?.delay || 0,
      ...options,
    };

    return this.channelIndexingQueue.add('index-channel', jobData, jobOptions);
  }

  // Job status and management
  public async getJobStatus(jobId: string, queueType: 'video' | 'channel'): Promise<Job<JobData> | null> {
    const queue = queueType === 'video' ? this.videoIndexingQueue : this.channelIndexingQueue;
    return queue.getJob(jobId);
  }

  public async getQueueStats(queueType: 'video' | 'channel'): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = queueType === 'video' ? this.videoIndexingQueue : this.channelIndexingQueue;
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  public async pauseQueue(queueType: 'video' | 'channel'): Promise<void> {
    const queue = queueType === 'video' ? this.videoIndexingQueue : this.channelIndexingQueue;
    await queue.pause();
  }

  public async resumeQueue(queueType: 'video' | 'channel'): Promise<void> {
    const queue = queueType === 'video' ? this.videoIndexingQueue : this.channelIndexingQueue;
    await queue.resume();
  }

  public async removeJob(jobId: string, queueType: 'video' | 'channel'): Promise<void> {
    const job = await this.getJobStatus(jobId, queueType);
    if (job) {
      await job.remove();
    }
  }

  public async retryFailedJobs(queueType: 'video' | 'channel'): Promise<void> {
    const queue = queueType === 'video' ? this.videoIndexingQueue : this.channelIndexingQueue;
    const failedJobs = await queue.getFailed();
    
    for (const job of failedJobs) {
      await job.retry();
    }
  }

  public async cleanQueue(
    queueType: 'video' | 'channel',
    grace: number = 5000,
    status?: 'completed' | 'failed'
  ): Promise<void> {
    const queue = queueType === 'video' ? this.videoIndexingQueue : this.channelIndexingQueue;
    
    if (status) {
      await queue.clean(grace, status);
    } else {
      await queue.clean(grace, 'completed');
      await queue.clean(grace, 'failed');
    }
  }

  // Getters for queue instances (for worker setup)
  public getVideoIndexingQueue(): Queue<JobData> {
    return this.videoIndexingQueue;
  }

  public getChannelIndexingQueue(): Queue<JobData> {
    return this.channelIndexingQueue;
  }

  // Graceful shutdown
  public async close(): Promise<void> {
    await Promise.all([
      this.videoIndexingQueue.close(),
      this.channelIndexingQueue.close(),
    ]);
  }
}