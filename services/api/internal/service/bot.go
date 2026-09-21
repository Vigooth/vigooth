package service

import "strings"

// botMarkers are lowercase substrings that identify automated clients in a
// User-Agent string. The generic words at the top catch most crawlers, which
// by convention advertise themselves; the names below cover the well-known
// scanners that reached the visit log without one of those words.
var botMarkers = []string{
	"bot",
	"crawler",
	"spider",
	"scraper",
	"headless",
	"phantomjs",
	"puppeteer",
	"playwright",
	"selenium",
	"python-requests",
	"python-urllib",
	"go-http-client",
	"curl/",
	"wget/",
	"okhttp",
	"java/",
	"libwww",
	"lighthouse",
	"censys",
	"shodan",
	"zgrab",
	"masscan",
	"nmap",
	"nuclei",
	"ahrefs",
	"semrush",
	"mj12",
	"dotbot",
	"petalbot",
	"bytespider",
	"facebookexternalhit",
	"slurp",
	"duckduckgo",
	"yandex",
	"baiduspider",
}

// IsBotUserAgent reports whether the User-Agent looks like an automated
// client rather than a person's browser. An empty User-Agent is treated as a
// bot: every real browser sends one.
func IsBotUserAgent(userAgent string) bool {
	ua := strings.ToLower(strings.TrimSpace(userAgent))
	if ua == "" {
		return true
	}
	for _, marker := range botMarkers {
		if strings.Contains(ua, marker) {
			return true
		}
	}
	return false
}
