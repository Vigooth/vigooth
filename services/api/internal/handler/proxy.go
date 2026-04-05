package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/net/proxy"
)

type ProxyHandler struct {
	tmdbApiKey string
	omdbApiKey string
	client     *http.Client
	torClient  *http.Client
}

func NewProxyHandler(tmdbApiKey, omdbApiKey string) *ProxyHandler {
	return &ProxyHandler{
		tmdbApiKey: tmdbApiKey,
		omdbApiKey: omdbApiKey,
		client:     &http.Client{Timeout: 10 * time.Second},
	}
}

func (h *ProxyHandler) getTorClient() *http.Client {
	if h.torClient != nil {
		return h.torClient
	}

	dialer, err := proxy.SOCKS5("tcp", "127.0.0.1:9150", nil, proxy.Direct)
	if err != nil {
		return h.client
	}

	h.torClient = &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			DialContext: func(_ context.Context, network, addr string) (net.Conn, error) {
				return dialer.Dial(network, addr)
			},
		},
	}
	return h.torClient
}

func (h *ProxyHandler) TmdbSearch(c *gin.Context) {
	query := c.Query("q")
	page := c.DefaultQuery("page", "1")

	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'q' is required"})
		return
	}

	url := fmt.Sprintf("https://api.themoviedb.org/3/search/multi?api_key=%s&language=fr-FR&query=%s&page=%s",
		h.tmdbApiKey, query, page)

	h.proxyGet(c, url)
}

func (h *ProxyHandler) TmdbMovieDetail(c *gin.Context) {
	id := c.Param("id")

	url := fmt.Sprintf("https://api.themoviedb.org/3/movie/%s?api_key=%s&language=fr-FR",
		id, h.tmdbApiKey)

	h.proxyGet(c, url)
}

func (h *ProxyHandler) TmdbMovieCredits(c *gin.Context) {
	id := c.Param("id")

	url := fmt.Sprintf("https://api.themoviedb.org/3/movie/%s/credits?api_key=%s&language=fr-FR",
		id, h.tmdbApiKey)

	h.proxyGet(c, url)
}

func (h *ProxyHandler) TmdbTvDetail(c *gin.Context) {
	id := c.Param("id")

	url := fmt.Sprintf("https://api.themoviedb.org/3/tv/%s?api_key=%s&language=fr-FR&append_to_response=external_ids",
		id, h.tmdbApiKey)

	h.proxyGet(c, url)
}

func (h *ProxyHandler) TmdbTvCredits(c *gin.Context) {
	id := c.Param("id")

	url := fmt.Sprintf("https://api.themoviedb.org/3/tv/%s/credits?api_key=%s&language=fr-FR",
		id, h.tmdbApiKey)

	h.proxyGet(c, url)
}

func (h *ProxyHandler) TmdbSearchPerson(c *gin.Context) {
	query := c.Query("q")
	page := c.DefaultQuery("page", "1")

	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'q' is required"})
		return
	}

	url := fmt.Sprintf("https://api.themoviedb.org/3/search/person?api_key=%s&language=fr-FR&query=%s&page=%s",
		h.tmdbApiKey, query, page)

	h.proxyGet(c, url)
}

func (h *ProxyHandler) TmdbDiscoverByPerson(c *gin.Context) {
	withCrew := c.Query("with_crew")
	page := c.DefaultQuery("page", "1")
	sortBy := c.DefaultQuery("sort_by", "release_date.desc")

	if withCrew == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'with_crew' is required"})
		return
	}

	url := fmt.Sprintf("https://api.themoviedb.org/3/discover/movie?api_key=%s&language=fr-FR&with_crew=%s&page=%s&sort_by=%s",
		h.tmdbApiKey, withCrew, page, sortBy)

	h.proxyGet(c, url)
}

func (h *ProxyHandler) OmdbRatings(c *gin.Context) {
	imdbId := c.Query("i")

	if imdbId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'i' is required"})
		return
	}

	url := fmt.Sprintf("https://www.omdbapi.com/?apikey=%s&i=%s",
		h.omdbApiKey, imdbId)

	h.proxyGet(c, url)
}

func (h *ProxyHandler) AllocineRatings(c *gin.Context) {
	imdbID := c.Query("imdb_id")
	if imdbID == "" {
		c.JSON(http.StatusOK, gin.H{"press": nil, "spectateurs": nil})
		return
	}

	// Step 1: Query Wikidata SPARQL to map IMDb ID → Allocine film ID
	allocineID := h.getAllocineIDFromWikidata(imdbID)
	if allocineID == "" {
		c.JSON(http.StatusOK, gin.H{"press": nil, "spectateurs": nil})
		return
	}

	// Step 2: Scrape the Allocine film page for ratings
	filmURL := fmt.Sprintf("https://www.allocine.fr/film/fichefilm_gen_cfilm=%s.html", allocineID)
	press, spectateurs := h.scrapeAllocineRatings(filmURL)

	result := gin.H{
		"press":       nil,
		"spectateurs": nil,
		"allocine_id": allocineID,
	}
	if press != nil {
		result["press"] = *press
	}
	if spectateurs != nil {
		result["spectateurs"] = *spectateurs
	}

	c.JSON(http.StatusOK, result)
}

