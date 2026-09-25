package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	browserUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
	// Below this many cinemas in the user's district, the whole city's are added.
	minNearbyTheaters = 5
	maxNearbyTheaters = 15
	nearbyCacheTTL    = time.Hour
)

var allocineTheaterRe = regexp.MustCompile(`data-theater="\{&quot;id&quot;:&quot;([A-Z0-9]+)&quot;,&quot;name&quot;:&quot;(.*?)&quot;\}`)

type allocineCity struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Zip  string `json:"zip"`
}

type allocineTheater struct {
	ID   string
	Name string
}

type allocineMovie struct {
	InternalID    int    `json:"internalId"`
	Title         string `json:"title"`
	OriginalTitle string `json:"originalTitle"`
	Releases      []struct {
		ReleaseDate struct {
			Date string `json:"date"`
		} `json:"releaseDate"`
	} `json:"releases"`
	Data struct {
		ProductionYear int `json:"productionYear"`
	} `json:"data"`
}

func (m allocineMovie) year() int {
	for _, r := range m.Releases {
		if len(r.ReleaseDate.Date) >= 4 {
			if y, err := strconv.Atoi(r.ReleaseDate.Date[:4]); err == nil {
				return y
			}
		}
	}
	return m.Data.ProductionYear
}

type nearbyMovie struct {
	TmdbResult json.RawMessage `json:"result"`
	Theaters   []string        `json:"theaters"`
}

type nearbyResponse struct {
	City   string        `json:"city"`
	Movies []nearbyMovie `json:"movies"`
}

type nearbyCacheEntry struct {
	response nearbyResponse
	expires  time.Time
}

var (
	nearbyCache   = map[int]nearbyCacheEntry{}
	nearbyCacheMu sync.Mutex
)

// NearbyMovies lists the films showing today in the cinemas around a
// position, from Allociné, each matched to its TMDB entry. Films showing in
// the most cinemas come first.
func (h *ProxyHandler) NearbyMovies(c *gin.Context) {
	lat, errLat := strconv.ParseFloat(c.Query("lat"), 64)
	lon, errLon := strconv.ParseFloat(c.Query("lon"), 64)
	if errLat != nil || errLon != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameters 'lat' and 'lon' are required"})
		return
	}

	cityName, postcode, err := h.reverseGeocode(lat, lon)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("failed to locate the position: %v", err)})
		return
	}

	// The postcode leads to the district (arrondissement) in big cities.
	city, err := h.findAllocineCity(postcode, postcode)
	if err != nil {
		city, err = h.findAllocineCity(cityName, "")
	}
	if err != nil {
		c.JSON(http.StatusOK, nearbyResponse{City: cityName, Movies: []nearbyMovie{}})
		return
	}

	nearbyCacheMu.Lock()
	cached, ok := nearbyCache[city.ID]
	nearbyCacheMu.Unlock()
	if ok && time.Now().Before(cached.expires) {
		c.JSON(http.StatusOK, cached.response)
		return
	}

	theaters, err := h.allocineTheaters(city.ID)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("failed to list cinemas: %v", err)})
		return
	}
	if len(theaters) < minNearbyTheaters {
		if whole, err := h.findAllocineCity(cityName, ""); err == nil && whole.ID != city.ID {
			more, _ := h.allocineTheaters(whole.ID)
			theaters = appendNewTheaters(theaters, more)
		}
	}
	if len(theaters) > maxNearbyTheaters {
		theaters = theaters[:maxNearbyTheaters]
	}

	response := nearbyResponse{City: city.Name, Movies: h.moviesShowingIn(theaters)}

	nearbyCacheMu.Lock()
	nearbyCache[city.ID] = nearbyCacheEntry{response: response, expires: time.Now().Add(nearbyCacheTTL)}
	nearbyCacheMu.Unlock()

	c.JSON(http.StatusOK, response)
}

// moviesShowingIn gathers today's films across the cinemas and matches them to TMDB.
func (h *ProxyHandler) moviesShowingIn(theaters []allocineTheater) []nearbyMovie {
	type showing struct {
		movie    allocineMovie
		theaters []string
	}
	var (
		mu      sync.Mutex
		wg      sync.WaitGroup
		byID    = map[int]*showing{}
		order   []int
		today   = time.Now().Format("2006-01-02")
		limiter = make(chan struct{}, 5)
	)
	for _, theater := range theaters {
		wg.Add(1)
		go func(theater allocineTheater) {
			defer wg.Done()
			limiter <- struct{}{}
			defer func() { <-limiter }()

			movies, err := h.allocineShowtimes(theater.ID, today)
			if err != nil {
				return
			}
			mu.Lock()
			defer mu.Unlock()
			for _, m := range movies {
				s, ok := byID[m.InternalID]
				if !ok {
					s = &showing{movie: m}
					byID[m.InternalID] = s
					order = append(order, m.InternalID)
				}
				s.theaters = append(s.theaters, theater.Name)
			}
		}(theater)
	}
	wg.Wait()

	showings := make([]*showing, 0, len(order))
	for _, id := range order {
		showings = append(showings, byID[id])
	}
	sort.SliceStable(showings, func(i, j int) bool {
		return len(showings[i].theaters) > len(showings[j].theaters)
	})

	matched := make([]nearbyMovie, len(showings))
	for i, s := range showings {
		wg.Add(1)
		go func(i int, s *showing) {
			defer wg.Done()
			limiter <- struct{}{}
			defer func() { <-limiter }()

			sort.Strings(s.theaters)
			matched[i] = nearbyMovie{TmdbResult: h.matchTmdbMovie(s.movie), Theaters: s.theaters}
		}(i, s)
	}
	wg.Wait()

	movies := make([]nearbyMovie, 0, len(matched))
	for _, m := range matched {
		if m.TmdbResult != nil {
			movies = append(movies, m)
		}
	}
	return movies
}

