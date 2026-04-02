ALTER TABLE movies ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) NOT NULL DEFAULT 'movie';

-- Allow same tmdb_id for different media types (movie vs tv can share IDs)
ALTER TABLE movies DROP CONSTRAINT IF EXISTS movies_user_id_tmdb_id_key;
ALTER TABLE movies ADD CONSTRAINT movies_user_id_tmdb_id_media_type_key UNIQUE (user_id, tmdb_id, media_type);
