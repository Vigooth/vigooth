package repository

import (
	"errors"
	"sync"

	"github.com/Vigooth/vigooth/services/api/internal/model"
)

var ErrVaultNotFound = errors.New("vault not found")

type VaultRepository interface {
	Save(vault *model.Vault) error
	FindByUserID(userID string) (*model.Vault, error)
	Delete(userID string) error
}

// InMemoryVaultRepository - for development, replace with DB later
type InMemoryVaultRepository struct {
	vaults map[string]*model.Vault
	mu     sync.RWMutex
}

func NewInMemoryVaultRepository() *InMemoryVaultRepository {
	return &InMemoryVaultRepository{
		vaults: make(map[string]*model.Vault),
	}
}

func (r *InMemoryVaultRepository) Save(vault *model.Vault) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.vaults[vault.UserID] = vault
	return nil
}

func (r *InMemoryVaultRepository) FindByUserID(userID string) (*model.Vault, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	vault, ok := r.vaults[userID]
	if !ok {
		return nil, ErrVaultNotFound
	}
	return vault, nil
}

func (r *InMemoryVaultRepository) Delete(userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.vaults, userID)
	return nil
}
