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

func TestReleaseCamRe(t *testing.T) {
	cams := []string{
		"The.Odyssey.2026.1080p.TELESYNC.HEVC.AAC2.0-SPLiCE",
		"The Odyssey (2026) 1080P HQ HDTS x265 AAC2.0 MULTI HC-Sub",
		"Movie.2026.HDCAM.x264",
		"Movie 2026 720p TS",
	}
	for _, name := range cams {
		if !releaseCamRe.MatchString(name) {
			t.Errorf("%q should be detected as cam", name)
		}
	}
	clean := []string{
		"The Odyssey 2026 1080p AMZN WEB-DL DDP5 1 H 264-Kitsune",
		"Fight.Club.1999.1080p.BluRay.x264.YIFY",
		"Points.2026.1080p.WEBRip", // "ts" inside a word must not match
	}
	for _, name := range clean {
		if releaseCamRe.MatchString(name) {
			t.Errorf("%q should not be detected as cam", name)
		}
	}
}

func TestFormatBytes(t *testing.T) {
	if got := formatBytes(1702618785); got != "1.59 GB" {
		t.Errorf("got %q", got)
	}
	if got := formatBytes(790_580_000); got != "754 MB" {
		t.Errorf("got %q", got)
	}
}
