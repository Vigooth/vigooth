package handler

import (
	"errors"
	"net/http"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/Vigooth/vigooth/services/api/internal/repository"
	"github.com/Vigooth/vigooth/services/api/internal/service"
	"github.com/gin-gonic/gin"
)

type VaultHandler struct {
	vaultService *service.VaultService
}

func NewVaultHandler(vaultService *service.VaultService) *VaultHandler {
	return &VaultHandler{
		vaultService: vaultService,
	}
}

func (h *VaultHandler) GetVault(c *gin.Context) {
	userID := c.GetString("userID")

	resp, err := h.vaultService.GetVault(userID)
	if err != nil {
		if errors.Is(err, repository.ErrVaultNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "vault not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get vault"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *VaultHandler) SaveVault(c *gin.Context) {
	userID := c.GetString("userID")

	var req model.SaveVaultRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.vaultService.SaveVault(userID, req.Data); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save vault"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "vault saved"})
}

func (h *VaultHandler) DeleteVault(c *gin.Context) {
	userID := c.GetString("userID")

	if err := h.vaultService.DeleteVault(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete vault"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "vault deleted"})
}
