package model

import "time"

// Visit is one page load on one of the frontends, as reported by its beacon.
type Visit struct {
	ID        string `json:"id"`
	IP        string `json:"ip"`
	App       string `json:"app"`
	Path      string `json:"path"`
	Referrer  string `json:"referrer"`
	UserAgent string `json:"user_agent"`
	// Email of the signed-in account at the time, "" for an anonymous visit.
	UserEmail string    `json:"user_email"`
	CreatedAt time.Time `json:"created_at"`
	// Nil until the address has been geolocated, or when the lookup failed.
	Location *IPLocation `json:"location,omitempty"`
}

// IPLocation is what the geolocation provider said about one address.
type IPLocation struct {
	IP          string    `json:"ip"`
	Country     string    `json:"country"`
	CountryCode string    `json:"country_code"`
	Region      string    `json:"region"`
	City        string    `json:"city"`
	Lat         *float64  `json:"lat,omitempty"`
	Lon         *float64  `json:"lon,omitempty"`
	ISP         string    `json:"isp"`
	Resolved    bool      `json:"resolved"`
	LookedUpAt  time.Time `json:"looked_up_at"`
}

// TrackRequest is the beacon body. Everything is optional but the app: a beacon
// is fire-and-forget from the browser, so a missing field must not lose the hit.
type TrackRequest struct {
	App      string `json:"app" binding:"required,max=50"`
	Path     string `json:"path" binding:"max=2000"`
	Referrer string `json:"referrer" binding:"max=2000"`
}

// VisitFilter narrows the admin listing.
type VisitFilter struct {
	App    string
	IP     string
	Limit  int
	Offset int
}

// Visitor is one address with everything seen from it, for the grouped view.
type Visitor struct {
	IP        string    `json:"ip"`
	Visits    int       `json:"visits"`
	FirstSeen time.Time `json:"first_seen"`
	LastSeen  time.Time `json:"last_seen"`
	// Distinct apps and signed-in accounts seen from this address.
	Apps     []string    `json:"apps"`
	Accounts []string    `json:"accounts"`
	Location *IPLocation `json:"location,omitempty"`
}

type CountBucket struct {
	Key   string `json:"key"`
	Count int    `json:"count"`
}

// VisitStats is the dashboard header: a few totals plus two breakdowns over the
// last 30 days.
type VisitStats struct {
	Total        int           `json:"total"`
	Today        int           `json:"today"`
	Last7Days    int           `json:"last_7_days"`
	UniqueIPs7d  int           `json:"unique_ips_7d"`
	ByCountry30d []CountBucket `json:"by_country_30d"`
	ByApp30d     []CountBucket `json:"by_app_30d"`
}