func (h *ProxyHandler) getAllocineIDFromWikidata(imdbID string) string {
	sparql := fmt.Sprintf(`SELECT ?allocineId WHERE { ?item wdt:P345 "%s" . ?item wdt:P1265 ?allocineId . }`, imdbID)
	wikidataURL := fmt.Sprintf("https://query.wikidata.org/sparql?format=json&query=%s", url.QueryEscape(sparql))

	req, err := http.NewRequest("GET", wikidataURL, nil)
	if err != nil {
		return ""
	}
	req.Header.Set("User-Agent", "MovieDB/1.0 (vigooth movie collection app)")
	req.Header.Set("Accept", "application/json")

	resp, err := h.client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return ""
	}

	var result struct {
		Results struct {
			Bindings []struct {
				AllocineID struct {
					Value string `json:"value"`
				} `json:"allocineId"`
			} `json:"bindings"`
		} `json:"results"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return ""
	}

	if len(result.Results.Bindings) == 0 {
		return ""
	}

	return result.Results.Bindings[0].AllocineID.Value
}

// Matches: rating-item...rating-title...>Label<...stareval-note">X,Y<
var allocineRatingRe = regexp.MustCompile(`(?s)rating-item.*?rating-title[^>]*>\s*(\w+)\s*<.*?stareval-note">(\d+[,\.]\d+)<`)

func (h *ProxyHandler) scrapeAllocineRatings(filmURL string) (press *float64, spectateurs *float64) {
	req, err := http.NewRequest("GET", filmURL, nil)
	if err != nil {
		return nil, nil
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "fr-FR,fr;q=0.9")

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, nil
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil
	}

	html := string(body)

	matches := allocineRatingRe.FindAllStringSubmatch(html, -1)
	for _, m := range matches {
		label := m[1]
		ratingStr := strings.Replace(m[2], ",", ".", 1)
		rating, err := strconv.ParseFloat(ratingStr, 64)
		if err != nil {
			continue
		}
		switch label {
		case "Presse":
			press = &rating
		case "Spectateurs":
			spectateurs = &rating
		}
	}

	return press, spectateurs
}

func (h *ProxyHandler) YtsLookup(c *gin.Context) {
	imdbID := c.Query("imdb_id")
	if imdbID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'imdb_id' is required"})
		return
	}

	targetURL := fmt.Sprintf("https://yts.bz/api/v2/list_movies.json?query_term=%s&limit=1", url.QueryEscape(imdbID))

	client := h.getTorClient()
	resp, err := client.Get(targetURL)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to reach YTS API (is Tor running?)"})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read response"})
		return
	}

	var ytsResp struct {
		Status string `json:"status"`
		Data   struct {
			MovieCount int `json:"movie_count"`
			Movies     []struct {
				URL      string `json:"url"`
				Slug     string `json:"slug"`
				Title    string `json:"title_long"`
				Torrents []struct {
					URL       string `json:"url"`
					Hash      string `json:"hash"`
					Quality   string `json:"quality"`
					Type      string `json:"type"`
					SizeBytes int64  `json:"size_bytes"`
					Size      string `json:"size"`
				} `json:"torrents"`
			} `json:"movies"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &ytsResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse YTS response"})
		return
	}

	if ytsResp.Data.MovieCount == 0 || len(ytsResp.Data.Movies) == 0 {
		c.JSON(http.StatusOK, gin.H{"found": false})
		return
	}

	movie := ytsResp.Data.Movies[0]
	trackers := []string{
		"udp://open.demonii.com:1337/announce",
		"udp://tracker.openbittorrent.com:80",
		"udp://tracker.coppersurfer.tk:6969",
		"udp://glotorrents.pw:6969/announce",
		"udp://tracker.opentrackr.org:1337/announce",
		"udp://torrent.gresille.org:80/announce",
		"udp://p4p.arenabg.com:1337",
		"udp://tracker.leechers-paradise.org:6969",
	}
	trackerParams := ""
	for _, tr := range trackers {
		trackerParams += "&tr=" + url.QueryEscape(tr)
	}

	torrents := make([]gin.H, 0, len(movie.Torrents))
	for _, t := range movie.Torrents {
		magnet := fmt.Sprintf("magnet:?xt=urn:btih:%s&dn=%s%s",
			t.Hash, url.QueryEscape(movie.Title), trackerParams)
		torrents = append(torrents, gin.H{
			"url":     t.URL,
			"magnet":  magnet,
			"quality": t.Quality,
			"type":    t.Type,
			"size":    t.Size,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"found":    true,
		"url":      movie.URL,
		"title":    movie.Title,
		"torrents": torrents,
	})
}

func (h *ProxyHandler) proxyGet(c *gin.Context, targetURL string) {
	resp, err := h.client.Get(targetURL)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to reach external API"})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read response"})
		return
	}

	c.Data(resp.StatusCode, "application/json", body)
}
