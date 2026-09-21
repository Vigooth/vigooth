package service

import "testing"

func TestIsBotUserAgent(t *testing.T) {
	cases := []struct {
		name string
		ua   string
		want bool
	}{
		{"empty", "", true},
		{"googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", true},
		{"ahrefs", "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)", true},
		{"headless chrome", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36", true},
		{"curl", "curl/8.4.0", true},
		{"python", "python-requests/2.31.0", true},
		{"censys", "Mozilla/5.0 (compatible; CensysInspect/1.1; +https://about.censys.io/)", true},
		{"chrome desktop", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36", false},
		{"safari ios", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1", false},
		{"firefox", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0", false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := IsBotUserAgent(tc.ua); got != tc.want {
				t.Errorf("IsBotUserAgent(%q) = %v, want %v", tc.ua, got, tc.want)
			}
		})
	}
}
