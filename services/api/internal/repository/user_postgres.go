package repository

import (
	"context"
	"errors"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresUserRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresUserRepository(pool *pgxpool.Pool) *PostgresUserRepository {
	return &PostgresUserRepository{pool: pool}
}

func (r *PostgresUserRepository) Create(user *model.User) error {
	_, err := r.pool.Exec(context.Background(),
		`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, $3, $4)`,
		user.ID, user.Email, user.Password, user.CreatedAt,
	)
	if err != nil {
		// Check for unique constraint violation
		if err.Error() == `ERROR: duplicate key value violates unique constraint "users_email_key" (SQLSTATE 23505)` {
			return ErrUserAlreadyExists
		}
		return err
	}
	return nil
}

func (r *PostgresUserRepository) FindByEmail(email string) (*model.User, error) {
	var user model.User
	err := r.pool.QueryRow(context.Background(),
		`SELECT id, email, password, totp_secret, totp_enabled, recovery_codes, created_at FROM users WHERE email = $1`,
		email,
	).Scan(&user.ID, &user.Email, &user.Password, &user.TotpSecret, &user.TotpEnabled, &user.RecoveryCodes, &user.CreatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *PostgresUserRepository) FindByID(id string) (*model.User, error) {
	var user model.User
	err := r.pool.QueryRow(context.Background(),
		`SELECT id, email, password, totp_secret, totp_enabled, recovery_codes, created_at FROM users WHERE id = $1`,
		id,
	).Scan(&user.ID, &user.Email, &user.Password, &user.TotpSecret, &user.TotpEnabled, &user.RecoveryCodes, &user.CreatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *PostgresUserRepository) UpdateTotpSecret(id string, secret string) error {
	_, err := r.pool.Exec(context.Background(),
		`UPDATE users SET totp_secret = $2 WHERE id = $1`,
		id, secret,
	)
	return err
}

func (r *PostgresUserRepository) EnableTotp(id string, recoveryCodes string) error {
	_, err := r.pool.Exec(context.Background(),
		`UPDATE users SET totp_enabled = TRUE, recovery_codes = $2 WHERE id = $1`,
		id, recoveryCodes,
	)
	return err
}

func (r *PostgresUserRepository) DisableTotp(id string) error {
	_, err := r.pool.Exec(context.Background(),
		`UPDATE users SET totp_enabled = FALSE, totp_secret = '', recovery_codes = '' WHERE id = $1`,
		id,
	)
	return err
}

func (r *PostgresUserRepository) UpdateRecoveryCodes(id string, codes string) error {
	_, err := r.pool.Exec(context.Background(),
		`UPDATE users SET recovery_codes = $2 WHERE id = $1`,
		id, codes,
	)
	return err
}
