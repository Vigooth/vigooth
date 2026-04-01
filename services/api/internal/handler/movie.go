package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/Vigooth/vigooth/services/api/internal/repository"
	"github.com/Vigooth/vigooth/services/api/internal/service"
	"github.com/gin-gonic/gin"
)

type MovieHandler struct {
	movieService *service.MovieService
}

func NewMovieHandler(movieService *service.MovieService) *MovieHandler {
	return &MovieHandler{
		movieService: movieService,
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
