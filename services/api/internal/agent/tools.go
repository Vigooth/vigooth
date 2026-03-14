package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/llm"
)

func buildTools() []llm.Tool {
	return []llm.Tool{
		{
			Name:        "get_recommendations",
			Description: "Get TMDB recommendations for a movie (films that users also liked). Returns a list of recommended movies with title, year, overview, genres, rating, and poster.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"tmdb_id": {"type": "integer", "description": "The TMDB movie ID"}
				},
				"required": ["tmdb_id"]
			}`),
		},
		{
			Name:        "get_similar",
			Description: "Get movies similar to a given movie (same genres/keywords). Returns a list of similar movies with title, year, overview, genres, rating, and poster.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"tmdb_id": {"type": "integer", "description": "The TMDB movie ID"}
				},
				"required": ["tmdb_id"]
			}`),
		},
		{
			Name:        "discover_movies",
			Description: "Discover movies by filters: genres, year range, minimum rating, sort order, director/actor. Great for exploring beyond the user's known films.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"with_genres": {"type": "string", "description": "Comma-separated genre IDs (28=Action, 12=Adventure, 16=Animation, 35=Comedy, 80=Crime, 99=Documentary, 18=Drama, 10751=Family, 14=Fantasy, 36=History, 27=Horror, 10402=Music, 9648=Mystery, 10749=Romance, 878=SciFi, 53=Thriller, 10752=War, 37=Western)"},
					"primary_release_year": {"type": "integer", "description": "Exact release year"},
					"primary_release_date_gte": {"type": "string", "description": "Minimum release date (YYYY-MM-DD)"},
					"primary_release_date_lte": {"type": "string", "description": "Maximum release date (YYYY-MM-DD)"},
					"vote_average_gte": {"type": "number", "description": "Minimum vote average (0-10)"},
					"vote_count_gte": {"type": "integer", "description": "Minimum number of votes (use 100+ to filter obscure films)"},
					"with_people": {"type": "string", "description": "Comma-separated person IDs (actors or directors)"},
					"sort_by": {"type": "string", "description": "Sort order: popularity.desc, vote_average.desc, primary_release_date.desc, revenue.desc"}
				}
			}`),
		},
		{
			Name:        "search_movie",
			Description: "Search for a movie by title on TMDB. Returns matches with TMDB ID, title, year, overview, and rating.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"query": {"type": "string", "description": "Movie title to search for"},
					"year": {"type": "integer", "description": "Optional: filter by release year"}
				},
				"required": ["query"]
			}`),
		},
		{
			Name:        "get_movie_details",
			Description: "Get full details for a movie: overview, genres, runtime, credits (director, main cast), rating, and poster.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"tmdb_id": {"type": "integer", "description": "The TMDB movie ID"}
				},
				"required": ["tmdb_id"]
			}`),
		},
		{
			Name:        "search_person",
			Description: "Search for a person (director, actor) on TMDB. Returns person ID, name, and known movies.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"query": {"type": "string", "description": "Person name to search for"}
				},
				"required": ["query"]
			}`),
		},
	}
}

type toolExecutor struct {
	client     *http.Client
	tmdbAPIKey string
}

func newToolExecutor(tmdbAPIKey string) *toolExecutor {
	return &toolExecutor{
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
		tmdbAPIKey: tmdbAPIKey,
	}
}

func (e *toolExecutor) Execute(ctx context.Context, name, arguments string) (string, error) {
	var args map[string]json.RawMessage
	if err := json.Unmarshal([]byte(arguments), &args); err != nil {
		return "", fmt.Errorf("invalid arguments: %w", err)
	}

	switch name {
	case "get_recommendations":
		return e.tmdbGet(ctx, fmt.Sprintf("/movie/%s/recommendations", rawString(args["tmdb_id"])), nil)
	case "get_similar":
		return e.tmdbGet(ctx, fmt.Sprintf("/movie/%s/similar", rawString(args["tmdb_id"])), nil)
	case "discover_movies":
		params := url.Values{}
		for key, val := range args {
			params.Set(key, rawString(val))
		}
		if _, ok := args["vote_count_gte"]; !ok {
			params.Set("vote_count.gte", "100")
		}
		if _, ok := args["sort_by"]; !ok {
			params.Set("sort_by", "vote_average.desc")
		}
		return e.tmdbGet(ctx, "/discover/movie", params)
	case "search_movie":
		params := url.Values{"query": {rawString(args["query"])}}
		if y, ok := args["year"]; ok {
			params.Set("year", rawString(y))
		}
		return e.tmdbGet(ctx, "/search/movie", params)
	case "get_movie_details":
		return e.tmdbGet(ctx, fmt.Sprintf("/movie/%s", rawString(args["tmdb_id"])), url.Values{"append_to_response": {"credits"}})
	case "search_person":
		return e.tmdbGet(ctx, "/search/person", url.Values{"query": {rawString(args["query"])}})
	default:
		return "", fmt.Errorf("unknown tool: %s", name)
	}
}

