-- Movies table
CREATE TABLE IF NOT EXISTS movies (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tmdb_id INTEGER NOT NULL,
    imdb_id VARCHAR(20),
    title VARCHAR(500) NOT NULL,
    original_title VARCHAR(500),
    year INTEGER,
    poster_path VARCHAR(500),
    backdrop_path VARCHAR(500),
    overview TEXT,
    genres TEXT,
    director VARCHAR(255),
    runtime INTEGER,
    metascore INTEGER,
    imdb_rating NUMERIC(3,1),
    rotten_tomatoes INTEGER,
    personal_rating INTEGER,
    notes TEXT DEFAULT '',
    added_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tmdb_id)
);

CREATE INDEX IF NOT EXISTS idx_movies_user_id ON movies(user_id);
