import { MigrationManager, runDatabaseMigrations } from '../migrations';
import { DatabaseConnection } from '../connection';
import fs from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock path module
jest.mock('path');
const mockPath = path as jest.Mocked<typeof path>;

describe('MigrationManager', () => {
  let mockDb: jest.Mocked<DatabaseConnection>;
  let mockClient: any;
  let migrationManager: MigrationManager;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
    };

    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
      getClient: jest.fn(),
      testConnection: jest.fn(),
      close: jest.fn(),
      getPoolInfo: jest.fn(),
    } as any;

    migrationManager = new MigrationManager(mockDb);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('runInitialSchema', () => {
    it('should run initial schema when not already executed', async () => {
      const schemaSql = 'CREATE TABLE test();';
      
      mockPath.join.mockReturnValue('/path/to/schema.sql');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(schemaSql);
      
      // Mock migrations table creation and check
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // createMigrationsTable
        .mockResolvedValueOnce({ rows: [] }) // getExecutedMigrations
        .mockResolvedValueOnce({ rows: [] }); // markMigrationAsExecuted

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockClient);
      });

      await migrationManager.runInitialSchema();

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO migrations (id, name) VALUES ($1, $2)',
        ['001_initial_schema', 'Initial database schema']
      );
    });

    it('should skip initial schema if already executed', async () => {
      const schemaSql = 'CREATE TABLE test();';
      
      mockPath.join.mockReturnValue('/path/to/schema.sql');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(schemaSql);
      
      // Mock that migration already exists
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // createMigrationsTable
        .mockResolvedValueOnce({ rows: [{ id: '001_initial_schema' }] }); // getExecutedMigrations

      await migrationManager.runInitialSchema();

      expect(mockDb.transaction).toHaveBeenCalled();
      // Should not call markMigrationAsExecuted
      expect(mockDb.query).not.toHaveBeenCalledWith(
        'INSERT INTO migrations (id, name) VALUES ($1, $2)',
        expect.any(Array)
      );
    });

    it('should throw error if schema file not found', async () => {
      mockPath.join.mockReturnValue('/path/to/schema.sql');
      mockFs.existsSync.mockReturnValue(false);

      await expect(migrationManager.runInitialSchema()).rejects.toThrow(
        'Migration file not found: /path/to/schema.sql'
      );
    });
  });

  describe('runMigrations', () => {
    it('should run pending migrations in order', async () => {
      const migrationFiles = ['002_add_indexes.sql', '003_add_constraints.sql'];
      const migrationSql1 = 'CREATE INDEX test_idx ON test(id);';
      const migrationSql2 = 'ALTER TABLE test ADD CONSTRAINT test_pk PRIMARY KEY (id);';

      mockPath.join
        .mockReturnValueOnce('/migrations')
        .mockReturnValueOnce('/migrations/002_add_indexes.sql')
        .mockReturnValueOnce('/migrations/003_add_constraints.sql');
      
      mockPath.basename
        .mockReturnValueOnce('002_add_indexes')
        .mockReturnValueOnce('003_add_constraints');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(migrationFiles as any);
      mockFs.readFileSync
        .mockReturnValueOnce(migrationSql1)
        .mockReturnValueOnce(migrationSql2);

      // Mock no executed migrations
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // createMigrationsTable
        .mockResolvedValueOnce({ rows: [] }) // getExecutedMigrations
        .mockResolvedValueOnce({ rows: [] }) // markMigrationAsExecuted 1
        .mockResolvedValueOnce({ rows: [] }); // markMigrationAsExecuted 2

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockClient);
      });

      await migrationManager.runMigrations();

      expect(mockDb.transaction).toHaveBeenCalledTimes(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO migrations (id, name) VALUES ($1, $2)',
        ['002_add_indexes', '002_add_indexes.sql']
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO migrations (id, name) VALUES ($1, $2)',
        ['003_add_constraints', '003_add_constraints.sql']
      );
    });

    it('should skip already executed migrations', async () => {
      const migrationFiles = ['002_add_indexes.sql'];

      mockPath.join.mockReturnValueOnce('/migrations');
      mockPath.basename.mockReturnValueOnce('002_add_indexes');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(migrationFiles as any);

      // Mock that migration already executed
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // createMigrationsTable
        .mockResolvedValueOnce({ rows: [{ id: '002_add_indexes' }] }); // getExecutedMigrations

      await migrationManager.runMigrations();

      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('should handle migration directory not existing', async () => {
      mockPath.join.mockReturnValueOnce('/migrations');
      mockFs.existsSync.mockReturnValue(false);

      await migrationManager.runMigrations();

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should rollback and throw error on migration failure', async () => {
      const migrationFiles = ['002_add_indexes.sql'];
      const migrationSql = 'INVALID SQL;';

      mockPath.join
        .mockReturnValueOnce('/migrations')
        .mockReturnValueOnce('/migrations/002_add_indexes.sql');
      
      mockPath.basename.mockReturnValueOnce('002_add_indexes');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(migrationFiles as any);
      mockFs.readFileSync.mockReturnValue(migrationSql);

      // Mock no executed migrations
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // createMigrationsTable
        .mockResolvedValueOnce({ rows: [] }); // getExecutedMigrations

      const error = new Error('SQL syntax error');
      mockDb.transaction.mockRejectedValue(error);

      await expect(migrationManager.runMigrations()).rejects.toThrow('SQL syntax error');
    });
  });

  describe('getMigrationStatus', () => {
    it('should return list of executed migrations', async () => {
      const mockMigrations = [
        { id: '001_initial_schema', name: 'Initial database schema', executed_at: new Date() },
        { id: '002_add_indexes', name: '002_add_indexes.sql', executed_at: new Date() },
      ];

      mockDb.query.mockResolvedValue({ rows: mockMigrations });

      const result = await migrationManager.getMigrationStatus();

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('001_initial_schema');
      expect(result[1]?.id).toBe('002_add_indexes');
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id, name, executed_at FROM migrations ORDER BY executed_at'
      );
    });
  });

  describe('rollbackLastMigration', () => {
    it('should rollback the last migration', async () => {
      const lastMigration = { id: '002_add_indexes', name: '002_add_indexes.sql' };
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [lastMigration] }) // get last migration
        .mockResolvedValueOnce({ rows: [] }); // delete migration

      await migrationManager.rollbackLastMigration();

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM migrations WHERE id = $1',
        ['002_add_indexes']
      );
    });

    it('should handle no migrations to rollback', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await migrationManager.rollbackLastMigration();

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });
  });
});

