import { google, youtube_v3 } from 'googleapis';
import { 
  YouTubeChannel, 
  YouTubeVideo, 
  YouTubeApiError, 
  YouTubeApiResponse,
  RateLimitConfig 
} from '../types/youtube';

export class YouTubeDataService {
  private youtube: youtube_v3.Youtube;
  private rateLimitConfig: RateLimitConfig;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private resetTime: number = Date.now() + 60000; // Reset every minute

  constructor(apiKey: string, rateLimitConfig?: Partial<RateLimitConfig>) {
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });

    this.rateLimitConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      ...rateLimitConfig
    };
  }

  /**
   * Validates if a YouTube channel exists and is accessible
   */
  async validateChannel(channelId: string): Promise<YouTubeApiResponse<YouTubeChannel>> {
    return this.executeWithRetry(async () => {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: [channelId]
      });

      if (!response.data.items || response.data.items.length === 0) {
        return {
          success: false,
          error: {
            code: 404,
            message: 'Channel not found or not accessible'
          }
        };
      }

      const channel = response.data.items[0];
      if (!channel || !channel.snippet || !channel.statistics) {
        return {
          success: false,
          error: {
            code: 500,
            message: 'Invalid channel data received from API'
          }
        };
      }

      const snippet = channel.snippet;
      const statistics = channel.statistics;

      return {
        success: true,
        data: {
          id: channel.id!,
          title: snippet.title!,
          description: snippet.description || '',
          thumbnailUrl: snippet.thumbnails?.default?.url || undefined,
          videoCount: parseInt(statistics.videoCount || '0', 10)
        }
      };
    });
  }

  /**
   * Retrieves all public videos from a YouTube channel
   */
  async getChannelVideos(channelId: string): Promise<YouTubeApiResponse<YouTubeVideo[]>> {
    return this.executeWithRetry(async () => {
      const videos: YouTubeVideo[] = [];
      let nextPageToken: string | undefined;

      do {
        // First, get the uploads playlist ID
        const channelResponse = await this.youtube.channels.list({
          part: ['contentDetails'],
          id: [channelId]
        });

        if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
          return {
            success: false,
            error: {
              code: 404,
              message: 'Channel not found'
            }
          };
        }

        const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        
        if (!uploadsPlaylistId) {
          return {
            success: false,
            error: {
              code: 404,
              message: 'Channel uploads playlist not found'
            }
          };
        }

        // Get videos from the uploads playlist
        const playlistParams: any = {
          part: ['snippet'],
          playlistId: uploadsPlaylistId,
          maxResults: 50
        };
        
        if (nextPageToken) {
          playlistParams.pageToken = nextPageToken;
        }

        const playlistResponse = await this.youtube.playlistItems.list(playlistParams);

        if (playlistResponse.data.items) {
          const videoIds = playlistResponse.data.items
            .map((item: any) => item.snippet?.resourceId?.videoId)
            .filter(Boolean) as string[];

          // Get detailed video information
          const videosResponse = await this.youtube.videos.list({
            part: ['snippet', 'contentDetails'],
            id: videoIds
          });

          if (videosResponse.data.items) {
            for (const video of videosResponse.data.items) {
              if (!video.snippet || !video.contentDetails) continue;
              
              const snippet = video.snippet;
              const contentDetails = video.contentDetails;

              videos.push({
                id: video.id!,
                title: snippet.title!,
                description: snippet.description || '',
                publishedAt: snippet.publishedAt!,
                duration: contentDetails.duration!,
                thumbnailUrl: snippet.thumbnails?.default?.url || undefined,
                channelId: snippet.channelId!
              });
            }
          }
        }

        nextPageToken = playlistResponse.data.nextPageToken || undefined;
      } while (nextPageToken);

      return {
        success: true,
        data: videos
      };
    });
  }

  /**
   * Executes a function with exponential backoff retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<YouTubeApiResponse<T>>
  ): Promise<YouTubeApiResponse<T>> {
    let lastError: YouTubeApiError | undefined;

    for (let attempt = 0; attempt <= this.rateLimitConfig.maxRetries; attempt++) {
      try {
        // Apply rate limiting
        await this.applyRateLimit();

        const result = await operation();
        
        // If successful or non-retryable error, return immediately
        if (result.success || !this.isRetryableError(result.error)) {
          return result;
        }

        lastError = result.error;

        // Don't retry on the last attempt
        if (attempt === this.rateLimitConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.rateLimitConfig.baseDelay * Math.pow(2, attempt),
          this.rateLimitConfig.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;

        await this.sleep(jitteredDelay);

      } catch (error: any) {
        lastError = this.parseError(error);

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          break;
        }

        // Don't retry on the last attempt
        if (attempt === this.rateLimitConfig.maxRetries) {
          break;
        }

        // For quota exceeded errors, wait longer
        if (error.code === 403 && error.message?.includes('quota')) {
          await this.sleep(this.rateLimitConfig.maxDelay);
        } else {
          const delay = Math.min(
            this.rateLimitConfig.baseDelay * Math.pow(2, attempt),
            this.rateLimitConfig.maxDelay
          );
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError || {
        code: 500,
        message: 'Unknown error occurred'
      }
    };
  }

  /**
   * Applies rate limiting to prevent exceeding API quotas
   */
  private async applyRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset counter every minute
    if (now > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = now + 60000;
    }

    // Limit to 100 requests per minute (conservative limit)
    if (this.requestCount >= 100) {
      const waitTime = this.resetTime - now;
      if (waitTime > 0) {
        await this.sleep(waitTime);
        this.requestCount = 0;
        this.resetTime = Date.now() + 60000;
      }
    }

    // Ensure minimum delay between requests (100ms)
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < 100) {
      await this.sleep(100 - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Determines if an error is retryable
   */
  private isRetryableError(error?: YouTubeApiError): boolean {
    if (!error) return false;

    // Retry on rate limit, server errors, and temporary failures
    return error.code === 429 || // Too Many Requests
           error.code === 500 || // Internal Server Error
           error.code === 502 || // Bad Gateway
           error.code === 503 || // Service Unavailable
           error.code === 504;   // Gateway Timeout
  }

  /**
   * Parses error from YouTube API response
   */
  private parseError(error: any): YouTubeApiError {
    if (error.response?.data?.error) {
      return {
        code: error.response.data.error.code || 500,
        message: error.response.data.error.message || 'Unknown API error',
        errors: error.response.data.error.errors
      };
    }

    return {
      code: error.code || 500,
      message: error.message || 'Unknown error occurred'
    };
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}