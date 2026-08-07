package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/service"
	"github.com/gin-gonic/gin"
)

// plantNetEndpoint identifies against the whole Pl@ntNet flora rather than one
// regional project: a kitchen garden mixes natives with things from three
// continents, and a narrower project would simply miss half of them.
const plantNetEndpoint = "https://my-api.plantnet.org/v2/identify/all"

// How many candidates to show. Pl@ntNet's tail drops off fast; past the fifth
// the scores are noise and the list stops being a choice.
const plantNetResults = 5

type PlantNetHandler struct {
	apiKey string
	client *http.Client
}

func NewPlantNetHandler(apiKey string) *PlantNetHandler {
	return &PlantNetHandler{
		apiKey: apiKey,
		// Identification runs a vision model on their side; 10s is regularly
		// too tight, and the caller is a human watching a spinner.
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

// plantNetImages caps how many reference photos travel back per candidate.
// Enough to tell two lookalike species apart, few enough to stay a row.
const plantNetImages = 3

// plantNetResponse is the subset of the upstream payload we care about.
type plantNetResponse struct {
	Results []struct {
		Score   float64 `json:"score"`
		Species struct {
			ScientificNameWithoutAuthor string   `json:"scientificNameWithoutAuthor"`
			CommonNames                 []string `json:"commonNames"`
			Family                      struct {
				ScientificNameWithoutAuthor string `json:"scientificNameWithoutAuthor"`
			} `json:"family"`
		} `json:"species"`
		Images []struct {
			Organ    string `json:"organ"`
			Citation string `json:"citation"`
			URL      struct {
				S string `json:"s"`
				M string `json:"m"`
			} `json:"url"`
		} `json:"images"`
	} `json:"results"`
	Remaining int `json:"remainingIdentificationRequests"`
}

// PlantReferenceImage is one community photo of a candidate species. The
// citation is not decoration: these are CC-BY-SA, so crediting the author is a
// condition of showing them.
type PlantReferenceImage struct {
	Thumb    string `json:"thumb"`
	Full     string `json:"full"`
	Organ    string `json:"organ"`
	Citation string `json:"citation"`
}

// PlantCandidate is one suggestion, already flattened into the shape the plant
// form fills itself from.
type PlantCandidate struct {
	Score     float64               `json:"score"`
	Name      string                `json:"name"`
	LatinName string                `json:"latin_name"`
	Family    string                `json:"family"`
	Images    []PlantReferenceImage `json:"images"`
}

// Identify forwards a photo to Pl@ntNet and returns ranked candidates.
//
// The body is the raw image, matching how photos are already uploaded. Only
// JPEG and PNG go out: Pl@ntNet rejects anything else, and the browser side
// re-encodes to JPEG on a canvas before calling this.
func (h *PlantNetHandler) Identify(c *gin.Context) {
	body := http.MaxBytesReader(c.Writer, c.Request.Body, service.MaxPhotoBytes+1)
	data, err := io.ReadAll(body)
	if err != nil {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "photo exceeds the maximum size"})
		return
	}
	if len(data) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "empty photo"})
		return
	}

	mime := c.ContentType()
	if mime != "image/jpeg" && mime != "image/png" {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{
			"error": "identification accepts JPEG or PNG only",
		})
		return
	}

	form, contentType, err := plantNetForm(data, mime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build the request"})
		return
	}

	query := url.Values{}
	query.Set("api-key", h.apiKey)
	query.Set("lang", "fr")
	query.Set("nb-results", fmt.Sprint(plantNetResults))
	// Reference photos are what let the gardener confirm the species rather than
	// trust a percentage.
	query.Set("include-related-images", "true")

	request, err := http.NewRequestWithContext(
		c.Request.Context(), http.MethodPost, plantNetEndpoint+"?"+query.Encode(), form,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build the request"})
		return
	}
	request.Header.Set("Content-Type", contentType)

	response, err := h.client.Do(request)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "identification service unreachable"})
		return
	}
	defer response.Body.Close()

	switch {
	// 404 is Pl@ntNet's "nothing recognised", not a routing mistake.
	case response.StatusCode == http.StatusNotFound:
		c.JSON(http.StatusOK, gin.H{"candidates": []PlantCandidate{}})
		return
	case response.StatusCode == http.StatusTooManyRequests:
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "daily identification quota reached"})
		return
	case response.StatusCode != http.StatusOK:
		c.JSON(http.StatusBadGateway, gin.H{"error": "identification failed"})
		return
	}

	var payload plantNetResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "unreadable identification response"})
		return
	}

	candidates := make([]PlantCandidate, 0, len(payload.Results))
	for _, result := range payload.Results {
		name := result.Species.ScientificNameWithoutAuthor
		// The French common name is what goes in the `name` field; the Latin one
		// is already carried separately, so falling back to it keeps the form
		// filled rather than half-empty.
		if len(result.Species.CommonNames) > 0 && result.Species.CommonNames[0] != "" {
			name = result.Species.CommonNames[0]
		}
		images := make([]PlantReferenceImage, 0, plantNetImages)
		for _, image := range result.Images {
			if len(images) == plantNetImages {
				break
			}
			if image.URL.S == "" {
				continue
			}
			images = append(images, PlantReferenceImage{
				Thumb:    image.URL.S,
				Full:     image.URL.M,
				Organ:    image.Organ,
				Citation: image.Citation,
			})
		}

		candidates = append(candidates, PlantCandidate{
			Score:     result.Score,
			Name:      name,
			LatinName: result.Species.ScientificNameWithoutAuthor,
			Family:    result.Species.Family.ScientificNameWithoutAuthor,
			Images:    images,
		})
	}

	c.JSON(http.StatusOK, gin.H{"candidates": candidates, "remaining": payload.Remaining})
}

// plantNetForm wraps the image in the multipart body the upstream expects.
func plantNetForm(data []byte, mime string) (io.Reader, string, error) {
	var buffer bytes.Buffer
	writer := multipart.NewWriter(&buffer)

	filename := "plant.jpg"
	if mime == "image/png" {
		filename = "plant.png"
	}

	part, err := writer.CreateFormFile("images", filename)
	if err != nil {
		return nil, "", err
	}
	if _, err := part.Write(data); err != nil {
		return nil, "", err
	}
	// `auto` lets Pl@ntNet decide which organ it is looking at. Asking the
	// gardener to classify their own photo as leaf or flower would be a worse
	// trade than the accuracy it buys.
	if err := writer.WriteField("organs", "auto"); err != nil {
		return nil, "", err
	}
	if err := writer.Close(); err != nil {
		return nil, "", err
	}

	return &buffer, writer.FormDataContentType(), nil
}