describe('runDatabaseMigrations', () => {
  let mockDb: jest.Mocked<DatabaseConnection>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
      getClient: jest.fn(),
      testConnection: jest.fn(),
      close: jest.fn(),
      getPoolInfo: jest.fn(),
    } as any;

    jest.clearAllMocks();
  });

  it('should run initial schema and migrations successfully', async () => {
    const schemaSql = 'CREATE TABLE test();';
    
    mockPath.join.mockReturnValue('/path/to/schema.sql');
    mockFs.existsSync
      .mockReturnValueOnce(true) // schema file exists
      .mockReturnValueOnce(false); // migrations directory doesn't exist
    mockFs.readFileSync.mockReturnValue(schemaSql);

    const mockTransactionClient = {
      query: jest.fn().mockResolvedValue({ rows: [] })
    };

    mockDb.query
      .mockResolvedValueOnce({ rows: [] }) // createMigrationsTable
      .mockResolvedValueOnce({ rows: [] }) // getExecutedMigrations
      .mockResolvedValueOnce({ rows: [] }); // markMigrationAsExecuted

    mockDb.transaction.mockImplementation(async (callback) => {
      return await callback(mockTransactionClient as any);
    });

    await runDatabaseMigrations(mockDb);

    expect(mockDb.transaction).toHaveBeenCalled();
  });

  it('should throw error if migrations fail', async () => {
    mockPath.join.mockReturnValue('/path/to/schema.sql');
    mockFs.existsSync.mockReturnValue(false);

    await expect(runDatabaseMigrations(mockDb)).rejects.toThrow('Migration file not found');
  });
});