package repository

import (
	"errors"
	"sort"
	"sync"

	"github.com/Vigooth/vigooth/services/api/internal/model"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrUserAlreadyExists = errors.New("user already exists")
)

type UserRepository interface {
	Create(user *model.User) error
	FindByEmail(email string) (*model.User, error)
	FindByID(id string) (*model.User, error)
	// List returns every account, newest first. Admin-only by construction: the
	// only caller sits behind the admin guard.
	List() ([]model.User, error)
}

// InMemoryUserRepository - for development, replace with DB later
type InMemoryUserRepository struct {
	users map[string]*model.User
	mu    sync.RWMutex
}

func NewInMemoryUserRepository() *InMemoryUserRepository {
	return &InMemoryUserRepository{
		users: make(map[string]*model.User),
	}
}

func (r *InMemoryUserRepository) Create(user *model.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Check if email already exists
	for _, u := range r.users {
		if u.Email == user.Email {
			return ErrUserAlreadyExists
		}
	}

	r.users[user.ID] = user
	return nil
}

func (r *InMemoryUserRepository) FindByEmail(email string) (*model.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, user := range r.users {
		if user.Email == email {
			return user, nil
		}
	}
	return nil, ErrUserNotFound
}

func (r *InMemoryUserRepository) FindByID(id string) (*model.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	user, ok := r.users[id]
	if !ok {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (r *InMemoryUserRepository) List() ([]model.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	users := make([]model.User, 0, len(r.users))
	for _, u := range r.users {
		users = append(users, *u)
	}
	sort.Slice(users, func(i, j int) bool { return users[i].CreatedAt.After(users[j].CreatedAt) })
	return users, nil
}
