package main

import (
	"fmt"
	"log"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/Vigooth/vigooth/services/api/internal/service"
)

// The demo garden the in-memory dev server starts with: trees around the edge,
// vegetables in the middle, a lavender hedge along the bottom. Coordinates are
// plan fractions; at a 25 m plan width a 0.05 square is 1.25 m, about a tree's
// foot. It mirrors apps/garden/scripts/seed-demo.mjs, which does the same
// against a real API for a real account.

type seedPlant struct {
	name, latin, family string
	spacingCm           int
}

type seedBed struct {
	name, kind string
	shape      []model.Point
	plant      seedPlant
	startsOn   string
	endsOn     string
	phases     []model.PhaseInput
}

func rect(x, y, w, h float64) []model.Point {
	return []model.Point{{X: x, Y: y}, {X: x + w, Y: y}, {X: x + w, Y: y + h}, {X: x, Y: y + h}}
}

func spot(x, y, size float64) []model.Point {
	return rect(x-size/2, y-size/2, size, size)
}

func seedDevGarden(gardenService *service.GardenService, userID string) {
	year := time.Now().Year()
	date := func(y int, md string) string { return fmt.Sprintf("%d-%s", y, md) }
	forever := [2]string{"2020-01-01", "2060-12-31"}

	tree := func(name, latin, family string, x, y, size float64) seedBed {
		return seedBed{
			name: name, kind: "row", shape: spot(x, y, size),
			plant:    seedPlant{name, latin, family, 400},
			startsOn: forever[0], endsOn: forever[1],
		}
	}

	beds := []seedBed{
		tree("Chêne", "Quercus robur", "Fagaceae", 0.08, 0.10, 0.08),
		tree("Tilleul", "Tilia cordata", "Malvaceae", 0.30, 0.08, 0.05),
		tree("Catalpa", "Catalpa bignonioides", "Bignoniaceae", 0.55, 0.08, 0.05),
		tree("Liquidambar", "Liquidambar styraciflua", "Altingiaceae", 0.80, 0.08, 0.05),
		tree("Érable pourpre", "Acer platanoides", "Sapindaceae", 0.92, 0.35, 0.05),
		tree("Bouleau", "Betula pendula", "Betulaceae", 0.92, 0.62, 0.05),
		tree("Magnolia", "Magnolia soulangeana", "Magnoliaceae", 0.08, 0.45, 0.05),
		tree("Saule pleureur", "Salix babylonica", "Salicaceae", 0.08, 0.80, 0.05),
		tree("Pin", "Pinus sylvestris", "Pinaceae", 0.92, 0.90, 0.05),
		tree("Pommier", "Malus domestica", "Rosaceae", 0.30, 0.93, 0.05),
		tree("Cerisier", "Prunus avium", "Rosaceae", 0.70, 0.93, 0.05),
		{
			name: "Massif de rosiers", kind: "bed", shape: rect(0.22, 0.28, 0.22, 0.10),
			plant:    seedPlant{"Rosier", "Rosa gallica", "Rosaceae", 80},
			startsOn: forever[0], endsOn: forever[1],
		},
		{
			name: "Tomates", kind: "bed", shape: rect(0.50, 0.28, 0.26, 0.10),
			plant:    seedPlant{"Tomate", "Solanum lycopersicum", "Solanaceae", 50},
			startsOn: date(year, "05-01"), endsOn: date(year, "10-31"),
			phases: []model.PhaseInput{
				{Kind: "planting", StartsOn: date(year, "05-01"), EndsOn: date(year, "05-20")},
				{Kind: "growth", StartsOn: date(year, "05-21"), EndsOn: date(year, "07-15")},
				{Kind: "flowering", StartsOn: date(year, "07-16"), EndsOn: date(year, "08-10")},
				{Kind: "harvest", StartsOn: date(year, "08-11"), EndsOn: date(year, "10-31")},
			},
		},
		{
			name: "Salades", kind: "bed", shape: rect(0.22, 0.46, 0.22, 0.10),
			plant:    seedPlant{"Laitue", "Lactuca sativa", "Asteraceae", 30},
			startsOn: date(year, "04-01"), endsOn: date(year, "11-30"),
		},
		{
			name: "Courges", kind: "bed", shape: rect(0.50, 0.46, 0.26, 0.10),
			plant:    seedPlant{"Potiron", "Cucurbita maxima", "Cucurbitaceae", 100},
			startsOn: date(year, "05-15"), endsOn: date(year, "10-31"),
		},
		{
			name: "Fraisiers", kind: "bed", shape: rect(0.22, 0.64, 0.22, 0.10),
			plant:    seedPlant{"Fraisier", "Fragaria × ananassa", "Rosaceae", 30},
			startsOn: forever[0], endsOn: forever[1],
		},
		{
			name: "Serre", kind: "greenhouse", shape: rect(0.50, 0.64, 0.14, 0.10),
			plant:    seedPlant{"Poivron", "Capsicum annuum", "Solanaceae", 45},
			startsOn: date(year, "04-15"), endsOn: date(year, "11-15"),
		},
		{
			name: "Pot de basilic", kind: "pot", shape: spot(0.71, 0.69, 0.04),
			plant:    seedPlant{"Basilic", "Ocimum basilicum", "Lamiaceae", 20},
			startsOn: date(year, "05-01"), endsOn: date(year, "10-15"),
		},
		{
			name: "Haie de lavande", kind: "row", shape: rect(0.22, 0.82, 0.54, 0.035),
			plant:    seedPlant{"Lavande", "Lavandula angustifolia", "Lamiaceae", 45},
			startsOn: forever[0], endsOn: forever[1],
		},
		{
			name: "Rang de poireaux", kind: "row", shape: rect(0.50, 0.58, 0.26, 0.03),
			plant:    seedPlant{"Poireau", "Allium porrum", "Amaryllidaceae", 15},
			startsOn: date(year, "06-01"), endsOn: date(year+1, "02-28"),
		},
		{
			name: "Tournesols", kind: "row", shape: rect(0.22, 0.58, 0.22, 0.03),
			plant:    seedPlant{"Tournesol", "Helianthus annuus", "Asteraceae", 40},
			startsOn: date(year, "05-01"), endsOn: date(year, "10-15"),
		},
	}

	plantIDs := map[string]string{}
	for i, bed := range beds {
		plantID, ok := plantIDs[bed.plant.name]
		if !ok {
			spacing := bed.plant.spacingCm
			created, err := gardenService.CreatePlant(userID, &model.SavePlantRequest{
				Name: bed.plant.name, LatinName: bed.plant.latin, Family: bed.plant.family, SpacingCm: &spacing,
			})
			if err != nil {
				log.Printf("Seed: garden plant %s: %v", bed.plant.name, err)
				continue
			}
			plantID = created.ID
			plantIDs[bed.plant.name] = plantID
		}

		createdBed, err := gardenService.CreateBed(userID, &model.SaveBedRequest{
			Name: bed.name, Kind: bed.kind, Shape: bed.shape, SortOrder: i,
		})
		if err != nil {
			log.Printf("Seed: garden bed %s: %v", bed.name, err)
			continue
		}
		if _, err := gardenService.CreateOccupation(userID, &model.SaveOccupationRequest{
			PlantID: plantID, BedID: createdBed.ID, StartsOn: bed.startsOn, EndsOn: bed.endsOn, Phases: bed.phases,
		}); err != nil {
			log.Printf("Seed: garden occupation %s: %v", bed.name, err)
		}
	}

	log.Printf("Seed: planted %d demo beds in dev user's garden", len(beds))
}
