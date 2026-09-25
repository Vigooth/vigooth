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

// TV categories on The Pirate Bay: TV shows, HD TV shows, UHD/4K TV shows.
var tpbTvCategories = map[string]bool{"205": true, "208": true, "212": true}

var tpbQualityRe = regexp.MustCompile(`(?i)\b(2160p|1080p|720p|480p|4k)\b`)

const tpbMaxResults = 15

type tpbResult struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	InfoHash string `json:"info_hash"`
	Seeders  string `json:"seeders"`
	Leechers string `json:"leechers"`
	Size     string `json:"size"`
	Category string `json:"category"`
}

// TpbSearch looks up TV torrents on The Pirate Bay through its unofficial
// apibay.org JSON API. It takes the show title and an optional season, and
// returns the best seeded releases first.
func (h *ProxyHandler) TpbSearch(c *gin.Context) {
	title := strings.TrimSpace(c.Query("q"))
	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'q' is required"})
		return
	}

	query := title
	var seasonRe *regexp.Regexp
	if s := c.Query("season"); s != "" {
		season, err := strconv.Atoi(s)
		if err != nil || season < 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'season' must be a positive integer"})
			return
		}
		query = fmt.Sprintf("%s S%02d", title, season)
		seasonRe = regexp.MustCompile(fmt.Sprintf(`(?i)\b(s0*%d|season\s*0*%d)(\b|e)`, season, season))
	}

	// Category 200 is "Video"; results are narrowed to the TV categories below.
	targetURL := fmt.Sprintf("https://apibay.org/q.php?q=%s&cat=200", url.QueryEscape(query))

	resp, err := h.ytsGet(targetURL)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("failed to reach The Pirate Bay API: %v", err)})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read response"})
		return
	}

	var results []tpbResult
	if err := json.Unmarshal(body, &results); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse The Pirate Bay response"})
		return
	}

	type scored struct {
		result  tpbResult
		seeders int
	}
	matches := make([]scored, 0, len(results))
	for _, r := range results {
		// No results is signalled by a single placeholder entry with id "0".
		if r.ID == "0" || !tpbTvCategories[r.Category] {
			continue
		}
		if seasonRe != nil && !seasonRe.MatchString(r.Name) {
			continue
		}
		seeders, _ := strconv.Atoi(r.Seeders)
		if seeders == 0 {
			continue
		}
		matches = append(matches, scored{result: r, seeders: seeders})
	}
	sort.SliceStable(matches, func(i, j int) bool { return matches[i].seeders > matches[j].seeders })
	if len(matches) > tpbMaxResults {
		matches = matches[:tpbMaxResults]
	}

	searchURL := "https://thepiratebay.org/search.php?q=" + url.QueryEscape(query)
	if len(matches) == 0 {
		c.JSON(http.StatusOK, gin.H{"found": false, "url": searchURL})
		return
	}

	torrents := make([]gin.H, 0, len(matches))
	for _, m := range matches {
		r := m.result
		leechers, _ := strconv.Atoi(r.Leechers)
		size, _ := strconv.ParseInt(r.Size, 10, 64)
		quality := strings.ToLower(tpbQualityRe.FindString(r.Name))
		if quality == "4k" {
			quality = "2160p"
		}
		torrents = append(torrents, gin.H{
			"id":       r.ID,
			"name":     r.Name,
			"url":      "https://thepiratebay.org/description.php?id=" + r.ID,
			"magnet":   magnetLink(r.InfoHash, r.Name),
			"quality":  quality,
			"size":     formatBytes(size),
			"seeders":  m.seeders,
			"leechers": leechers,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"found":    true,
		"url":      searchURL,
		"torrents": torrents,
	})
}

func formatBytes(n int64) string {
	const unit = 1024
	if n < unit {
		return fmt.Sprintf("%d B", n)
	}
	div, exp := int64(unit), 0
	for m := n / unit; m >= unit; m /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(n)/float64(div), "KMGTPE"[exp])
}
