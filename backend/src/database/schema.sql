-- YouTube Content Search Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(1000),
    video_count INTEGER DEFAULT 0,
    indexed_video_count INTEGER DEFAULT 0,
    last_indexed TIMESTAMP WITH TIME ZONE,
    indexing_status VARCHAR(50) DEFAULT 'pending' CHECK (indexing_status IN ('pending', 'in_progress', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id VARCHAR(255) UNIQUE NOT NULL,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    title VARCHAR(1000) NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL, -- in seconds
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    thumbnail_url VARCHAR(1000),
    has_subtitles BOOLEAN DEFAULT FALSE,
    subtitle_language VARCHAR(10),
    indexing_status VARCHAR(50) DEFAULT 'pending' CHECK (indexing_status IN ('pending', 'completed', 'failed', 'no_subtitles')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subtitles table
CREATE TABLE IF NOT EXISTS subtitles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    start_time DECIMAL(10,3) NOT NULL, -- in seconds with millisecond precision
    end_time DECIMAL(10,3) NOT NULL,   -- in seconds with millisecond precision
    text TEXT NOT NULL,
    confidence DECIMAL(3,2), -- for auto-generated subtitles (0.00 to 1.00)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_channels_channel_id ON channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_indexing_status ON channels(indexing_status);

CREATE INDEX IF NOT EXISTS idx_videos_video_id ON videos(video_id);
CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos(published_at);
CREATE INDEX IF NOT EXISTS idx_videos_indexing_status ON videos(indexing_status);

CREATE INDEX IF NOT EXISTS idx_subtitles_video_id ON subtitles(video_id);
CREATE INDEX IF NOT EXISTS idx_subtitles_start_time ON subtitles(start_time);
CREATE INDEX IF NOT EXISTS idx_subtitles_end_time ON subtitles(end_time);
CREATE INDEX IF NOT EXISTS idx_subtitles_text_search ON subtitles USING gin(to_tsvector('english', text));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();