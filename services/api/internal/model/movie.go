package model

import "time"

type Movie struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	TmdbID          int       `json:"tmdb_id"`
	ImdbID          string    `json:"imdb_id"`
	Title           string    `json:"title"`
	OriginalTitle   string    `json:"original_title"`
	Year            int       `json:"year"`
	PosterPath      string    `json:"poster_path"`
	BackdropPath    string    `json:"backdrop_path"`
	Overview        string    `json:"overview"`
	Genres          string    `json:"genres"`
	Director        string    `json:"director"`
	Runtime         int       `json:"runtime"`
	Metascore       *int      `json:"metascore"`
	ImdbRating      *float64  `json:"imdb_rating"`
	RottenTomatoes  *int      `json:"rotten_tomatoes"`
	PersonalRating  *int      `json:"personal_rating"`
	Notes           string    `json:"notes"`
	AddedAt         time.Time `json:"added_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type AddMovieRequest struct {
	TmdbID         int      `json:"tmdb_id" binding:"required"`
	ImdbID         string   `json:"imdb_id"`
	Title          string   `json:"title" binding:"required"`
	OriginalTitle  string   `json:"original_title"`
	Year           int      `json:"year"`
	PosterPath     string   `json:"poster_path"`
	BackdropPath   string   `json:"backdrop_path"`
	Overview       string   `json:"overview"`
	Genres         string   `json:"genres"`
	Director       string   `json:"director"`
	Runtime        int      `json:"runtime"`
	Metascore      *int     `json:"metascore"`
	ImdbRating     *float64 `json:"imdb_rating"`
	RottenTomatoes *int     `json:"rotten_tomatoes"`
	PersonalRating *int     `json:"personal_rating" binding:"omitempty,min=1,max=10"`
	Notes          string   `json:"notes"`
}

type UpdateMovieRequest struct {
	PersonalRating *int     `json:"personal_rating" binding:"omitempty,min=1,max=10"`
	Notes          *string  `json:"notes"`
	Metascore      *int     `json:"metascore"`
	ImdbRating     *float64 `json:"imdb_rating"`
	RottenTomatoes *int     `json:"rotten_tomatoes"`
}

type MovieListQuery struct {
	Search     string
	Limit      int
	Offset     int
	AddedAfter string // RFC3339 date string, e.g. "2025-01-01T00:00:00Z"
	MinRating  int    // minimum personal_rating (0 = no filter)
}

type MovieListResponse struct {
	Movies  []Movie `json:"movies"`
	Total   int     `json:"total"`
	HasMore bool    `json:"has_more"`
}
