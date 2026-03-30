package repository

import (
	"sync"
	"time"
)

type StoredRecommendation struct {
	Title      string  `json:"title"`
	Year       int     `json:"year"`
	TmdbID     int     `json:"tmdb_id,omitempty"`
	PosterPath string  `json:"poster_path,omitempty"`
	Reason     string  `json:"reason"`
}

type RecommendationHistory struct {
	ID              string                 `json:"id"`
	UserID          string                 `json:"user_id"`
	Recommendations []StoredRecommendation `json:"recommendations"`
	TokensUsed      int                    `json:"tokens_used"`
	IsAI            bool                   `json:"is_ai"`
	CreatedAt       time.Time              `json:"created_at"`
}

type RecommendationRepository interface {
	Save(entry *RecommendationHistory) error
	FindByUserID(userID string) ([]RecommendationHistory, error)
}

type InMemoryRecommendationRepository struct {
	entries map[string][]RecommendationHistory // userID -> entries
	mu      sync.RWMutex
}

func NewInMemoryRecommendationRepository() *InMemoryRecommendationRepository {
	return &InMemoryRecommendationRepository{
		entries: make(map[string][]RecommendationHistory),
	}
}

func (r *InMemoryRecommendationRepository) Save(entry *RecommendationHistory) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.entries[entry.UserID] = append(r.entries[entry.UserID], *entry)
	return nil
}

func (r *InMemoryRecommendationRepository) FindByUserID(userID string) ([]RecommendationHistory, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.entries[userID], nil
}
