package service

import (
	"errors"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/Vigooth/vigooth/services/api/internal/repository"
	"github.com/google/uuid"
)

var (
	ErrInvalidDate      = errors.New("dates must be YYYY-MM-DD")
	ErrDatesReversed    = errors.New("end date must not precede start date")
	ErrPhotoTooLarge    = errors.New("photo exceeds the maximum size")
	ErrPhotoUnsupported = errors.New("unsupported photo type")
)

// MaxPhotoBytes caps what a single plant photo may occupy. Uploads are
// downscaled in the browser first, so anything approaching this ceiling is a
// client that skipped that step rather than a legitimate garden photo.
const MaxPhotoBytes = 4 << 20 // 4 MiB

var allowedPhotoMimes = map[string]struct{}{
	"image/jpeg": {},
	"image/png":  {},
	"image/webp": {},
}

type GardenService struct {
	gardenRepo repository.GardenRepository
}

func NewGardenService(gardenRepo repository.GardenRepository) *GardenService {
	return &GardenService{gardenRepo: gardenRepo}
}

// --- Read

func (s *GardenService) GetGarden(userID string) (*model.GardenResponse, error) {
	beds, err := s.gardenRepo.ListBeds(userID)
	if err != nil {
		return nil, err
	}
	plants, err := s.gardenRepo.ListPlants(userID)
	if err != nil {
		return nil, err
	}
	occupations, err := s.gardenRepo.ListOccupations(userID)
	if err != nil {
		return nil, err
	}

	return &model.GardenResponse{
		Beds:        beds,
		Plants:      plants,
		Occupations: occupations,
		Conflicts:   DetectConflicts(occupations),
	}, nil
}

// DetectConflicts reports every pair of occupations that share a bed and an
// overlapping date window.
//
// Both endpoints are inclusive: a bed freed on the 10th and re-sown on the 10th
// is a real conflict, because the ground cannot hold both crops that day. The
// comparison is quadratic within each bed, which is the right trade at garden
// scale — a season holds tens of occupations, not thousands.
func DetectConflicts(occupations []model.Occupation) []model.Conflict {
	byBed := make(map[string][]model.Occupation)
	for _, occupation := range occupations {
		byBed[occupation.BedID] = append(byBed[occupation.BedID], occupation)
	}

	conflicts := []model.Conflict{}
	for bedID, list := range byBed {
		for i := 0; i < len(list); i++ {
			for j := i + 1; j < len(list); j++ {
				a, b := list[i], list[j]
				aStart, err := repository.ParseDate(a.StartsOn)
				if err != nil {
					continue
				}
				aEnd, err := repository.ParseDate(a.EndsOn)
				if err != nil {
					continue
				}
				bStart, err := repository.ParseDate(b.StartsOn)
				if err != nil {
					continue
				}
				bEnd, err := repository.ParseDate(b.EndsOn)
				if err != nil {
					continue
				}

				start := aStart
				if bStart.After(start) {
					start = bStart
				}
				end := aEnd
				if bEnd.Before(end) {
					end = bEnd
				}
				if start.After(end) {
					continue
				}

				conflicts = append(conflicts, model.Conflict{
					BedID:          bedID,
					OccupationAID:  a.ID,
					OccupationBID:  b.ID,
					OverlapStart:   start.Format(repository.DateLayout),
					OverlapEnd:     end.Format(repository.DateLayout),
					OverlapDayspan: int(end.Sub(start).Hours()/24) + 1,
				})
			}
		}
	}
	return conflicts
}

// --- Beds

