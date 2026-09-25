package handler

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/Vigooth/vigooth/services/api/internal/llm"
	"github.com/gin-gonic/gin"
)

// PlantCropHandler asks the vision model where the plant is in a photo, so the
// cropper can open with a box already drawn around it. The owner still decides:
// the box is a suggestion they adjust or accept, never applied on its own.
type PlantCropHandler struct {
	provider llm.Provider
}

func NewPlantCropHandler(provider llm.Provider) *PlantCropHandler {
	return &PlantCropHandler{provider: provider}
}

// maxCropPhotoBytes caps what the browser may send. The client downscales to
// ~1280 px first, so a real photo lands well under this.
const maxCropPhotoBytes = 3 << 20

// CropSuggestion is a rectangle in normalised 0..1 image coordinates.
type CropSuggestion struct {
	X0 float64 `json:"x0"`
	Y0 float64 `json:"y0"`
	X1 float64 `json:"x1"`
	Y1 float64 `json:"y1"`
}

var cropTool = llm.Tool{
	Name:        "proposer_cadre",
	Description: "Donne le rectangle qui encadre la plante principale de la photo.",
	Parameters: json.RawMessage(`{
		"type": "object",
		"properties": {
			"x0": {"type": "number", "description": "Bord gauche, fraction de la largeur de l'image entre 0 et 1."},
			"y0": {"type": "number", "description": "Bord haut, fraction de la hauteur entre 0 et 1."},
			"x1": {"type": "number", "description": "Bord droit, fraction de la largeur entre 0 et 1, supérieur à x0."},
			"y1": {"type": "number", "description": "Bord bas, fraction de la hauteur entre 0 et 1, supérieur à y0."}
		},
		"required": ["x0", "y0", "x1", "y1"]
	}`),
}

const cropSystemPrompt = `Tu aides à recadrer des photos de plantes avant de les transformer en modèle 3D.
On te donne une photo. Trouve la plante principale — arbre, arbuste, fleur, légume — celle qui occupe le sujet de l'image.
Réponds uniquement en appelant l'outil proposer_cadre avec un rectangle serré autour de cette plante entière, du pied au sommet, avec une petite marge de 2 à 4 % de chaque côté.
Exclus le décor : clôtures, murs, maisons, autres plantes en arrière-plan, personnes. Si la plante touche un bord de l'image, le rectangle touche ce bord.
Les coordonnées sont des fractions de l'image, 0 en haut à gauche, 1 en bas à droite.`

// Suggest takes raw image bytes with the type in Content-Type, like the
// identification endpoint, and answers with a normalised rectangle.
//
// POST /api/garden/plants/crop-suggest → { "x0", "y0", "x1", "y1" }
func (h *PlantCropHandler) Suggest(c *gin.Context) {
	body := http.MaxBytesReader(c.Writer, c.Request.Body, maxCropPhotoBytes+1)
	data, err := io.ReadAll(body)
	if err != nil {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "photo trop lourde pour la suggestion"})
		return
	}
	mime := c.ContentType()
	if mime != "image/jpeg" && mime != "image/png" && mime != "image/webp" {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": "la photo doit être un JPEG, PNG ou WebP"})
		return
	}

	response, err := h.provider.Chat(c.Request.Context(), []llm.Message{
		{Role: "system", Content: cropSystemPrompt},
		{
			Role:    "user",
			Content: "Où est la plante principale sur cette photo ?",
			Images:  []llm.Image{{MimeType: mime, Data: data}},
		},
	}, []llm.Tool{cropTool})
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "suggestion indisponible"})
		return
	}
	if len(response.ToolCalls) == 0 {
		c.JSON(http.StatusBadGateway, gin.H{"error": "aucun cadre proposé"})
		return
	}

	var box CropSuggestion
	if err := json.Unmarshal([]byte(response.ToolCalls[0].Arguments), &box); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "cadre illisible"})
		return
	}
	box = clampBox(box)
	if box.X1-box.X0 < 0.05 || box.Y1-box.Y0 < 0.05 {
		c.JSON(http.StatusBadGateway, gin.H{"error": "cadre proposé trop petit"})
		return
	}
	c.JSON(http.StatusOK, box)
}

// clampBox folds a model answer into the unit square with corners in order;
// a model that slips to 1.02 or swaps two edges should not cost the owner the
// suggestion.
func clampBox(box CropSuggestion) CropSuggestion {
	clamp := func(v float64) float64 {
		if v < 0 {
			return 0
		}
		if v > 1 {
			return 1
		}
		return v
	}
	x0, x1 := clamp(box.X0), clamp(box.X1)
	y0, y1 := clamp(box.Y0), clamp(box.Y1)
	if x1 < x0 {
		x0, x1 = x1, x0
	}
	if y1 < y0 {
		y0, y1 = y1, y0
	}
	return CropSuggestion{X0: x0, Y0: y0, X1: x1, Y1: y1}
}
