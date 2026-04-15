package service

import (
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/Vigooth/vigooth/services/api/internal/repository"
	"github.com/google/uuid"
)

type MovieService struct {
	movieRepo repository.MovieRepository
}

func NewMovieService(movieRepo repository.MovieRepository) *MovieService {
	return &MovieService{
		movieRepo: movieRepo,
	}
}

func (s *MovieService) AddMovie(userID string, req *model.AddMovieRequest) (*model.Movie, error) {
	mediaType := req.MediaType
	if mediaType == "" {
		mediaType = "movie"
	}

	movie := &model.Movie{
		ID:             uuid.New().String(),
		UserID:         userID,
		TmdbID:         req.TmdbID,
		ImdbID:         req.ImdbID,
		MediaType:      mediaType,
		Title:          req.Title,
		OriginalTitle:  req.OriginalTitle,
		Year:           req.Year,
		PosterPath:     req.PosterPath,
		BackdropPath:   req.BackdropPath,
		Overview:       req.Overview,
		Genres:         req.Genres,
		Director:       req.Director,
		Runtime:        req.Runtime,
		Metascore:      req.Metascore,
		ImdbRating:     req.ImdbRating,
		RottenTomatoes: req.RottenTomatoes,
		PersonalRating: req.PersonalRating,
		Notes:          req.Notes,
		AddedAt:        time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := s.movieRepo.Create(movie); err != nil {
		return nil, err
	}

	return movie, nil
}

func (s *MovieService) GetMovies(userID string, query model.MovieListQuery) (*model.MovieListResponse, error) {
	if query.Limit <= 0 {
		query.Limit = 20
	}
	if query.Limit > 100 {
		query.Limit = 100
	}

	movies, total, err := s.movieRepo.FindAllByUserID(userID, query)
	if err != nil {
		return nil, err
	}

	return &model.MovieListResponse{
		Movies:  movies,
		Total:   total,
		HasMore: query.Offset+len(movies) < total,
	}, nil
}

func (s *MovieService) GetMovie(id string, userID string) (*model.Movie, error) {
	return s.movieRepo.FindByID(id, userID)
}

func (s *MovieService) UpdateMovie(id string, userID string, req *model.UpdateMovieRequest) (*model.Movie, error) {
	movie, err := s.movieRepo.FindByID(id, userID)
	if err != nil {
		return nil, err
	}

	if req.PersonalRating != nil {
		movie.PersonalRating = req.PersonalRating
	}
	if req.Notes != nil {
		movie.Notes = *req.Notes
	}
	if req.Metascore != nil {
		movie.Metascore = req.Metascore
	}
	if req.ImdbRating != nil {
		movie.ImdbRating = req.ImdbRating
	}
	if req.RottenTomatoes != nil {
		movie.RottenTomatoes = req.RottenTomatoes
	}

	movie.UpdatedAt = time.Now()

	if err := s.movieRepo.Update(movie); err != nil {
		return nil, err
	}

	return movie, nil
}

func (s *MovieService) DeleteMovie(id string, userID string) error {
	return s.movieRepo.Delete(id, userID)
}

func (s *MovieService) FindWithEmptyOverview(userID string) ([]model.Movie, error) {
	return s.movieRepo.FindWithEmptyOverview(userID)
}

func (s *MovieService) UpdateOverview(id string, overview string) error {
	return s.movieRepo.UpdateOverview(id, overview)
}

func (s *MovieService) GetTmdbIDs(userID string) ([]int, error) {
	return s.movieRepo.FindTmdbIDsByUserID(userID)
}
