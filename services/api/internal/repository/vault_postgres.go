package repository

import (
	"context"
	"errors"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresVaultRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresVaultRepository(pool *pgxpool.Pool) *PostgresVaultRepository {
	return &PostgresVaultRepository{pool: pool}
}

func (r *PostgresVaultRepository) Save(vault *model.Vault) error {
	_, err := r.pool.Exec(context.Background(),
		`INSERT INTO vaults (user_id, data, updated_at)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (user_id)
		 DO UPDATE SET data = $2, updated_at = $3`,
		vault.UserID, vault.Data, vault.UpdatedAt,
	)
	return err
}

func (r *PostgresVaultRepository) FindByUserID(userID string) (*model.Vault, error) {
	var vault model.Vault
	err := r.pool.QueryRow(context.Background(),
		`SELECT user_id, data, updated_at FROM vaults WHERE user_id = $1`,
		userID,
	).Scan(&vault.UserID, &vault.Data, &vault.UpdatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrVaultNotFound
		}
		return nil, err
	}
	return &vault, nil
}

func (r *PostgresVaultRepository) Delete(userID string) error {
	_, err := r.pool.Exec(context.Background(),
		`DELETE FROM vaults WHERE user_id = $1`,
		userID,
	)
	return err
}
