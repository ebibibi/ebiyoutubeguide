# Database Module

This module provides database connection utilities, schema management, and migration capabilities for the YouTube Content Search application.

## Features

- **Connection Management**: Singleton pattern with connection pooling
- **Schema Management**: Automated database schema creation
- **Migration System**: Version-controlled database migrations
- **Transaction Support**: Safe transaction handling with automatic rollback
- **Error Handling**: Comprehensive error handling and logging

## Quick Start

### 1. Environment Setup

Copy the `.env.example` file and configure your database settings:

```bash
cp .env.example .env
```

Required environment variables:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=youtube_content_search
DB_USER=your_username
DB_PASSWORD=your_password
DB_SSL=false
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

### 2. Database Setup

Run the database setup script to create the schema and run migrations:

```bash
npm run db:setup
```

This will:
- Test the database connection
- Create the initial schema (channels, videos, subtitles tables)
- Run any pending migrations
- Display connection pool information

## Usage

### Basic Connection

```typescript
import { initializeDatabase } from './database';

async function example() {
  const db = await initializeDatabase();
  
  // Simple query
  const result = await db.query('SELECT NOW()');
  console.log(result.rows[0]);
  
  // Close connection when done
  await db.close();
}
```

### Using Transactions

```typescript
import { initializeDatabase } from './database';

async function example() {
  const db = await initializeDatabase();
  
  await db.transaction(async (client) => {
    await client.query('INSERT INTO channels (channel_id, name) VALUES ($1, $2)', 
      ['UC123', 'Test Channel']);
    await client.query('INSERT INTO videos (video_id, channel_id, title) VALUES ($1, $2, $3)', 
      ['video123', 'channel-uuid', 'Test Video']);
    // If any query fails, the entire transaction is rolled back
  });
}
```

### Manual Migrations

```typescript
import { MigrationManager, initializeDatabase } from './database';

async function runMigrations() {
  const db = await initializeDatabase();
  const migrationManager = new MigrationManager(db);
  
  // Run all pending migrations
  await migrationManager.runMigrations();
  
  // Check migration status
  const status = await migrationManager.getMigrationStatus();
  console.log('Executed migrations:', status);
}
```

## Database Schema

### Tables

#### channels
- `id` (UUID, Primary Key)
- `channel_id` (VARCHAR, Unique) - YouTube channel ID
- `name` (VARCHAR) - Channel name
- `description` (TEXT) - Channel description
- `thumbnail_url` (VARCHAR) - Channel thumbnail URL
- `video_count` (INTEGER) - Total videos in channel
- `indexed_video_count` (INTEGER) - Number of indexed videos
- `last_indexed` (TIMESTAMP) - Last indexing time
- `indexing_status` (VARCHAR) - Current indexing status
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### videos
- `id` (UUID, Primary Key)
- `video_id` (VARCHAR, Unique) - YouTube video ID
- `channel_id` (UUID, Foreign Key) - References channels.id
- `title` (VARCHAR) - Video title
- `description` (TEXT) - Video description
- `duration` (INTEGER) - Duration in seconds
- `published_at` (TIMESTAMP) - Video publish date
- `thumbnail_url` (VARCHAR) - Video thumbnail URL
- `has_subtitles` (BOOLEAN) - Whether subtitles are available
- `subtitle_language` (VARCHAR) - Subtitle language code
- `indexing_status` (VARCHAR) - Current indexing status
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### subtitles
- `id` (UUID, Primary Key)
- `video_id` (UUID, Foreign Key) - References videos.id
- `start_time` (DECIMAL) - Start time in seconds
- `end_time` (DECIMAL) - End time in seconds
- `text` (TEXT) - Subtitle text content
- `confidence` (DECIMAL) - Confidence score for auto-generated subtitles
- `created_at` (TIMESTAMP)

### Indexes

The schema includes optimized indexes for:
- Channel and video lookups by external IDs
- Timestamp-based queries on subtitles
- Full-text search on subtitle content
- Status-based filtering

## Migration System

### Creating Migrations

1. Create a new SQL file in `src/database/migrations/` with format: `YYYYMMDD_HHMMSS_description.sql`
2. Write your migration SQL
3. Run `npm run db:migrate` to apply

Example migration file (`20231201_120000_add_video_tags.sql`):
```sql
-- Add tags column to videos table
ALTER TABLE videos ADD COLUMN tags TEXT[];

-- Create index for tag searches
CREATE INDEX idx_videos_tags ON videos USING gin(tags);
```

### Migration Commands

```bash
# Run all pending migrations
npm run db:migrate

# Check migration status (programmatically)
# Use MigrationManager.getMigrationStatus()
```

## Testing

The database module includes comprehensive unit tests:

```bash
# Run database tests
npm test -- --testPathPattern=database

# Run tests in watch mode
npm run test:watch -- --testPathPattern=database
```

## Connection Pool Management

The database connection uses PostgreSQL connection pooling with the following default settings:

- **Max Connections**: 20
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 2 seconds

Monitor pool health:
```typescript
const db = await initializeDatabase();
const poolInfo = db.getPoolInfo();
console.log('Pool status:', poolInfo);
// Output: { totalCount: 5, idleCount: 3, waitingCount: 0 }
```

## Error Handling

The module provides comprehensive error handling:

- **Connection Errors**: Automatic retry and circuit breaker patterns
- **Query Errors**: Detailed error logging with context
- **Transaction Errors**: Automatic rollback with error propagation
- **Migration Errors**: Safe rollback with detailed error reporting

## Performance Considerations

- Use connection pooling for concurrent requests
- Implement proper indexing for frequently queried columns
- Use transactions for multi-step operations
- Monitor connection pool metrics in production
- Consider read replicas for search-heavy workloads

## Security

- Environment-based configuration
- SQL injection prevention through parameterized queries
- Connection encryption support (SSL)
- Proper error handling without information leakage