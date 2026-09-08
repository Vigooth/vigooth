package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/model"
)

// ipAPIEndpoint is ip-api.com's free tier: no key, 45 lookups a minute, HTTP
// only (HTTPS is paid). The cache in ip_locations is what keeps us under the
// quota, since only the first hit from an address costs a lookup.
const ipAPIEndpoint = "http://ip-api.com/json/"

type ipAPIResponse struct {
	Status      string  `json:"status"`
	Message     string  `json:"message"`
	Country     string  `json:"country"`
	CountryCode string  `json:"countryCode"`
	RegionName  string  `json:"regionName"`
	City        string  `json:"city"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
	ISP         string  `json:"isp"`
}

// GeoIPClient resolves one address to a place.
type GeoIPClient struct {
	http *http.Client
}

func NewGeoIPClient() *GeoIPClient {
	return &GeoIPClient{http: &http.Client{Timeout: 5 * time.Second}}
}

// IsPublicIP says whether a lookup could possibly succeed. Loopback and private
// ranges (every hit in local dev, or a misconfigured proxy) are never sent out.
func IsPublicIP(raw string) bool {
	ip := net.ParseIP(raw)
	if ip == nil {
		return false
	}
	return !(ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast())
}

// Lookup asks the provider. A "fail" answer from it (reserved range, unknown
// address) is not an error: it comes back as an unresolved location, which the
// caller stores so the address is not asked about again.
func (g *GeoIPClient) Lookup(ctx context.Context, ip string) (*model.IPLocation, error) {
	query := url.Values{}
	query.Set("fields", "status,message,country,countryCode,regionName,city,lat,lon,isp")
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, ipAPIEndpoint+url.PathEscape(ip)+"?"+query.Encode(), nil)
	if err != nil {
		return nil, err
	}

	resp, err := g.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("geoip: unexpected status %d", resp.StatusCode)
	}

	var body ipAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, err
	}

	loc := &model.IPLocation{IP: ip, LookedUpAt: time.Now()}
	if body.Status != "success" {
		return loc, nil
	}
	lat, lon := body.Lat, body.Lon
	loc.Country = body.Country
	loc.CountryCode = body.CountryCode
	loc.Region = body.RegionName
	loc.City = body.City
	loc.Lat = &lat
	loc.Lon = &lon
	loc.ISP = body.ISP
	loc.Resolved = true
	return loc, nil
}
