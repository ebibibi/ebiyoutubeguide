import { Job } from 'bull';
import { QueueService, JobData, JobProgress, JobResult } from './queue';

export class WorkerService {
  private static instance: WorkerService;
  private queueService: QueueService;

  private constructor() {
    this.queueService = QueueService.getInstance();
    this.setupWorkers();
  }

  public static getInstance(): WorkerService {
    if (!WorkerService.instance) {
      WorkerService.instance = new WorkerService();
    }
    return WorkerService.instance;
  }

  private setupWorkers(): void {
    // Video indexing worker
    this.queueService.getVideoIndexingQueue().process('index-video', 5, async (job: Job<JobData>) => {
      return this.processVideoIndexing(job);
    });

    // Channel indexing worker
    this.queueService.getChannelIndexingQueue().process('index-channel', 2, async (job: Job<JobData>) => {
      return this.processChannelIndexing(job);
    });
  }

  private async processVideoIndexing(job: Job<JobData>): Promise<JobResult> {
    const { videoId, channelId, metadata } = job.data;
    
    try {
      // Update progress
      await this.updateJobProgress(job, {
        percentage: 0,
        message: 'Starting video indexing',
        currentStep: 'initialization',
        totalSteps: 4,
        completedSteps: 0,
      });

      // Step 1: Validate video
      await this.updateJobProgress(job, {
        percentage: 25,
        message: 'Validating video',
        currentStep: 'validation',
        totalSteps: 4,
        completedSteps: 1,
      });

      if (!videoId) {
        throw new Error('Video ID is required');
      }

      // Step 2: Extract subtitles (placeholder - will be implemented in task 5.2)
      await this.updateJobProgress(job, {
        percentage: 50,
        message: 'Extracting subtitles',
        currentStep: 'subtitle_extraction',
        totalSteps: 4,
        completedSteps: 2,
      });

      // Simulate processing time
      await this.delay(1000);

      // Step 3: Process and store data (placeholder)
      await this.updateJobProgress(job, {
        percentage: 75,
        message: 'Processing and storing data',
        currentStep: 'data_processing',
        totalSteps: 4,
        completedSteps: 3,
      });

      await this.delay(500);

      // Step 4: Complete
      await this.updateJobProgress(job, {
        percentage: 100,
        message: 'Video indexing completed',
        currentStep: 'completed',
        totalSteps: 4,
        completedSteps: 4,
      });

      return {
        success: true,
        message: `Successfully indexed video ${videoId}`,
        data: {
          videoId,
          channelId,
          processedAt: new Date().toISOString(),
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        success: false,
        message: `Failed to index video ${videoId}: ${errorMessage}`,
        errors: [errorMessage],
      };
    }
  }

  private async processChannelIndexing(job: Job<JobData>): Promise<JobResult> {
    const { channelId, metadata } = job.data;
    
    try {
      // Update progress
      await this.updateJobProgress(job, {
        percentage: 0,
        message: 'Starting channel indexing',
        currentStep: 'initialization',
        totalSteps: 5,
        completedSteps: 0,
      });

      // Step 1: Validate channel
      await this.updateJobProgress(job, {
        percentage: 20,
        message: 'Validating channel',
        currentStep: 'validation',
        totalSteps: 5,
        completedSteps: 1,
      });

      if (!channelId) {
        throw new Error('Channel ID is required');
      }

      // Step 2: Fetch channel videos (placeholder)
      await this.updateJobProgress(job, {
        percentage: 40,
        message: 'Fetching channel videos',
        currentStep: 'video_fetching',
        totalSteps: 5,
        completedSteps: 2,
      });

      await this.delay(2000);

      // Step 3: Queue video indexing jobs (placeholder)
      await this.updateJobProgress(job, {
        percentage: 60,
        message: 'Queuing video indexing jobs',
        currentStep: 'job_queuing',
        totalSteps: 5,
        completedSteps: 3,
      });

      await this.delay(1000);

      // Step 4: Update channel status (placeholder)
      await this.updateJobProgress(job, {
        percentage: 80,
        message: 'Updating channel status',
        currentStep: 'status_update',
        totalSteps: 5,
        completedSteps: 4,
      });

      await this.delay(500);

      // Step 5: Complete
      await this.updateJobProgress(job, {
        percentage: 100,
        message: 'Channel indexing completed',
        currentStep: 'completed',
        totalSteps: 5,
        completedSteps: 5,
      });

      return {
        success: true,
        message: `Successfully started indexing for channel ${channelId}`,
        data: {
          channelId,
          processedAt: new Date().toISOString(),
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        success: false,
        message: `Failed to index channel ${channelId}: ${errorMessage}`,
        errors: [errorMessage],
      };
    }
  }

  private async updateJobProgress(job: Job<JobData>, progress: JobProgress): Promise<void> {
    await job.progress(progress);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async shutdown(): Promise<void> {
    await this.queueService.close();
  }
}