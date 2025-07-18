import { YouTubeDataService } from '../YouTubeDataService';
import { google } from 'googleapis';

// Mock the googleapis module
jest.mock('googleapis');
const mockGoogle = google as jest.Mocked<typeof google>;

describe('YouTubeDataService', () => {
  let service: YouTubeDataService;
  let mockYouTube: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock YouTube API instance
    mockYouTube = {
      channels: {
        list: jest.fn()
      },
      playlistItems: {
        list: jest.fn()
      },
      videos: {
        list: jest.fn()
      }
    };

    // Mock google.youtube to return our mock instance
    mockGoogle.youtube.mockReturnValue(mockYouTube);

    // Create service instance
    service = new YouTubeDataService('test-api-key');
  });

  describe('validateChannel', () => {
    it('should successfully validate an existing channel', async () => {
      const mockChannelResponse = {
        data: {
          items: [{
            id: 'UC123456789',
            snippet: {
              title: 'Test Channel',
              description: 'Test channel description',
              thumbnails: {
                default: {
                  url: 'https://example.com/thumbnail.jpg'
                }
              }
            },
            statistics: {
              videoCount: '100'
            }
          }]
        }
      };

      mockYouTube.channels.list.mockResolvedValue(mockChannelResponse);

      const result = await service.validateChannel('UC123456789');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'UC123456789',
        title: 'Test Channel',
        description: 'Test channel description',
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        videoCount: 100
      });

      expect(mockYouTube.channels.list).toHaveBeenCalledWith({
        part: ['snippet', 'statistics'],
        id: ['UC123456789']
      });
    });

    it('should return error for non-existent channel', async () => {
      const mockChannelResponse = {
        data: {
          items: []
        }
      };

      mockYouTube.channels.list.mockResolvedValue(mockChannelResponse);

      const result = await service.validateChannel('INVALID_CHANNEL');

      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        code: 404,
        message: 'Channel not found or not accessible'
      });
    });

    it('should handle API errors with retry logic', async () => {
      const apiError = {
        response: {
          data: {
            error: {
              code: 500,
              message: 'Internal server error'
            }
          }
        }
      };

      mockYouTube.channels.list
        .mockRejectedValueOnce(apiError)
        .mockRejectedValueOnce(apiError)
        .mockResolvedValue({
          data: {
            items: [{
              id: 'UC123456789',
              snippet: {
                title: 'Test Channel',
                description: 'Test description'
              },
              statistics: {
                videoCount: '50'
              }
            }]
          }
        });

      const result = await service.validateChannel('UC123456789');

      expect(result.success).toBe(true);
      expect(mockYouTube.channels.list).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const apiError = {
        response: {
          data: {
            error: {
              code: 500,
              message: 'Internal server error'
            }
          }
        }
      };

      mockYouTube.channels.list.mockRejectedValue(apiError);

      const result = await service.validateChannel('UC123456789');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(500);
      expect(mockYouTube.channels.list).toHaveBeenCalledTimes(4); // Initial + 3 retries
    }, 10000);
  });

  describe('getChannelVideos', () => {
    it('should successfully retrieve channel videos', async () => {
      const mockChannelResponse = {
        data: {
          items: [{
            contentDetails: {
              relatedPlaylists: {
                uploads: 'UU123456789'
              }
            }
          }]
        }
      };

      const mockPlaylistResponse = {
        data: {
          items: [{
            snippet: {
              resourceId: {
                videoId: 'video123'
              }
            }
          }],
          nextPageToken: undefined
        }
      };

      const mockVideosResponse = {
        data: {
          items: [{
            id: 'video123',
            snippet: {
              title: 'Test Video',
              description: 'Test video description',
              publishedAt: '2023-01-01T00:00:00Z',
              channelId: 'UC123456789',
              thumbnails: {
                default: {
                  url: 'https://example.com/video-thumb.jpg'
                }
              }
            },
            contentDetails: {
              duration: 'PT10M30S'
            }
          }]
        }
      };

      mockYouTube.channels.list.mockResolvedValue(mockChannelResponse);
      mockYouTube.playlistItems.list.mockResolvedValue(mockPlaylistResponse);
      mockYouTube.videos.list.mockResolvedValue(mockVideosResponse);

      const result = await service.getChannelVideos('UC123456789');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toEqual({
        id: 'video123',
        title: 'Test Video',
        description: 'Test video description',
        publishedAt: '2023-01-01T00:00:00Z',
        duration: 'PT10M30S',
        thumbnailUrl: 'https://example.com/video-thumb.jpg',
        channelId: 'UC123456789'
      });
    });

    it('should handle pagination correctly', async () => {
      const mockChannelResponse = {
        data: {
          items: [{
            contentDetails: {
              relatedPlaylists: {
                uploads: 'UU123456789'
              }
            }
          }]
        }
      };

      const mockPlaylistResponse1 = {
        data: {
          items: [{
            snippet: {
              resourceId: {
                videoId: 'video1'
              }
            }
          }],
          nextPageToken: 'page2'
        }
      };

      const mockPlaylistResponse2 = {
        data: {
          items: [{
            snippet: {
              resourceId: {
                videoId: 'video2'
              }
            }
          }],
          nextPageToken: undefined
        }
      };

      const mockVideosResponse1 = {
        data: {
          items: [{
            id: 'video1',
            snippet: {
              title: 'Video 1',
              description: '',
              publishedAt: '2023-01-01T00:00:00Z',
              channelId: 'UC123456789'
            },
            contentDetails: {
              duration: 'PT5M'
            }
          }]
        }
      };

      const mockVideosResponse2 = {
        data: {
          items: [{
            id: 'video2',
            snippet: {
              title: 'Video 2',
              description: '',
              publishedAt: '2023-01-02T00:00:00Z',
              channelId: 'UC123456789'
            },
            contentDetails: {
              duration: 'PT8M'
            }
          }]
        }
      };

      mockYouTube.channels.list.mockResolvedValue(mockChannelResponse);
      mockYouTube.playlistItems.list
        .mockResolvedValueOnce(mockPlaylistResponse1)
        .mockResolvedValueOnce(mockPlaylistResponse2);
      mockYouTube.videos.list
        .mockResolvedValueOnce(mockVideosResponse1)
        .mockResolvedValueOnce(mockVideosResponse2);

      const result = await service.getChannelVideos('UC123456789');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockYouTube.playlistItems.list).toHaveBeenCalledTimes(2);
      expect(mockYouTube.videos.list).toHaveBeenCalledTimes(2);
    });

    it('should return error for channel without uploads playlist', async () => {
      const mockChannelResponse = {
        data: {
          items: [{
            contentDetails: {
              relatedPlaylists: {}
            }
          }]
        }
      };

      mockYouTube.channels.list.mockResolvedValue(mockChannelResponse);

      const result = await service.getChannelVideos('UC123456789');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Channel uploads playlist not found');
    });
  });

  describe('rate limiting', () => {
    it('should apply rate limiting between requests', async () => {
      const mockChannelResponse = {
        data: {
          items: [{
            id: 'UC123456789',
            snippet: {
              title: 'Test Channel',
              description: ''
            },
            statistics: {
              videoCount: '10'
            }
          }]
        }
      };

      mockYouTube.channels.list.mockResolvedValue(mockChannelResponse);

      const startTime = Date.now();
      
      // Make sequential requests to test rate limiting
      await service.validateChannel('UC123456789');
      await service.validateChannel('UC123456789');
      await service.validateChannel('UC123456789');

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least 200ms due to rate limiting (100ms between requests)
      expect(duration).toBeGreaterThan(150);
    });
  });

  describe('error handling', () => {
    it('should not retry non-retryable errors', async () => {
      const apiError = {
        response: {
          data: {
            error: {
              code: 404,
              message: 'Not found'
            }
          }
        }
      };

      mockYouTube.channels.list.mockRejectedValue(apiError);

      const result = await service.validateChannel('INVALID');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(404);
      expect(mockYouTube.channels.list).toHaveBeenCalledTimes(1); // No retries
    }, 10000);

    it('should retry on rate limit errors', async () => {
      const rateLimitError = {
        response: {
          data: {
            error: {
              code: 429,
              message: 'Rate limit exceeded'
            }
          }
        }
      };

      const successResponse = {
        data: {
          items: [{
            id: 'UC123456789',
            snippet: {
              title: 'Test Channel',
              description: ''
            },
            statistics: {
              videoCount: '10'
            }
          }]
        }
      };

      mockYouTube.channels.list
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(successResponse);

      const result = await service.validateChannel('UC123456789');

      expect(result.success).toBe(true);
      expect(mockYouTube.channels.list).toHaveBeenCalledTimes(2);
    });
  });
});