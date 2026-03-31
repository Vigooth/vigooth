package repository

import (
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/model"
)

var (
	ErrMovieNotFound      = errors.New("movie not found")
	ErrMovieAlreadyExists = errors.New("movie already in collection")
)

type MovieRepository interface {
	Create(movie *model.Movie) error
	FindByID(id string, userID string) (*model.Movie, error)
	FindAllByUserID(userID string, query model.MovieListQuery) ([]model.Movie, int, error)
	Update(movie *model.Movie) error
	Delete(id string, userID string) error
	ExistsByTmdbID(userID string, tmdbID int) (bool, error)
}

// InMemoryMovieRepository - for development
type InMemoryMovieRepository struct {
	movies map[string]*model.Movie
	mu     sync.RWMutex
}

func NewInMemoryMovieRepository() *InMemoryMovieRepository {
	return &InMemoryMovieRepository{
		movies: make(map[string]*model.Movie),
	}
}

func (r *InMemoryMovieRepository) Create(movie *model.Movie) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Check uniqueness
	for _, m := range r.movies {
		if m.UserID == movie.UserID && m.TmdbID == movie.TmdbID {
			return ErrMovieAlreadyExists
		}
	}

	movie.AddedAt = time.Now()
	movie.UpdatedAt = time.Now()
	r.movies[movie.ID] = movie
	return nil
}

func (r *InMemoryMovieRepository) FindByID(id string, userID string) (*model.Movie, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	movie, ok := r.movies[id]
	if !ok || movie.UserID != userID {
		return nil, ErrMovieNotFound
	}
	return movie, nil
}

func (r *InMemoryMovieRepository) FindAllByUserID(userID string, query model.MovieListQuery) ([]model.Movie, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var all []model.Movie
	search := strings.ToLower(query.Search)
	for _, m := range r.movies {
		if m.UserID != userID {
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(m.Title), search) && !strings.Contains(strings.ToLower(m.Director), search) {
			continue
		}
		all = append(all, *m)
	}

	total := len(all)
	start := query.Offset
	if start > total {
		start = total
	}
	end := start + query.Limit
	if end > total {
		end = total
	}
	return all[start:end], total, nil
}

func (r *InMemoryMovieRepository) Update(movie *model.Movie) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, ok := r.movies[movie.ID]
	if !ok || existing.UserID != movie.UserID {
		return ErrMovieNotFound
	}

	movie.UpdatedAt = time.Now()
	r.movies[movie.ID] = movie
	return nil
}

func (r *InMemoryMovieRepository) Delete(id string, userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	movie, ok := r.movies[id]
	if !ok || movie.UserID != userID {
		return ErrMovieNotFound
	}

	delete(r.movies, id)
	return nil
}

func (r *InMemoryMovieRepository) ExistsByTmdbID(userID string, tmdbID int) (bool, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, m := range r.movies {
		if m.UserID == userID && m.TmdbID == tmdbID {
			return true, nil
		}
	}
	return false, nil
}
