package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresMovieRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresMovieRepository(pool *pgxpool.Pool) *PostgresMovieRepository {
	return &PostgresMovieRepository{pool: pool}
}

func (r *PostgresMovieRepository) Create(movie *model.Movie) error {
	_, err := r.pool.Exec(context.Background(),
		`INSERT INTO movies (id, user_id, tmdb_id, imdb_id, media_type, title, original_title, year,
			poster_path, backdrop_path, overview, genres, director, runtime,
			metascore, imdb_rating, rotten_tomatoes, personal_rating, notes, added_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
		movie.ID, movie.UserID, movie.TmdbID, movie.ImdbID, movie.MediaType, movie.Title, movie.OriginalTitle,
		movie.Year, movie.PosterPath, movie.BackdropPath, movie.Overview, movie.Genres,
		movie.Director, movie.Runtime, movie.Metascore, movie.ImdbRating, movie.RottenTomatoes,
		movie.PersonalRating, movie.Notes, movie.AddedAt, movie.UpdatedAt,
	)

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return ErrMovieAlreadyExists
		}
		return err
	}
	return nil
}

func (r *PostgresMovieRepository) FindByID(id string, userID string) (*model.Movie, error) {
	var movie model.Movie
	err := r.pool.QueryRow(context.Background(),
		`SELECT id, user_id, tmdb_id, imdb_id, media_type, title, original_title, year,
			poster_path, backdrop_path, overview, genres, director, runtime,
			metascore, imdb_rating, rotten_tomatoes, personal_rating, notes, added_at, updated_at
		 FROM movies WHERE id = $1 AND user_id = $2`,
		id, userID,
	).Scan(
		&movie.ID, &movie.UserID, &movie.TmdbID, &movie.ImdbID, &movie.MediaType, &movie.Title,
		&movie.OriginalTitle, &movie.Year, &movie.PosterPath, &movie.BackdropPath,
		&movie.Overview, &movie.Genres, &movie.Director, &movie.Runtime,
		&movie.Metascore, &movie.ImdbRating, &movie.RottenTomatoes,
		&movie.PersonalRating, &movie.Notes, &movie.AddedAt, &movie.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMovieNotFound
		}
		return nil, err
	}
	return &movie, nil
}

func (r *PostgresMovieRepository) FindAllByUserID(userID string, query model.MovieListQuery) ([]model.Movie, int, error) {
	args := []any{userID}
	where := "WHERE user_id = $1"

	if query.Search != "" {
		args = append(args, "%"+query.Search+"%")
		where += fmt.Sprintf(" AND (title ILIKE $%d OR director ILIKE $%d)", len(args), len(args))
	}

	if query.AddedAfter != "" {
		args = append(args, query.AddedAfter)
		where += fmt.Sprintf(" AND added_at >= $%d", len(args))
	}

	if query.MinRating > 0 {
		args = append(args, query.MinRating)
		where += fmt.Sprintf(" AND personal_rating >= $%d", len(args))
	}

	// Count total matching rows
	var total int
	countSQL := "SELECT COUNT(*) FROM movies " + where
	if err := r.pool.QueryRow(context.Background(), countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Fetch page
	selectSQL := `SELECT id, user_id, tmdb_id, imdb_id, media_type, title, original_title, year,
			poster_path, backdrop_path, overview, genres, director, runtime,
			metascore, imdb_rating, rotten_tomatoes, personal_rating, notes, added_at, updated_at
		 FROM movies ` + where + ` ORDER BY added_at DESC LIMIT $` + fmt.Sprintf("%d", len(args)+1) + ` OFFSET $` + fmt.Sprintf("%d", len(args)+2)
	args = append(args, query.Limit, query.Offset)

	rows, err := r.pool.Query(context.Background(), selectSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var movies []model.Movie
	for rows.Next() {
		var movie model.Movie
		err := rows.Scan(
			&movie.ID, &movie.UserID, &movie.TmdbID, &movie.ImdbID, &movie.MediaType, &movie.Title,
			&movie.OriginalTitle, &movie.Year, &movie.PosterPath, &movie.BackdropPath,
			&movie.Overview, &movie.Genres, &movie.Director, &movie.Runtime,
			&movie.Metascore, &movie.ImdbRating, &movie.RottenTomatoes,
			&movie.PersonalRating, &movie.Notes, &movie.AddedAt, &movie.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		movies = append(movies, movie)
	}

	if movies == nil {
		movies = []model.Movie{}
	}

	return movies, total, nil
}

func (r *PostgresMovieRepository) Update(movie *model.Movie) error {
	result, err := r.pool.Exec(context.Background(),
		`UPDATE movies SET
			personal_rating = $1, notes = $2, metascore = $3,
			imdb_rating = $4, rotten_tomatoes = $5, updated_at = $6
		 WHERE id = $7 AND user_id = $8`,
		movie.PersonalRating, movie.Notes, movie.Metascore,
		movie.ImdbRating, movie.RottenTomatoes, movie.UpdatedAt,
		movie.ID, movie.UserID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrMovieNotFound
	}
	return nil
}

func (r *PostgresMovieRepository) Delete(id string, userID string) error {
	result, err := r.pool.Exec(context.Background(),
		`DELETE FROM movies WHERE id = $1 AND user_id = $2`,
		id, userID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrMovieNotFound
	}
	return nil
}

func (r *PostgresMovieRepository) ExistsByTmdbID(userID string, tmdbID int) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(context.Background(),
		`SELECT EXISTS(SELECT 1 FROM movies WHERE user_id = $1 AND tmdb_id = $2)`,
		userID, tmdbID,
	).Scan(&exists)

	return exists, err
}

func (r *PostgresMovieRepository) FindWithEmptyOverview(userID string) ([]model.Movie, error) {
	rows, err := r.pool.Query(context.Background(),
		`SELECT id, user_id, tmdb_id, imdb_id, media_type, title, original_title, year,
			poster_path, backdrop_path, overview, genres, director, runtime,
			metascore, imdb_rating, rotten_tomatoes, personal_rating, notes, added_at, updated_at
		 FROM movies WHERE user_id = $1 AND (overview IS NULL OR overview = '') AND tmdb_id > 0`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var movies []model.Movie
	for rows.Next() {
		var movie model.Movie
		err := rows.Scan(
			&movie.ID, &movie.UserID, &movie.TmdbID, &movie.ImdbID, &movie.MediaType, &movie.Title,
			&movie.OriginalTitle, &movie.Year, &movie.PosterPath, &movie.BackdropPath,
			&movie.Overview, &movie.Genres, &movie.Director, &movie.Runtime,
			&movie.Metascore, &movie.ImdbRating, &movie.RottenTomatoes,
			&movie.PersonalRating, &movie.Notes, &movie.AddedAt, &movie.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		movies = append(movies, movie)
	}
	if movies == nil {
		movies = []model.Movie{}
	}
	return movies, nil
}

func (r *PostgresMovieRepository) UpdateOverview(id string, overview string) error {
	_, err := r.pool.Exec(context.Background(),
		`UPDATE movies SET overview = $1, updated_at = NOW() WHERE id = $2`,
		overview, id,
	)
	return err
}

func (r *PostgresMovieRepository) FindTmdbIDsByUserID(userID string) ([]int, error) {
	rows, err := r.pool.Query(context.Background(),
		`SELECT tmdb_id FROM movies WHERE user_id = $1`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if ids == nil {
		ids = []int{}
	}
	return ids, nil
}
