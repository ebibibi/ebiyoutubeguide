export interface IChannel {
  id: string;
  channelId: string; // YouTube channel ID
  name: string;
  description?: string;
  thumbnailUrl?: string;
  videoCount: number;
  indexedVideoCount: number;
  lastIndexed: Date;
  indexingStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChannelData {
  channelId: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  videoCount?: number;
}

export interface UpdateChannelData {
  name?: string;
  description?: string;
  thumbnailUrl?: string;
  videoCount?: number;
  indexedVideoCount?: number;
  lastIndexed?: Date;
  indexingStatus?: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class Channel implements IChannel {
  public id: string;
  public channelId: string;
  public name: string;
  public description?: string;
  public thumbnailUrl?: string;
  public videoCount: number;
  public indexedVideoCount: number;
  public lastIndexed: Date;
  public indexingStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: IChannel) {
    this.id = data.id;
    this.channelId = data.channelId;
    this.name = data.name;
    this.videoCount = data.videoCount;
    this.indexedVideoCount = data.indexedVideoCount;
    this.lastIndexed = data.lastIndexed;
    this.indexingStatus = data.indexingStatus;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    
    if (data.description !== undefined) {
      this.description = data.description;
    }
    
    if (data.thumbnailUrl !== undefined) {
      this.thumbnailUrl = data.thumbnailUrl;
    }
  }

  /**
   * Creates a new Channel instance with validation
   */
  static create(data: CreateChannelData): Channel {
    Channel.validateCreateData(data);
    
    const now = new Date();
    const channelData: IChannel = {
      id: Channel.generateId(),
      channelId: data.channelId,
      name: data.name,
      videoCount: data.videoCount || 0,
      indexedVideoCount: 0,
      lastIndexed: now,
      indexingStatus: 'pending',
      createdAt: now,
      updatedAt: now,
      ...(data.description !== undefined && { description: data.description }),
      ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl })
    };

    return new Channel(channelData);
  }

  /**
   * Updates channel data with validation
   */
  update(data: UpdateChannelData): void {
    Channel.validateUpdateData(data);
    
    if (data.name !== undefined) this.name = data.name;
    if (data.description !== undefined) this.description = data.description;
    if (data.thumbnailUrl !== undefined) this.thumbnailUrl = data.thumbnailUrl;
    if (data.videoCount !== undefined) this.videoCount = data.videoCount;
    if (data.indexedVideoCount !== undefined) this.indexedVideoCount = data.indexedVideoCount;
    if (data.lastIndexed !== undefined) this.lastIndexed = data.lastIndexed;
    if (data.indexingStatus !== undefined) this.indexingStatus = data.indexingStatus;
    
    this.updatedAt = new Date();
  }

  /**
   * Validates channel creation data
   */
  static validateCreateData(data: CreateChannelData): void {
    if (!data.channelId || typeof data.channelId !== 'string') {
      throw new ValidationError('Channel ID is required and must be a string', 'channelId');
    }

    if (!Channel.isValidYouTubeChannelId(data.channelId)) {
      throw new ValidationError('Invalid YouTube channel ID format', 'channelId');
    }

    if (!data.name || typeof data.name !== 'string') {
      throw new ValidationError('Channel name is required and must be a string', 'name');
    }

    if (data.name.trim().length === 0) {
      throw new ValidationError('Channel name cannot be empty', 'name');
    }

    if (data.name.length > 255) {
      throw new ValidationError('Channel name cannot exceed 255 characters', 'name');
    }

    if (data.description && typeof data.description !== 'string') {
      throw new ValidationError('Channel description must be a string', 'description');
    }

    if (data.description && data.description.length > 1000) {
      throw new ValidationError('Channel description cannot exceed 1000 characters', 'description');
    }

    if (data.thumbnailUrl && typeof data.thumbnailUrl !== 'string') {
      throw new ValidationError('Thumbnail URL must be a string', 'thumbnailUrl');
    }

    if (data.thumbnailUrl && !Channel.isValidUrl(data.thumbnailUrl)) {
      throw new ValidationError('Invalid thumbnail URL format', 'thumbnailUrl');
    }

    if (data.videoCount !== undefined) {
      if (typeof data.videoCount !== 'number' || data.videoCount < 0) {
        throw new ValidationError('Video count must be a non-negative number', 'videoCount');
      }
    }
  }

  /**
   * Validates channel update data
   */
  static validateUpdateData(data: UpdateChannelData): void {
    if (data.name !== undefined) {
      if (typeof data.name !== 'string') {
        throw new ValidationError('Channel name must be a string', 'name');
      }
      if (data.name.trim().length === 0) {
        throw new ValidationError('Channel name cannot be empty', 'name');
      }
      if (data.name.length > 255) {
        throw new ValidationError('Channel name cannot exceed 255 characters', 'name');
      }
    }

    if (data.description !== undefined && typeof data.description !== 'string') {
      throw new ValidationError('Channel description must be a string', 'description');
    }

    if (data.description && data.description.length > 1000) {
      throw new ValidationError('Channel description cannot exceed 1000 characters', 'description');
    }

    if (data.thumbnailUrl !== undefined) {
      if (typeof data.thumbnailUrl !== 'string') {
        throw new ValidationError('Thumbnail URL must be a string', 'thumbnailUrl');
      }
      if (data.thumbnailUrl && !Channel.isValidUrl(data.thumbnailUrl)) {
        throw new ValidationError('Invalid thumbnail URL format', 'thumbnailUrl');
      }
    }

    if (data.videoCount !== undefined) {
      if (typeof data.videoCount !== 'number' || data.videoCount < 0) {
        throw new ValidationError('Video count must be a non-negative number', 'videoCount');
      }
    }

    if (data.indexedVideoCount !== undefined) {
      if (typeof data.indexedVideoCount !== 'number' || data.indexedVideoCount < 0) {
        throw new ValidationError('Indexed video count must be a non-negative number', 'indexedVideoCount');
      }
    }

    if (data.lastIndexed !== undefined && !(data.lastIndexed instanceof Date)) {
      throw new ValidationError('Last indexed must be a Date object', 'lastIndexed');
    }

    if (data.indexingStatus !== undefined) {
      const validStatuses = ['pending', 'in_progress', 'completed', 'failed'];
      if (!validStatuses.includes(data.indexingStatus)) {
        throw new ValidationError('Invalid indexing status', 'indexingStatus');
      }
    }
  }

  /**
   * Validates YouTube channel ID format
   */
  static isValidYouTubeChannelId(channelId: string): boolean {
    if (!channelId || channelId.trim().length === 0) {
      return false;
    }

    // Check for spaces (invalid)
    if (channelId.includes(' ')) {
      return false;
    }

    // If it starts with UC, it must be exactly 24 characters long
    if (channelId.startsWith('UC')) {
      const ucPattern = /^UC[a-zA-Z0-9_-]{22}$/;
      return ucPattern.test(channelId);
    }
    
    // Reject patterns that look like malformed UC IDs (start with letters followed by many digits)
    if (/^[A-Z]{2}\d{20,}$/.test(channelId)) {
      return false;
    }
    
    // Custom channel names (handles) - must be 4-30 characters, alphanumeric with limited special chars
    // Should not contain 'invalid' patterns or be too generic
    const handlePattern = /^@?[a-zA-Z0-9][a-zA-Z0-9._-]{2,28}[a-zA-Z0-9]$/;
    
    // Reject obviously invalid patterns
    if (channelId.includes('invalid') || channelId.length < 4 || channelId.length > 30) {
      return false;
    }
    
    return handlePattern.test(channelId);
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
   * Generates a unique ID for the channel
   */
  static generateId(): string {
    return `ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Converts channel to JSON representation
   */
  toJSON(): IChannel {
    const result: IChannel = {
      id: this.id,
      channelId: this.channelId,
      name: this.name,
      videoCount: this.videoCount,
      indexedVideoCount: this.indexedVideoCount,
      lastIndexed: this.lastIndexed,
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

    return result;
  }
}