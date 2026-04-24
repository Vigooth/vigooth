package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var steamIDRegex = regexp.MustCompile(`^https://steamcommunity\.com/openid/id/(\d+)$`)

type SteamAuthHandler struct {
	steamAPIKey  string
	jwtSecret    string
	cookieConfig CookieConfig
	baseURL      string
	client       *http.Client
}

func NewSteamAuthHandler(steamAPIKey, jwtSecret string, cookieConfig CookieConfig, baseURL string) *SteamAuthHandler {
	return &SteamAuthHandler{
		steamAPIKey:  steamAPIKey,
		jwtSecret:    jwtSecret,
		cookieConfig: cookieConfig,
		baseURL:      strings.TrimRight(baseURL, "/"),
		client:       &http.Client{Timeout: 10 * time.Second},
	}
}

// Login redirects the browser to Steam's OpenID login page.
func (h *SteamAuthHandler) Login(c *gin.Context) {
	params := url.Values{
		"openid.ns":         {"http://specs.openid.net/auth/2.0"},
		"openid.mode":       {"checkid_setup"},
		"openid.return_to":  {h.baseURL + "/auth/steam/callback"},
		"openid.realm":      {h.baseURL + "/"},
		"openid.identity":   {"http://specs.openid.net/auth/2.0/identifier_select"},
		"openid.claimed_id": {"http://specs.openid.net/auth/2.0/identifier_select"},
	}
	c.Redirect(http.StatusTemporaryRedirect, "https://steamcommunity.com/openid/login?"+params.Encode())
}

// Callback handles Steam's OpenID redirect, verifies the assertion, issues a JWT cookie, and redirects to the frontend.
func (h *SteamAuthHandler) Callback(c *gin.Context) {
	// Build verification request — replay all query params with mode=check_authentication
	params := url.Values{}
	for key, values := range c.Request.URL.Query() {
		params.Set(key, values[0])
	}
	params.Set("openid.mode", "check_authentication")

	resp, err := h.client.PostForm("https://steamcommunity.com/openid/login", params)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.baseURL+"/login?error=steam_unavailable")
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil || !strings.Contains(string(body), "is_valid:true") {
		c.Redirect(http.StatusTemporaryRedirect, h.baseURL+"/login?error=verification_failed")
		return
	}

	// Extract Steam ID from the claimed_id
	claimedID := c.Query("openid.claimed_id")
	matches := steamIDRegex.FindStringSubmatch(claimedID)
	if len(matches) != 2 {
		c.Redirect(http.StatusTemporaryRedirect, h.baseURL+"/login?error=invalid_steam_id")
		return
	}
	steamID := matches[1]

	// Fetch player summary to include in JWT
	personaname, avatar := h.fetchPlayerInfo(steamID)

	// Issue JWT
	claims := jwt.MapClaims{
		"sub":         steamID,
		"typ":         "steam",
		"personaname": personaname,
		"avatar":      avatar,
		"exp":         time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":         time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(h.jwtSecret))
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.baseURL+"/login?error=token_failed")
		return
	}

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		"steam_token",
		tokenString,
		h.cookieConfig.MaxAge,
		"/",
		h.cookieConfig.Domain,
		h.cookieConfig.Secure,
		true, // HttpOnly
	)

	c.Redirect(http.StatusTemporaryRedirect, h.baseURL+"/library")
}

// Me returns the authenticated user's Steam profile from the JWT claims.
func (h *SteamAuthHandler) Me(c *gin.Context) {
	tokenString := h.extractToken(c)
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(h.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid claims"})
		return
	}

	if tokenType, _ := claims["typ"].(string); tokenType != "steam" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not a steam session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"steamId":     claims["sub"],
		"personaname": claims["personaname"],
		"avatar":      claims["avatar"],
	})
}

// Logout clears the auth cookie.
func (h *SteamAuthHandler) Logout(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		"steam_token",
		"",
		-1,
		"/",
		h.cookieConfig.Domain,
		h.cookieConfig.Secure,
		true,
	)
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

func (h *SteamAuthHandler) extractToken(c *gin.Context) string {
	if token, err := c.Cookie("steam_token"); err == nil && token != "" {
		return token
	}
	authHeader := c.GetHeader("Authorization")
	parts := strings.Split(authHeader, " ")
	if len(parts) == 2 && parts[0] == "Bearer" {
		return parts[1]
	}
	return ""
}

func (h *SteamAuthHandler) fetchPlayerInfo(steamID string) (personaname, avatar string) {
	u := fmt.Sprintf("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=%s&steamids=%s",
		h.steamAPIKey, steamID)

	resp, err := h.client.Get(u)
	if err != nil {
		return "", ""
	}
	defer resp.Body.Close()

	var result struct {
		Response struct {
			Players []struct {
				Personaname string `json:"personaname"`
				Avatarfull  string `json:"avatarfull"`
			} `json:"players"`
		} `json:"response"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", ""
	}

	if len(result.Response.Players) > 0 {
		return result.Response.Players[0].Personaname, result.Response.Players[0].Avatarfull
	}
	return "", ""
}
