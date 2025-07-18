import { Channel, ValidationError, CreateChannelData, UpdateChannelData, IChannel } from '../Channel';

describe('Channel Model', () => {
  const validCreateData: CreateChannelData = {
    channelId: 'UCrAOnWg4S-XDI9M_vhLw8Ag',
    name: 'Test Channel',
    description: 'A test channel description',
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    videoCount: 100
  };

  const validChannelData: IChannel = {
    id: 'ch_123456789_abc123def',
    channelId: 'UCrAOnWg4S-XDI9M_vhLw8Ag',
    name: 'Test Channel',
    description: 'A test channel description',
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    videoCount: 100,
    indexedVideoCount: 50,
    lastIndexed: new Date('2023-01-01'),
    indexingStatus: 'completed',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  describe('Channel.create()', () => {
    it('should create a valid channel with required fields', () => {
      const minimalData = {
        channelId: 'UCrAOnWg4S-XDI9M_vhLw8Ag',
        name: 'Test Channel'
      };

      const channel = Channel.create(minimalData);

      expect(channel.channelId).toBe(minimalData.channelId);
      expect(channel.name).toBe(minimalData.name);
      expect(channel.videoCount).toBe(0);
      expect(channel.indexedVideoCount).toBe(0);
      expect(channel.indexingStatus).toBe('pending');
      expect(channel.id).toMatch(/^ch_\d+_[a-z0-9]+$/);
      expect(channel.createdAt).toBeInstanceOf(Date);
      expect(channel.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a channel with all optional fields', () => {
      const channel = Channel.create(validCreateData);

      expect(channel.channelId).toBe(validCreateData.channelId);
      expect(channel.name).toBe(validCreateData.name);
      expect(channel.description).toBe(validCreateData.description);
      expect(channel.thumbnailUrl).toBe(validCreateData.thumbnailUrl);
      expect(channel.videoCount).toBe(validCreateData.videoCount);
    });

    it('should throw ValidationError for missing channelId', () => {
      const invalidData = { ...validCreateData };
      delete (invalidData as any).channelId;

      expect(() => Channel.create(invalidData)).toThrow(ValidationError);
      expect(() => Channel.create(invalidData)).toThrow('Channel ID is required');
    });

    it('should throw ValidationError for invalid channelId', () => {
      const invalidData = { ...validCreateData, channelId: 'invalid-id' };

      expect(() => Channel.create(invalidData)).toThrow(ValidationError);
      expect(() => Channel.create(invalidData)).toThrow('Invalid YouTube channel ID format');
    });

    it('should throw ValidationError for missing name', () => {
      const invalidData = { ...validCreateData };
      delete (invalidData as any).name;

      expect(() => Channel.create(invalidData)).toThrow(ValidationError);
      expect(() => Channel.create(invalidData)).toThrow('Channel name is required');
    });

    it('should throw ValidationError for empty name', () => {
      const invalidData = { ...validCreateData, name: '   ' };

      expect(() => Channel.create(invalidData)).toThrow(ValidationError);
      expect(() => Channel.create(invalidData)).toThrow('Channel name cannot be empty');
    });

    it('should throw ValidationError for name too long', () => {
      const invalidData = { ...validCreateData, name: 'a'.repeat(256) };

      expect(() => Channel.create(invalidData)).toThrow(ValidationError);
      expect(() => Channel.create(invalidData)).toThrow('Channel name cannot exceed 255 characters');
    });

    it('should throw ValidationError for description too long', () => {
      const invalidData = { ...validCreateData, description: 'a'.repeat(1001) };

      expect(() => Channel.create(invalidData)).toThrow(ValidationError);
      expect(() => Channel.create(invalidData)).toThrow('Channel description cannot exceed 1000 characters');
    });

    it('should throw ValidationError for invalid thumbnail URL', () => {
      const invalidData = { ...validCreateData, thumbnailUrl: 'not-a-url' };

      expect(() => Channel.create(invalidData)).toThrow(ValidationError);
      expect(() => Channel.create(invalidData)).toThrow('Invalid thumbnail URL format');
    });

    it('should throw ValidationError for negative video count', () => {
      const invalidData = { ...validCreateData, videoCount: -1 };

      expect(() => Channel.create(invalidData)).toThrow(ValidationError);
      expect(() => Channel.create(invalidData)).toThrow('Video count must be a non-negative number');
    });
  });

  describe('Channel.update()', () => {
    let channel: Channel;

    beforeEach(() => {
      channel = new Channel(validChannelData);
    });

    it('should update channel name', () => {
      const newName = 'Updated Channel Name';
      const originalUpdatedAt = channel.updatedAt;

      // Wait a bit to ensure updatedAt changes
      setTimeout(() => {
        channel.update({ name: newName });

        expect(channel.name).toBe(newName);
        expect(channel.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 1);
    });

    it('should update multiple fields', () => {
      const updateData: UpdateChannelData = {
        name: 'New Name',
        description: 'New Description',
        videoCount: 200,
        indexedVideoCount: 150,
        indexingStatus: 'in_progress'
      };

      channel.update(updateData);

      expect(channel.name).toBe(updateData.name);
      expect(channel.description).toBe(updateData.description);
      expect(channel.videoCount).toBe(updateData.videoCount);
      expect(channel.indexedVideoCount).toBe(updateData.indexedVideoCount);
      expect(channel.indexingStatus).toBe(updateData.indexingStatus);
    });

    it('should throw ValidationError for invalid update data', () => {
      expect(() => channel.update({ name: '' })).toThrow(ValidationError);
      expect(() => channel.update({ videoCount: -1 })).toThrow(ValidationError);
      expect(() => channel.update({ indexingStatus: 'invalid' as any })).toThrow(ValidationError);
    });

    it('should not update fields that are undefined', () => {
      const originalName = channel.name;
      const originalDescription = channel.description;

      channel.update({ videoCount: 300 });

      expect(channel.name).toBe(originalName);
      expect(channel.description).toBe(originalDescription);
      expect(channel.videoCount).toBe(300);
    });
  });

  describe('Channel validation methods', () => {
    describe('isValidYouTubeChannelId()', () => {
      it('should validate UC format channel IDs', () => {
        expect(Channel.isValidYouTubeChannelId('UCrAOnWg4S-XDI9M_vhLw8Ag')).toBe(true);
        expect(Channel.isValidYouTubeChannelId('UC1234567890123456789012')).toBe(true);
      });

      it('should validate handle format channel IDs', () => {
        expect(Channel.isValidYouTubeChannelId('@testchannel')).toBe(true);
        expect(Channel.isValidYouTubeChannelId('testchannel')).toBe(true);
        expect(Channel.isValidYouTubeChannelId('test_channel-123')).toBe(true);
      });

      it('should reject invalid channel IDs', () => {
        expect(Channel.isValidYouTubeChannelId('UC123')).toBe(false); // too short
        expect(Channel.isValidYouTubeChannelId('XC1234567890123456789012')).toBe(false); // wrong prefix
        expect(Channel.isValidYouTubeChannelId('')).toBe(false); // empty
        expect(Channel.isValidYouTubeChannelId('invalid channel')).toBe(false); // spaces
      });
    });

    describe('isValidUrl()', () => {
      it('should validate correct URLs', () => {
        expect(Channel.isValidUrl('https://example.com')).toBe(true);
        expect(Channel.isValidUrl('http://example.com/path')).toBe(true);
        expect(Channel.isValidUrl('https://example.com/path?query=value')).toBe(true);
      });

      it('should reject invalid URLs', () => {
        expect(Channel.isValidUrl('not-a-url')).toBe(false);
        expect(Channel.isValidUrl('ftp://example.com')).toBe(true); // FTP is valid URL
        expect(Channel.isValidUrl('')).toBe(false);
        expect(Channel.isValidUrl('example.com')).toBe(false); // missing protocol
      });
    });

    describe('generateId()', () => {
      it('should generate unique IDs', () => {
        const id1 = Channel.generateId();
        const id2 = Channel.generateId();

        expect(id1).toMatch(/^ch_\d+_[a-z0-9]+$/);
        expect(id2).toMatch(/^ch_\d+_[a-z0-9]+$/);
        expect(id1).not.toBe(id2);
      });
    });
  });

  describe('Channel constructor and methods', () => {
    it('should create channel instance from IChannel data', () => {
      const channel = new Channel(validChannelData);

      expect(channel.id).toBe(validChannelData.id);
      expect(channel.channelId).toBe(validChannelData.channelId);
      expect(channel.name).toBe(validChannelData.name);
      expect(channel.description).toBe(validChannelData.description);
      expect(channel.thumbnailUrl).toBe(validChannelData.thumbnailUrl);
      expect(channel.videoCount).toBe(validChannelData.videoCount);
      expect(channel.indexedVideoCount).toBe(validChannelData.indexedVideoCount);
      expect(channel.lastIndexed).toBe(validChannelData.lastIndexed);
      expect(channel.indexingStatus).toBe(validChannelData.indexingStatus);
      expect(channel.createdAt).toBe(validChannelData.createdAt);
      expect(channel.updatedAt).toBe(validChannelData.updatedAt);
    });

    it('should convert to JSON correctly', () => {
      const channel = new Channel(validChannelData);
      const json = channel.toJSON();

      expect(json).toEqual(validChannelData);
      expect(json).not.toBe(validChannelData); // should be a copy
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with message and field', () => {
      const error = new ValidationError('Test error', 'testField');

      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
      expect(error.name).toBe('ValidationError');
      expect(error).toBeInstanceOf(Error);
    });

    it('should create ValidationError with message only', () => {
      const error = new ValidationError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.field).toBeUndefined();
      expect(error.name).toBe('ValidationError');
    });
  });
});