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
		tokenString := m.extractToken(c, allowedTypes)
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

// extractToken reads the JWT from the HttpOnly cookie matching one of the
// allowed token types, falling back to the Authorization header.
// Scoping the cookie to the token type lets user and steam sessions coexist
// on the same domain instead of overwriting each other.
func (m *AuthMiddleware) extractToken(c *gin.Context, allowedTypes []string) string {
	for _, t := range allowedTypes {
		if token, err := c.Cookie(cookieNameForType(t)); err == nil && token != "" {
			return token
		}
	}

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

func cookieNameForType(tokenType string) string {
	switch tokenType {
	case "steam":
		return "steam_token"
	default:
		return "auth_token"
	}
}
