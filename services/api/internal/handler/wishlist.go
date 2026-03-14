package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/Vigooth/vigooth/services/api/internal/repository"
	"github.com/Vigooth/vigooth/services/api/internal/service"
	"github.com/gin-gonic/gin"
)

type WishlistHandler struct {
	wishlistService *service.WishlistService
}

func NewWishlistHandler(wishlistService *service.WishlistService) *WishlistHandler {
	return &WishlistHandler{
		wishlistService: wishlistService,
	}
}

func (h *WishlistHandler) GetWishlist(c *gin.Context) {
	userID := c.GetString("userID")

	resp, err := h.wishlistService.GetItems(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get wishlist"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *WishlistHandler) AddToWishlist(c *gin.Context) {
	userID := c.GetString("userID")

	var req model.AddWishlistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item, err := h.wishlistService.AddItem(userID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrWishlistItemAlreadyExists) {
			c.JSON(http.StatusConflict, gin.H{"error": "item already in wishlist"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add to wishlist"})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func (h *WishlistHandler) RemoveFromWishlist(c *gin.Context) {
	userID := c.GetString("userID")
	tmdbIDStr := c.Param("tmdbId")

	tmdbID, err := strconv.Atoi(tmdbIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tmdb_id"})
		return
	}

	err = h.wishlistService.RemoveItem(userID, tmdbID)
	if err != nil {
		if errors.Is(err, repository.ErrWishlistItemNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "item not found in wishlist"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove from wishlist"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "item removed from wishlist"})
}
