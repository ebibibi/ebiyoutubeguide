import { Video, ValidationError, CreateVideoData, IVideo } from '../Video';

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
    // Validation tests for create
    it('should throw error for missing videoId', () => {
      const invalidData = { ...validCreateData };
      delete (invalidData as any).videoId;

      expect(() => Video.create(invalidData)).toThrow(ValidationError);
      expect(() => Video.create(invalidData)).toThrow('Video ID is required');
    });

    it('should throw error for invalid YouTube video ID format', () => {
      const invalidData = { ...validCreateData, videoId: 'invalid-id' };

      expect(() => Video.create(invalidData)).toThrow(ValidationError);
      expect(() => Video.create(invalidData)).toThrow('Invalid YouTube video ID format');
    });

    it('should throw error for missing channelId', () => {
      const invalidData = { ...validCreateData };
      delete (invalidData as any).channelId;

      expect(() => Video.create(invalidData)).toThrow(ValidationError);
      expect(() => Video.create(invalidData)).toThrow('Channel ID is required');
    });

    it('should throw error for empty channelId', () => {
      const invalidData = { ...validCreateData, channelId: '   ' };

      expect(() => Video.create(invalidData)).toThrow(ValidationError);
      expect(() => Video.create(invalidData)).toThrow('Channel ID cannot be empty');
    });

    it('should throw error for missing title', () => {
      const invalidData = { ...validCreateData };
      delete (invalidData as any).title;

      expect(() => Video.create(invalidData)).toThrow(ValidationError);
      expect(() => Video.create(invalidData)).toThrow('Video title is required');
    });

    it('should throw error for empty title', () => {
      const invalidData = { ...validCreateData, title: '   ' };

      expect(() => Video.create(invalidData)).toThrow(ValidationError);
      expect(() => Video.create(invalidData)).toThrow('Video title cannot be empty');
    });

    it('should throw error for title too long', () => {
      const invalidData = { ...validCreateData, title: 'a'.repeat(501) };

      expect(() => Video.create(invalidData)).toThrow(ValidationError);
      expect(() => Video.create(invalidData)).toThrow('Video title cannot exceed 500 characters');
    });

    it('should throw error for description too long', () => {
      const invalidData = { ...validCreateData, description: 'a'.repeat(5001) };

      expect(() => Video.create(invalidData)).toThrow(ValidationError);
      expect(() => Video.create(invalidData)).toThrow('Video description cannot exceed 5000 characters');
    });

    it('should throw error for negative duration', () => {
      const invalidData = { ...validCreateData, duration: -1 };

      expect(() => Video.create(invalidData)).toThrow(ValidationError);
      expect(() => Video.create(invalidData)).toThrow('Duration must be a non-negative number');
    });

    it('should throw error for duration too long', () => {
      const invalidData = { ...validCreateData, duration: 86401 };

      expect(() => Video.create(invalidData)).toThrow(ValidationError);
      expect(() => Video.create(invalidData)).toThrow('Duration cannot exceed 24 hours');
    });

    it('should throw error for future published date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const invalidData = { ...validCreateData, publishedAt: futureDate };

      expect(() => Video.create(invalidData)).toThrow(ValidationError);
      expect(() => Video.create(invalidData)).toThrow('Published date cannot be in the future');
    });

    it('should throw error for invalid thumbnail URL', () => {
      const invalidData = { ...validCreateData, thumbnailUrl: 'not-a-url' };

      expect(() => Video.create(invalidData)).toThrow(ValidationError);
      expect(() => Video.create(invalidData)).toThrow('Invalid thumbnail URL format');
    });

    it('should throw error for invalid language code', () => {
      const invalidData = { ...validCreateData, subtitleLanguage: 'invalid' };

      expect(() => Video.create(invalidData)).toThrow(ValidationError);
      expect(() => Video.create(invalidData)).toThrow('Invalid subtitle language code');
    });
  });

  describe('Video constructor', () => {
    it('should create video instance from valid data', () => {
      const video = new Video(validVideoData);

      expect(video.id).toBe(validVideoData.id);
      expect(video.videoId).toBe(validVideoData.videoId);
      expect(video.channelId).toBe(validVideoData.channelId);
      expect(video.title).toBe(validVideoData.title);
      expect(video.description).toBe(validVideoData.description);
      expect(video.duration).toBe(validVideoData.duration);
      expect(video.publishedAt).toBe(validVideoData.publishedAt);
      expect(video.thumbnailUrl).toBe(validVideoData.thumbnailUrl);
      expect(video.hasSubtitles).toBe(validVideoData.hasSubtitles);
      expect(video.subtitleLanguage).toBe(validVideoData.subtitleLanguage);
      expect(video.indexingStatus).toBe(validVideoData.indexingStatus);
      expect(video.createdAt).toBe(validVideoData.createdAt);
      expect(video.updatedAt).toBe(validVideoData.updatedAt);
    });

    it('should handle optional fields correctly', () => {
      const minimalData: IVideo = {
        id: 'vid_123',
        videoId: 'dQw4w9WgXcQ',
        channelId: 'UCrAOnWg4S-XDI9M_vhLw8Ag',
        title: 'Test Video',
        duration: 120,
        publishedAt: new Date('2023-01-01'),
        hasSubtitles: false,
        indexingStatus: 'pending',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      };

      const video = new Video(minimalData);

      expect(video.description).toBeUndefined();
      expect(video.thumbnailUrl).toBeUndefined();
      expect(video.subtitleLanguage).toBeUndefined();
    });
  });

  describe('Video.update()', () => {
    let video: Video;

    beforeEach(() => {
      video = new Video(validVideoData);
    });

    it('should update video title', () => {
      const newTitle = 'Updated Video Title';
      const originalUpdatedAt = video.updatedAt;

      // Wait a bit to ensure updatedAt changes
      setTimeout(() => {
        video.update({ title: newTitle });

        expect(video.title).toBe(newTitle);
        expect(video.updatedAt).not.toBe(originalUpdatedAt);
      }, 1);
    });

    it('should update video description', () => {
      const newDescription = 'Updated description';
      video.update({ description: newDescription });

      expect(video.description).toBe(newDescription);
    });

    it('should update video duration', () => {
      const newDuration = 300;
      video.update({ duration: newDuration });

      expect(video.duration).toBe(newDuration);
    });

    it('should update indexing status', () => {
      video.update({ indexingStatus: 'completed' });

      expect(video.indexingStatus).toBe('completed');
    });

    it('should update hasSubtitles flag', () => {
      video.update({ hasSubtitles: false });

      expect(video.hasSubtitles).toBe(false);
    });

    it('should update subtitle language', () => {
      const newLanguage = 'es';
      video.update({ subtitleLanguage: newLanguage });

      expect(video.subtitleLanguage).toBe(newLanguage);
    });

    it('should throw error for invalid title in update', () => {
      expect(() => video.update({ title: '' })).toThrow(ValidationError);
      expect(() => video.update({ title: '' })).toThrow('Video title cannot be empty');
    });

    it('should throw error for invalid duration in update', () => {
      expect(() => video.update({ duration: -1 })).toThrow(ValidationError);
      expect(() => video.update({ duration: -1 })).toThrow('Duration must be a non-negative number');
    });

    it('should throw error for invalid indexing status', () => {
      expect(() => video.update({ indexingStatus: 'invalid' as any })).toThrow(ValidationError);
      expect(() => video.update({ indexingStatus: 'invalid' as any })).toThrow('Invalid indexing status');
    });
  });

  describe('Video utility methods', () => {
    let video: Video;

    beforeEach(() => {
      video = new Video(validVideoData);
    });

    describe('getFormattedDuration()', () => {
      it('should format duration under 1 hour correctly', () => {
        video.update({ duration: 125 }); // 2:05
        expect(video.getFormattedDuration()).toBe('2:05');
      });

      it('should format duration over 1 hour correctly', () => {
        video.update({ duration: 3665 }); // 1:01:05
        expect(video.getFormattedDuration()).toBe('1:01:05');
      });

      it('should format exact minutes correctly', () => {
        video.update({ duration: 120 }); // 2:00
        expect(video.getFormattedDuration()).toBe('2:00');
      });

      it('should format zero duration correctly', () => {
        video.update({ duration: 0 });
        expect(video.getFormattedDuration()).toBe('0:00');
      });
    });

    describe('getYouTubeUrl()', () => {
      it('should return correct YouTube URL', () => {
        const expectedUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
        expect(video.getYouTubeUrl()).toBe(expectedUrl);
      });
    });

    describe('isRecentlyPublished()', () => {
      it('should return true for video published within 30 days', () => {
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 15);
        video.update({ publishedAt: recentDate });

        expect(video.isRecentlyPublished()).toBe(true);
      });

      it('should return false for video published over 30 days ago', () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 45);
        video.update({ publishedAt: oldDate });

        expect(video.isRecentlyPublished()).toBe(false);
      });

      it('should return false for video published exactly 30 days ago', () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        video.update({ publishedAt: thirtyDaysAgo });

        expect(video.isRecentlyPublished()).toBe(false);
      });
    });

    describe('toJSON()', () => {
      it('should return complete JSON representation', () => {
        const json = video.toJSON();

        expect(json).toEqual(validVideoData);
      });

      it('should handle optional fields correctly in JSON', () => {
        const minimalData: IVideo = {
          id: 'vid_123',
          videoId: 'dQw4w9WgXcQ',
          channelId: 'UCrAOnWg4S-XDI9M_vhLw8Ag',
          title: 'Test Video',
          duration: 120,
          publishedAt: new Date('2023-01-01'),
          hasSubtitles: false,
          indexingStatus: 'pending',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01')
        };

        const minimalVideo = new Video(minimalData);
        const json = minimalVideo.toJSON();

        expect(json.description).toBeUndefined();
        expect(json.thumbnailUrl).toBeUndefined();
        expect(json.subtitleLanguage).toBeUndefined();
        expect(json.id).toBe(minimalData.id);
        expect(json.videoId).toBe(minimalData.videoId);
      });
    });
  });

  describe('Video validation helper methods', () => {
    describe('isValidYouTubeVideoId()', () => {
      it('should validate correct YouTube video IDs', () => {
        expect(Video.isValidYouTubeVideoId('dQw4w9WgXcQ')).toBe(true);
        expect(Video.isValidYouTubeVideoId('_1234567890')).toBe(true);
        expect(Video.isValidYouTubeVideoId('abcDEF-_123')).toBe(true);
      });

      it('should reject invalid YouTube video IDs', () => {
        expect(Video.isValidYouTubeVideoId('short')).toBe(false);
        expect(Video.isValidYouTubeVideoId('toolongvideoid')).toBe(false);
        expect(Video.isValidYouTubeVideoId('invalid@char')).toBe(false);
        expect(Video.isValidYouTubeVideoId('')).toBe(false);
      });
    });

    describe('isValidUrl()', () => {
      it('should validate correct URLs', () => {
        expect(Video.isValidUrl('https://example.com')).toBe(true);
        expect(Video.isValidUrl('http://test.org/path')).toBe(true);
        expect(Video.isValidUrl('https://img.youtube.com/vi/abc/maxresdefault.jpg')).toBe(true);
      });

      it('should reject invalid URLs', () => {
        expect(Video.isValidUrl('not-a-url')).toBe(false);
        expect(Video.isValidUrl('invalid-protocol')).toBe(false);
        expect(Video.isValidUrl('')).toBe(false);
      });
    });

    describe('isValidLanguageCode()', () => {
      it('should validate correct language codes', () => {
        expect(Video.isValidLanguageCode('en')).toBe(true);
        expect(Video.isValidLanguageCode('es')).toBe(true);
        expect(Video.isValidLanguageCode('en-US')).toBe(true);
        expect(Video.isValidLanguageCode('pt-BR')).toBe(true);
        expect(Video.isValidLanguageCode('eng')).toBe(true);
      });

      it('should reject invalid language codes', () => {
        expect(Video.isValidLanguageCode('e')).toBe(false);
        expect(Video.isValidLanguageCode('english')).toBe(false);
        expect(Video.isValidLanguageCode('en-us')).toBe(false); // lowercase country code
        expect(Video.isValidLanguageCode('EN')).toBe(false); // uppercase language code
        expect(Video.isValidLanguageCode('')).toBe(false);
      });
    });

    describe('generateId()', () => {
      it('should generate unique IDs with correct format', () => {
        const id1 = Video.generateId();
        const id2 = Video.generateId();

        expect(id1).toMatch(/^vid_\d+_[a-z0-9]+$/);
        expect(id2).toMatch(/^vid_\d+_[a-z0-9]+$/);
        expect(id1).not.toBe(id2);
      });
    });
  });

  describe('Video metadata handling', () => {
    it('should handle video with subtitles correctly', () => {
      const videoWithSubtitles = Video.create({
        ...validCreateData,
        hasSubtitles: true,
        subtitleLanguage: 'en'
      });

      expect(videoWithSubtitles.hasSubtitles).toBe(true);
      expect(videoWithSubtitles.subtitleLanguage).toBe('en');
      expect(videoWithSubtitles.indexingStatus).toBe('pending');
    });

    it('should handle video without subtitles correctly', () => {
      const videoWithoutSubtitles = Video.create({
        ...validCreateData,
        hasSubtitles: false
      });

      expect(videoWithoutSubtitles.hasSubtitles).toBe(false);
      expect(videoWithoutSubtitles.subtitleLanguage).toBe(validCreateData.subtitleLanguage);
    });

    it('should update indexing status correctly', () => {
      const video = Video.create(validCreateData);
      
      expect(video.indexingStatus).toBe('pending');
      
      video.update({ indexingStatus: 'completed' });
      expect(video.indexingStatus).toBe('completed');
      
      video.update({ indexingStatus: 'failed' });
      expect(video.indexingStatus).toBe('failed');
      
      video.update({ indexingStatus: 'no_subtitles' });
      expect(video.indexingStatus).toBe('no_subtitles');
    });

    it('should handle long video descriptions', () => {
      const longDescription = 'a'.repeat(4999); // Just under the limit
      const video = Video.create({
        ...validCreateData,
        description: longDescription
      });

      expect(video.description).toBe(longDescription);
    });

    it('should handle various duration formats', () => {
      // Test short video (under 1 minute)
      const shortVideo = Video.create({ ...validCreateData, duration: 45 });
      expect(shortVideo.getFormattedDuration()).toBe('0:45');

      // Test medium video (several minutes)
      const mediumVideo = Video.create({ ...validCreateData, duration: 600 });
      expect(mediumVideo.getFormattedDuration()).toBe('10:00');

      // Test long video (over 1 hour)
      const longVideo = Video.create({ ...validCreateData, duration: 7200 });
      expect(longVideo.getFormattedDuration()).toBe('2:00:00');
    });
  });
});