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

	"github.com/gin-gonic/gin"
)

const (
	apibayBaseURL = "https://apibay.org"
	// apibay category 200 = video (movies, HD movies, ...).
	apibayVideoCategory = "200"
	tpbMaxTorrents      = 6
	// apibay answers with a Cloudflare page unless the request looks like a browser.
	tpbUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
)

var (
	releaseCamRe = regexp.MustCompile(`(?i)\b(cam|hdcam|camrip|ts|hdts|telesync|tc|hdtc|telecine)\b`)
	// Shared with the YTS lookup so magnets from both sources hit the same trackers.
	magnetTrackers = []string{
		"udp://open.demonii.com:1337/announce",
		"udp://tracker.openbittorrent.com:80",
		"udp://tracker.coppersurfer.tk:6969",
		"udp://glotorrents.pw:6969/announce",
		"udp://tracker.opentrackr.org:1337/announce",
		"udp://torrent.gresille.org:80/announce",
		"udp://p4p.arenabg.com:1337",
		"udp://tracker.leechers-paradise.org:6969",
	}
)

func buildMagnet(hash, name string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "magnet:?xt=urn:btih:%s&dn=%s", hash, url.QueryEscape(name))
	for _, tr := range magnetTrackers {
		b.WriteString("&tr=")
		b.WriteString(url.QueryEscape(tr))
	}
	return b.String()
}

func formatBytes(size int64) string {
	const gb = 1 << 30
	const mb = 1 << 20
	switch {
	case size >= gb:
		return fmt.Sprintf("%.2f GB", float64(size)/gb)
	case size >= mb:
		return fmt.Sprintf("%.0f MB", float64(size)/mb)
	default:
		return fmt.Sprintf("%d B", size)
	}
}

type apibayResult struct {
	Name     string `json:"name"`
	InfoHash string `json:"info_hash"`
	Seeders  string `json:"seeders"`
	Size     string `json:"size"`
	Imdb     string `json:"imdb"`
}

func (h *ProxyHandler) apibaySearch(q string) ([]apibayResult, error) {
	query := url.Values{}
	query.Set("q", q)
	query.Set("cat", apibayVideoCategory)
	req, err := http.NewRequest(http.MethodGet, apibayBaseURL+"/q.php?"+query.Encode(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", tpbUserAgent)
	req.Header.Set("Accept", "application/json")

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var results []apibayResult
	if err := json.Unmarshal(body, &results); err != nil {
		return nil, fmt.Errorf("failed to parse TPB response")
	}
	return results, nil
}

func hasImdbMatch(results []apibayResult, imdbID string) bool {
	for _, r := range results {
		if strings.ToLower(r.Imdb) == imdbID {
			return true
		}
	}
	return false
}

type tpbTorrent struct {
	Name    string `json:"name"`
	Magnet  string `json:"magnet"`
	Quality string `json:"quality"` // "2160p", "1080p", "720p", "480p" or ""
	Type    string `json:"type"`    // "bluray", "web", "cam" or ""
	Size    string `json:"size"`
	Seeders int    `json:"seeders"`
	Cam     bool   `json:"cam"`
}

// TpbLookup godoc: GET /api/tpb?imdb_id=tt0137523&title=Fight%20Club&year=1999
// Fallback when YTS has nothing: searches The Pirate Bay by title and keeps only
// the torrents tagged with the requested IMDb id, so homonyms are never mixed up.
func (h *ProxyHandler) TpbLookup(c *gin.Context) {
	imdbID := strings.ToLower(c.Query("imdb_id"))
	title := c.Query("title")
	year := c.Query("year")
	if imdbID == "" || title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameters 'imdb_id' and 'title' are required"})
		return
	}

	// Title + year first for precision; title alone as a second chance when the
	// year is missing from release names.
	results, err := h.apibaySearch(strings.TrimSpace(title + " " + year))
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("failed to reach TPB API: %v", err)})
		return
	}
	if year != "" && !hasImdbMatch(results, imdbID) {
		if retry, err := h.apibaySearch(title); err == nil {
			results = retry
		}
	}

	torrents := make([]tpbTorrent, 0, len(results))
	for _, r := range results {
		if strings.ToLower(r.Imdb) != imdbID {
			continue
		}
		seeders, _ := strconv.Atoi(r.Seeders)
		size, _ := strconv.ParseInt(r.Size, 10, 64)
		_, quality, source := tagRelease(r.Name)
		cam := releaseCamRe.MatchString(r.Name)
		if cam {
			source = "cam"
		}
		torrents = append(torrents, tpbTorrent{
			Name:    r.Name,
			Magnet:  buildMagnet(r.InfoHash, r.Name),
			Quality: quality,
			Type:    source,
			Size:    formatBytes(size),
			Seeders: seeders,
			Cam:     cam,
		})
	}

	// Proper releases first, then the best seeded.
	sort.SliceStable(torrents, func(i, j int) bool {
		if torrents[i].Cam != torrents[j].Cam {
			return !torrents[i].Cam
		}
		return torrents[i].Seeders > torrents[j].Seeders
	})
	if len(torrents) > tpbMaxTorrents {
		torrents = torrents[:tpbMaxTorrents]
	}

	c.JSON(http.StatusOK, gin.H{
		"found":    len(torrents) > 0,
		"torrents": torrents,
	})
}