func (s *GardenService) CreateBed(userID string, req *model.SaveBedRequest) (*model.Bed, error) {
	now := time.Now()
	bed := &model.Bed{
		ID:        uuid.New().String(),
		UserID:    userID,
		Name:      req.Name,
		Kind:      defaultKind(req.Kind),
		AreaM2:    req.AreaM2,
		Shape:     req.Shape,
		SortOrder: req.SortOrder,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := s.gardenRepo.CreateBed(bed); err != nil {
		return nil, err
	}
	return bed, nil
}

func (s *GardenService) UpdateBed(userID, id string, req *model.SaveBedRequest) (*model.Bed, error) {
	bed := &model.Bed{
		ID:        id,
		UserID:    userID,
		Name:      req.Name,
		Kind:      defaultKind(req.Kind),
		AreaM2:    req.AreaM2,
		Shape:     req.Shape,
		SortOrder: req.SortOrder,
		UpdatedAt: time.Now(),
	}
	if err := s.gardenRepo.UpdateBed(bed); err != nil {
		return nil, err
	}
	return bed, nil
}

func (s *GardenService) DeleteBed(userID, id string) error {
	return s.gardenRepo.DeleteBed(userID, id)
}

func defaultKind(kind string) string {
	if kind == "" {
		return "bed"
	}
	return kind
}

// --- Plants

func (s *GardenService) CreatePlant(userID string, req *model.SavePlantRequest) (*model.Plant, error) {
	now := time.Now()
	plant := &model.Plant{
		ID:          uuid.New().String(),
		UserID:      userID,
		Name:        req.Name,
		LatinName:   req.LatinName,
		Family:      req.Family,
		Description: req.Description,
		Sun:         req.Sun,
		Water:       req.Water,
		SpacingCm:   req.SpacingCm,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := s.gardenRepo.CreatePlant(plant); err != nil {
		return nil, err
	}
	return plant, nil
}

func (s *GardenService) UpdatePlant(userID, id string, req *model.SavePlantRequest) (*model.Plant, error) {
	plant := &model.Plant{
		ID:          id,
		UserID:      userID,
		Name:        req.Name,
		LatinName:   req.LatinName,
		Family:      req.Family,
		Description: req.Description,
		Sun:         req.Sun,
		Water:       req.Water,
		SpacingCm:   req.SpacingCm,
		UpdatedAt:   time.Now(),
	}
	if err := s.gardenRepo.UpdatePlant(plant); err != nil {
		return nil, err
	}
	return plant, nil
}

func (s *GardenService) DeletePlant(userID, id string) error {
	return s.gardenRepo.DeletePlant(userID, id)
}

func (s *GardenService) SetPlantPhoto(userID, id string, data []byte, mime string) error {
	if len(data) > MaxPhotoBytes {
		return ErrPhotoTooLarge
	}
	if _, ok := allowedPhotoMimes[mime]; !ok {
		return ErrPhotoUnsupported
	}
	return s.gardenRepo.SetPlantPhoto(userID, id, data, mime)
}

func (s *GardenService) GetPlantPhoto(userID, id string) ([]byte, string, error) {
	return s.gardenRepo.GetPlantPhoto(userID, id)
}

// --- Occupations

// buildOccupation validates the window and materialises phase IDs.
//
// Phases are intentionally not required to sit inside the occupation window: a
// sowing phase often starts indoors weeks before the bed is actually taken, and
// rejecting that would make the model lie about how growing works.
func buildOccupation(userID, id string, req *model.SaveOccupationRequest) (*model.Occupation, error) {
	startsOn, err := repository.ParseDate(req.StartsOn)
	if err != nil {
		return nil, ErrInvalidDate
	}
	endsOn, err := repository.ParseDate(req.EndsOn)
	if err != nil {
		return nil, ErrInvalidDate
	}
	if endsOn.Before(startsOn) {
		return nil, ErrDatesReversed
	}

	phases := make([]model.Phase, 0, len(req.Phases))
	for _, input := range req.Phases {
		phaseStart, err := repository.ParseDate(input.StartsOn)
		if err != nil {
			return nil, ErrInvalidDate
		}
		phaseEnd, err := repository.ParseDate(input.EndsOn)
		if err != nil {
			return nil, ErrInvalidDate
		}
		if phaseEnd.Before(phaseStart) {
			return nil, ErrDatesReversed
		}
		phases = append(phases, model.Phase{
			ID:           uuid.New().String(),
			OccupationID: id,
			Kind:         input.Kind,
			StartsOn:     input.StartsOn,
			EndsOn:       input.EndsOn,
		})
	}

	return &model.Occupation{
		ID:        id,
		UserID:    userID,
		PlantID:   req.PlantID,
		BedID:     req.BedID,
		StartsOn:  req.StartsOn,
		EndsOn:    req.EndsOn,
		Notes:     req.Notes,
		Phases:    phases,
		UpdatedAt: time.Now(),
	}, nil
}

func (s *GardenService) CreateOccupation(userID string, req *model.SaveOccupationRequest) (*model.Occupation, error) {
	occupation, err := buildOccupation(userID, uuid.New().String(), req)
	if err != nil {
		return nil, err
	}
	occupation.CreatedAt = occupation.UpdatedAt
	if err := s.gardenRepo.CreateOccupation(occupation); err != nil {
		return nil, err
	}
	return occupation, nil
}

func (s *GardenService) UpdateOccupation(userID, id string, req *model.SaveOccupationRequest) (*model.Occupation, error) {
	occupation, err := buildOccupation(userID, id, req)
	if err != nil {
		return nil, err
	}
	if err := s.gardenRepo.UpdateOccupation(occupation); err != nil {
		return nil, err
	}
	return occupation, nil
}

func (s *GardenService) DeleteOccupation(userID, id string) error {
	return s.gardenRepo.DeleteOccupation(userID, id)
}
