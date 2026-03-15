package repository

import (
	"context"
	"errors"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresWishlistRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresWishlistRepository(pool *pgxpool.Pool) *PostgresWishlistRepository {
	return &PostgresWishlistRepository{pool: pool}
}

func (r *PostgresWishlistRepository) Create(item *model.WishlistItem) error {
	_, err := r.pool.Exec(context.Background(),
		`INSERT INTO wishlists (id, user_id, tmdb_id, title, year, poster_path, added_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		item.ID, item.UserID, item.TmdbID, item.Title, item.Year, item.PosterPath, item.AddedAt,
	)

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return ErrWishlistItemAlreadyExists
		}
		return err
	}
	return nil
}

func (r *PostgresWishlistRepository) FindAllByUserID(userID string) ([]model.WishlistItem, error) {
	rows, err := r.pool.Query(context.Background(),
		`SELECT id, user_id, tmdb_id, title, year, poster_path, added_at
		 FROM wishlists WHERE user_id = $1 ORDER BY added_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.WishlistItem
	for rows.Next() {
		var item model.WishlistItem
		err := rows.Scan(
			&item.ID, &item.UserID, &item.TmdbID, &item.Title,
			&item.Year, &item.PosterPath, &item.AddedAt,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	if items == nil {
		items = []model.WishlistItem{}
	}

	return items, nil
}

func (r *PostgresWishlistRepository) Delete(userID string, tmdbID int) error {
	result, err := r.pool.Exec(context.Background(),
		`DELETE FROM wishlists WHERE user_id = $1 AND tmdb_id = $2`,
		userID, tmdbID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrWishlistItemNotFound
	}
	return nil
}

func (r *PostgresWishlistRepository) ExistsByTmdbID(userID string, tmdbID int) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(context.Background(),
		`SELECT EXISTS(SELECT 1 FROM wishlists WHERE user_id = $1 AND tmdb_id = $2)`,
		userID, tmdbID,
	).Scan(&exists)

	return exists, err
}