func (h *ProxyHandler) reverseGeocode(lat, lon float64) (city, postcode string, err error) {
	u := fmt.Sprintf("https://api-adresse.data.gouv.fr/reverse/?lat=%f&lon=%f", lat, lon)
	var body struct {
		Features []struct {
			Properties struct {
				City     string `json:"city"`
				Postcode string `json:"postcode"`
			} `json:"properties"`
		} `json:"features"`
	}
	if err := h.getJSON(u, &body); err != nil {
		return "", "", err
	}
	if len(body.Features) == 0 {
		return "", "", fmt.Errorf("no address found (outside France?)")
	}
	p := body.Features[0].Properties
	return p.City, p.Postcode, nil
}

// findAllocineCity searches Allociné's cities; with a zip, only an exact zip match counts.
func (h *ProxyHandler) findAllocineCity(query, zip string) (allocineCity, error) {
	var body struct {
		Values struct {
			Cities []struct {
				Node allocineCity `json:"node"`
			} `json:"cities"`
		} `json:"values"`
	}
	u := "https://www.allocine.fr/_/localization_city/" + url.PathEscape(query)
	if err := h.getJSON(u, &body); err != nil {
		return allocineCity{}, err
	}
	for _, c := range body.Values.Cities {
		if zip != "" && c.Node.Zip == zip {
			return c.Node, nil
		}
		if zip == "" && strings.EqualFold(c.Node.Name, query) {
			return c.Node, nil
		}
	}
	return allocineCity{}, fmt.Errorf("no Allociné city for %q", query)
}

// allocineTheaters reads the first page of a city's cinemas.
func (h *ProxyHandler) allocineTheaters(cityID int) ([]allocineTheater, error) {
	body, err := h.fetchBody(fmt.Sprintf("https://www.allocine.fr/salle/cinema/ville-%d/", cityID))
	if err != nil {
		return nil, err
	}
	var theaters []allocineTheater
	seen := map[string]bool{}
	for _, m := range allocineTheaterRe.FindAllStringSubmatch(string(body), -1) {
		if seen[m[1]] {
			continue
		}
		seen[m[1]] = true
		// The name is JSON-escaped (é…) inside the HTML attribute.
		name := m[2]
		var unescaped string
		if json.Unmarshal([]byte(`"`+name+`"`), &unescaped) == nil {
			name = unescaped
		}
		theaters = append(theaters, allocineTheater{ID: m[1], Name: strings.TrimSpace(name)})
	}
	return theaters, nil
}

func appendNewTheaters(theaters, more []allocineTheater) []allocineTheater {
	seen := map[string]bool{}
	for _, t := range theaters {
		seen[t.ID] = true
	}
	for _, t := range more {
		if !seen[t.ID] {
			theaters = append(theaters, t)
		}
	}
	return theaters
}

// allocineShowtimes returns the films with at least one showtime in a cinema on a day.
func (h *ProxyHandler) allocineShowtimes(theaterID, day string) ([]allocineMovie, error) {
	var body struct {
		Results []struct {
			Movie     allocineMovie              `json:"movie"`
			Showtimes map[string]json.RawMessage `json:"showtimes"`
		} `json:"results"`
	}
	u := fmt.Sprintf("https://www.allocine.fr/_/showtimes/theater-%s/d-%s/", theaterID, day)
	if err := h.getJSON(u, &body); err != nil {
		return nil, err
	}
	movies := make([]allocineMovie, 0, len(body.Results))
	for _, r := range body.Results {
		if r.Movie.InternalID == 0 || !hasShowtime(r.Showtimes) {
			continue
		}
		movies = append(movies, r.Movie)
	}
	return movies, nil
}

func hasShowtime(showtimes map[string]json.RawMessage) bool {
	for _, raw := range showtimes {
		var list []json.RawMessage
		if json.Unmarshal(raw, &list) == nil && len(list) > 0 {
			return true
		}
	}
	return false
}

// matchTmdbMovie finds the TMDB search result for an Allociné film, or nil.
func (h *ProxyHandler) matchTmdbMovie(m allocineMovie) json.RawMessage {
	year := m.year()
	attempts := []struct {
		title string
		year  int
	}{{m.OriginalTitle, year}, {m.Title, year}, {m.Title, 0}}
	for _, a := range attempts {
		if a.title == "" {
			continue
		}
		u := fmt.Sprintf("https://api.themoviedb.org/3/search/movie?api_key=%s&language=fr-FR&query=%s",
			h.tmdbApiKey, url.QueryEscape(a.title))
		if a.year > 0 {
			u += fmt.Sprintf("&year=%d", a.year)
		}
		var body struct {
			Results []json.RawMessage `json:"results"`
		}
		if err := h.getJSON(u, &body); err == nil && len(body.Results) > 0 {
			return body.Results[0]
		}
	}
	return nil
}

// fetchBody GETs a page as a browser would, since Allociné rejects bot user agents.
func (h *ProxyHandler) fetchBody(targetURL string) ([]byte, error) {
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", browserUserAgent)
	req.Header.Set("Accept-Language", "fr-FR,fr;q=0.9")

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return io.ReadAll(resp.Body)
}

func (h *ProxyHandler) getJSON(targetURL string, into any) error {
	body, err := h.fetchBody(targetURL)
	if err != nil {
		return err
	}
	return json.Unmarshal(body, into)
}
