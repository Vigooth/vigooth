package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/llm"
	"github.com/Vigooth/vigooth/services/api/internal/model"
)

const agentTimeout = 3 * time.Minute

func buildSystemPrompt(vibe int) string {
	var vibeInstruction string
	switch {
	case vibe <= 20:
		vibeInstruction = `FOCUS: 100% PÉPITES/NICHE. Ne sélectionne AUCUN film des candidats TMDB. Propose uniquement des films peu connus, indépendants, d'auteur, étrangers, des perles rares. Évite tout blockbuster ou film mainstream.`
	case vibe <= 40:
		vibeInstruction = `FOCUS: Majorité PÉPITES/NICHE (7-8 sur 10). Sélectionne 1-2 candidats TMDB max, le reste doit être des films peu connus, indépendants, d'auteur.`
	case vibe <= 60:
		vibeInstruction = `FOCUS: Mix équilibré. Sélectionne ~5 films des candidats TMDB (populaires/similaires) et ~5 pépites/niche de ta propre connaissance.`
	case vibe <= 80:
		vibeInstruction = `FOCUS: Majorité POPULAIRES (7-8 sur 10). Sélectionne principalement des candidats TMDB, avec 1-2 pépites niche.`
	default:
		vibeInstruction = `FOCUS: 100% POPULAIRES. Sélectionne uniquement des films des candidats TMDB. Privilégie les films les mieux notés et les plus connus.`
	}

	return fmt.Sprintf(`Tu es un cinéphile expert. On te donne le profil d'un utilisateur et des films candidats issus de TMDB.

Ta mission: sélectionne 5-10 films à recommander.

%s

Règles:
- Analyse les films adorés ET les moins aimés pour comprendre les goûts
- Ne recommande JAMAIS un film de la liste "COLLECTION" ou "WISHLIST"
- Diversifie: pas 5 films du même réalisateur
- Évite les genres/styles des films mal notés

Réponds UNIQUEMENT avec le JSON, rien d'autre:
[{"title": "...", "year": 2020, "tmdb_id": 123, "poster_path": "/abc.jpg"}]

Pour tes propres suggestions (pépites), mets tmdb_id à 0 et poster_path à "".`, vibeInstruction)
}

type RecommendationAgent struct {
	llm        llm.Provider
	tmdbAPIKey string
	exec       *toolExecutor
}

func NewRecommendationAgent(provider llm.Provider, tmdbAPIKey string) *RecommendationAgent {
	return &RecommendationAgent{
		llm:        provider,
		tmdbAPIKey: tmdbAPIKey,
		exec:       newToolExecutor(tmdbAPIKey),
	}
}

type TokenUsage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
	TotalTokens  int `json:"total_tokens"`
}

