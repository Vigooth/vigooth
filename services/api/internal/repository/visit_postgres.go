package repository

import (
	"context"
	"errors"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresVisitRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresVisitRepository(pool *pgxpool.Pool) *PostgresVisitRepository {
	return &PostgresVisitRepository{pool: pool}
}

func (r *PostgresVisitRepository) Create(visit *model.Visit) error {
	_, err := r.pool.Exec(context.Background(),
		`INSERT INTO visits (id, ip, app, path, referrer, user_agent, created_at)
		 VALUES ($1, $2::inet, $3, $4, $5, $6, $7)`,
		visit.ID, visit.IP, visit.App, visit.Path, visit.Referrer, visit.UserAgent, visit.CreatedAt,
	)
	return err
}

func (r *PostgresVisitRepository) List(filter model.VisitFilter) ([]model.Visit, error) {
	// `$1 = ''` folds the filter into one query: an empty app matches everything.
	rows, err := r.pool.Query(context.Background(),
		`SELECT v.id, host(v.ip), v.app, v.path, v.referrer, v.user_agent, v.created_at,
		        l.resolved, l.country, l.country_code, l.region, l.city, l.lat, l.lon, l.isp, l.looked_up_at
		 FROM visits v
		 LEFT JOIN ip_locations l ON l.ip = v.ip
		 WHERE ($1 = '' OR v.app = $1)
		 ORDER BY v.created_at DESC
		 LIMIT $2 OFFSET $3`,
		filter.App, filter.Limit, filter.Offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	visits := []model.Visit{}
	for rows.Next() {
		var v model.Visit
		var resolved *bool
		var country, countryCode, region, city, isp *string
		var lat, lon *float64
		var lookedUpAt *time.Time
		if err := rows.Scan(
			&v.ID, &v.IP, &v.App, &v.Path, &v.Referrer, &v.UserAgent, &v.CreatedAt,
			&resolved, &country, &countryCode, &region, &city, &lat, &lon, &isp, &lookedUpAt,
		); err != nil {
			return nil, err
		}
		if resolved != nil && *resolved {
			v.Location = &model.IPLocation{
				IP:          v.IP,
				Country:     *country,
				CountryCode: *countryCode,
				Region:      *region,
				City:        *city,
				Lat:         lat,
				Lon:         lon,
				ISP:         *isp,
				Resolved:    true,
				LookedUpAt:  *lookedUpAt,
			}
		}
		visits = append(visits, v)
	}
	return visits, rows.Err()
}

func (r *PostgresVisitRepository) Stats(now time.Time) (*model.VisitStats, error) {
	ctx := context.Background()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekAgo := now.Add(-7 * 24 * time.Hour)
	monthAgo := now.Add(-30 * 24 * time.Hour)

	stats := &model.VisitStats{
		ByCountry30d: []model.CountBucket{},
		ByApp30d:     []model.CountBucket{},
	}

	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*),
		        COUNT(*) FILTER (WHERE created_at >= $1),
		        COUNT(*) FILTER (WHERE created_at > $2),
		        COUNT(DISTINCT ip) FILTER (WHERE created_at > $2)
		 FROM visits`,
		startOfDay, weekAgo,
	).Scan(&stats.Total, &stats.Today, &stats.Last7Days, &stats.UniqueIPs7d)
	if err != nil {
		return nil, err
	}

	// Unresolved addresses group under '' so the total of the buckets still adds
	// up to the month's traffic; the frontend labels the empty key.
	stats.ByCountry30d, err = r.buckets(ctx,
		`SELECT COALESCE(CASE WHEN l.resolved THEN l.country END, ''), COUNT(*)
		 FROM visits v LEFT JOIN ip_locations l ON l.ip = v.ip
		 WHERE v.created_at > $1
		 GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10`, monthAgo)
	if err != nil {
		return nil, err
	}
	stats.ByApp30d, err = r.buckets(ctx,
		`SELECT app, COUNT(*) FROM visits WHERE created_at > $1
		 GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10`, monthAgo)
	if err != nil {
		return nil, err
	}
	return stats, nil
}

func (r *PostgresVisitRepository) buckets(ctx context.Context, query string, since time.Time) ([]model.CountBucket, error) {
	rows, err := r.pool.Query(ctx, query, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	buckets := []model.CountBucket{}
	for rows.Next() {
		var b model.CountBucket
		if err := rows.Scan(&b.Key, &b.Count); err != nil {
			return nil, err
		}
		buckets = append(buckets, b)
	}
	return buckets, rows.Err()
}

func (r *PostgresVisitRepository) GetLocation(ip string) (*model.IPLocation, error) {
	var loc model.IPLocation
	err := r.pool.QueryRow(context.Background(),
		`SELECT host(ip), country, country_code, region, city, lat, lon, isp, resolved, looked_up_at
		 FROM ip_locations WHERE ip = $1::inet`, ip,
	).Scan(&loc.IP, &loc.Country, &loc.CountryCode, &loc.Region, &loc.City, &loc.Lat, &loc.Lon, &loc.ISP, &loc.Resolved, &loc.LookedUpAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLocationNotFound
		}
		return nil, err
	}
	return &loc, nil
}

func (r *PostgresVisitRepository) SaveLocation(loc *model.IPLocation) error {
	_, err := r.pool.Exec(context.Background(),
		`INSERT INTO ip_locations (ip, country, country_code, region, city, lat, lon, isp, resolved, looked_up_at)
		 VALUES ($1::inet, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 ON CONFLICT (ip) DO UPDATE SET
		   country = EXCLUDED.country, country_code = EXCLUDED.country_code,
		   region = EXCLUDED.region, city = EXCLUDED.city,
		   lat = EXCLUDED.lat, lon = EXCLUDED.lon, isp = EXCLUDED.isp,
		   resolved = EXCLUDED.resolved, looked_up_at = EXCLUDED.looked_up_at`,
		loc.IP, loc.Country, loc.CountryCode, loc.Region, loc.City, loc.Lat, loc.Lon, loc.ISP, loc.Resolved, loc.LookedUpAt,
	)
	return err
}
