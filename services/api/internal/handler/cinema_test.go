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
		{Time: "18:30", Version: "VF", Theater: "A"},
		{Time: "20:15", Version: "VO", Theater: "B"},
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
