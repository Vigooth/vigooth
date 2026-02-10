package service

import (
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/Vigooth/vigooth/services/api/internal/repository"
)

type VaultService struct {
	vaultRepo repository.VaultRepository
}

func NewVaultService(vaultRepo repository.VaultRepository) *VaultService {
	return &VaultService{
		vaultRepo: vaultRepo,
	}
}

func (s *VaultService) GetVault(userID string) (*model.VaultResponse, error) {
	vault, err := s.vaultRepo.FindByUserID(userID)
	if err != nil {
		return nil, err
	}

	return &model.VaultResponse{
		Data:      vault.Data,
		UpdatedAt: vault.UpdatedAt,
	}, nil
}

func (s *VaultService) SaveVault(userID string, data string) error {
	vault := &model.Vault{
		UserID:    userID,
		Data:      data,
		UpdatedAt: time.Now(),
	}

	return s.vaultRepo.Save(vault)
}

func (s *VaultService) DeleteVault(userID string) error {
	return s.vaultRepo.Delete(userID)
}
