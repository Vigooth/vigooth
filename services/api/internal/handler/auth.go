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
	// Strict: cookie is never sent on cross-site requests. Kills CSRF. Tradeoff:
	// arriving via an external link (email, chat) shows a logged-out state until
	// the user navigates within the site — acceptable for vilock's threat model.
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie(
		"auth_token",
		token,
		h.cookieConfig.MaxAge,
		"/",
		h.cookieConfig.Domain,
		h.cookieConfig.Secure,
		true, // HttpOnly
	)
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

// Me returns the account behind the request's cookie, in the same shape as Login.
//
// The route is guarded, so reaching this handler already means the token was
// valid; a client with no session gets the middleware's 401, which is exactly the
// signal it needs to show a login form.
func (h *AuthHandler) Me(c *gin.Context) {
	user, err := h.authService.GetUser(c.GetString("userID"))
	if err != nil {
		// Valid token for an account that no longer exists — deleted since the
		// token was issued. Treated as no session rather than a server fault.
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unknown user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	c.SetSameSite(http.SameSiteStrictMode)
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
