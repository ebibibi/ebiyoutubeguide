import Redis from 'redis';
import { RedisConnection } from '../redis';

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('RedisConnection', () => {
  let mockRedisClient: any;

  beforeEach(() => {
    mockRedisClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    };

    (Redis.createClient as jest.Mock).mockReturnValue(mockRedisClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset the singleton instance
    (RedisConnection as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should create and return a Redis client instance', async () => {
      const instance = await RedisConnection.getInstance();

      expect(Redis.createClient).toHaveBeenCalledWith({
        socket: {
          host: 'localhost',
          port: 6379,
        },
      });

      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(instance).toBe(mockRedisClient);
    });

    it('should return the same instance on subsequent calls', async () => {
      const instance1 = await RedisConnection.getInstance();
      const instance2 = await RedisConnection.getInstance();

      expect(instance1).toBe(instance2);
      expect(Redis.createClient).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await RedisConnection.getInstance();

      // Simulate error event
      const errorHandler = mockRedisClient.on.mock.calls.find((call: any) => call[0] === 'error')[1];
      const testError = new Error('Connection failed');
      errorHandler(testError);

      expect(consoleSpy).toHaveBeenCalledWith('Redis Client Error:', testError);
      
      consoleSpy.mockRestore();
    });

    it('should handle connect event', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await RedisConnection.getInstance();

      // Simulate connect event
      const connectHandler = mockRedisClient.on.mock.calls.find((call: any) => call[0] === 'connect')[1];
      connectHandler();

      expect(consoleSpy).toHaveBeenCalledWith('Redis Client Connected');
      
      consoleSpy.mockRestore();
    });

    it('should handle ready event', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await RedisConnection.getInstance();

      // Simulate ready event
      const readyHandler = mockRedisClient.on.mock.calls.find((call: any) => call[0] === 'ready')[1];
      readyHandler();

      expect(consoleSpy).toHaveBeenCalledWith('Redis Client Ready');
      
      consoleSpy.mockRestore();
    });
  });

  describe('disconnect', () => {
    it('should disconnect the Redis client', async () => {
      await RedisConnection.getInstance();
      await RedisConnection.disconnect();

      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect when no instance exists', async () => {
      await RedisConnection.disconnect();

      expect(mockRedisClient.disconnect).not.toHaveBeenCalled();
    });
  });
});