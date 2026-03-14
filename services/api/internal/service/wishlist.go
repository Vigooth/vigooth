package service

import (
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/Vigooth/vigooth/services/api/internal/repository"
	"github.com/google/uuid"
)

type WishlistService struct {
	wishlistRepo repository.WishlistRepository
}

func NewWishlistService(wishlistRepo repository.WishlistRepository) *WishlistService {
	return &WishlistService{
		wishlistRepo: wishlistRepo,
	}
}

func (s *WishlistService) AddItem(userID string, req *model.AddWishlistRequest) (*model.WishlistItem, error) {
	item := &model.WishlistItem{
		ID:         uuid.New().String(),
		UserID:     userID,
		TmdbID:     req.TmdbID,
		Title:      req.Title,
		Year:       req.Year,
		PosterPath: req.PosterPath,
		AddedAt:    time.Now(),
	}

	if err := s.wishlistRepo.Create(item); err != nil {
		return nil, err
	}

	return item, nil
}

func (s *WishlistService) GetItems(userID string) (*model.WishlistResponse, error) {
	items, err := s.wishlistRepo.FindAllByUserID(userID)
	if err != nil {
		return nil, err
	}

	return &model.WishlistResponse{
		Items: items,
		Total: len(items),
	}, nil
}

func (s *WishlistService) RemoveItem(userID string, tmdbID int) error {
	return s.wishlistRepo.Delete(userID, tmdbID)
}

func (s *WishlistService) IsInWishlist(userID string, tmdbID int) (bool, error) {
	return s.wishlistRepo.ExistsByTmdbID(userID, tmdbID)
}
