package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/Vigooth/vigooth/services/api/internal/repository"
	"github.com/Vigooth/vigooth/services/api/internal/service"
	"github.com/gin-gonic/gin"
)

type MovieHandler struct {
	movieService *service.MovieService
	tmdbApiKey   string
}

func NewMovieHandler(movieService *service.MovieService, tmdbApiKey string) *MovieHandler {
	return &MovieHandler{
		movieService: movieService,
		tmdbApiKey:   tmdbApiKey,
	}
}

func (h *MovieHandler) GetMovies(c *gin.Context) {
	userID := c.GetString("userID")

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	search := c.Query("search")

	addedAfter := c.Query("added_after")
	minRating, _ := strconv.Atoi(c.DefaultQuery("min_rating", "0"))

	query := model.MovieListQuery{
		Search:     search,
		Limit:      limit,
		Offset:     offset,
		AddedAfter: addedAfter,
		MinRating:  minRating,
	}

	resp, err := h.movieService.GetMovies(userID, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get movies"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *MovieHandler) GetMovie(c *gin.Context) {
	userID := c.GetString("userID")
	id := c.Param("id")

	movie, err := h.movieService.GetMovie(id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrMovieNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "movie not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get movie"})
		return
	}

	c.JSON(http.StatusOK, movie)
}

func (h *MovieHandler) AddMovie(c *gin.Context) {
	userID := c.GetString("userID")

	var req model.AddMovieRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	movie, err := h.movieService.AddMovie(userID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrMovieAlreadyExists) {
			c.JSON(http.StatusConflict, gin.H{"error": "movie already in collection"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add movie"})
		return
	}

	c.JSON(http.StatusCreated, movie)
}

func (h *MovieHandler) UpdateMovie(c *gin.Context) {
	userID := c.GetString("userID")
	id := c.Param("id")

	var req model.UpdateMovieRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	movie, err := h.movieService.UpdateMovie(id, userID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrMovieNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "movie not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update movie"})
		return
	}

	c.JSON(http.StatusOK, movie)
}

func (h *MovieHandler) DeleteMovie(c *gin.Context) {
	userID := c.GetString("userID")
	id := c.Param("id")

	err := h.movieService.DeleteMovie(id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrMovieNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "movie not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete movie"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "movie deleted"})
}

func (h *MovieHandler) BackfillOverviews(c *gin.Context) {
	userID := c.GetString("userID")

	movies, err := h.movieService.FindWithEmptyOverview(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find movies"})
		return
	}

	if len(movies) == 0 {
		c.JSON(http.StatusOK, gin.H{"updated": 0, "message": "all movies already have overviews"})
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	updated := 0

	for _, movie := range movies {
		endpoint := "movie"
		if movie.MediaType == "tv" {
			endpoint = "tv"
		}
		url := fmt.Sprintf("https://api.themoviedb.org/3/%s/%d?api_key=%s&language=fr-FR",
			endpoint, movie.TmdbID, h.tmdbApiKey)

		resp, err := client.Get(url)
		if err != nil {
			continue
		}
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil || resp.StatusCode != 200 {
			continue
		}

		var detail struct {
			Overview string `json:"overview"`
		}
		if err := json.Unmarshal(body, &detail); err != nil || detail.Overview == "" {
			continue
		}

		if err := h.movieService.UpdateOverview(movie.ID, detail.Overview); err != nil {
			continue
		}
		updated++
	}

	c.JSON(http.StatusOK, gin.H{"updated": updated, "total": len(movies)})
}
