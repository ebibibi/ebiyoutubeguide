import { DatabaseConnection, getDatabaseConfig } from '../connection';
import { Pool } from 'pg';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    get totalCount() { return 0; },
    get idleCount() { return 0; },
    get waitingCount() { return 0; },
  })),
}));

describe('DatabaseConnection', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockClient: any;

  beforeEach(() => {
    // Reset the singleton instance
    (DatabaseConnection as any).instance = undefined;
    
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = new Pool() as jest.Mocked<Pool>;
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
    
    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should create a new instance with config', () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
      };

      const instance = DatabaseConnection.getInstance(config);
      expect(instance).toBeInstanceOf(DatabaseConnection);
    });

    it('should return the same instance on subsequent calls', () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
      };

      const instance1 = DatabaseConnection.getInstance(config);
      const instance2 = DatabaseConnection.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should throw error if no config provided for first initialization', () => {
      expect(() => {
        DatabaseConnection.getInstance();
      }).toThrow('Database configuration is required for first initialization');
    });
  });

  describe('query', () => {
    it('should execute query and release client', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
      };

      const db = DatabaseConnection.getInstance(config);
      const mockResult = { rows: [{ id: 1 }] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await db.query('SELECT * FROM test', ['param']);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM test', ['param']);
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });

    it('should release client even if query fails', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
      };

      const db = DatabaseConnection.getInstance(config);
      const error = new Error('Query failed');
      mockClient.query.mockRejectedValue(error);

      await expect(db.query('SELECT * FROM test')).rejects.toThrow('Query failed');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('transaction', () => {
    it('should execute transaction and commit on success', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
      };

      const db = DatabaseConnection.getInstance(config);
      const callback = jest.fn().mockResolvedValue('success');

      const result = await db.transaction(callback);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe('success');
    });

    it('should rollback transaction on error', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
      };

      const db = DatabaseConnection.getInstance(config);
      const error = new Error('Transaction failed');
      const callback = jest.fn().mockRejectedValue(error);

      await expect(db.transaction(callback)).rejects.toThrow('Transaction failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection test', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
      };

      const db = DatabaseConnection.getInstance(config);
      mockClient.query.mockResolvedValue({ rows: [{ now: new Date() }] });

      const result = await db.testConnection();

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT NOW()', undefined);
    });

    it('should return false for failed connection test', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
      };

      const db = DatabaseConnection.getInstance(config);
      mockClient.query.mockRejectedValue(new Error('Connection failed'));

      const result = await db.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getPoolInfo', () => {
    it('should return pool information', () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
      };

      Object.defineProperty(mockPool, 'totalCount', { value: 10 });
      Object.defineProperty(mockPool, 'idleCount', { value: 5 });
      Object.defineProperty(mockPool, 'waitingCount', { value: 2 });

      const db = DatabaseConnection.getInstance(config);
      const info = db.getPoolInfo();

      expect(info).toEqual({
        totalCount: 10,
        idleCount: 5,
        waitingCount: 2,
      });
    });
  });
});

describe('getDatabaseConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default config when no environment variables are set', () => {
    delete process.env['DB_HOST'];
    delete process.env['DB_PORT'];
    delete process.env['DB_NAME'];
    delete process.env['DB_USER'];
    delete process.env['DB_PASSWORD'];

    const config = getDatabaseConfig();

    expect(config).toEqual({
      host: 'localhost',
      port: 5432,
      database: 'youtube_content_search',
      user: 'postgres',
      password: '',
      ssl: false,
      maxConnections: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  });

  it('should use environment variables when provided', () => {
    process.env['DB_HOST'] = 'custom-host';
    process.env['DB_PORT'] = '3306';
    process.env['DB_NAME'] = 'custom-db';
    process.env['DB_USER'] = 'custom-user';
    process.env['DB_PASSWORD'] = 'custom-password';
    process.env['DB_SSL'] = 'true';
    process.env['DB_MAX_CONNECTIONS'] = '50';

    const config = getDatabaseConfig();

    expect(config).toEqual({
      host: 'custom-host',
      port: 3306,
      database: 'custom-db',
      user: 'custom-user',
      password: 'custom-password',
      ssl: true,
      maxConnections: 50,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  });
});