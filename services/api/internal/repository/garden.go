package repository

import (
	"errors"
	"sort"
	"sync"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/model"
)

var (
	ErrGardenNotFound = errors.New("garden record not found")
	ErrGardenNoPhoto  = errors.New("plant has no photo")
)

type GardenRepository interface {
	ListBeds(userID string) ([]model.Bed, error)
	CreateBed(bed *model.Bed) error
	UpdateBed(bed *model.Bed) error
	DeleteBed(userID, id string) error

	ListPlants(userID string) ([]model.Plant, error)
	CreatePlant(plant *model.Plant) error
	UpdatePlant(plant *model.Plant) error
	DeletePlant(userID, id string) error
	SetPlantPhoto(userID, id string, data []byte, mime string) error
	GetPlantPhoto(userID, id string) ([]byte, string, error)

	ListOccupations(userID string) ([]model.Occupation, error)
	CreateOccupation(occupation *model.Occupation) error
	UpdateOccupation(occupation *model.Occupation) error
	DeleteOccupation(userID, id string) error
}

// InMemoryGardenRepository backs the no-DATABASE_URL development mode.
type InMemoryGardenRepository struct {
	beds        map[string]*model.Bed
	plants      map[string]*model.Plant
	photos      map[string][]byte
	occupations map[string]*model.Occupation
	mu          sync.RWMutex
}

func NewInMemoryGardenRepository() *InMemoryGardenRepository {
	return &InMemoryGardenRepository{
		beds:        make(map[string]*model.Bed),
		plants:      make(map[string]*model.Plant),
		photos:      make(map[string][]byte),
		occupations: make(map[string]*model.Occupation),
	}
}

func (r *InMemoryGardenRepository) ListBeds(userID string) ([]model.Bed, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	beds := []model.Bed{}
	for _, bed := range r.beds {
		if bed.UserID == userID {
			beds = append(beds, *bed)
		}
	}
	sort.Slice(beds, func(i, j int) bool {
		if beds[i].SortOrder != beds[j].SortOrder {
			return beds[i].SortOrder < beds[j].SortOrder
		}
		return beds[i].Name < beds[j].Name
	})
	return beds, nil
}

func (r *InMemoryGardenRepository) CreateBed(bed *model.Bed) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	copied := *bed
	r.beds[bed.ID] = &copied
	return nil
}

func (r *InMemoryGardenRepository) UpdateBed(bed *model.Bed) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, ok := r.beds[bed.ID]
	if !ok || existing.UserID != bed.UserID {
		return ErrGardenNotFound
	}
	copied := *bed
	copied.CreatedAt = existing.CreatedAt
	r.beds[bed.ID] = &copied
	return nil
}

func (r *InMemoryGardenRepository) DeleteBed(userID, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	bed, ok := r.beds[id]
	if !ok || bed.UserID != userID {
		return ErrGardenNotFound
	}
	delete(r.beds, id)
	// Mirror the ON DELETE CASCADE the Postgres schema applies.
	for occID, occupation := range r.occupations {
		if occupation.BedID == id {
			delete(r.occupations, occID)
		}
	}
	return nil
}

func (r *InMemoryGardenRepository) ListPlants(userID string) ([]model.Plant, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	plants := []model.Plant{}
	for _, plant := range r.plants {
		if plant.UserID == userID {
			plants = append(plants, *plant)
		}
	}
	sort.Slice(plants, func(i, j int) bool { return plants[i].Name < plants[j].Name })
	return plants, nil
}

func (r *InMemoryGardenRepository) CreatePlant(plant *model.Plant) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	copied := *plant
	r.plants[plant.ID] = &copied
	return nil
}

func (r *InMemoryGardenRepository) UpdatePlant(plant *model.Plant) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, ok := r.plants[plant.ID]
	if !ok || existing.UserID != plant.UserID {
		return ErrGardenNotFound
	}
	copied := *plant
	copied.CreatedAt = existing.CreatedAt
	// The photo is written through its own endpoint; a metadata update must not
	// silently drop it.
	copied.HasPhoto = existing.HasPhoto
	copied.PhotoMime = existing.PhotoMime
	r.plants[plant.ID] = &copied
	return nil
}

func (r *InMemoryGardenRepository) DeletePlant(userID, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	plant, ok := r.plants[id]
	if !ok || plant.UserID != userID {
		return ErrGardenNotFound
	}
	delete(r.plants, id)
	delete(r.photos, id)
	for occID, occupation := range r.occupations {
		if occupation.PlantID == id {
			delete(r.occupations, occID)
		}
	}
	return nil
}

func (r *InMemoryGardenRepository) SetPlantPhoto(userID, id string, data []byte, mime string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	plant, ok := r.plants[id]
	if !ok || plant.UserID != userID {
		return ErrGardenNotFound
	}
	r.photos[id] = data
	plant.HasPhoto = true
	plant.PhotoMime = mime
	plant.UpdatedAt = time.Now()
	return nil
}

func (r *InMemoryGardenRepository) GetPlantPhoto(userID, id string) ([]byte, string, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	plant, ok := r.plants[id]
	if !ok || plant.UserID != userID {
		return nil, "", ErrGardenNotFound
	}
	data, ok := r.photos[id]
	if !ok || len(data) == 0 {
		return nil, "", ErrGardenNoPhoto
	}
	return data, plant.PhotoMime, nil
}

func (r *InMemoryGardenRepository) ListOccupations(userID string) ([]model.Occupation, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	occupations := []model.Occupation{}
	for _, occupation := range r.occupations {
		if occupation.UserID == userID {
			occupations = append(occupations, *occupation)
		}
	}
	sort.Slice(occupations, func(i, j int) bool {
		return occupations[i].StartsOn < occupations[j].StartsOn
	})
	return occupations, nil
}

func (r *InMemoryGardenRepository) CreateOccupation(occupation *model.Occupation) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	copied := *occupation
	r.occupations[occupation.ID] = &copied
	return nil
}

func (r *InMemoryGardenRepository) UpdateOccupation(occupation *model.Occupation) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, ok := r.occupations[occupation.ID]
	if !ok || existing.UserID != occupation.UserID {
		return ErrGardenNotFound
	}
	copied := *occupation
	copied.CreatedAt = existing.CreatedAt
	r.occupations[occupation.ID] = &copied
	return nil
}

func (r *InMemoryGardenRepository) DeleteOccupation(userID, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	occupation, ok := r.occupations[id]
	if !ok || occupation.UserID != userID {
		return ErrGardenNotFound
	}
	delete(r.occupations, id)
	return nil
}
