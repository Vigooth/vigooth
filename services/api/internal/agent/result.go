package agent

type Recommendation struct {
	Title       string `json:"title"`
	Year        int    `json:"year"`
	TmdbID      int    `json:"tmdb_id,omitempty"`
	PosterPath  string `json:"poster_path,omitempty"`
	Reason      string `json:"reason"`
	AllocineURL string `json:"allocine_url,omitempty"`
}

type RecommendationResult struct {
	Recommendations []Recommendation `json:"recommendations"`
	Total           int              `json:"total"`
}

type Event struct {
	Type    string `json:"type"`    // "thinking", "tool_call", "recommendation", "done", "error"
	Message string `json:"message"` // Human-readable description
	Data    any    `json:"data,omitempty"`
}
