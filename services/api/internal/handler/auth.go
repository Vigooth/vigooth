package handler

import (
	"errors"
	"net/http"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/Vigooth/vigooth/services/api/internal/service"
	"github.com/gin-gonic/gin"
)

type CookieConfig struct {
	Domain string
	Secure bool
	MaxAge int // seconds
}

type AuthHandler struct {
	authService  *service.AuthService
	cookieConfig CookieConfig
}

func NewAuthHandler(authService *service.AuthService, cookieConfig CookieConfig) *AuthHandler {
	return &AuthHandler{
		authService:  authService,
		cookieConfig: cookieConfig,
	}
}

func (h *AuthHandler) setAuthCookie(c *gin.Context, token string) {
	c.SetCookie(
		"auth_token",
		token,
		h.cookieConfig.MaxAge,
		"/",
		h.cookieConfig.Domain,
		h.cookieConfig.Secure,
		true, // HttpOnly
	)
	c.SetSameSite(http.SameSiteLaxMode)
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req model.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.authService.Register(req)
	if err != nil {
		if errors.Is(err, service.ErrEmailTaken) {
			c.JSON(http.StatusConflict, gin.H{"error": "email already taken"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "registration failed"})
		return
	}

	h.setAuthCookie(c, resp.Token)

	c.JSON(http.StatusCreated, gin.H{
		"user": resp.User,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req model.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.authService.Login(req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "login failed"})
		return
	}

	h.setAuthCookie(c, resp.Token)

	c.JSON(http.StatusOK, gin.H{
		"user": resp.User,
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	c.SetCookie(
		"auth_token",
		"",
		-1,
		"/",
		h.cookieConfig.Domain,
		h.cookieConfig.Secure,
		true,
	)
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}
