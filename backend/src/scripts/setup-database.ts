#!/usr/bin/env ts-node

import { initializeDatabase, runDatabaseMigrations } from '../database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Initialize database connection
    const db = await initializeDatabase();
    console.log('Database connection established');
    
    // Run migrations
    await runDatabaseMigrations(db);
    console.log('Database setup completed successfully');
    
    // Show connection info
    const poolInfo = db.getPoolInfo();
    console.log('Connection pool info:', poolInfo);
    
    // Close connection
    await db.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase();
}

export { setupDatabase };