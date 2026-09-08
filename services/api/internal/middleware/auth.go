package middleware

import (
	"errors"
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
		userID, err := m.authenticate(c, allowedTypes)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			c.Abort()
			return
		}

		// Set user ID in context for handlers
		c.Set("userID", userID)
		c.Next()
	}
}

// OptionalAuth sets "userID" when a valid token is present and does nothing
// otherwise. For endpoints anyone may call but that like to know who did: the
// visit beacon uses it to attribute a hit to the signed-in account.
func (m *AuthMiddleware) OptionalAuth(allowedTypes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if userID, err := m.authenticate(c, allowedTypes); err == nil {
			c.Set("userID", userID)
		}
		c.Next()
	}
}

// authenticate resolves the request's token to a user ID, or says why not.
func (m *AuthMiddleware) authenticate(c *gin.Context, allowedTypes []string) (string, error) {
	tokenString := m.extractToken(c, allowedTypes)
	if tokenString == "" {
		return "", errors.New("missing authentication")
	}

	// Parse and validate token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(m.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		return "", errors.New("invalid token")
	}

	// Extract claims
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("invalid token claims")
	}

	if len(allowedTypes) > 0 {
		tokenType, _ := claims["typ"].(string)
		if !contains(allowedTypes, tokenType) {
			return "", errors.New("token type not allowed for this endpoint")
		}
	}

	userID, ok := claims["sub"].(string)
	if !ok {
		return "", errors.New("invalid user id in token")
	}
	return userID, nil
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
