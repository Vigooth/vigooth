package model

import "time"

type WishlistItem struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	TmdbID     int       `json:"tmdb_id"`
	Title      string    `json:"title"`
	Year       int       `json:"year"`
	PosterPath string    `json:"poster_path"`
	AddedAt    time.Time `json:"added_at"`
}

type AddWishlistRequest struct {
	TmdbID     int    `json:"tmdb_id" binding:"required"`
	Title      string `json:"title" binding:"required"`
	Year       int    `json:"year"`
	PosterPath string `json:"poster_path"`
}

type WishlistResponse struct {
	Items []WishlistItem `json:"items"`
	Total int            `json:"total"`
}
