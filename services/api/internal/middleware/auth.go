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

// RequireAuth enforces a valid JWT whose "typ" claim is one of the allowed
// types. Pass "user" for moovi/vilock endpoints and "steam" for Steam-specific
// endpoints. A token without a "typ" claim is rejected.
func (m *AuthMiddleware) RequireAuth(allowedTypes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := m.extractToken(c)
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authentication"})
			c.Abort()
			return
		}

		// Parse and validate token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(m.jwtSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		// Extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token claims"})
			c.Abort()
			return
		}

		if len(allowedTypes) > 0 {
			tokenType, _ := claims["typ"].(string)
			if !contains(allowedTypes, tokenType) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "token type not allowed for this endpoint"})
				c.Abort()
				return
			}
		}

		userID, ok := claims["sub"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id in token"})
			c.Abort()
			return
		}

		// Set user ID in context for handlers
		c.Set("userID", userID)
		c.Next()
	}
}

func contains(list []string, v string) bool {
	for _, s := range list {
		if s == v {
			return true
		}
	}
	return false
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
