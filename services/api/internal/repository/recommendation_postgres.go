package repository

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRecommendationRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRecommendationRepository(pool *pgxpool.Pool) *PostgresRecommendationRepository {
	return &PostgresRecommendationRepository{pool: pool}
}

func (r *PostgresRecommendationRepository) Save(entry *RecommendationHistory) error {
	recsJSON, err := json.Marshal(entry.Recommendations)
	if err != nil {
		return err
	}

	_, err = r.pool.Exec(context.Background(),
		`INSERT INTO recommendation_history (id, user_id, recommendations, tokens_used, is_ai, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		entry.ID, entry.UserID, recsJSON, entry.TokensUsed, entry.IsAI, entry.CreatedAt,
	)

	return err
}

func (r *PostgresRecommendationRepository) FindByUserID(userID string) ([]RecommendationHistory, error) {
	rows, err := r.pool.Query(context.Background(),
		`SELECT id, user_id, recommendations, tokens_used, is_ai, created_at
		 FROM recommendation_history WHERE user_id = $1 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []RecommendationHistory
	for rows.Next() {
		var entry RecommendationHistory
		var recsJSON []byte
		err := rows.Scan(
			&entry.ID, &entry.UserID, &recsJSON, &entry.TokensUsed, &entry.IsAI, &entry.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		if err := json.Unmarshal(recsJSON, &entry.Recommendations); err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}

	if entries == nil {
		entries = []RecommendationHistory{}
	}

	return entries, nil
}
