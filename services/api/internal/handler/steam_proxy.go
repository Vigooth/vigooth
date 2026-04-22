package handler

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
)

type SteamProxyHandler struct {
	steamAPIKey string
	client      *http.Client
}

func NewSteamProxyHandler(steamAPIKey string) *SteamProxyHandler {
	return &SteamProxyHandler{
		steamAPIKey: steamAPIKey,
		client:      &http.Client{Timeout: 10 * time.Second},
	}
}

// OwnedGames proxies IPlayerService/GetOwnedGames/v1.
func (h *SteamProxyHandler) OwnedGames(c *gin.Context) {
	steamID := c.Param("steamId")
	params := url.Values{
		"key":                      {h.steamAPIKey},
		"steamid":                  {steamID},
		"include_appinfo":          {"1"},
		"include_played_free_games": {"1"},
		"format":                   {"json"},
	}
	h.proxy(c, "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?"+params.Encode())
}

// PlayerSummary proxies ISteamUser/GetPlayerSummaries/v2 for a single player.
func (h *SteamProxyHandler) PlayerSummary(c *gin.Context) {
	steamID := c.Param("steamId")
	params := url.Values{
		"key":      {h.steamAPIKey},
		"steamids": {steamID},
	}
	h.proxy(c, "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?"+params.Encode())
}

// PlayerSummaries proxies ISteamUser/GetPlayerSummaries/v2 for multiple players.
func (h *SteamProxyHandler) PlayerSummaries(c *gin.Context) {
	steamIDs := c.Query("steamids")
	if steamIDs == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "steamids query parameter required"})
		return
	}
	params := url.Values{
		"key":      {h.steamAPIKey},
		"steamids": {steamIDs},
	}
	h.proxy(c, "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?"+params.Encode())
}

// FriendList proxies ISteamUser/GetFriendList/v1.
func (h *SteamProxyHandler) FriendList(c *gin.Context) {
	steamID := c.Param("steamId")
	params := url.Values{
		"key":          {h.steamAPIKey},
		"steamid":      {steamID},
		"relationship": {"friend"},
	}
	h.proxy(c, "https://api.steampowered.com/ISteamUser/GetFriendList/v1/?"+params.Encode())
}

// ResolveVanity proxies ISteamUser/ResolveVanityURL/v1.
func (h *SteamProxyHandler) ResolveVanity(c *gin.Context) {
	vanityURL := c.Param("vanityUrl")
	params := url.Values{
		"key":       {h.steamAPIKey},
		"vanityurl": {vanityURL},
	}
	h.proxy(c, "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?"+params.Encode())
}

// StoreAppDetails proxies store.steampowered.com/api/appdetails.
func (h *SteamProxyHandler) StoreAppDetails(c *gin.Context) {
	appids := c.Query("appids")
	lang := c.DefaultQuery("l", "english")
	if appids == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "appids query parameter required"})
		return
	}
	u := fmt.Sprintf("https://store.steampowered.com/api/appdetails?appids=%s&l=%s", url.QueryEscape(appids), url.QueryEscape(lang))
	h.proxy(c, u)
}

func (h *SteamProxyHandler) proxy(c *gin.Context, targetURL string) {
	resp, err := h.client.Get(targetURL)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to reach Steam API"})
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
