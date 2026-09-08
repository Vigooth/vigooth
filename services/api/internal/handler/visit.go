package handler

import (
	"net/http"
	"strconv"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/Vigooth/vigooth/services/api/internal/service"
	"github.com/gin-gonic/gin"
)

type VisitHandler struct {
	visitService *service.VisitService
}

func NewVisitHandler(visitService *service.VisitService) *VisitHandler {
	return &VisitHandler{visitService: visitService}
}

// Track receives the frontend beacon.
//
// The browser sends it in no-cors mode with a text/plain body, which is what
// lets every app on every origin report without a preflight or a CORS entry.
// ShouldBindJSON decodes regardless of Content-Type, so that is fine here. The
// answer is deliberately empty: the browser never reads it.
func (h *VisitHandler) Track(c *gin.Context) {
	var req model.TrackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	if err := h.visitService.Record(req, c.ClientIP(), c.GetHeader("User-Agent"), c.GetString("userID")); err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *VisitHandler) List(c *gin.Context) {
	limit, _ := strconv.Atoi(c.Query("limit"))
	offset, _ := strconv.Atoi(c.Query("offset"))

	visits, err := h.visitService.List(model.VisitFilter{
		App:    c.Query("app"),
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list visits"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"visits": visits})
}

func (h *VisitHandler) Stats(c *gin.Context) {
	stats, err := h.visitService.Stats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute stats"})
		return
	}
	c.JSON(http.StatusOK, stats)
}
