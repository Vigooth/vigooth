package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/agent"
	"github.com/Vigooth/vigooth/services/api/internal/llm"
	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/Vigooth/vigooth/services/api/internal/repository"
	"github.com/Vigooth/vigooth/services/api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type RecommendationHandler struct {
	movieService    *service.MovieService
	wishlistService *service.WishlistService
	llmProvider     llm.Provider
	tmdbAPIKey      string
	recoRepo        repository.RecommendationRepository
}

func NewRecommendationHandler(movieService *service.MovieService, wishlistService *service.WishlistService, llmProvider llm.Provider, tmdbAPIKey string, recoRepo repository.RecommendationRepository) *RecommendationHandler {
	return &RecommendationHandler{
		movieService:    movieService,
		wishlistService: wishlistService,
		llmProvider:     llmProvider,
		tmdbAPIKey:      tmdbAPIKey,
		recoRepo:        recoRepo,
	}
}

type streamRequest struct {
	MovieIDs []string `json:"movie_ids"`
	Vibe     *int     `json:"vibe"`
}

func (h *RecommendationHandler) StreamRecommendations(c *gin.Context) {
	userID := c.GetString("userID")

	var req streamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req = streamRequest{}
	}

	moviesResp, err := h.movieService.GetMovies(userID, model.MovieListQuery{Limit: 10000})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get movies"})
		return
	}

	if len(moviesResp.Movies) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no movies in collection"})
		return
	}

	// Exclude all collection + wishlist TMDB IDs from recommendations,
	// regardless of which movies are selected for taste analysis
	var excludeTmdbIDs []int
	for _, m := range moviesResp.Movies {
		if m.TmdbID != 0 {
			excludeTmdbIDs = append(excludeTmdbIDs, m.TmdbID)
		}
	}
	if wishlistResp, err := h.wishlistService.GetItems(userID); err == nil {
		for _, item := range wishlistResp.Items {
			excludeTmdbIDs = append(excludeTmdbIDs, item.TmdbID)
		}
	}

	movies := moviesResp.Movies
	if len(req.MovieIDs) > 0 {
		idSet := make(map[string]bool)
		for _, id := range req.MovieIDs {
			idSet[id] = true
		}
		filteredMovies := movies[:0:0]
		for _, m := range movies {
			if idSet[m.ID] {
				filteredMovies = append(filteredMovies, m)
			}
		}
		if len(filteredMovies) > 0 {
			movies = filteredMovies
		}
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
	c.Writer.Flush()

	recoAgent := agent.NewRecommendationAgent(h.llmProvider, h.tmdbAPIKey)

	vibe := 50 // default: balanced
	if req.Vibe != nil {
		vibe = *req.Vibe
	}

	var tokensUsed int
	result, err := recoAgent.Run(c.Request.Context(), movies, excludeTmdbIDs, vibe, func(event agent.Event) {
		// Capture tokens from done event
		if event.Type == "done" {
			if data, ok := event.Data.(map[string]interface{}); ok {
				if t, ok := data["tokens"].(agent.TokenUsage); ok {
					tokensUsed = t.TotalTokens
				}
			}
		}

		data, _ := json.Marshal(event)
		fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", event.Type, string(data))
		c.Writer.Flush()
	})

	if err != nil {
		log.Printf("recommendation agent error: %v", err)
		errEvent := agent.Event{Type: "error", Message: err.Error()}
		data, _ := json.Marshal(errEvent)
		fmt.Fprintf(c.Writer, "event: error\ndata: %s\n\n", string(data))
		c.Writer.Flush()
		return
	}

	// Save to history
	if result != nil && len(result.Recommendations) > 0 {
		var stored []repository.StoredRecommendation
		for _, r := range result.Recommendations {
			stored = append(stored, repository.StoredRecommendation{
				Title:      r.Title,
				Year:       r.Year,
				TmdbID:     r.TmdbID,
				PosterPath: r.PosterPath,
				Reason:     r.Reason,
			})
		}
		entry := &repository.RecommendationHistory{
			ID:              uuid.New().String(),
			UserID:          userID,
			Recommendations: stored,
			TokensUsed:      tokensUsed,
			IsAI:            true,
			CreatedAt:       time.Now(),
		}
		if err := h.recoRepo.Save(entry); err != nil {
			log.Printf("failed to save recommendation history: %v", err)
		}
	}
}

func (h *RecommendationHandler) StreamRecommendationsSimple(c *gin.Context) {
	userID := c.GetString("userID")

	var req streamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req = streamRequest{}
	}

	moviesResp, err := h.movieService.GetMovies(userID, model.MovieListQuery{Limit: 10000})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get movies"})
		return
	}

	if len(moviesResp.Movies) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no movies in collection"})
		return
	}

	var excludeTmdbIDs []int
	for _, m := range moviesResp.Movies {
		if m.TmdbID != 0 {
			excludeTmdbIDs = append(excludeTmdbIDs, m.TmdbID)
		}
	}
	if wishlistResp, err := h.wishlistService.GetItems(userID); err == nil {
		for _, item := range wishlistResp.Items {
			excludeTmdbIDs = append(excludeTmdbIDs, item.TmdbID)
		}
	}

	movies := moviesResp.Movies
	if len(req.MovieIDs) > 0 {
		idSet := make(map[string]bool)
		for _, id := range req.MovieIDs {
			idSet[id] = true
		}
		filteredMovies := movies[:0:0]
		for _, m := range movies {
			if idSet[m.ID] {
				filteredMovies = append(filteredMovies, m)
			}
		}
		if len(filteredMovies) > 0 {
			movies = filteredMovies
		}
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
	c.Writer.Flush()

	recoAgent := agent.NewRecommendationAgent(h.llmProvider, h.tmdbAPIKey)

	vibe := 50
	if req.Vibe != nil {
		vibe = *req.Vibe
	}

	result, err := recoAgent.RunSimple(c.Request.Context(), movies, excludeTmdbIDs, vibe, func(event agent.Event) {
		data, _ := json.Marshal(event)
		fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", event.Type, string(data))
		c.Writer.Flush()
	})

	if err != nil {
		log.Printf("recommendation simple error: %v", err)
		errEvent := agent.Event{Type: "error", Message: err.Error()}
		data, _ := json.Marshal(errEvent)
		fmt.Fprintf(c.Writer, "event: error\ndata: %s\n\n", string(data))
		c.Writer.Flush()
		return
	}

	// Save to history (no tokens used)
	if result != nil && len(result.Recommendations) > 0 {
		var stored []repository.StoredRecommendation
		for _, r := range result.Recommendations {
			stored = append(stored, repository.StoredRecommendation{
				Title:      r.Title,
				Year:       r.Year,
				TmdbID:     r.TmdbID,
				PosterPath: r.PosterPath,
				Reason:     r.Reason,
			})
		}
		entry := &repository.RecommendationHistory{
			ID:              uuid.New().String(),
			UserID:          userID,
			Recommendations: stored,
			TokensUsed:      0,
			IsAI:            false,
			CreatedAt:       time.Now(),
		}
		if err := h.recoRepo.Save(entry); err != nil {
			log.Printf("failed to save recommendation history: %v", err)
		}
	}
}

func (h *RecommendationHandler) GetHistory(c *gin.Context) {
	userID := c.GetString("userID")

	history, err := h.recoRepo.FindByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get history"})
		return
	}

	if history == nil {
		history = []repository.RecommendationHistory{}
	}

	c.JSON(http.StatusOK, gin.H{
		"history": history,
		"total":   len(history),
	})
}
