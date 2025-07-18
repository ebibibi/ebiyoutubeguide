import { Video, ValidationError, CreateVideoData, UpdateVideoData, IVideo } from '../Video';

describe('Video Model', () => {
  const validCreateData: CreateVideoData = {
    videoId: 'dQw4w9WgXcQ',
    channelId: 'UCrAOnWg4S-XDI9M_vhLw8Ag',
    title: 'Test Video Title',
    description: 'A test video description',
    duration: 180, // 3 minutes
    publishedAt: new Date('2023-01-01'),
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    hasSubtitles: true,
    subtitleLanguage: 'en'
  };

  const validVideoData: IVideo = {
    id: 'vid_123456789_abc123def',
    videoId: 'dQw4w9WgXcQ',
    channelId: 'UCrAOnWg4S-XDI9M_vhLw8Ag',
    title: 'Test Video Title',
    description: 'A test video description',
    duration: 180,
    publishedAt: new Date('2023-01-01'),
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    hasSubtitles: true,
    subtitleLanguage: 'en',
    indexingStatus: 'completed',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  describe('Video.create()', () => {
    it('should create a valid video with required fields', () => {
      const minimalData: CreateVideoData = {
        videoId: 'dQw4w9WgXcQ',
        channelId: 'UCrAOnWg4S-XDI9M_vhLw8Ag',
        title: 'Test Video',
        duration: 120,
        publishedAt: new Date('2023-01-01')
      };

      const video = Video.create(minimalData);

      expect(video.videoId).toBe(minimalData.videoId);
      expect(video.channelId).toBe(minimalData.channelId);
      expect(video.title).toBe(minimalData.title);
      expect(video.duration).toBe(minimalData.duration);
      expect(video.publishedAt).toBe(minimalData.publishedAt);
      expect(video.hasSubtitles).toBe(false);
      expect(video.indexingStatus).toBe('pending');
      expect(video.id).toMatch(/^vid_\d+_[a-z0-9]+$/);
      expect(video.createdAt).toBeInstanceOf(Date);
      expect(video.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a video with all optional fields', () => {
      const video = Video.create(validCreateData);

      expect(video.videoId).toBe(validCreateData.videoId);
      expect(video.channelId).toBe(validCreateData.channelId);
      expect(video.title).toBe(validCreateData.title);
      expect(video.description).toBe(validCreateData.description);
      expect(video.duration).toBe(validCreateData.duration);
      expect(video.publishedAt).toBe(validCreateData.publishedAt);
      expect(video.thumbnailUrl).toBe(validCreateData.thumbnailUrl);
      expect(video.hasSubtitles).toBe(validCreateData.hasSubtitles);
      expect(video.subtitleLanguage).toBe(validCreateData.subtitleLanguage);
    });
