import fs from 'fs';
import path from 'path';
import { DatabaseConnection } from './connection';

export interface Migration {
  id: string;
  name: string;
  sql: string;
  executedAt?: Date;
}

export class MigrationManager {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  private async createMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(500) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await this.db.query(createTableSQL);
  }

  private async getExecutedMigrations(): Promise<string[]> {
    await this.createMigrationsTable();
    
    const result = await this.db.query('SELECT id FROM migrations ORDER BY executed_at');
    return result.rows.map((row: any) => row.id);
  }

  private async markMigrationAsExecuted(migration: Migration): Promise<void> {
    await this.db.query(
      'INSERT INTO migrations (id, name) VALUES ($1, $2)',
      [migration.id, migration.name]
    );
  }

  private loadMigrationFile(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
  }

  public async runInitialSchema(): Promise<void> {
    console.log('Running initial database schema...');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = this.loadMigrationFile(schemaPath);
    
    await this.db.transaction(async (client) => {
      await client.query(schemaSql);
    });
    
    // Mark initial schema as executed
    const initialMigration: Migration = {
      id: '001_initial_schema',
      name: 'Initial database schema',
      sql: schemaSql
    };
    
    const executedMigrations = await this.getExecutedMigrations();
    if (!executedMigrations.includes(initialMigration.id)) {
      await this.markMigrationAsExecuted(initialMigration);
      console.log('Initial schema migration completed');
    } else {
      console.log('Initial schema already exists');
    }
  }

  public async runMigrations(migrationsDir?: string): Promise<void> {
    const migrationPath = migrationsDir || path.join(__dirname, 'migrations');
    
    if (!fs.existsSync(migrationPath)) {
      console.log('No migrations directory found, skipping migrations');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const executedMigrations = await this.getExecutedMigrations();

    for (const file of migrationFiles) {
      const migrationId = path.basename(file, '.sql');
      
      if (executedMigrations.includes(migrationId)) {
        console.log(`Migration ${migrationId} already executed, skipping`);
        continue;
      }

      console.log(`Running migration: ${migrationId}`);
      
      const filePath = path.join(migrationPath, file);
      const sql = this.loadMigrationFile(filePath);
      
      const migration: Migration = {
        id: migrationId,
        name: file,
        sql: sql
      };

      try {
        await this.db.transaction(async (client) => {
          await client.query(sql);
        });
        
        await this.markMigrationAsExecuted(migration);
        console.log(`Migration ${migrationId} completed successfully`);
      } catch (error) {
        console.error(`Migration ${migrationId} failed:`, error);
        throw error;
      }
    }
  }

  public async rollbackLastMigration(): Promise<void> {
    // This is a basic implementation - in production you'd want more sophisticated rollback handling
    const result = await this.db.query(
      'SELECT id, name FROM migrations ORDER BY executed_at DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }
    
    const lastMigration = result.rows[0];
    console.log(`Rolling back migration: ${lastMigration.id}`);
    
    // Remove from migrations table
    await this.db.query('DELETE FROM migrations WHERE id = $1', [lastMigration.id]);
    
    console.log(`Migration ${lastMigration.id} rolled back (manual cleanup may be required)`);
  }

  public async getMigrationStatus(): Promise<Migration[]> {
    const result = await this.db.query(
      'SELECT id, name, executed_at FROM migrations ORDER BY executed_at'
    );
    
    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      sql: '',
      executedAt: row.executed_at
    }));
  }
}

// Utility function to run migrations
export async function runDatabaseMigrations(db: DatabaseConnection): Promise<void> {
  const migrationManager = new MigrationManager(db);
  
  try {
    await migrationManager.runInitialSchema();
    await migrationManager.runMigrations();
    console.log('All database migrations completed successfully');
  } catch (error) {
    console.error('Database migration failed:', error);
    throw error;
  }
}