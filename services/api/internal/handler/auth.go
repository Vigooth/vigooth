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

	if resp.TotpRequired {
		// Set a short-lived pending cookie instead of full auth
		c.SetCookie("auth_token", resp.Token, 300, "/", h.cookieConfig.Domain, h.cookieConfig.Secure, true)
		c.SetSameSite(http.SameSiteLaxMode)
		c.JSON(http.StatusOK, gin.H{
			"totp_required": true,
		})
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

func (h *AuthHandler) VerifyTotpLogin(c *gin.Context) {
	var req model.TotpVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("userID")
	token, err := h.authService.VerifyTotpLogin(userID, req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidTotpCode) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid code"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "verification failed"})
		return
	}

	h.setAuthCookie(c, token)

	user, _ := h.authService.GetUser(userID)
	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}

func (h *AuthHandler) GetTotpStatus(c *gin.Context) {
	userID := c.GetString("userID")
	enabled, err := h.authService.GetTotpStatus(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get status"})
		return
	}
	c.JSON(http.StatusOK, model.TotpStatusResponse{Enabled: enabled})
}

func (h *AuthHandler) SetupTotp(c *gin.Context) {
	userID := c.GetString("userID")
	resp, err := h.authService.SetupTotp(userID)
	if err != nil {
		if errors.Is(err, service.ErrTotpAlreadyEnabled) {
			c.JSON(http.StatusConflict, gin.H{"error": "2FA already enabled"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "setup failed"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *AuthHandler) EnableTotp(c *gin.Context) {
	var req model.TotpVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("userID")
	codes, err := h.authService.EnableTotp(userID, req.Code)
	if err != nil {
		if errors.Is(err, service.ErrInvalidTotpCode) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid code"})
			return
		}
		if errors.Is(err, service.ErrTotpAlreadyEnabled) {
			c.JSON(http.StatusConflict, gin.H{"error": "2FA already enabled"})
			return
		}
		if errors.Is(err, service.ErrTotpNotSetup) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "call setup first"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "enable failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"recovery_codes": codes,
	})
}

func (h *AuthHandler) DisableTotp(c *gin.Context) {
	var req model.TotpVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("userID")
	if err := h.authService.DisableTotp(userID, req.Code); err != nil {
		if errors.Is(err, service.ErrInvalidTotpCode) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid code"})
			return
		}
		if errors.Is(err, service.ErrTotpNotEnabled) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "2FA not enabled"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "disable failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "2FA disabled"})
}