func (a *RecommendationAgent) Run(ctx context.Context, userMovies []model.Movie, excludeTmdbIDs []int, vibe int, onEvent func(Event)) (*RecommendationResult, error) {
	ctx, cancel := context.WithTimeout(ctx, agentTimeout)
	defer cancel()

	onEvent(Event{Type: "thinking", Message: "Analyse de votre collection..."})

	// Build existing titles/IDs for filtering
	existingTitles := make(map[string]bool)
	existingTMDBIDs := make(map[int]bool)
	for _, m := range userMovies {
		existingTitles[strings.ToLower(m.Title)] = true
		if m.OriginalTitle != "" {
			existingTitles[strings.ToLower(m.OriginalTitle)] = true
		}
		if m.TmdbID != 0 {
			existingTMDBIDs[m.TmdbID] = true
		}
	}
	// Exclude wishlist movies
	for _, id := range excludeTmdbIDs {
		existingTMDBIDs[id] = true
	}

	// Step 1: Pick top-rated movies to query TMDB
	topMovies := pickTopMovies(userMovies, 3)

	// Step 2: Fetch TMDB candidates (in Go, no LLM cost)
	onEvent(Event{Type: "tool_call", Message: "Recherche TMDB des films similaires..."})
	candidates := a.fetchTMDBCandidates(ctx, topMovies, existingTMDBIDs, onEvent)

	if len(candidates) == 0 {
		onEvent(Event{Type: "error", Message: "Aucun candidat trouvé sur TMDB"})
		return &RecommendationResult{}, nil
	}

	log.Printf("[agent] fetched %d TMDB candidates", len(candidates))

	// Step 3: Single LLM call to select + add hidden gems
	onEvent(Event{Type: "thinking", Message: fmt.Sprintf("Sélection parmi %d candidats TMDB + pépites...", len(candidates))})

	collectionSummary := buildCollectionSummary(userMovies)
	candidatesSummary := buildCandidatesSummary(candidates)

	prompt := fmt.Sprintf("## COLLECTION DE L'UTILISATEUR\n%s\n\n## CANDIDATS TMDB\n%s", collectionSummary, candidatesSummary)

	messages := []llm.Message{
		{Role: "system", Content: buildSystemPrompt(vibe)},
		{Role: "user", Content: prompt},
	}

	resp, err := a.llm.Chat(ctx, messages, nil)
	if err != nil {
		onEvent(Event{Type: "error", Message: fmt.Sprintf("Erreur LLM: %s", err)})
		return nil, fmt.Errorf("llm chat: %w", err)
	}

	tokens := TokenUsage{
		InputTokens:  resp.Usage.InputTokens,
		OutputTokens: resp.Usage.OutputTokens,
		TotalTokens:  resp.Usage.InputTokens + resp.Usage.OutputTokens,
	}

	// Step 4: Parse recommendations
	recommendations := parseRecommendations(resp.Content, existingTitles)

	// Build overview map from candidates
	candidateOverviews := make(map[int]string)
	for _, c := range candidates {
		if c.Overview != "" {
			candidateOverviews[c.ID] = c.Overview
		}
	}

	// Filter by TMDB ID and add overviews from candidates
	var filtered []Recommendation
	for _, r := range recommendations {
		if r.TmdbID != 0 && existingTMDBIDs[r.TmdbID] {
			continue
		}
		if r.TmdbID != 0 && r.Reason == "" {
			if ov, ok := candidateOverviews[r.TmdbID]; ok {
				r.Reason = ov
			}
		}
		filtered = append(filtered, r)
	}

	// Step 5: Enrich hidden gems (tmdb_id=0) by searching TMDB + get overview
	filtered = a.enrichRecommendations(ctx, filtered, onEvent)

	// Step 6: Re-filter after enrichment (hidden gems now have real TMDB IDs)
	var final []Recommendation
	for _, r := range filtered {
		if r.TmdbID != 0 && existingTMDBIDs[r.TmdbID] {
			continue
		}
		final = append(final, r)
	}

	result := &RecommendationResult{
		Recommendations: final,
		Total:           len(final),
	}

	for _, rec := range final {
		onEvent(Event{
			Type:    "recommendation",
			Message: fmt.Sprintf("%s (%d)", rec.Title, rec.Year),
			Data:    rec,
		})
	}

	onEvent(Event{
		Type:    "done",
		Message: fmt.Sprintf("%d recommandations trouvées", len(final)),
		Data: map[string]interface{}{
			"recommendations": final,
			"total":           len(final),
			"tokens":          tokens,
		},
	})

	log.Printf("[agent] done: %d recommendations, tokens: in=%d out=%d total=%d",
		len(final), tokens.InputTokens, tokens.OutputTokens, tokens.TotalTokens)

	return result, nil
}

// pickTopMovies returns the N highest-rated movies (or most recent if unrated)
func pickTopMovies(movies []model.Movie, n int) []model.Movie {
	// Sort: rated movies first (highest rating), then unrated by year
	type scored struct {
		movie model.Movie
		score int
	}
	var items []scored
	for _, m := range movies {
		s := 0
		if m.PersonalRating != nil {
			s = *m.PersonalRating
		}
		items = append(items, scored{movie: m, score: s})
	}
	// Simple selection sort for small N
	for i := 0; i < n && i < len(items); i++ {
		maxIdx := i
		for j := i + 1; j < len(items); j++ {
			if items[j].score > items[maxIdx].score {
				maxIdx = j
			}
		}
		items[i], items[maxIdx] = items[maxIdx], items[maxIdx]
		if maxIdx != i {
			items[i], items[maxIdx] = items[maxIdx], items[i]
		}
	}

	var result []model.Movie
	for i := 0; i < n && i < len(items); i++ {
		result = append(result, items[i].movie)
	}
	return result
}

