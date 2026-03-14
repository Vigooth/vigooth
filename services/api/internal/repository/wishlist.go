package repository

import (
	"errors"
	"sync"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/model"
)

var (
	ErrWishlistItemNotFound      = errors.New("wishlist item not found")
	ErrWishlistItemAlreadyExists = errors.New("item already in wishlist")
)

type WishlistRepository interface {
	Create(item *model.WishlistItem) error
	FindAllByUserID(userID string) ([]model.WishlistItem, error)
	Delete(userID string, tmdbID int) error
	ExistsByTmdbID(userID string, tmdbID int) (bool, error)
}

// InMemoryWishlistRepository - for development
type InMemoryWishlistRepository struct {
	items map[string]*model.WishlistItem
	mu    sync.RWMutex
}

func NewInMemoryWishlistRepository() *InMemoryWishlistRepository {
	return &InMemoryWishlistRepository{
		items: make(map[string]*model.WishlistItem),
	}
}

func (r *InMemoryWishlistRepository) Create(item *model.WishlistItem) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Check uniqueness
	for _, i := range r.items {
		if i.UserID == item.UserID && i.TmdbID == item.TmdbID {
			return ErrWishlistItemAlreadyExists
		}
	}

	item.AddedAt = time.Now()
	r.items[item.ID] = item
	return nil
}

func (r *InMemoryWishlistRepository) FindAllByUserID(userID string) ([]model.WishlistItem, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var items []model.WishlistItem
	for _, i := range r.items {
		if i.UserID == userID {
			items = append(items, *i)
		}
	}
	return items, nil
}

func (r *InMemoryWishlistRepository) Delete(userID string, tmdbID int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for id, i := range r.items {
		if i.UserID == userID && i.TmdbID == tmdbID {
			delete(r.items, id)
			return nil
		}
	}

	return ErrWishlistItemNotFound
}

func (r *InMemoryWishlistRepository) ExistsByTmdbID(userID string, tmdbID int) (bool, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, i := range r.items {
		if i.UserID == userID && i.TmdbID == tmdbID {
			return true, nil
		}
	}
	return false, nil
}
