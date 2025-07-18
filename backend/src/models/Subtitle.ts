export interface ISubtitle {
  id: string;
  videoId: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
  confidence?: number; // for auto-generated subtitles
  createdAt: Date;
}

export interface CreateSubtitleData {
  videoId: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number;
}

export interface UpdateSubtitleData {
  startTime?: number;
  endTime?: number;
  text?: string;
  confidence?: number;
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class Subtitle implements ISubtitle {
  public id: string;
  public videoId: string;
  public startTime: number;
  public endTime: number;
  public text: string;
  public confidence?: number;
  public createdAt: Date;

  constructor(data: ISubtitle) {
    this.id = data.id;
    this.videoId = data.videoId;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.text = data.text;
    this.createdAt = data.createdAt;
    
    if (data.confidence !== undefined) {
      this.confidence = data.confidence;
    }
  }

  /**
   * Creates a new Subtitle instance with validation
   */
  static create(data: CreateSubtitleData): Subtitle {
    Subtitle.validateCreateData(data);
    
    const now = new Date();
    const subtitleData: ISubtitle = {
      id: Subtitle.generateId(),
      videoId: data.videoId,
      startTime: data.startTime,
      endTime: data.endTime,
      text: data.text,
      createdAt: now,
      ...(data.confidence !== undefined && { confidence: data.confidence })
    };

    return new Subtitle(subtitleData);
  }

  /**
   * Updates subtitle data with validation
   */
  update(data: UpdateSubtitleData): void {
    Subtitle.validateUpdateData(data);
    
    if (data.startTime !== undefined) this.startTime = data.startTime;
    if (data.endTime !== undefined) this.endTime = data.endTime;
    if (data.text !== undefined) this.text = data.text;
    if (data.confidence !== undefined) this.confidence = data.confidence;
    
    // Validate timestamp relationship after update
    if (this.startTime >= this.endTime) {
      throw new ValidationError('Start time must be less than end time');
    }
  }

  /**
   * Validates subtitle creation data
   */
  static validateCreateData(data: CreateSubtitleData): void {
    if (typeof data.videoId !== 'string') {
      throw new ValidationError('Video ID is required and must be a string', 'videoId');
    }

    if (data.videoId.trim().length === 0) {
      throw new ValidationError('Video ID cannot be empty', 'videoId');
    }

    if (typeof data.startTime !== 'number') {
      throw new ValidationError('Start time is required and must be a number', 'startTime');
    }

    if (data.startTime < 0) {
      throw new ValidationError('Start time cannot be negative', 'startTime');
    }

    if (typeof data.endTime !== 'number') {
      throw new ValidationError('End time is required and must be a number', 'endTime');
    }

    if (data.endTime < 0) {
      throw new ValidationError('End time cannot be negative', 'endTime');
    }

    if (data.startTime >= data.endTime) {
      throw new ValidationError('Start time must be less than end time', 'startTime');
    }

    // Validate reasonable duration limits (max 1 hour per subtitle segment)
    if (data.endTime - data.startTime > 3600) {
      throw new ValidationError('Subtitle segment cannot exceed 1 hour', 'endTime');
    }

    if (typeof data.text !== 'string') {
      throw new ValidationError('Text is required and must be a string', 'text');
    }

    if (data.text.trim().length === 0) {
      throw new ValidationError('Text cannot be empty', 'text');
    }

    if (data.text.length > 1000) {
      throw new ValidationError('Text cannot exceed 1000 characters', 'text');
    }

    if (data.confidence !== undefined) {
      if (typeof data.confidence !== 'number') {
        throw new ValidationError('Confidence must be a number', 'confidence');
      }
      if (data.confidence < 0 || data.confidence > 1) {
        throw new ValidationError('Confidence must be between 0 and 1', 'confidence');
      }
    }
  }

  /**
   * Validates subtitle update data
   */
  static validateUpdateData(data: UpdateSubtitleData): void {
    if (data.startTime !== undefined) {
      if (typeof data.startTime !== 'number') {
        throw new ValidationError('Start time must be a number', 'startTime');
      }
      if (data.startTime < 0) {
        throw new ValidationError('Start time cannot be negative', 'startTime');
      }
    }

    if (data.endTime !== undefined) {
      if (typeof data.endTime !== 'number') {
        throw new ValidationError('End time must be a number', 'endTime');
      }
      if (data.endTime < 0) {
        throw new ValidationError('End time cannot be negative', 'endTime');
      }
    }

    if (data.startTime !== undefined && data.endTime !== undefined) {
      if (data.startTime >= data.endTime) {
        throw new ValidationError('Start time must be less than end time', 'startTime');
      }
      if (data.endTime - data.startTime > 3600) {
        throw new ValidationError('Subtitle segment cannot exceed 1 hour', 'endTime');
      }
    }

    if (data.text !== undefined) {
      if (typeof data.text !== 'string') {
        throw new ValidationError('Text must be a string', 'text');
      }
      if (data.text.trim().length === 0) {
        throw new ValidationError('Text cannot be empty', 'text');
      }
      if (data.text.length > 1000) {
        throw new ValidationError('Text cannot exceed 1000 characters', 'text');
      }
    }

    if (data.confidence !== undefined) {
      if (typeof data.confidence !== 'number') {
        throw new ValidationError('Confidence must be a number', 'confidence');
      }
      if (data.confidence < 0 || data.confidence > 1) {
        throw new ValidationError('Confidence must be between 0 and 1', 'confidence');
      }
    }
  }

  /**
   * Generates a unique ID for the subtitle
   */
  static generateId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets the duration of the subtitle segment in seconds
   */
  getDuration(): number {
    return this.endTime - this.startTime;
  }

  /**
   * Formats timestamp to human readable format (MM:SS or HH:MM:SS)
   */
  static formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
  }