func (e *toolExecutor) tmdbGet(ctx context.Context, path string, extra url.Values) (string, error) {
	params := url.Values{
		"api_key":  {e.tmdbAPIKey},
		"language": {"fr-FR"},
	}
	for k, v := range extra {
		params[k] = v
	}

	reqURL := "https://api.themoviedb.org/3" + path + "?" + params.Encode()

	req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}

	resp, err := e.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("fetch: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 256*1024))
	if err != nil {
		return "", fmt.Errorf("read body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("TMDB API error (%d): %s", resp.StatusCode, string(body))
	}

	// Summarize results to save tokens
	return summarizeTMDB(path, body)
}

func summarizeTMDB(path string, body []byte) (string, error) {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		s := string(body)
		if len(s) > 3000 {
			s = s[:3000]
		}
		return s, nil
	}

	// List endpoints (recommendations, similar, discover, search)
	if results, ok := raw["results"]; ok {
		var movies []map[string]interface{}
		if err := json.Unmarshal(results, &movies); err == nil {
			var summaries []map[string]interface{}
			for i, m := range movies {
				if i >= 10 {
					break
				}
				summary := map[string]interface{}{
					"id":    m["id"],
					"title": m["title"],
					"year":  extractYear(m["release_date"]),
					"vote":  m["vote_average"],
					"poster": m["poster_path"],
				}
				if name, ok := m["name"]; ok {
					summary["name"] = name
				}
				summaries = append(summaries, summary)
			}
			out, _ := json.Marshal(summaries)
			return string(out), nil
		}
	}

	// Single movie details
	if _, ok := raw["credits"]; ok {
		var full map[string]interface{}
		json.Unmarshal(body, &full)

		// Extract genres as names
		var genreNames []string
		if genres, ok := full["genres"].([]interface{}); ok {
			for _, g := range genres {
				if gm, ok := g.(map[string]interface{}); ok {
					genreNames = append(genreNames, fmt.Sprintf("%v", gm["name"]))
				}
			}
		}

		// Extract director + top 3 cast
		var directors []string
		var cast []string
		if creditsRaw, ok := raw["credits"]; ok {
			var credits struct {
				Cast []map[string]interface{} `json:"cast"`
				Crew []map[string]interface{} `json:"crew"`
			}
			json.Unmarshal(creditsRaw, &credits)
			for _, c := range credits.Crew {
				if c["job"] == "Director" {
					directors = append(directors, fmt.Sprintf("%v", c["name"]))
				}
			}
			for i, c := range credits.Cast {
				if i >= 3 {
					break
				}
				cast = append(cast, fmt.Sprintf("%v", c["name"]))
			}
		}

		summary := map[string]interface{}{
			"id":        full["id"],
			"title":     full["title"],
			"year":      extractYear(full["release_date"]),
			"vote":      full["vote_average"],
			"genres":    genreNames,
			"directors": directors,
			"cast":      cast,
			"poster":    full["poster_path"],
			"runtime":   full["runtime"],
		}
		out, _ := json.Marshal(summary)
		return string(out), nil
	}

	s := string(body)
	if len(s) > 3000 {
		s = s[:3000]
	}
	return s, nil
}

func extractYear(v interface{}) string {
	if s, ok := v.(string); ok && len(s) >= 4 {
		return s[:4]
	}
	return ""
}

type tmdbSearchResult struct {
	ID         int    `json:"id"`
	PosterPath string `json:"poster_path"`
	Overview   string `json:"overview"`
}

func (e *toolExecutor) tmdbSearchMovie(ctx context.Context, title string, year int) (*tmdbSearchResult, error) {
	params := url.Values{"query": {title}}
	if year > 0 {
		params.Set("year", fmt.Sprintf("%d", year))
	}
	raw, err := e.tmdbGetRaw(ctx, "/search/movie", params)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Results []struct {
			ID         int    `json:"id"`
			PosterPath string `json:"poster_path"`
			Overview   string `json:"overview"`
		} `json:"results"`
	}
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}
	if len(resp.Results) == 0 {
		return &tmdbSearchResult{}, nil
	}
	return &tmdbSearchResult{
		ID:         resp.Results[0].ID,
		PosterPath: resp.Results[0].PosterPath,
		Overview:   resp.Results[0].Overview,
	}, nil
}

func (e *toolExecutor) tmdbGetRaw(ctx context.Context, path string, extra url.Values) ([]byte, error) {
	params := url.Values{
		"api_key":  {e.tmdbAPIKey},
		"language": {"fr-FR"},
	}
	for k, v := range extra {
		params[k] = v
	}

	reqURL := "https://api.themoviedb.org/3" + path + "?" + params.Encode()
	req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 256*1024))
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDB API error (%d)", resp.StatusCode)
	}
	return body, nil
}

// rawString extracts a raw JSON value as a plain string (removes quotes for strings, keeps numbers as-is)
func rawString(v json.RawMessage) string {
	var s string
	if json.Unmarshal(v, &s) == nil {
		return s
	}
	return string(v)
}
