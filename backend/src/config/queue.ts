import Bull from 'bull';
import { config } from './index';

export interface JobProgress {
  total: number;
  completed: number;
  percentage: number;
  currentStep: string;
  message?: string;
}

export interface JobResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
}

// Queue configuration
const redisConfig: any = {
  host: config.redis.host,
  port: config.redis.port,
};

if (config.redis.password) {
  redisConfig.password = config.redis.password;
}

const queueConfig = {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 50,     // Keep last 50 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
};

// Create queues
export const videoIndexingQueue = new Bull('video-indexing', queueConfig);
export const channelIndexingQueue = new Bull('channel-indexing', queueConfig);

// Queue event handlers for logging and monitoring
const setupQueueEventHandlers = (queue: Bull.Queue, queueName: string) => {
  queue.on('completed', (job, result) => {
    console.log(`${queueName} job ${job.id} completed:`, result);
  });

  queue.on('failed', (job, err) => {
    console.error(`${queueName} job ${job.id} failed:`, err.message);
  });

  queue.on('progress', (job, progress) => {
    console.log(`${queueName} job ${job.id} progress:`, progress);
  });

  queue.on('stalled', (job) => {
    console.warn(`${queueName} job ${job.id} stalled`);
  });
};

// Setup event handlers
setupQueueEventHandlers(videoIndexingQueue, 'Video Indexing');
setupQueueEventHandlers(channelIndexingQueue, 'Channel Indexing');

export { queueConfig };