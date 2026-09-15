package handler

import (
	"bytes"
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
	openSubtitlesBaseURL   = "https://api.opensubtitles.com/api/v1"
	openSubtitlesUserAgent = "moovi v1.0"
	// Enough to find a YIFY-tagged release without flooding the menu.
	subtitlesPerLanguage = 8
	defaultSubtitleLangs = "fr,en"
)

// SubtitlesHandler proxies OpenSubtitles (https://opensubtitles.com) for moovi.
// Searching only needs the API key. Downloading works anonymously when the consumer
// allows it (5/day, 100/day in dev mode); username/password are optional and switch
// downloads to the user's own quota.
type SubtitlesHandler struct {
	apiKey   string
	username string
	password string
	client   *http.Client

	tokenMu     sync.Mutex
	token       string
	tokenExpiry time.Time
}

func NewSubtitlesHandler(apiKey, username, password string) *SubtitlesHandler {
	return &SubtitlesHandler{
		apiKey:   apiKey,
		username: username,
		password: password,
		client:   &http.Client{Timeout: 15 * time.Second},
	}
}

func (h *SubtitlesHandler) configured() bool {
	return h.apiKey != ""
}

func (h *SubtitlesHandler) hasCredentials() bool {
	return h.username != "" && h.password != ""
}

func (h *SubtitlesHandler) newRequest(method, path string, body []byte, bearer string) (*http.Request, error) {
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequest(method, openSubtitlesBaseURL+path, reader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Api-Key", h.apiKey)
	req.Header.Set("User-Agent", openSubtitlesUserAgent)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	return req, nil
}

// do runs the request and decodes a 2xx JSON body into out.
func (h *SubtitlesHandler) do(req *http.Request, out any) error {
	resp, err := h.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var apiErr struct {
			Message string `json:"message"`
		}
		_ = json.Unmarshal(body, &apiErr)
		if apiErr.Message != "" {
			return fmt.Errorf("HTTP %d: %s", resp.StatusCode, apiErr.Message)
		}
		return fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	if out == nil {
		return nil
	}
	return json.Unmarshal(body, out)
}

// getToken logs in once and reuses the JWT until shortly before it expires (24h on OpenSubtitles).
func (h *SubtitlesHandler) getToken() (string, error) {
	h.tokenMu.Lock()
	defer h.tokenMu.Unlock()

	if h.token != "" && time.Now().Before(h.tokenExpiry) {
		return h.token, nil
	}

	payload, err := json.Marshal(map[string]string{
		"username": h.username,
		"password": h.password,
	})
	if err != nil {
		return "", err
	}
	req, err := h.newRequest(http.MethodPost, "/login", payload, "")
	if err != nil {
		return "", err
	}

	var loginResp struct {
		Token string `json:"token"`
	}
	if err := h.do(req, &loginResp); err != nil {
		return "", fmt.Errorf("login failed: %w", err)
	}
	if loginResp.Token == "" {
		return "", fmt.Errorf("login failed: empty token")
	}

	h.token = loginResp.Token
	h.tokenExpiry = time.Now().Add(23 * time.Hour)
	return h.token, nil
}

type subtitleEntry struct {
	FileID          int64  `json:"file_id"`
	Language        string `json:"language"`
	Release         string `json:"release"`
	DownloadCount   int64  `json:"download_count"`
	HearingImpaired bool   `json:"hearing_impaired"`
	URL             string `json:"url"`
	// Release tags used by the client to match a subtitle with a YTS torrent.
	Yify    bool   `json:"yify"`
	Quality string `json:"quality"` // "2160p", "1080p", "720p", "480p" or ""
	Source  string `json:"source"`  // "bluray", "web" or ""
}

var (
	releaseQualityRe = regexp.MustCompile(`(?i)\b(2160p|1080p|720p|480p)\b`)
	releaseBlurayRe  = regexp.MustCompile(`(?i)blu-?ray|bdrip|brrip|bd-?rip`)
	releaseWebRe     = regexp.MustCompile(`(?i)\bweb(-?dl|-?rip)?\b|amzn|nf\b|dsnp|hmax`)
	releaseYifyRe    = regexp.MustCompile(`(?i)\byify\b|\byts\b|yts\.(mx|lt|am|ag|bz)`)
)

func tagRelease(release string) (yify bool, quality, source string) {
	yify = releaseYifyRe.MatchString(release)
	if m := releaseQualityRe.FindStringSubmatch(release); m != nil {
		quality = strings.ToLower(m[1])
	}
	switch {
	case releaseBlurayRe.MatchString(release):
		source = "bluray"
	case releaseWebRe.MatchString(release):
		source = "web"
	}
	return yify, quality, source
}

// Search godoc: GET /api/subtitles?imdb_id=tt0137523&languages=fr,en
func (h *SubtitlesHandler) Search(c *gin.Context) {
	imdbID := c.Query("imdb_id")
	if imdbID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'imdb_id' is required"})
		return
	}
	if !h.configured() {
		c.JSON(http.StatusOK, gin.H{"found": false, "configured": false, "downloadable": false})
		return
	}

	languages := c.DefaultQuery("languages", defaultSubtitleLangs)
	// OpenSubtitles wants a bare numeric IMDb id and sorted, comma-separated lowercase languages.
	numericID := strings.TrimPrefix(strings.ToLower(imdbID), "tt")
	langList := strings.Split(strings.ToLower(languages), ",")
	sort.Strings(langList)

	query := url.Values{}
	query.Set("imdb_id", numericID)
	query.Set("languages", strings.Join(langList, ","))
	query.Set("order_by", "download_count")
	query.Set("order_direction", "desc")

	req, err := h.newRequest(http.MethodGet, "/subtitles?"+query.Encode(), nil, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build request"})
		return
	}

	var searchResp struct {
		Data []struct {
			Attributes struct {
				Language        string `json:"language"`
				Release         string `json:"release"`
				DownloadCount   int64  `json:"download_count"`
				HearingImpaired bool   `json:"hearing_impaired"`
				URL             string `json:"url"`
				Files           []struct {
					FileID int64 `json:"file_id"`
				} `json:"files"`
			} `json:"attributes"`
		} `json:"data"`
	}
	if err := h.do(req, &searchResp); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("failed to reach OpenSubtitles: %v", err)})
		return
	}

	perLanguage := map[string]int{}
	subtitles := make([]subtitleEntry, 0, len(searchResp.Data))
	for _, item := range searchResp.Data {
		attrs := item.Attributes
		if len(attrs.Files) == 0 {
			continue
		}
		lang := strings.ToLower(attrs.Language)
		if perLanguage[lang] >= subtitlesPerLanguage {
			continue
		}
		perLanguage[lang]++
		yify, quality, source := tagRelease(attrs.Release)
		subtitles = append(subtitles, subtitleEntry{
			FileID:          attrs.Files[0].FileID,
			Language:        lang,
			Release:         attrs.Release,
			DownloadCount:   attrs.DownloadCount,
			HearingImpaired: attrs.HearingImpaired,
			URL:             attrs.URL,
			Yify:            yify,
			Quality:         quality,
			Source:          source,
		})
	}

	// Keep the caller's language order (fr before en), then most downloaded first.
	requested := strings.Split(strings.ToLower(languages), ",")
	rank := make(map[string]int, len(requested))
	for i, lang := range requested {
		rank[lang] = i
	}
	sort.SliceStable(subtitles, func(i, j int) bool {
		ri, rj := rank[subtitles[i].Language], rank[subtitles[j].Language]
		if ri != rj {
			return ri < rj
		}
		return subtitles[i].DownloadCount > subtitles[j].DownloadCount
	})

	c.JSON(http.StatusOK, gin.H{
		"found":        len(subtitles) > 0,
		"configured":   true,
		"downloadable": true,
		"subtitles":    subtitles,
	})
}

