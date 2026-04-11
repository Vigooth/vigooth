package repository

import (
	"errors"
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
	UpdateTotpSecret(id string, secret string) error
	EnableTotp(id string, recoveryCodes string) error
	DisableTotp(id string) error
	UpdateRecoveryCodes(id string, codes string) error
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

func (r *InMemoryUserRepository) UpdateTotpSecret(id string, secret string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	user, ok := r.users[id]
	if !ok {
		return ErrUserNotFound
	}
	user.TotpSecret = secret
	return nil
}

func (r *InMemoryUserRepository) EnableTotp(id string, recoveryCodes string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	user, ok := r.users[id]
	if !ok {
		return ErrUserNotFound
	}
	user.TotpEnabled = true
	user.RecoveryCodes = recoveryCodes
	return nil
}

func (r *InMemoryUserRepository) DisableTotp(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	user, ok := r.users[id]
	if !ok {
		return ErrUserNotFound
	}
	user.TotpEnabled = false
	user.TotpSecret = ""
	user.RecoveryCodes = ""
	return nil
}

func (r *InMemoryUserRepository) UpdateRecoveryCodes(id string, codes string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	user, ok := r.users[id]
	if !ok {
		return ErrUserNotFound
	}
	user.RecoveryCodes = codes
	return nil
}