// fetchTMDBCandidates fetches recommendations and similar movies from TMDB
func (a *RecommendationAgent) fetchTMDBCandidates(ctx context.Context, topMovies []model.Movie, existingIDs map[int]bool, onEvent func(Event)) []tmdbCandidate {
	seen := make(map[int]bool)
	var candidates []tmdbCandidate

	for _, m := range topMovies {
		if m.TmdbID == 0 {
			continue
		}

		// Get recommendations (raw for overviews, summarized for Claude)
		onEvent(Event{Type: "tool_call", Message: fmt.Sprintf("TMDB recommandations pour %s...", m.Title)})
		recoOverviews := make(map[int]string)
		recos, err := a.exec.tmdbGet(ctx, fmt.Sprintf("/movie/%d/recommendations", m.TmdbID), nil)
		if err == nil {
			rawRecos, _ := a.exec.tmdbGetRaw(ctx, fmt.Sprintf("/movie/%d/recommendations", m.TmdbID), nil)
			extractOverviews(rawRecos, recoOverviews)
			candidates = appendCandidates(candidates, recos, seen, existingIDs, "recommandé", recoOverviews)
		}

		// Get similar
		onEvent(Event{Type: "tool_call", Message: fmt.Sprintf("TMDB similaires pour %s...", m.Title)})
		simOverviews := make(map[int]string)
		similar, err := a.exec.tmdbGet(ctx, fmt.Sprintf("/movie/%d/similar", m.TmdbID), nil)
		if err == nil {
			rawSim, _ := a.exec.tmdbGetRaw(ctx, fmt.Sprintf("/movie/%d/similar", m.TmdbID), nil)
			extractOverviews(rawSim, simOverviews)
			candidates = appendCandidates(candidates, similar, seen, existingIDs, "similaire", simOverviews)
		}
	}

	return candidates
}

type tmdbCandidate struct {
	ID         int     `json:"id"`
	Title      string  `json:"title"`
	Year       string  `json:"year"`
	Vote       float64 `json:"vote"`
	PosterPath string  `json:"poster"`
	Overview   string  `json:"overview"`
	Source     string  `json:"source"`
}

func appendCandidates(candidates []tmdbCandidate, jsonStr string, seen, existingIDs map[int]bool, source string, overviews map[int]string) []tmdbCandidate {
	var items []map[string]interface{}
	if err := json.Unmarshal([]byte(jsonStr), &items); err != nil {
		return candidates
	}

	for _, item := range items {
		id := int(toFloat(item["id"]))
		if id == 0 || seen[id] || existingIDs[id] {
			continue
		}
		seen[id] = true
		overview := ""
		if ov, ok := overviews[id]; ok {
			overview = ov
		}
		candidates = append(candidates, tmdbCandidate{
			ID:         id,
			Title:      fmt.Sprintf("%v", item["title"]),
			Year:       fmt.Sprintf("%v", item["year"]),
			Vote:       toFloat(item["vote"]),
			PosterPath: fmt.Sprintf("%v", item["poster"]),
			Overview:   overview,
			Source:     source,
		})
	}
	return candidates
}

func toFloat(v interface{}) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case int:
		return float64(n)
	default:
		return 0
	}
}

func extractOverviews(raw []byte, out map[int]string) {
	if raw == nil {
		return
	}
	var resp struct {
		Results []struct {
			ID       int    `json:"id"`
			Overview string `json:"overview"`
		} `json:"results"`
	}
	if json.Unmarshal(raw, &resp) == nil {
		for _, r := range resp.Results {
			if r.Overview != "" {
				out[r.ID] = r.Overview
			}
		}
	}
}

