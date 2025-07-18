import { Subtitle, ValidationError, CreateSubtitleData, UpdateSubtitleData, ISubtitle } from '../Subtitle';

describe('Subtitle Model', () => {
  const validCreateData: CreateSubtitleData = {
    videoId: 'dQw4w9WgXcQ',
    startTime: 10.5,
    endTime: 15.2,
    text: 'This is a test subtitle text.',
    confidence: 0.95
  };

  const validSubtitleData: ISubtitle = {
    id: 'sub_123456789_abc123def',
    videoId: 'dQw4w9WgXcQ',
    startTime: 10.5,
    endTime: 15.2,
    text: 'This is a test subtitle text.',
    confidence: 0.95,
    createdAt: new Date('2023-01-01')
  };

  describe('Subtitle.create()', () => {
    it('should create a valid subtitle with required fields', () => {
      const minimalData = {
        videoId: 'dQw4w9WgXcQ',
        startTime: 10.0,
        endTime: 15.0,
        text: 'Test subtitle'
      };

      const subtitle = Subtitle.create(minimalData);

      expect(subtitle.videoId).toBe(minimalData.videoId);
      expect(subtitle.startTime).toBe(minimalData.startTime);
      expect(subtitle.endTime).toBe(minimalData.endTime);
      expect(subtitle.text).toBe(minimalData.text);
      expect(subtitle.confidence).toBeUndefined();
      expect(subtitle.id).toMatch(/^sub_\d+_[a-z0-9]+$/);
      expect(subtitle.createdAt).toBeInstanceOf(Date);
    });

    it('should create a subtitle with all optional fields', () => {
      const subtitle = Subtitle.create(validCreateData);

      expect(subtitle.videoId).toBe(validCreateData.videoId);
      expect(subtitle.startTime).toBe(validCreateData.startTime);
      expect(subtitle.endTime).toBe(validCreateData.endTime);
      expect(subtitle.text).toBe(validCreateData.text);
      expect(subtitle.confidence).toBe(validCreateData.confidence);
    });

    it('should throw ValidationError for missing videoId', () => {
      const invalidData = { ...validCreateData };
      delete (invalidData as any).videoId;

      expect(() => Subtitle.create(invalidData)).toThrow(ValidationError);
      expect(() => Subtitle.create(invalidData)).toThrow('Video ID is required');
    });

    it('should throw ValidationError for empty videoId', () => {
      const invalidData = { ...validCreateData, videoId: '' };

      expect(() => Subtitle.create(invalidData)).toThrow(ValidationError);
      expect(() => Subtitle.create(invalidData)).toThrow('Video ID cannot be empty');
    });

    it('should throw ValidationError for invalid startTime', () => {
      const invalidData = { ...validCreateData, startTime: -1 };

      expect(() => Subtitle.create(invalidData)).toThrow(ValidationError);
      expect(() => Subtitle.create(invalidData)).toThrow('Start time cannot be negative');
    });

    it('should throw ValidationError for invalid endTime', () => {
      const invalidData = { ...validCreateData, endTime: -1 };

      expect(() => Subtitle.create(invalidData)).toThrow(ValidationError);
      expect(() => Subtitle.create(invalidData)).toThrow('End time cannot be negative');
    });

    it('should throw ValidationError when startTime >= endTime', () => {
      const invalidData = { ...validCreateData, startTime: 20, endTime: 15 };

      expect(() => Subtitle.create(invalidData)).toThrow(ValidationError);
      expect(() => Subtitle.create(invalidData)).toThrow('Start time must be less than end time');
    });

    it('should throw ValidationError for equal start and end times', () => {
      const invalidData = { ...validCreateData, startTime: 15, endTime: 15 };

      expect(() => Subtitle.create(invalidData)).toThrow(ValidationError);
      expect(() => Subtitle.create(invalidData)).toThrow('Start time must be less than end time');
    });

    it('should throw ValidationError for subtitle segment exceeding 1 hour', () => {
      const invalidData = { ...validCreateData, startTime: 0, endTime: 3601 };

      expect(() => Subtitle.create(invalidData)).toThrow(ValidationError);
      expect(() => Subtitle.create(invalidData)).toThrow('Subtitle segment cannot exceed 1 hour');
    });

    it('should throw ValidationError for empty text', () => {
      const invalidData = { ...validCreateData, text: '' };

      expect(() => Subtitle.create(invalidData)).toThrow(ValidationError);
      expect(() => Subtitle.create(invalidData)).toThrow('Text cannot be empty');
    });

    it('should throw ValidationError for text exceeding 1000 characters', () => {
      const invalidData = { ...validCreateData, text: 'a'.repeat(1001) };

      expect(() => Subtitle.create(invalidData)).toThrow(ValidationError);
      expect(() => Subtitle.create(invalidData)).toThrow('Text cannot exceed 1000 characters');
    });

    it('should throw ValidationError for confidence outside 0-1 range', () => {
      const invalidData1 = { ...validCreateData, confidence: -0.1 };
      const invalidData2 = { ...validCreateData, confidence: 1.1 };

      expect(() => Subtitle.create(invalidData1)).toThrow(ValidationError);
      expect(() => Subtitle.create(invalidData1)).toThrow('Confidence must be between 0 and 1');
      
      expect(() => Subtitle.create(invalidData2)).toThrow(ValidationError);
      expect(() => Subtitle.create(invalidData2)).toThrow('Confidence must be between 0 and 1');
    });
  });

  describe('Subtitle constructor', () => {
    it('should create subtitle instance from valid data', () => {
      const subtitle = new Subtitle(validSubtitleData);

      expect(subtitle.id).toBe(validSubtitleData.id);
      expect(subtitle.videoId).toBe(validSubtitleData.videoId);
      expect(subtitle.startTime).toBe(validSubtitleData.startTime);
      expect(subtitle.endTime).toBe(validSubtitleData.endTime);
      expect(subtitle.text).toBe(validSubtitleData.text);
      expect(subtitle.confidence).toBe(validSubtitleData.confidence);
      expect(subtitle.createdAt).toBe(validSubtitleData.createdAt);
    });

    it('should handle undefined confidence', () => {
      const dataWithoutConfidence = { ...validSubtitleData };
      delete dataWithoutConfidence.confidence;

      const subtitle = new Subtitle(dataWithoutConfidence);

      expect(subtitle.confidence).toBeUndefined();
    });
  });

  describe('Subtitle.update()', () => {
    let subtitle: Subtitle;

    beforeEach(() => {
      subtitle = new Subtitle(validSubtitleData);
    });

    it('should update startTime', () => {
      const updateData: UpdateSubtitleData = { startTime: 5.0 };
      subtitle.update(updateData);

      expect(subtitle.startTime).toBe(5.0);
    });

    it('should update endTime', () => {
      const updateData: UpdateSubtitleData = { endTime: 20.0 };
      subtitle.update(updateData);

      expect(subtitle.endTime).toBe(20.0);
    });

    it('should update text', () => {
      const updateData: UpdateSubtitleData = { text: 'Updated subtitle text' };
      subtitle.update(updateData);

      expect(subtitle.text).toBe('Updated subtitle text');
    });

    it('should update confidence', () => {
      const updateData: UpdateSubtitleData = { confidence: 0.8 };
      subtitle.update(updateData);

      expect(subtitle.confidence).toBe(0.8);
    });

    it('should throw ValidationError when updated times create invalid relationship', () => {
      const updateData: UpdateSubtitleData = { startTime: 20, endTime: 15 };

      expect(() => subtitle.update(updateData)).toThrow(ValidationError);
      expect(() => subtitle.update(updateData)).toThrow('Start time must be less than end time');
    });

    it('should validate individual time updates', () => {
      expect(() => subtitle.update({ startTime: -1 })).toThrow(ValidationError);
      expect(() => subtitle.update({ endTime: -1 })).toThrow(ValidationError);
    });
  });

  describe('Subtitle utility methods', () => {
    let subtitle: Subtitle;

    beforeEach(() => {
      subtitle = new Subtitle(validSubtitleData);
    });

    describe('getDuration()', () => {
      it('should return correct duration', () => {
        expect(subtitle.getDuration()).toBeCloseTo(4.7, 1); // 15.2 - 10.5
      });
    });

    describe('formatTimestamp()', () => {
      it('should format seconds correctly without hours', () => {
        expect(Subtitle.formatTimestamp(65.5)).toBe('1:05.500');
        expect(Subtitle.formatTimestamp(10.123)).toBe('0:10.122');
      });

      it('should format seconds correctly with hours', () => {
        expect(Subtitle.formatTimestamp(3665.5)).toBe('1:01:05.500');
        expect(Subtitle.formatTimestamp(7200)).toBe('2:00:00.000');
      });
    });

    describe('getFormattedStartTime() and getFormattedEndTime()', () => {
      it('should return formatted timestamps', () => {
        expect(subtitle.getFormattedStartTime()).toBe('0:10.500');
        expect(subtitle.getFormattedEndTime()).toBe('0:15.199');
      });
    });

    describe('getFormattedDuration()', () => {
      it('should return formatted duration', () => {
        expect(subtitle.getFormattedDuration()).toBe('0:04.699');
      });
    });

    describe('containsTimestamp()', () => {
      it('should return true for timestamps within range', () => {
        expect(subtitle.containsTimestamp(12.0)).toBe(true);
        expect(subtitle.containsTimestamp(10.5)).toBe(true); // start time
        expect(subtitle.containsTimestamp(15.2)).toBe(true); // end time
      });

      it('should return false for timestamps outside range', () => {
        expect(subtitle.containsTimestamp(9.0)).toBe(false);
        expect(subtitle.containsTimestamp(16.0)).toBe(false);
      });
    });

    describe('overlapsWith()', () => {
      it('should detect overlapping subtitles', () => {
        const overlappingSubtitle = new Subtitle({
          ...validSubtitleData,
          id: 'sub_different_id',
          startTime: 14.0,
          endTime: 18.0
        });

        expect(subtitle.overlapsWith(overlappingSubtitle)).toBe(true);
        expect(overlappingSubtitle.overlapsWith(subtitle)).toBe(true);
      });

      it('should not detect non-overlapping subtitles', () => {
        const nonOverlappingSubtitle = new Subtitle({
          ...validSubtitleData,
          id: 'sub_different_id',
          startTime: 16.0,
          endTime: 20.0
        });

        expect(subtitle.overlapsWith(nonOverlappingSubtitle)).toBe(false);
        expect(nonOverlappingSubtitle.overlapsWith(subtitle)).toBe(false);
      });
    });

    describe('getOverlapDuration()', () => {
      it('should calculate overlap duration correctly', () => {
        const overlappingSubtitle = new Subtitle({
          ...validSubtitleData,
          id: 'sub_different_id',
          startTime: 14.0,
          endTime: 18.0
        });

        expect(subtitle.getOverlapDuration(overlappingSubtitle)).toBeCloseTo(1.2, 1); // 15.2 - 14.0
      });

      it('should return 0 for non-overlapping subtitles', () => {
        const nonOverlappingSubtitle = new Subtitle({
          ...validSubtitleData,
          id: 'sub_different_id',
          startTime: 16.0,
          endTime: 20.0
        });

        expect(subtitle.getOverlapDuration(nonOverlappingSubtitle)).toBe(0);
      });
    });
  });

  describe('Text processing methods', () => {
    describe('processText()', () => {
      it('should clean subtitle text artifacts', () => {
        const dirtyText = '  [Music]  This is   a test  (applause) subtitle.  ';
        const cleanText = Subtitle.processText(dirtyText);

        expect(cleanText).toBe('This is a test subtitle.');
      });

      it('should fix punctuation spacing', () => {
        const text = 'Hello , world ! How are you ?';
        const cleanText = Subtitle.processText(text);

        expect(cleanText).toBe('Hello, world! How are you?');
      });

      it('should handle empty brackets and parentheses', () => {
        const text = 'Hello [] world () test';
        const cleanText = Subtitle.processText(text);

        expect(cleanText).toBe('Hello world test');
      });
    });

    describe('getProcessedText()', () => {
      it('should return processed version of subtitle text', () => {
        const subtitle = new Subtitle({
          ...validSubtitleData,
          text: '  [Music]  Test   subtitle  (noise)  '
        });

        expect(subtitle.getProcessedText()).toBe('Test subtitle');
      });
    });
  });

  describe('Confidence methods', () => {
    describe('hasHighConfidence()', () => {
      it('should return true for high confidence subtitles', () => {
        const highConfidenceSubtitle = new Subtitle({
          ...validSubtitleData,
          confidence: 0.9
        });

        expect(highConfidenceSubtitle.hasHighConfidence()).toBe(true);
      });

      it('should return false for low confidence subtitles', () => {
        const lowConfidenceSubtitle = new Subtitle({
          ...validSubtitleData,
          confidence: 0.7
        });

        expect(lowConfidenceSubtitle.hasHighConfidence()).toBe(false);
      });

      it('should return false when confidence is undefined', () => {
        const dataWithoutConfidence = { ...validSubtitleData };
        delete dataWithoutConfidence.confidence;
        const noConfidenceSubtitle = new Subtitle(dataWithoutConfidence);

        expect(noConfidenceSubtitle.hasHighConfidence()).toBe(false);
      });
    });

    describe('hasLowConfidence()', () => {
      it('should return true for low confidence subtitles', () => {
        const lowConfidenceSubtitle = new Subtitle({
          ...validSubtitleData,
          confidence: 0.3
        });

        expect(lowConfidenceSubtitle.hasLowConfidence()).toBe(true);
      });

      it('should return false for high confidence subtitles', () => {
        const highConfidenceSubtitle = new Subtitle({
          ...validSubtitleData,
          confidence: 0.8
        });

        expect(highConfidenceSubtitle.hasLowConfidence()).toBe(false);
      });
    });
  });

  describe('getYouTubeUrlWithTimestamp()', () => {
    it('should generate correct YouTube URL with timestamp', () => {
      const subtitle = new Subtitle(validSubtitleData);
      const url = subtitle.getYouTubeUrlWithTimestamp('dQw4w9WgXcQ');

      expect(url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s');
    });

    it('should handle fractional seconds by flooring', () => {
      const subtitle = new Subtitle({
        ...validSubtitleData,
        startTime: 10.9
      });
      const url = subtitle.getYouTubeUrlWithTimestamp('dQw4w9WgXcQ');

      expect(url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s');
    });
  });

  describe('validateSubtitleBatch()', () => {
    it('should validate non-overlapping subtitles', () => {
      const subtitles = [
        new Subtitle({ ...validSubtitleData, id: 'sub1', startTime: 0, endTime: 5 }),
        new Subtitle({ ...validSubtitleData, id: 'sub2', startTime: 6, endTime: 10 }),
        new Subtitle({ ...validSubtitleData, id: 'sub3', startTime: 11, endTime: 15 })
      ];

      expect(() => Subtitle.validateSubtitleBatch(subtitles)).not.toThrow();
    });

    it('should allow small overlaps (less than 0.5 seconds)', () => {
      const subtitles = [
        new Subtitle({ ...validSubtitleData, id: 'sub1', startTime: 0, endTime: 5.2 }),
        new Subtitle({ ...validSubtitleData, id: 'sub2', startTime: 5, endTime: 10 })
      ];

      expect(() => Subtitle.validateSubtitleBatch(subtitles)).not.toThrow();
    });

    it('should throw ValidationError for significant overlaps', () => {
      const subtitles = [
        new Subtitle({ ...validSubtitleData, id: 'sub1', startTime: 0, endTime: 6 }),
        new Subtitle({ ...validSubtitleData, id: 'sub2', startTime: 5, endTime: 10 })
      ];

      expect(() => Subtitle.validateSubtitleBatch(subtitles)).toThrow(ValidationError);
      expect(() => Subtitle.validateSubtitleBatch(subtitles)).toThrow('Subtitle overlap detected');
    });

    it('should handle empty array', () => {
      expect(() => Subtitle.validateSubtitleBatch([])).not.toThrow();
    });

    it('should handle single subtitle', () => {
      const subtitles = [new Subtitle(validSubtitleData)];

      expect(() => Subtitle.validateSubtitleBatch(subtitles)).not.toThrow();
    });
  });

  describe('toJSON()', () => {
    it('should return correct JSON representation with confidence', () => {
      const subtitle = new Subtitle(validSubtitleData);
      const json = subtitle.toJSON();

      expect(json).toEqual({
        id: validSubtitleData.id,
        videoId: validSubtitleData.videoId,
        startTime: validSubtitleData.startTime,
        endTime: validSubtitleData.endTime,
        text: validSubtitleData.text,
        confidence: validSubtitleData.confidence,
        createdAt: validSubtitleData.createdAt
      });
    });

    it('should return correct JSON representation without confidence', () => {
      const dataWithoutConfidence = { ...validSubtitleData };
      delete dataWithoutConfidence.confidence;
      
      const subtitle = new Subtitle(dataWithoutConfidence);
      const json = subtitle.toJSON();

      expect(json).toEqual({
        id: validSubtitleData.id,
        videoId: validSubtitleData.videoId,
        startTime: validSubtitleData.startTime,
        endTime: validSubtitleData.endTime,
        text: validSubtitleData.text,
        createdAt: validSubtitleData.createdAt
      });
      expect(json.confidence).toBeUndefined();
    });
  });
});