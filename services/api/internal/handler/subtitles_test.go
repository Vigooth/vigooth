package handler

import "testing"

func TestTagRelease(t *testing.T) {
	cases := []struct {
		release string
		yify    bool
		quality string
		source  string
	}{
		{"Fight.Club.1999.1080p.BluRay.x264.YIFY", true, "1080p", "bluray"},
		{"Fight Club (1999) [720p] [YTS.MX]", true, "720p", ""},
		{"Fight.Club.1999.720p.BrRip.x264.YIFY", true, "720p", "bluray"},
		{"Fight.Club.1999.2160p.WEB-DL.DDP5.1.x265-GROUP", false, "2160p", "web"},
		{"Fight.Club.1999.AMZN.WEBRip.1080p", false, "1080p", "web"},
		{"Fight Club (1999)", false, "", ""},
	}
	for _, tc := range cases {
		yify, quality, source := tagRelease(tc.release)
		if yify != tc.yify || quality != tc.quality || source != tc.source {
			t.Errorf("%q: got (%v,%q,%q) want (%v,%q,%q)", tc.release, yify, quality, source, tc.yify, tc.quality, tc.source)
		}
	}
}
