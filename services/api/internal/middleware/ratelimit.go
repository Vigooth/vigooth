package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateLimiter struct {
	mu      sync.Mutex
	hits    map[string][]time.Time
	max     int
	window  time.Duration
}

// RateLimit limits requests per client IP to `max` within `window`.
// In-memory, per-process — fine for single-instance deploys. Behind a proxy,
// gin's ClientIP() uses X-Forwarded-For which must be set by a trusted proxy.
func RateLimit(max int, window time.Duration) gin.HandlerFunc {
	rl := &rateLimiter{
		hits:   make(map[string][]time.Time),
		max:    max,
		window: window,
	}

	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()
		cutoff := now.Add(-rl.window)

		rl.mu.Lock()
		recent := rl.hits[ip][:0]
		for _, t := range rl.hits[ip] {
			if t.After(cutoff) {
				recent = append(recent, t)
			}
		}
		if len(recent) >= rl.max {
			rl.hits[ip] = recent
			rl.mu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many requests"})
			return
		}
		rl.hits[ip] = append(recent, now)
		rl.mu.Unlock()

		c.Next()
	}
}