// Download godoc: GET /api/subtitles/download?file_id=123
// Streams the .srt file as an attachment so the browser saves it directly.
func (h *SubtitlesHandler) Download(c *gin.Context) {
	fileID := c.Query("file_id")
	if fileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'file_id' is required"})
		return
	}
	if !h.configured() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "subtitles are not configured (OPENSUBTITLES_API_KEY)"})
		return
	}

	// Anonymous downloads rely on the consumer's "allow anonymous downloads" setting.
	token := ""
	if h.hasCredentials() {
		var err error
		if token, err = h.getToken(); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
	}

	payload, err := json.Marshal(map[string]any{"file_id": json.Number(fileID)})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file_id"})
		return
	}
	req, err := h.newRequest(http.MethodPost, "/download", payload, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build request"})
		return
	}

	var downloadResp struct {
		Link      string `json:"link"`
		FileName  string `json:"file_name"`
		Remaining int    `json:"remaining"`
		Message   string `json:"message"`
	}
	if err := h.do(req, &downloadResp); err != nil {
		// A stale token gets rejected with 401; drop it so the next call logs in again.
		if strings.Contains(err.Error(), "HTTP 401") {
			h.tokenMu.Lock()
			h.token = ""
			h.tokenMu.Unlock()
		}
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("failed to reach OpenSubtitles: %v", err)})
		return
	}
	if downloadResp.Link == "" {
		c.JSON(http.StatusBadGateway, gin.H{"error": "OpenSubtitles returned no download link"})
		return
	}

	fileResp, err := h.client.Get(downloadResp.Link)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("failed to fetch subtitle file: %v", err)})
		return
	}
	defer fileResp.Body.Close()
	if fileResp.StatusCode != http.StatusOK {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("subtitle file returned HTTP %d", fileResp.StatusCode)})
		return
	}

	fileName := downloadResp.FileName
	if fileName == "" {
		fileName = "subtitle-" + fileID + ".srt"
	}
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%q", fileName))
	c.Header("X-Subtitles-Remaining", strconv.Itoa(downloadResp.Remaining))
	c.DataFromReader(http.StatusOK, fileResp.ContentLength, "application/x-subrip", fileResp.Body, nil)
}

// Ping is used by the service health check.
func (h *SubtitlesHandler) Ping() error {
	if !h.configured() {
		return fmt.Errorf("not configured (optional)")
	}
	req, err := h.newRequest(http.MethodGet, "/infos/languages", nil, "")
	if err != nil {
		return err
	}
	return h.do(req, nil)
}
