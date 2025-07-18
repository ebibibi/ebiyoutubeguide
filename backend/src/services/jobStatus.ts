import { Job } from 'bull';
import { QueueService, JobData, JobProgress } from './queue';

export interface JobStatusInfo {
  id: string;
  type: 'video' | 'channel';
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
  progress?: JobProgress;
  data: JobData;
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
  failedReason?: string;
  attempts: number;
  maxAttempts: number;
}

export interface QueueStatusSummary {
  video: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  channel: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
}

export class JobStatusService {
  private static instance: JobStatusService;
  private queueService: QueueService;

  private constructor() {
    this.queueService = QueueService.getInstance();
  }

  public static getInstance(): JobStatusService {
    if (!JobStatusService.instance) {
      JobStatusService.instance = new JobStatusService();
    }
    return JobStatusService.instance;
  }

  public async getJobStatus(jobId: string, queueType: 'video' | 'channel'): Promise<JobStatusInfo | null> {
    try {
      const job = await this.queueService.getJobStatus(jobId, queueType);
      
      if (!job) {
        return null;
      }

      return this.mapJobToStatusInfo(job, queueType);
    } catch (error) {
      console.error(`Error getting job status for ${jobId}:`, error);
      return null;
    }
  }

  public async getChannelIndexingStatus(channelId: string): Promise<JobStatusInfo[]> {
    try {
      const channelQueue = this.queueService.getChannelIndexingQueue();
      const videoQueue = this.queueService.getVideoIndexingQueue();

      // Get all jobs for this channel
      const [channelJobs, videoJobs] = await Promise.all([
        this.getJobsByChannelId(channelQueue, channelId),
        this.getJobsByChannelId(videoQueue, channelId),
      ]);

      const channelStatusJobs = channelJobs.map(job => this.mapJobToStatusInfo(job, 'channel'));
      const videoStatusJobs = videoJobs.map(job => this.mapJobToStatusInfo(job, 'video'));

      return [...channelStatusJobs, ...videoStatusJobs];
    } catch (error) {
      console.error(`Error getting channel indexing status for ${channelId}:`, error);
      return [];
    }
  }

  public async getQueueSummary(): Promise<QueueStatusSummary> {
    try {
      const [videoStats, channelStats] = await Promise.all([
        this.queueService.getQueueStats('video'),
        this.queueService.getQueueStats('channel'),
      ]);

      return {
        video: videoStats,
        channel: channelStats,
      };
    } catch (error) {
      console.error('Error getting queue summary:', error);
      return {
        video: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        channel: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      };
    }
  }

  public async getActiveJobs(): Promise<JobStatusInfo[]> {
    try {
      const channelQueue = this.queueService.getChannelIndexingQueue();
      const videoQueue = this.queueService.getVideoIndexingQueue();

      const [activeChannelJobs, activeVideoJobs] = await Promise.all([
        channelQueue.getActive(),
        videoQueue.getActive(),
      ]);

      const channelStatusJobs = activeChannelJobs.map(job => this.mapJobToStatusInfo(job, 'channel'));
      const videoStatusJobs = activeVideoJobs.map(job => this.mapJobToStatusInfo(job, 'video'));

      return [...channelStatusJobs, ...videoStatusJobs];
    } catch (error) {
      console.error('Error getting active jobs:', error);
      return [];
    }
  }

  public async getFailedJobs(): Promise<JobStatusInfo[]> {
    try {
      const channelQueue = this.queueService.getChannelIndexingQueue();
      const videoQueue = this.queueService.getVideoIndexingQueue();

      const [failedChannelJobs, failedVideoJobs] = await Promise.all([
        channelQueue.getFailed(),
        videoQueue.getFailed(),
      ]);

      const channelStatusJobs = failedChannelJobs.map(job => this.mapJobToStatusInfo(job, 'channel'));
      const videoStatusJobs = failedVideoJobs.map(job => this.mapJobToStatusInfo(job, 'video'));

      return [...channelStatusJobs, ...videoStatusJobs];
    } catch (error) {
      console.error('Error getting failed jobs:', error);
      return [];
    }
  }

  public async retryJob(jobId: string, queueType: 'video' | 'channel'): Promise<boolean> {
    try {
      const job = await this.queueService.getJobStatus(jobId, queueType);
      
      if (!job) {
        return false;
      }

      await job.retry();
      return true;
    } catch (error) {
      console.error(`Error retrying job ${jobId}:`, error);
      return false;
    }
  }

  public async removeJob(jobId: string, queueType: 'video' | 'channel'): Promise<boolean> {
    try {
      await this.queueService.removeJob(jobId, queueType);
      return true;
    } catch (error) {
      console.error(`Error removing job ${jobId}:`, error);
      return false;
    }
  }

  private async getJobsByChannelId(queue: any, channelId: string): Promise<Job<JobData>[]> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    const allJobs = [...waiting, ...active, ...completed, ...failed, ...delayed];
    
    return allJobs.filter((job: Job<JobData>) => job.data.channelId === channelId);
  }

  private mapJobToStatusInfo(job: Job<JobData>, type: 'video' | 'channel'): JobStatusInfo {
    let status: JobStatusInfo['status'] = 'waiting';
    
    if (job.finishedOn) {
      status = job.failedReason ? 'failed' : 'completed';
    } else if (job.processedOn) {
      status = 'active';
    } else if (job.opts.delay && job.opts.delay > Date.now()) {
      status = 'delayed';
    }

    return {
      id: job.id?.toString() || '',
      type,
      status,
      progress: job.progress() as JobProgress,
      data: job.data,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      failedReason: job.failedReason,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts || 1,
    };
  }
}