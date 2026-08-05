package model

import "time"

// PhaseKind values recognised by the client timeline. Anything else is stored
// but rendered neutrally.
const (
	PhaseSowing    = "sowing"
	PhasePlanting  = "planting"
	PhaseGrowth    = "growth"
	PhaseFlowering = "flowering"
	PhaseHarvest   = "harvest"
)

// Point is a vertex of a bed polygon, in normalised 0..1 plan coordinates.
type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type Bed struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Name      string    `json:"name"`
	Kind      string    `json:"kind"`
	AreaM2    *float64  `json:"area_m2,omitempty"`
	Shape     []Point   `json:"shape,omitempty"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Plant struct {
	ID          string `json:"id"`
	UserID      string `json:"user_id"`
	Name        string `json:"name"`
	LatinName   string `json:"latin_name"`
	Family      string `json:"family"`
	Description string `json:"description"`
	Sun         string `json:"sun"`
	Water       string `json:"water"`
	SpacingCm   *int   `json:"spacing_cm,omitempty"`
	// HasPhoto lets the client decide whether to fetch the photo endpoint at all,
	// without ever shipping the bytes inside a list response.
	HasPhoto  bool      `json:"has_photo"`
	PhotoMime string    `json:"photo_mime,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Phase struct {
	ID           string `json:"id"`
	OccupationID string `json:"occupation_id"`
	Kind         string `json:"kind"`
	StartsOn     string `json:"starts_on"`
	EndsOn       string `json:"ends_on"`
}

type Occupation struct {
	ID       string `json:"id"`
	UserID   string `json:"user_id"`
	PlantID  string `json:"plant_id"`
	BedID    string `json:"bed_id"`
	StartsOn string `json:"starts_on"`
	EndsOn   string `json:"ends_on"`
	Notes    string `json:"notes"`
	// Phases are always loaded with their occupation; a phase has no meaning on
	// its own, so there is no endpoint that returns them separately.
	Phases    []Phase   `json:"phases"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Conflict reports two occupations sharing a bed and an overlapping window.
// The server computes these rather than the client so the answer cannot drift
// between the timeline view and whatever else asks later.
type Conflict struct {
	BedID          string `json:"bed_id"`
	OccupationAID  string `json:"occupation_a_id"`
	OccupationBID  string `json:"occupation_b_id"`
	OverlapStart   string `json:"overlap_start"`
	OverlapEnd     string `json:"overlap_end"`
	OverlapDayspan int    `json:"overlap_dayspan"`
}

// --- Requests

type SaveBedRequest struct {
	Name      string   `json:"name" binding:"required"`
	Kind      string   `json:"kind"`
	AreaM2    *float64 `json:"area_m2"`
	Shape     []Point  `json:"shape"`
	SortOrder int      `json:"sort_order"`
}

type SavePlantRequest struct {
	Name        string `json:"name" binding:"required"`
	LatinName   string `json:"latin_name"`
	Family      string `json:"family"`
	Description string `json:"description"`
	Sun         string `json:"sun"`
	Water       string `json:"water"`
	SpacingCm   *int   `json:"spacing_cm"`
}

type PhaseInput struct {
	Kind     string `json:"kind" binding:"required"`
	StartsOn string `json:"starts_on" binding:"required"`
	EndsOn   string `json:"ends_on" binding:"required"`
}

type SaveOccupationRequest struct {
	PlantID  string       `json:"plant_id" binding:"required"`
	BedID    string       `json:"bed_id" binding:"required"`
	StartsOn string       `json:"starts_on" binding:"required"`
	EndsOn   string       `json:"ends_on" binding:"required"`
	Notes    string       `json:"notes"`
	Phases   []PhaseInput `json:"phases"`
}

// --- Responses

// GardenResponse is the single payload the app boots from. The three lists are
// small and always needed together — the timeline cannot render without all of
// them — so one round trip beats three.
type GardenResponse struct {
	Beds        []Bed        `json:"beds"`
	Plants      []Plant      `json:"plants"`
	Occupations []Occupation `json:"occupations"`
	Conflicts   []Conflict   `json:"conflicts"`
}
