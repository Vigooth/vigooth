package service

import (
	"testing"

	"github.com/Vigooth/vigooth/services/api/internal/model"
)

func occupation(id, bedID, startsOn, endsOn string) model.Occupation {
	return model.Occupation{ID: id, BedID: bedID, StartsOn: startsOn, EndsOn: endsOn}
}

func TestDetectConflictsIgnoresSeparateBeds(t *testing.T) {
	// Identical windows, different beds: two crops in two places is not a clash.
	conflicts := DetectConflicts([]model.Occupation{
		occupation("a", "bed-1", "2026-04-01", "2026-07-01"),
		occupation("b", "bed-2", "2026-04-01", "2026-07-01"),
	})
	if len(conflicts) != 0 {
		t.Fatalf("expected no conflicts across beds, got %d", len(conflicts))
	}
}

func TestDetectConflictsIgnoresDisjointWindows(t *testing.T) {
	conflicts := DetectConflicts([]model.Occupation{
		occupation("a", "bed-1", "2026-03-01", "2026-05-31"),
		occupation("b", "bed-1", "2026-06-01", "2026-09-30"),
	})
	if len(conflicts) != 0 {
		t.Fatalf("expected no conflicts for back-to-back windows, got %d", len(conflicts))
	}
}

func TestDetectConflictsTouchingDayIsAConflict(t *testing.T) {
	// Both endpoints are inclusive: one bed cannot hold both crops on the 31st.
	conflicts := DetectConflicts([]model.Occupation{
		occupation("a", "bed-1", "2026-03-01", "2026-05-31"),
		occupation("b", "bed-1", "2026-05-31", "2026-09-30"),
	})
	if len(conflicts) != 1 {
		t.Fatalf("expected 1 conflict on the shared day, got %d", len(conflicts))
	}
	if got := conflicts[0].OverlapDayspan; got != 1 {
		t.Errorf("expected a 1-day overlap, got %d", got)
	}
	if conflicts[0].OverlapStart != "2026-05-31" || conflicts[0].OverlapEnd != "2026-05-31" {
		t.Errorf("unexpected overlap window: %s..%s",
			conflicts[0].OverlapStart, conflicts[0].OverlapEnd)
	}
}

func TestDetectConflictsReportsOverlapWindow(t *testing.T) {
	conflicts := DetectConflicts([]model.Occupation{
		occupation("a", "bed-1", "2026-04-01", "2026-06-30"),
		occupation("b", "bed-1", "2026-06-01", "2026-08-31"),
	})
	if len(conflicts) != 1 {
		t.Fatalf("expected 1 conflict, got %d", len(conflicts))
	}
	c := conflicts[0]
	if c.OverlapStart != "2026-06-01" || c.OverlapEnd != "2026-06-30" {
		t.Errorf("unexpected overlap window: %s..%s", c.OverlapStart, c.OverlapEnd)
	}
	if c.OverlapDayspan != 30 {
		t.Errorf("expected 30 overlapping days, got %d", c.OverlapDayspan)
	}
	if c.BedID != "bed-1" {
		t.Errorf("expected bed-1, got %s", c.BedID)
	}
}

func TestDetectConflictsFullyContainedWindow(t *testing.T) {
	// A short crop nested inside a long one still collides for its whole length.
	conflicts := DetectConflicts([]model.Occupation{
		occupation("long", "bed-1", "2026-03-01", "2026-10-31"),
		occupation("short", "bed-1", "2026-05-01", "2026-05-10"),
	})
	if len(conflicts) != 1 {
		t.Fatalf("expected 1 conflict, got %d", len(conflicts))
	}
	if got := conflicts[0].OverlapDayspan; got != 10 {
		t.Errorf("expected 10 overlapping days, got %d", got)
	}
}

func TestDetectConflictsEveryPairInABed(t *testing.T) {
	// Three mutually overlapping occupations are three distinct pairs, so none of
	// them is hidden behind another.
	conflicts := DetectConflicts([]model.Occupation{
		occupation("a", "bed-1", "2026-04-01", "2026-08-01"),
		occupation("b", "bed-1", "2026-05-01", "2026-09-01"),
		occupation("c", "bed-1", "2026-06-01", "2026-10-01"),
	})
	if len(conflicts) != 3 {
		t.Fatalf("expected 3 pairwise conflicts, got %d", len(conflicts))
	}
}

func TestDetectConflictsSkipsMalformedDates(t *testing.T) {
	// A bad row must not take the whole response down with it.
	conflicts := DetectConflicts([]model.Occupation{
		occupation("bad", "bed-1", "not-a-date", "2026-08-01"),
		occupation("good", "bed-1", "2026-04-01", "2026-09-01"),
	})
	if len(conflicts) != 0 {
		t.Fatalf("expected malformed rows to be skipped, got %d conflicts", len(conflicts))
	}
}

func TestBuildOccupationRejectsReversedWindow(t *testing.T) {
	_, err := buildOccupation("user", "id", &model.SaveOccupationRequest{
		PlantID:  "plant",
		BedID:    "bed",
		StartsOn: "2026-09-01",
		EndsOn:   "2026-04-01",
	})
	if err != ErrDatesReversed {
		t.Fatalf("expected ErrDatesReversed, got %v", err)
	}
}

func TestBuildOccupationRejectsBadDate(t *testing.T) {
	_, err := buildOccupation("user", "id", &model.SaveOccupationRequest{
		PlantID:  "plant",
		BedID:    "bed",
		StartsOn: "01/04/2026",
		EndsOn:   "2026-09-01",
	})
	if err != ErrInvalidDate {
		t.Fatalf("expected ErrInvalidDate, got %v", err)
	}
}

func TestBuildOccupationAllowsPhaseOutsideWindow(t *testing.T) {
	// Sowing indoors before the bed is taken is legitimate, not an error.
	occ, err := buildOccupation("user", "id", &model.SaveOccupationRequest{
		PlantID:  "plant",
		BedID:    "bed",
		StartsOn: "2026-05-01",
		EndsOn:   "2026-09-01",
		Phases: []model.PhaseInput{
			{Kind: model.PhaseSowing, StartsOn: "2026-03-01", EndsOn: "2026-03-20"},
		},
	})
	if err != nil {
		t.Fatalf("expected an earlier sowing phase to be accepted, got %v", err)
	}
	if len(occ.Phases) != 1 {
		t.Fatalf("expected 1 phase, got %d", len(occ.Phases))
	}
	if occ.Phases[0].ID == "" {
		t.Error("expected the phase to get an id")
	}
	if occ.Phases[0].OccupationID != "id" {
		t.Errorf("expected the phase to point at its occupation, got %q",
			occ.Phases[0].OccupationID)
	}
}
