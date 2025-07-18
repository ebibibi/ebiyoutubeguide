import Redis from 'redis';
import { config } from './index';

export class RedisConnection {
  private static instance: Redis.RedisClientType;
  private static isConnected = false;

  public static async getInstance(): Promise<Redis.RedisClientType> {
    if (!this.instance) {
      const redisConfig: any = {
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
      };

      if (config.redis.password) {
        redisConfig.password = config.redis.password;
      }

      this.instance = Redis.createClient(redisConfig);

      this.instance.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.instance.on('connect', () => {
        console.log('Redis Client Connected');
        this.isConnected = true;
      });

      this.instance.on('ready', () => {
        console.log('Redis Client Ready');
      });

      this.instance.on('end', () => {
        console.log('Redis Client Disconnected');
        this.isConnected = false;
      });
    }

    if (!this.isConnected) {
      await this.instance.connect();
    }

    return this.instance;
  }

  public static async disconnect(): Promise<void> {
    if (this.instance && this.isConnected) {
      await this.instance.disconnect();
      this.isConnected = false;
    }
  }

  public static isConnectionReady(): boolean {
    return this.isConnected;
  }
}