  /**
   * Gets formatted start timestamp
   */
  getFormattedStartTime(): string {
    return Subtitle.formatTimestamp(this.startTime);
  }

  /**
   * Gets formatted end timestamp
   */
  getFormattedEndTime(): string {
    return Subtitle.formatTimestamp(this.endTime);
  }

  /**
   * Gets formatted duration
   */
  getFormattedDuration(): string {
    return Subtitle.formatTimestamp(this.getDuration());
  }

  /**
   * Checks if a given timestamp falls within this subtitle segment
   */
  containsTimestamp(timestamp: number): boolean {
    return timestamp >= this.startTime && timestamp <= this.endTime;
  }

  /**
   * Checks if this subtitle overlaps with another subtitle segment
   */
  overlapsWith(other: Subtitle): boolean {
    return this.startTime < other.endTime && this.endTime > other.startTime;
  }

  /**
   * Gets the overlap duration with another subtitle segment
   */
  getOverlapDuration(other: Subtitle): number {
    if (!this.overlapsWith(other)) {
      return 0;
    }
    
    const overlapStart = Math.max(this.startTime, other.startTime);
    const overlapEnd = Math.min(this.endTime, other.endTime);
    return overlapEnd - overlapStart;
  }

  /**
   * Processes and cleans subtitle text
   */
  static processText(text: string): string {
    return text
      .trim()
      // Remove common subtitle artifacts
      .replace(/\[.*?\]/g, '') // Remove [music], [applause], etc.
      .replace(/\(.*?\)/g, '') // Remove (music), (applause), etc.
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      // Clean up punctuation
      .replace(/\s+([,.!?;:])/g, '$1')
      .trim();
  }

  /**
   * Gets processed and cleaned text
   */
  getProcessedText(): string {
    return Subtitle.processText(this.text);
  }

  /**
   * Checks if subtitle has high confidence (for auto-generated subtitles)
   */
  hasHighConfidence(): boolean {
    return this.confidence !== undefined && this.confidence >= 0.8;
  }

  /**
   * Checks if subtitle has low confidence (for auto-generated subtitles)
   */
  hasLowConfidence(): boolean {
    return this.confidence !== undefined && this.confidence < 0.5;
  }

  /**
   * Creates a YouTube URL with timestamp
   */
  getYouTubeUrlWithTimestamp(videoId: string): string {
    const startSeconds = Math.floor(this.startTime);
    return `https://www.youtube.com/watch?v=${videoId}&t=${startSeconds}s`;
  }

  /**
   * Validates a batch of subtitles for consistency
   */
  static validateSubtitleBatch(subtitles: Subtitle[]): void {
    if (subtitles.length === 0) {
      return;
    }

    // Sort by start time for validation
    const sortedSubtitles = [...subtitles].sort((a, b) => a.startTime - b.startTime);

    // Check for overlaps and gaps
    for (let i = 0; i < sortedSubtitles.length - 1; i++) {
      const current = sortedSubtitles[i];
      const next = sortedSubtitles[i + 1];

      // Check for significant overlaps (more than 0.5 seconds)
      if (current && next && current.endTime > next.startTime + 0.5) {
        throw new ValidationError(
          `Subtitle overlap detected: ${current.getFormattedEndTime()} overlaps with ${next.getFormattedStartTime()}`
        );
      }
    }
  }

  /**
   * Converts subtitle to JSON representation
   */
  toJSON(): ISubtitle {
    const result: ISubtitle = {
      id: this.id,
      videoId: this.videoId,
      startTime: this.startTime,
      endTime: this.endTime,
      text: this.text,
      createdAt: this.createdAt
    };

    if (this.confidence !== undefined) {
      result.confidence = this.confidence;
    }

    return result;
  }
}