func buildCandidatesSummary(candidates []tmdbCandidate) string {
	var sb strings.Builder
	for _, c := range candidates {
		sb.WriteString(fmt.Sprintf("- %s (%s) TMDB:%d vote:%.1f poster:%s\n", c.Title, c.Year, c.ID, c.Vote, c.PosterPath))
	}
	return sb.String()
}

// enrichRecommendations searches TMDB for recommendations that don't have a tmdb_id (Claude's own picks)
func (a *RecommendationAgent) enrichRecommendations(ctx context.Context, recs []Recommendation, onEvent func(Event)) []Recommendation {
	var enriched []Recommendation
	for _, r := range recs {
		if r.TmdbID != 0 {
			enriched = append(enriched, r)
			continue
		}

		// Search TMDB for this movie
		onEvent(Event{Type: "tool_call", Message: fmt.Sprintf("Recherche TMDB: %s...", r.Title)})
		query := fmt.Sprintf("%s", r.Title)
		result, err := a.exec.tmdbSearchMovie(ctx, query, r.Year)
		if err != nil {
			log.Printf("[agent] TMDB search failed for %s: %v", r.Title, err)
			enriched = append(enriched, r)
			continue
		}

		if result.ID != 0 {
			r.TmdbID = result.ID
			r.PosterPath = result.PosterPath
			if r.Reason == "" && result.Overview != "" {
				r.Reason = result.Overview
			}
		}
		enriched = append(enriched, r)
	}
	return enriched
}

func buildCollectionSummary(movies []model.Movie) string {
	var loved, liked, neutral, disliked []model.Movie

	for _, m := range movies {
		if m.PersonalRating == nil {
			neutral = append(neutral, m)
		} else if *m.PersonalRating >= 9 {
			loved = append(loved, m)
		} else if *m.PersonalRating >= 7 {
			liked = append(liked, m)
		} else {
			disliked = append(disliked, m)
		}
	}

	var sb strings.Builder

	writeSection := func(title string, list []model.Movie) {
		if len(list) == 0 {
			return
		}
		sb.WriteString(fmt.Sprintf("\n## %s\n", title))
		for _, m := range list {
			rating := ""
			if m.PersonalRating != nil {
				rating = fmt.Sprintf(" [%d/10]", *m.PersonalRating)
			}
			sb.WriteString(fmt.Sprintf("- %s (%d) | %s | %s%s\n", m.Title, m.Year, m.Director, m.Genres, rating))
		}
	}

	writeSection("ADORÉS (9-10/10)", loved)
	writeSection("AIMÉS (7-8/10)", liked)
	writeSection("MOINS AIMÉS (1-6/10)", disliked)
	writeSection("PAS ENCORE NOTÉS", neutral)

	return sb.String()
}

func parseRecommendations(content string, existingTitles map[string]bool) []Recommendation {
	// Try RECOMMENDATIONS_JSON marker first
	marker := "RECOMMENDATIONS_JSON:"
	idx := strings.Index(content, marker)
	if idx != -1 {
		content = content[idx+len(marker):]
	}

	return extractJSONRecommendations(content, existingTitles)
}

func extractJSONRecommendations(content string, existingTitles map[string]bool) []Recommendation {
	start := strings.Index(content, "[")
	if start == -1 {
		return nil
	}

	depth := 0
	end := -1
	for i := start; i < len(content); i++ {
		if content[i] == '[' {
			depth++
		} else if content[i] == ']' {
			depth--
			if depth == 0 {
				end = i
				break
			}
		}
	}

	if end == -1 {
		return nil
	}

	jsonStr := content[start : end+1]

	var recs []Recommendation
	if err := json.Unmarshal([]byte(jsonStr), &recs); err != nil {
		log.Printf("failed to parse recommendations JSON: %v", err)
		return nil
	}

	var filtered []Recommendation
	for _, r := range recs {
		if r.Title != "" && !existingTitles[strings.ToLower(r.Title)] {
			filtered = append(filtered, r)
		}
	}

	return filtered
}
