package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DateLayout is the wire format for every date the garden API exchanges.
// Occupations are day-granular by nature — a bed is busy for a season, not for
// an afternoon — so dates travel as plain YYYY-MM-DD and never carry a timezone
// that could shift them across a day boundary.
const DateLayout = "2006-01-02"

// ParseDate validates a wire date and converts it for the driver.
func ParseDate(value string) (time.Time, error) {
	return time.Parse(DateLayout, value)
}

type PostgresGardenRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresGardenRepository(pool *pgxpool.Pool) *PostgresGardenRepository {
	return &PostgresGardenRepository{pool: pool}
}

// --- Beds

func (r *PostgresGardenRepository) ListBeds(userID string) ([]model.Bed, error) {
	rows, err := r.pool.Query(context.Background(),
		`SELECT id, user_id, name, COALESCE(kind, 'bed'), area_m2, shape, sort_order,
		        created_at, updated_at
		 FROM garden_beds WHERE user_id = $1 ORDER BY sort_order, name`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	beds := []model.Bed{}
	for rows.Next() {
		var bed model.Bed
		var shape []byte
		if err := rows.Scan(&bed.ID, &bed.UserID, &bed.Name, &bed.Kind, &bed.AreaM2,
			&shape, &bed.SortOrder, &bed.CreatedAt, &bed.UpdatedAt); err != nil {
			return nil, err
		}
		if len(shape) > 0 {
			if err := json.Unmarshal(shape, &bed.Shape); err != nil {
				return nil, err
			}
		}
		beds = append(beds, bed)
	}
	return beds, rows.Err()
}

func encodeShape(shape []model.Point) ([]byte, error) {
	if len(shape) == 0 {
		return nil, nil
	}
	return json.Marshal(shape)
}

func (r *PostgresGardenRepository) CreateBed(bed *model.Bed) error {
	shape, err := encodeShape(bed.Shape)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(context.Background(),
		`INSERT INTO garden_beds (id, user_id, name, kind, area_m2, shape, sort_order,
		                          created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		bed.ID, bed.UserID, bed.Name, bed.Kind, bed.AreaM2, shape, bed.SortOrder,
		bed.CreatedAt, bed.UpdatedAt,
	)
	return err
}

func (r *PostgresGardenRepository) UpdateBed(bed *model.Bed) error {
	shape, err := encodeShape(bed.Shape)
	if err != nil {
		return err
	}
	tag, err := r.pool.Exec(context.Background(),
		`UPDATE garden_beds
		 SET name = $3, kind = $4, area_m2 = $5, shape = $6, sort_order = $7, updated_at = $8
		 WHERE id = $1 AND user_id = $2`,
		bed.ID, bed.UserID, bed.Name, bed.Kind, bed.AreaM2, shape, bed.SortOrder, bed.UpdatedAt,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrGardenNotFound
	}
	return nil
}

func (r *PostgresGardenRepository) DeleteBed(userID, id string) error {
	tag, err := r.pool.Exec(context.Background(),
		`DELETE FROM garden_beds WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrGardenNotFound
	}
	return nil
}

// --- Plants

// plantColumns never selects the photo bytes. A list of plants would otherwise
// drag every image through the connection for a view that only needs to know
// whether a photo exists.
const plantColumns = `id, user_id, name, COALESCE(latin_name, ''), COALESCE(family, ''),
	COALESCE(description, ''), COALESCE(sun, ''), COALESCE(water, ''), spacing_cm,
	photo IS NOT NULL, COALESCE(photo_mime, ''), created_at, updated_at`

func scanPlant(row pgx.Row) (*model.Plant, error) {
	var plant model.Plant
	err := row.Scan(&plant.ID, &plant.UserID, &plant.Name, &plant.LatinName, &plant.Family,
		&plant.Description, &plant.Sun, &plant.Water, &plant.SpacingCm,
		&plant.HasPhoto, &plant.PhotoMime, &plant.CreatedAt, &plant.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &plant, nil
}

func (r *PostgresGardenRepository) ListPlants(userID string) ([]model.Plant, error) {
	rows, err := r.pool.Query(context.Background(),
		`SELECT `+plantColumns+` FROM garden_plants WHERE user_id = $1 ORDER BY name`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	plants := []model.Plant{}
	for rows.Next() {
		plant, err := scanPlant(rows)
		if err != nil {
			return nil, err
		}
		plants = append(plants, *plant)
	}
	return plants, rows.Err()
}

func (r *PostgresGardenRepository) CreatePlant(plant *model.Plant) error {
	_, err := r.pool.Exec(context.Background(),
		`INSERT INTO garden_plants (id, user_id, name, latin_name, family, description,
		                            sun, water, spacing_cm, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		plant.ID, plant.UserID, plant.Name, plant.LatinName, plant.Family, plant.Description,
		plant.Sun, plant.Water, plant.SpacingCm, plant.CreatedAt, plant.UpdatedAt,
	)
	return err
}

func (r *PostgresGardenRepository) UpdatePlant(plant *model.Plant) error {
	// photo and photo_mime are deliberately absent: they belong to the photo
	// endpoint, and a metadata save must not wipe an existing image.
	tag, err := r.pool.Exec(context.Background(),
		`UPDATE garden_plants
		 SET name = $3, latin_name = $4, family = $5, description = $6, sun = $7,
		     water = $8, spacing_cm = $9, updated_at = $10
		 WHERE id = $1 AND user_id = $2`,
		plant.ID, plant.UserID, plant.Name, plant.LatinName, plant.Family, plant.Description,
		plant.Sun, plant.Water, plant.SpacingCm, plant.UpdatedAt,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrGardenNotFound
	}
	return nil
}

func (r *PostgresGardenRepository) DeletePlant(userID, id string) error {
	tag, err := r.pool.Exec(context.Background(),
		`DELETE FROM garden_plants WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrGardenNotFound
	}
	return nil
}

func (r *PostgresGardenRepository) SetPlantPhoto(userID, id string, data []byte, mime string) error {
	tag, err := r.pool.Exec(context.Background(),
		`UPDATE garden_plants SET photo = $3, photo_mime = $4, updated_at = NOW()
		 WHERE id = $1 AND user_id = $2`,
		id, userID, data, mime,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrGardenNotFound
	}
	return nil
}

func (r *PostgresGardenRepository) GetPlantPhoto(userID, id string) ([]byte, string, error) {
	var data []byte
	var mime string
	err := r.pool.QueryRow(context.Background(),
		`SELECT photo, COALESCE(photo_mime, '') FROM garden_plants
		 WHERE id = $1 AND user_id = $2`, id, userID).Scan(&data, &mime)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, "", ErrGardenNotFound
	}
	if err != nil {
		return nil, "", err
	}
	if len(data) == 0 {
		return nil, "", ErrGardenNoPhoto
	}
	return data, mime, nil
}

// --- Plan photo

// SetPlanPhoto upserts, because the row is the user's single plan slot rather
// than a record they create and then edit — there is no "first upload" case worth
// distinguishing from a replacement.
func (r *PostgresGardenRepository) SetPlanPhoto(userID string, data []byte, mime string) error {
	_, err := r.pool.Exec(context.Background(),
		`INSERT INTO garden_settings (user_id, plan_photo, plan_photo_mime, updated_at)
		 VALUES ($1, $2, $3, NOW())
		 ON CONFLICT (user_id) DO UPDATE
		   SET plan_photo = EXCLUDED.plan_photo,
		       plan_photo_mime = EXCLUDED.plan_photo_mime,
		       updated_at = NOW()`,
		userID, data, mime,
	)
	return err
}

func (r *PostgresGardenRepository) GetPlanPhoto(userID string) ([]byte, string, error) {
	var data []byte
	var mime string
	err := r.pool.QueryRow(context.Background(),
		`SELECT plan_photo, COALESCE(plan_photo_mime, '') FROM garden_settings
		 WHERE user_id = $1`, userID).Scan(&data, &mime)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, "", ErrGardenNoPhoto
	}
	if err != nil {
		return nil, "", err
	}
	if len(data) == 0 {
		return nil, "", ErrGardenNoPhoto
	}
	return data, mime, nil
}

// HasPlanPhoto never selects the bytes: it runs on every garden read, and
// dragging the image through the connection just to test for its presence would
// make the main payload pay for a picture it does not carry.
func (r *PostgresGardenRepository) HasPlanPhoto(userID string) (bool, error) {
	var present bool
	err := r.pool.QueryRow(context.Background(),
		`SELECT plan_photo IS NOT NULL FROM garden_settings WHERE user_id = $1`,
		userID).Scan(&present)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return present, nil
}

func (r *PostgresGardenRepository) DeletePlanPhoto(userID string) error {
	// Clear the columns rather than the row: it is the user's settings slot, and
	// other settings may join it later.
	_, err := r.pool.Exec(context.Background(),
		`UPDATE garden_settings SET plan_photo = NULL, plan_photo_mime = NULL, updated_at = NOW()
		 WHERE user_id = $1`, userID)
	return err
}

// --- Occupations

func (r *PostgresGardenRepository) ListOccupations(userID string) ([]model.Occupation, error) {
	rows, err := r.pool.Query(context.Background(),
		`SELECT id, user_id, plant_id, bed_id, starts_on, ends_on, COALESCE(notes, ''),
		        created_at, updated_at
		 FROM garden_occupations WHERE user_id = $1 ORDER BY starts_on, created_at`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	occupations := []model.Occupation{}
	index := make(map[string]int)
	for rows.Next() {
		var occupation model.Occupation
		var startsOn, endsOn time.Time
		if err := rows.Scan(&occupation.ID, &occupation.UserID, &occupation.PlantID,
			&occupation.BedID, &startsOn, &endsOn, &occupation.Notes,
			&occupation.CreatedAt, &occupation.UpdatedAt); err != nil {
			return nil, err
		}
		occupation.StartsOn = startsOn.Format(DateLayout)
		occupation.EndsOn = endsOn.Format(DateLayout)
		occupation.Phases = []model.Phase{}
		index[occupation.ID] = len(occupations)
		occupations = append(occupations, occupation)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(occupations) == 0 {
		return occupations, nil
	}

	// One extra query for every phase in the garden, then grouped in memory.
	// Per-occupation queries would be a round trip each; a JOIN would duplicate
	// every occupation row once per phase.
	phaseRows, err := r.pool.Query(context.Background(),
		`SELECT p.id, p.occupation_id, p.kind, p.starts_on, p.ends_on
		 FROM garden_phases p
		 JOIN garden_occupations o ON o.id = p.occupation_id
		 WHERE o.user_id = $1
		 ORDER BY p.starts_on`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer phaseRows.Close()

	for phaseRows.Next() {
		var phase model.Phase
		var startsOn, endsOn time.Time
		if err := phaseRows.Scan(&phase.ID, &phase.OccupationID, &phase.Kind,
			&startsOn, &endsOn); err != nil {
			return nil, err
		}
		phase.StartsOn = startsOn.Format(DateLayout)
		phase.EndsOn = endsOn.Format(DateLayout)
		if position, ok := index[phase.OccupationID]; ok {
			occupations[position].Phases = append(occupations[position].Phases, phase)
		}
	}
	return occupations, phaseRows.Err()
}

// writeOccupation inserts or updates an occupation together with its phases, in
// one transaction. Phases are replaced wholesale rather than diffed: they are a
// handful of rows fully owned by the occupation, so a half-applied edit is the
// only outcome worth protecting against.
func (r *PostgresGardenRepository) writeOccupation(occupation *model.Occupation, insert bool) error {
	startsOn, err := ParseDate(occupation.StartsOn)
	if err != nil {
		return err
	}
	endsOn, err := ParseDate(occupation.EndsOn)
	if err != nil {
		return err
	}

	ctx := context.Background()
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if insert {
		_, err = tx.Exec(ctx,
			`INSERT INTO garden_occupations (id, user_id, plant_id, bed_id, starts_on,
			                                 ends_on, notes, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			occupation.ID, occupation.UserID, occupation.PlantID, occupation.BedID,
			startsOn, endsOn, occupation.Notes, occupation.CreatedAt, occupation.UpdatedAt,
		)
		if err != nil {
			return err
		}
	} else {
		tag, err := tx.Exec(ctx,
			`UPDATE garden_occupations
			 SET plant_id = $3, bed_id = $4, starts_on = $5, ends_on = $6, notes = $7,
			     updated_at = $8
			 WHERE id = $1 AND user_id = $2`,
			occupation.ID, occupation.UserID, occupation.PlantID, occupation.BedID,
			startsOn, endsOn, occupation.Notes, occupation.UpdatedAt,
		)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return ErrGardenNotFound
		}
		if _, err := tx.Exec(ctx,
			`DELETE FROM garden_phases WHERE occupation_id = $1`, occupation.ID); err != nil {
			return err
		}
	}

	for _, phase := range occupation.Phases {
		phaseStart, err := ParseDate(phase.StartsOn)
		if err != nil {
			return err
		}
		phaseEnd, err := ParseDate(phase.EndsOn)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO garden_phases (id, occupation_id, kind, starts_on, ends_on)
			 VALUES ($1, $2, $3, $4, $5)`,
			phase.ID, occupation.ID, phase.Kind, phaseStart, phaseEnd,
		); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *PostgresGardenRepository) CreateOccupation(occupation *model.Occupation) error {
	return r.writeOccupation(occupation, true)
}

func (r *PostgresGardenRepository) UpdateOccupation(occupation *model.Occupation) error {
	return r.writeOccupation(occupation, false)
}

func (r *PostgresGardenRepository) DeleteOccupation(userID, id string) error {
	tag, err := r.pool.Exec(context.Background(),
		`DELETE FROM garden_occupations WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrGardenNotFound
	}
	return nil
}
