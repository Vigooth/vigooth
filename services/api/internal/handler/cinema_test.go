package handler

import (
	"testing"
	"time"
)

func TestShowtimeVersion(t *testing.T) {
	cases := map[string]string{"ORIGINAL": "VO", "DUBBED": "VF", "LOCAL": "VF"}
	for diffusion, want := range cases {
		if got := showtimeVersion(diffusion); got != want {
			t.Errorf("showtimeVersion(%q) = %q, want %q", diffusion, got, want)
		}
	}
}

func TestWithUpcomingShowtimes(t *testing.T) {
	at := func(hhmm string) time.Time {
		parsed, err := time.ParseInLocation("2006-01-02 15:04", "2026-09-25 "+hhmm, parisTime)
		if err != nil {
			t.Fatal(err)
		}
		return parsed
	}
	response := nearbyResponse{City: "Lyon", Movies: []nearbyMovie{
		{Theaters: []string{"A", "B"}, showtimes: []showtime{
			{startsAt: at("14:00"), version: "VF", theater: "A"},
			{startsAt: at("21:00"), version: "VF", theater: "B"},
			{startsAt: at("18:30"), version: "VF", theater: "A"},
			{startsAt: at("20:15"), version: "VO", theater: "B"},
		}},
		{Theaters: []string{"A"}, showtimes: []showtime{
			{startsAt: at("13:00"), version: "VF", theater: "A"},
		}},
	}}

	got := withUpcomingShowtimes(response, at("16:00"))

	if len(got.Movies) != 1 {
		t.Fatalf("got %d films, want 1: the one with no showtime left is dropped", len(got.Movies))
	}
	want := []nextShowtime{
		{Date: "2026-09-25", Time: "18:30", Version: "VF", Theater: "A"},
		{Date: "2026-09-25", Time: "20:15", Version: "VO", Theater: "B"},
	}
	next := got.Movies[0].NextShowtimes
	if len(next) != len(want) {
		t.Fatalf("got %v, want %v", next, want)
	}
	for i := range want {
		if next[i] != want[i] {
			t.Errorf("next[%d] = %v, want %v", i, next[i], want[i])
		}
	}
	if response.Movies[0].NextShowtimes != nil {
		t.Error("the cached response must not be modified")
	}
}

func TestNearbyDaysFor(t *testing.T) {
	// 23:30 UTC is already the next day in Paris.
	now := time.Date(2026, 9, 28, 23, 30, 0, 0, time.UTC)

	days, err := nearbyDaysFor("", now)
	if err != nil || len(days) != 1 || days[0] != "2026-09-29" {
		t.Errorf("default = %v, %v; want [2026-09-29]", days, err)
	}
	week, err := nearbyDaysFor("week", now)
	if err != nil || len(week) != 7 || week[0] != "2026-09-29" || week[6] != "2026-10-05" {
		t.Errorf("week = %v, %v; want 2026-09-29 to 2026-10-05", week, err)
	}
	if days, err := nearbyDaysFor("2026-10-01", now); err != nil || days[0] != "2026-10-01" {
		t.Errorf("a day of the week = %v, %v", days, err)
	}
	for _, day := range []string{"2026-09-28", "2026-10-06", "tomorrow"} {
		if _, err := nearbyDaysFor(day, now); err == nil {
			t.Errorf("nearbyDaysFor(%q) accepted a day outside the week", day)
		}
	}
}

func TestTheaterName(t *testing.T) {
	cases := map[string]string{
		`Cin\u00e9ma L&#039;Etoile`:   "Cinéma L'Etoile",
		`Path\u00e9 Lyon - Bellecour`: "Pathé Lyon - Bellecour",
		`Le Cin\u00e9ma `:             "Le Cinéma",
	}
	for raw, want := range cases {
		if got := theaterName(raw); got != want {
			t.Errorf("theaterName(%q) = %q, want %q", raw, got, want)
		}
	}
}
