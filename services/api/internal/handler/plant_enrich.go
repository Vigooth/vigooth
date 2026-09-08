package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/Vigooth/vigooth/services/api/internal/llm"
	"github.com/gin-gonic/gin"
)

type PlantEnrichHandler struct {
	provider llm.Provider
}

func NewPlantEnrichHandler(provider llm.Provider) *PlantEnrichHandler {
	return &PlantEnrichHandler{provider: provider}
}

type enrichRequest struct {
	Name      string `json:"name"`
	LatinName string `json:"latin_name"`
}

// PlantCare is what the model is allowed to fill: the growing advice, never the
// identity. Name, Latin name and family come from Pl@ntNet, which knows them.
type PlantCare struct {
	Sun         string `json:"sun"`
	Water       string `json:"water"`
	SpacingCm   *int   `json:"spacing_cm"`
	Description string `json:"description"`
}

// enrichTool forces a structured answer. Asking for JSON in the prompt and
// parsing the reply works until the day the model wraps it in prose; a tool
// call is checked by the provider instead.
var enrichTool = llm.Tool{
	Name:        "remplir_fiche",
	Description: "Renseigne les conseils de culture pour une plante de potager.",
	Parameters: json.RawMessage(`{
		"type": "object",
		"properties": {
			"sun": {
				"type": "string",
				"description": "Exposition, 1 à 3 mots. Ex: 'Plein soleil', 'Mi-ombre'."
			},
			"water": {
				"type": "string",
				"description": "Besoin en eau, 1 à 3 mots. Ex: 'Régulier', 'Abondant en été'."
			},
			"spacing_cm": {
				"type": "integer",
				"description": "Distance de plantation entre deux pieds, en centimètres."
			},
			"description": {
				"type": "string",
				"description": "Deux phrases maximum sur la culture au potager, en français."
			}
		},
		"required": ["sun", "water", "spacing_cm", "description"]
	}`),
}

const enrichSystemPrompt = `Tu es jardinier maraîcher. On te donne une espèce, tu renseignes ses conditions de culture au potager, sous climat tempéré français.
Réponds uniquement en appelant l'outil remplir_fiche. Sois concret et bref : ces valeurs vont dans les champs d'un formulaire, pas dans un article.
Si l'espèce ne se cultive pas au potager, renseigne quand même ses besoins réels.`

// Enrich fills the growing-advice fields from the species name.
//
// Deliberately not fed the photo: the species is already settled by then, and a
// second opinion from a text model could only contradict Pl@ntNet.
func (h *PlantEnrichHandler) Enrich(c *gin.Context) {
	var input enrichRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	species := strings.TrimSpace(input.LatinName)
	if species == "" {
		species = strings.TrimSpace(input.Name)
	}
	if species == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a plant name is required"})
		return
	}

	question := "Espèce : " + species
	// The common name disambiguates cultivars a Latin name flattens — a cherry
	// tomato and a beefsteak are both Solanum lycopersicum, spaced differently.
	if input.Name != "" && !strings.EqualFold(input.Name, species) {
		question += " (nom courant : " + strings.TrimSpace(input.Name) + ")"
	}

	response, err := h.provider.Chat(c.Request.Context(), []llm.Message{
		{Role: "system", Content: enrichSystemPrompt},
		{Role: "user", Content: question},
	}, []llm.Tool{enrichTool})
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "suggestion service unavailable"})
		return
	}

	if len(response.ToolCalls) == 0 {
		c.JSON(http.StatusBadGateway, gin.H{"error": "no suggestion returned"})
		return
	}

	var care PlantCare
	if err := json.Unmarshal([]byte(response.ToolCalls[0].Arguments), &care); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "unreadable suggestion"})
		return
	}

	c.JSON(http.StatusOK, care)
}
