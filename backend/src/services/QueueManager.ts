import Bull from 'bull';
import { videoIndexingQueue, channelIndexingQueue, JobProgress, JobResult } from '../config/queue';

export interface QueueJobData {
  channelId?: string;
  videoId?: string;
  userId?: string;
  priority?: number;
}

export interface JobStatus {
  id: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
  progress: JobProgress | null;
  result: JobResult | null;
  error: string | null;
  createdAt: Date;
  processedAt: Date | null;
  finishedAt: Date | null;
  attemptsMade: number;
  maxAttempts: number;
}

export class QueueManager {
  /**
   * Add a video indexing job to the queue
   */
  public static async addVideoIndexingJob(
    data: QueueJobData,
    options?: Bull.JobOptions
  ): Promise<Bull.Job> {
    const jobOptions: Bull.JobOptions = {
      priority: data.priority || 0,
      delay: options?.delay || 0,
      ...options,
    };

    return videoIndexingQueue.add('index-video', data, jobOptions);
  }

  /**
   * Add a channel indexing job to the queue
   */
  public static async addChannelIndexingJob(
    data: QueueJobData,
    options?: Bull.JobOptions
  ): Promise<Bull.Job> {
    const jobOptions: Bull.JobOptions = {
      priority: data.priority || 0,
      delay: options?.delay || 0,
      ...options,
    };

    return channelIndexingQueue.add('index-channel', data, jobOptions);
  }

  /**
   * Get job status by ID
   */
  public static async getJobStatus(jobId: string, queueType: 'video' | 'channel'): Promise<JobStatus | null> {
    const queue = queueType === 'video' ? videoIndexingQueue : channelIndexingQueue;
    const job = await queue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress as JobProgress | null;

    return {
      id: job.id.toString(),
      state,
      progress,
      result: job.returnvalue as JobResult | null,
      error: job.failedReason || null,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : null,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts || 1,
    };
  }

  /**
   * Get all jobs for a specific channel
   */
  public static async getChannelJobs(channelId: string): Promise<JobStatus[]> {
    const jobs = await Promise.all([
      videoIndexingQueue.getJobs(['waiting', 'active', 'completed', 'failed']),
      channelIndexingQueue.getJobs(['waiting', 'active', 'completed', 'failed']),
    ]);

    const allJobs = [...jobs[0], ...jobs[1]];
    const channelJobs = allJobs.filter(job => job.data.channelId === channelId);

    const jobStatuses = await Promise.all(
      channelJobs.map(async (job) => {
        const state = await job.getState();
        const progress = job.progress as JobProgress | null;

        return {
          id: job.id.toString(),
          state,
          progress,
          result: job.returnvalue as JobResult | null,
          error: job.failedReason || null,
          createdAt: new Date(job.timestamp),
          processedAt: job.processedOn ? new Date(job.processedOn) : null,
          finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
          attemptsMade: job.attemptsMade,
          maxAttempts: job.opts.attempts || 1,
        };
      })
    );

    return jobStatuses;
  }

  /**
   * Cancel a job
   */
  public static async cancelJob(jobId: string, queueType: 'video' | 'channel'): Promise<boolean> {
    const queue = queueType === 'video' ? videoIndexingQueue : channelIndexingQueue;
    const job = await queue.getJob(jobId);

    if (!job) {
      return false;
    }

    try {
      await job.remove();
      return true;
    } catch (error) {
      console.error('Error canceling job:', error);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  public static async getQueueStats(queueType: 'video' | 'channel') {
    const queue = queueType === 'video' ? videoIndexingQueue : channelIndexingQueue;

    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
      queue.getPaused(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: paused.length,
      total: waiting.length + active.length + completed.length + failed.length + delayed.length + paused.length,
    };
  }

  /**
   * Clean old jobs from queues
   */
  public static async cleanQueues(): Promise<void> {
    const cleanOptions = {
      grace: 1000 * 60 * 60 * 24, // 24 hours
    };

    await Promise.all([
      videoIndexingQueue.clean(1000 * 60 * 60 * 24, 'completed'),
      videoIndexingQueue.clean(1000 * 60 * 60 * 24 * 7, 'failed'), // Keep failed jobs for 7 days
      channelIndexingQueue.clean(1000 * 60 * 60 * 24, 'completed'),
      channelIndexingQueue.clean(1000 * 60 * 60 * 24 * 7, 'failed'),
    ]);
  }

  /**
   * Pause a queue
   */
  public static async pauseQueue(queueType: 'video' | 'channel'): Promise<void> {
    const queue = queueType === 'video' ? videoIndexingQueue : channelIndexingQueue;
    await queue.pause();
  }

  /**
   * Resume a queue
   */
  public static async resumeQueue(queueType: 'video' | 'channel'): Promise<void> {
    const queue = queueType === 'video' ? videoIndexingQueue : channelIndexingQueue;
    await queue.resume();
  }
}