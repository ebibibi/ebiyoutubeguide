export interface IVideo {
  id: string;
  videoId: string; // YouTube video ID
  channelId: string;
  title: string;
  description?: string;
  duration: number; // in seconds
  publishedAt: Date;
  thumbnailUrl?: string;
  hasSubtitles: boolean;
  subtitleLanguage?: string;
  indexingStatus: 'pending' | 'completed' | 'failed' | 'no_subtitles';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVideoData {
  videoId: string;
  channelId: string;
  title: string;
  description?: string;
  duration: number;
  publishedAt: Date;
  thumbnailUrl?: string;
  hasSubtitles?: boolean;
  subtitleLanguage?: string;
}

export interface UpdateVideoData {
  title?: string;
  description?: string;
  duration?: number;
  publishedAt?: Date;
  thumbnailUrl?: string;
  hasSubtitles?: boolean;
  subtitleLanguage?: string;
  indexingStatus?: 'pending' | 'completed' | 'failed' | 'no_subtitles';
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class Video implements IVideo {
  public id: string;
  public videoId: string;
  public channelId: string;
  public title: string;
  public description?: string;
  public duration: number;
  public publishedAt: Date;
  public thumbnailUrl?: string;
  public hasSubtitles: boolean;
  public subtitleLanguage?: string;
  public indexingStatus: 'pending' | 'completed' | 'failed' | 'no_subtitles';
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: IVideo) {
    this.id = data.id;
    this.videoId = data.videoId;
    this.channelId = data.channelId;
    this.title = data.title;
    this.duration = data.duration;
    this.publishedAt = data.publishedAt;
    this.hasSubtitles = data.hasSubtitles;
    this.indexingStatus = data.indexingStatus;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    
    if (data.description !== undefined) {
      this.description = data.description;
    }
    
    if (data.thumbnailUrl !== undefined) {
      this.thumbnailUrl = data.thumbnailUrl;
    }
    
    if (data.subtitleLanguage !== undefined) {
      this.subtitleLanguage = data.subtitleLanguage;
    }
  }

  /**
   * Creates a new Video instance with validation
   */
  static create(data: CreateVideoData): Video {
    Video.validateCreateData(data);
    
    const now = new Date();
    const videoData: IVideo = {
      id: Video.generateId(),
      videoId: data.videoId,
      channelId: data.channelId,
      title: data.title,
      duration: data.duration,
      publishedAt: data.publishedAt,
      hasSubtitles: data.hasSubtitles || false,
      indexingStatus: 'pending',
      createdAt: now,
      updatedAt: now,
      ...(data.description !== undefined && { description: data.description }),
      ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
      ...(data.subtitleLanguage !== undefined && { subtitleLanguage: data.subtitleLanguage })
    };

    return new Video(videoData);
  }

  /**
   * Updates video data with validation
   */
  update(data: UpdateVideoData): void {
    Video.validateUpdateData(data);
    
    if (data.title !== undefined) this.title = data.title;
    if (data.description !== undefined) this.description = data.description;
    if (data.duration !== undefined) this.duration = data.duration;
    if (data.publishedAt !== undefined) this.publishedAt = data.publishedAt;
    if (data.thumbnailUrl !== undefined) this.thumbnailUrl = data.thumbnailUrl;
    if (data.hasSubtitles !== undefined) this.hasSubtitles = data.hasSubtitles;
    if (data.subtitleLanguage !== undefined) this.subtitleLanguage = data.subtitleLanguage;
    if (data.indexingStatus !== undefined) this.indexingStatus = data.indexingStatus;
    
    this.updatedAt = new Date();
  }

  /**
   * Validates video creation data
   */
  static validateCreateData(data: CreateVideoData): void {
    if (!data.videoId || typeof data.videoId !== 'string') {
      throw new ValidationError('Video ID is required and must be a string', 'videoId');
    }

    if (!Video.isValidYouTubeVideoId(data.videoId)) {
      throw new ValidationError('Invalid YouTube video ID format', 'videoId');
    }

    if (!data.channelId || typeof data.channelId !== 'string') {
      throw new ValidationError('Channel ID is required and must be a string', 'channelId');
    }

    if (data.channelId.trim().length === 0) {
      throw new ValidationError('Channel ID cannot be empty', 'channelId');
    }

    if (!data.title || typeof data.title !== 'string') {
      throw new ValidationError('Video title is required and must be a string', 'title');
    }

    if (data.title.trim().length === 0) {
      throw new ValidationError('Video title cannot be empty', 'title');
    }

    if (data.title.length > 500) {
      throw new ValidationError('Video title cannot exceed 500 characters', 'title');
    }

    if (data.description && typeof data.description !== 'string') {
      throw new ValidationError('Video description must be a string', 'description');
    }

    if (data.description && data.description.length > 5000) {
      throw new ValidationError('Video description cannot exceed 5000 characters', 'description');
    }

    if (typeof data.duration !== 'number' || data.duration < 0) {
      throw new ValidationError('Duration must be a non-negative number', 'duration');
    }

    if (data.duration > 86400) { // 24 hours in seconds
      throw new ValidationError('Duration cannot exceed 24 hours', 'duration');
    }

    if (!(data.publishedAt instanceof Date)) {
      throw new ValidationError('Published date must be a Date object', 'publishedAt');
    }

    if (data.publishedAt > new Date()) {
      throw new ValidationError('Published date cannot be in the future', 'publishedAt');
    }

    if (data.thumbnailUrl && typeof data.thumbnailUrl !== 'string') {
      throw new ValidationError('Thumbnail URL must be a string', 'thumbnailUrl');
    }

    if (data.thumbnailUrl && !Video.isValidUrl(data.thumbnailUrl)) {
      throw new ValidationError('Invalid thumbnail URL format', 'thumbnailUrl');
    }

    if (data.hasSubtitles !== undefined && typeof data.hasSubtitles !== 'boolean') {
      throw new ValidationError('Has subtitles must be a boolean', 'hasSubtitles');
    }

    if (data.subtitleLanguage && typeof data.subtitleLanguage !== 'string') {
      throw new ValidationError('Subtitle language must be a string', 'subtitleLanguage');
    }

    if (data.subtitleLanguage && !Video.isValidLanguageCode(data.subtitleLanguage)) {
      throw new ValidationError('Invalid subtitle language code', 'subtitleLanguage');
    }
  }

  /**
   * Validates video update data
   */
  static validateUpdateData(data: UpdateVideoData): void {
    if (data.title !== undefined) {
      if (typeof data.title !== 'string') {
        throw new ValidationError('Video title must be a string', 'title');
      }
      if (data.title.trim().length === 0) {
        throw new ValidationError('Video title cannot be empty', 'title');
      }
      if (data.title.length > 500) {
        throw new ValidationError('Video title cannot exceed 500 characters', 'title');
      }
    }

    if (data.description !== undefined && typeof data.description !== 'string') {
      throw new ValidationError('Video description must be a string', 'description');
    }

    if (data.description && data.description.length > 5000) {
      throw new ValidationError('Video description cannot exceed 5000 characters', 'description');
    }

    if (data.duration !== undefined) {
      if (typeof data.duration !== 'number' || data.duration < 0) {
        throw new ValidationError('Duration must be a non-negative number', 'duration');
      }
      if (data.duration > 86400) {
        throw new ValidationError('Duration cannot exceed 24 hours', 'duration');
      }
    }

    if (data.publishedAt !== undefined) {
      if (!(data.publishedAt instanceof Date)) {
        throw new ValidationError('Published date must be a Date object', 'publishedAt');
      }
      if (data.publishedAt > new Date()) {
        throw new ValidationError('Published date cannot be in the future', 'publishedAt');
      }
    }

    if (data.thumbnailUrl !== undefined) {
      if (typeof data.thumbnailUrl !== 'string') {
        throw new ValidationError('Thumbnail URL must be a string', 'thumbnailUrl');
      }
      if (data.thumbnailUrl && !Video.isValidUrl(data.thumbnailUrl)) {
        throw new ValidationError('Invalid thumbnail URL format', 'thumbnailUrl');
      }
    }

    if (data.hasSubtitles !== undefined && typeof data.hasSubtitles !== 'boolean') {
      throw new ValidationError('Has subtitles must be a boolean', 'hasSubtitles');
    }

    if (data.subtitleLanguage !== undefined) {
      if (typeof data.subtitleLanguage !== 'string') {
        throw new ValidationError('Subtitle language must be a string', 'subtitleLanguage');
      }
      if (data.subtitleLanguage && !Video.isValidLanguageCode(data.subtitleLanguage)) {
        throw new ValidationError('Invalid subtitle language code', 'subtitleLanguage');
      }
    }

    if (data.indexingStatus !== undefined) {
      const validStatuses = ['pending', 'completed', 'failed', 'no_subtitles'];
      if (!validStatuses.includes(data.indexingStatus)) {
        throw new ValidationError('Invalid indexing status', 'indexingStatus');
      }
    }
  }

  /**
   * Validates YouTube video ID format
   */
  static isValidYouTubeVideoId(videoId: string): boolean {
    // YouTube video IDs are 11 characters long, alphanumeric with - and _
    const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
    return videoIdPattern.test(videoId);
  }

  /**
   * Validates URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates language code format (ISO 639-1 or similar)
   */
  static isValidLanguageCode(languageCode: string): boolean {
    // Accept common language codes: 2-letter (en), 2+2 (en-US), or 3-letter (eng)
    const languagePattern = /^[a-z]{2,3}(-[A-Z]{2})?$/;
    return languagePattern.test(languageCode);
  }

  /**
   * Generates a unique ID for the video
   */
  static generateId(): string {
    return `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Formats duration from seconds to human readable format
   */
  getFormattedDuration(): string {
    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    const seconds = this.duration % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Gets the YouTube video URL
   */
  getYouTubeUrl(): string {
    return `https://www.youtube.com/watch?v=${this.videoId}`;
  }

  /**
   * Checks if video is recently published (within last 30 days)
   */
  isRecentlyPublished(): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.publishedAt > thirtyDaysAgo;
  }

  /**
   * Converts video to JSON representation
   */
  toJSON(): IVideo {
    const result: IVideo = {
      id: this.id,
      videoId: this.videoId,
      channelId: this.channelId,
      title: this.title,
      duration: this.duration,
      publishedAt: this.publishedAt,
      hasSubtitles: this.hasSubtitles,
      indexingStatus: this.indexingStatus,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };

    if (this.description !== undefined) {
      result.description = this.description;
    }

    if (this.thumbnailUrl !== undefined) {
      result.thumbnailUrl = this.thumbnailUrl;
    }

    if (this.subtitleLanguage !== undefined) {
      result.subtitleLanguage = this.subtitleLanguage;
    }

    return result;
  }
}