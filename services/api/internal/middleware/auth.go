package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type AuthMiddleware struct {
	jwtSecret string
}

func NewAuthMiddleware(jwtSecret string) *AuthMiddleware {
	return &AuthMiddleware{
		jwtSecret: jwtSecret,
	}
}

func (m *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, ok := m.parseToken(c)
		if !ok {
			return
		}

		// Reject pending TOTP tokens — they are not full auth
		if purpose, exists := claims["purpose"].(string); exists && purpose == "totp_pending" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "2FA verification required"})
			c.Abort()
			return
		}

		userID, ok := claims["sub"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id in token"})
			c.Abort()
			return
		}

		c.Set("userID", userID)
		c.Next()
	}
}

func (m *AuthMiddleware) RequirePendingTotp() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, ok := m.parseToken(c)
		if !ok {
			return
		}

		purpose, _ := claims["purpose"].(string)
		if purpose != "totp_pending" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "pending TOTP token required"})
			c.Abort()
			return
		}

		userID, ok := claims["sub"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id in token"})
			c.Abort()
			return
		}

		c.Set("userID", userID)
		c.Next()
	}
}

func (m *AuthMiddleware) parseToken(c *gin.Context) (jwt.MapClaims, bool) {
	tokenString := m.extractToken(c)
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authentication"})
		c.Abort()
		return nil, false
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(m.jwtSecret), nil
	})

	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		c.Abort()
		return nil, false
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token claims"})
		c.Abort()
		return nil, false
	}

	return claims, true
}

// extractToken reads the JWT from the HttpOnly cookie first, then falls back to
// the Authorization header for backward compatibility.
func (m *AuthMiddleware) extractToken(c *gin.Context) string {
	// 1. Try HttpOnly cookie
	if token, err := c.Cookie("auth_token"); err == nil && token != "" {
		return token
	}

	// 2. Fallback: Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return ""
	}

	return parts[1]
}
