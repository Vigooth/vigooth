package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// RequireAdmin runs after RequireAuth and asks the callback whether the
// authenticated account is an administrator. Admin status is derived from the
// account, not from the token: revoking it takes effect on the next request
// rather than at the token's expiry.
func RequireAdmin(isAdmin func(userID string) bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !isAdmin(c.GetString("userID")) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "admin only"})
			return
		}
		c.Next()
	}
}
