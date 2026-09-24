package handler

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/service"
	"github.com/gin-gonic/gin"
)

// Meshy turns one photo into a textured mesh. Generation is asynchronous on
// their side — a task is created, then polled until it lands — so this handler
// has two halves: start, and check. The check is what stores the model when the
// task succeeds, so a browser tab closed mid-way loses nothing: the next check
// for that task still stores it.
const meshyEndpoint = "https://api.meshy.ai/openapi/v1/image-to-3d"

// meshyPolycount keeps the mesh light enough to stand a dozen times in a phone's
// walk: an image-to-3D default is several hundred thousand triangles.
const meshyPolycount = 15000

type PlantModelGenHandler struct {
	apiKey        string
	client        *http.Client
	gardenService *service.GardenService
}

func NewPlantModelGenHandler(apiKey string, gardenService *service.GardenService) *PlantModelGenHandler {
	return &PlantModelGenHandler{
		apiKey:        apiKey,
		gardenService: gardenService,
		// The generous timeout is for the model download at the end, which can
		// be a few megabytes from a CDN; the API calls themselves are quick.
		client: &http.Client{Timeout: 60 * time.Second},
	}
}

type meshyCreateResponse struct {
	Result string `json:"result"`
}

type meshyTaskResponse struct {
	Status    string `json:"status"`
	Progress  int    `json:"progress"`
	ModelURLs struct {
		GLB string `json:"glb"`
	} `json:"model_urls"`
	TaskError struct {
		Message string `json:"message"`
	} `json:"task_error"`
}

// meshyCall sends one authenticated request and decodes a JSON answer.
func (h *PlantModelGenHandler) meshyCall(method, url string, body any, out any) error {
	var payload io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return err
		}
		payload = bytes.NewReader(encoded)
	}
	request, err := http.NewRequest(method, url, payload)
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+h.apiKey)
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}

	response, err := h.client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("meshy answered %d: %s", response.StatusCode, bytes.TrimSpace(raw))
	}
	return json.Unmarshal(raw, out)
}

// Start creates the generation task from the plant's stored photo.
//
// POST /api/garden/plants/:id/model/generate → { "task_id": "..." }
func (h *PlantModelGenHandler) Start(c *gin.Context) {
	userID := c.GetString("userID")
	plantID := c.Param("id")

	photo, mime, err := h.gardenService.GetPlantPhoto(userID, plantID)
	if err != nil {
		respondGardenError(c, err, "failed to load photo")
		return
	}
	if mime == "" {
		mime = "image/jpeg"
	}

	// The photo travels inline: the API is the only thing that can read it, so
	// there is no public URL to hand over instead.
	body := map[string]any{
		"image_url":        "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(photo),
		"ai_model":         "latest",
		"should_texture":   true,
		"enable_pbr":       false,
		"should_remesh":    true,
		"target_polycount": meshyPolycount,
		"target_formats":   []string{"glb"},
	}

	var created meshyCreateResponse
	if err := h.meshyCall(http.MethodPost, meshyEndpoint, body, &created); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "la génération 3D n'a pas pu démarrer : " + err.Error()})
		return
	}
	if created.Result == "" {
		c.JSON(http.StatusBadGateway, gin.H{"error": "la génération 3D n'a pas renvoyé de tâche"})
		return
	}
	c.JSON(http.StatusAccepted, gin.H{"task_id": created.Result})
}

// Check reports where a task stands and, once it has succeeded, downloads the
// mesh and stores it as the plant's model in the same call.
//
// GET /api/garden/plants/:id/model/generate/:taskId
//
//	→ { "status": "pending" | "running" | "succeeded" | "failed", "progress": 0-100, "error"?: "..." }
func (h *PlantModelGenHandler) Check(c *gin.Context) {
	userID := c.GetString("userID")
	plantID := c.Param("id")
	taskID := c.Param("taskId")

	var task meshyTaskResponse
	if err := h.meshyCall(http.MethodGet, meshyEndpoint+"/"+taskID, nil, &task); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "impossible de suivre la génération : " + err.Error()})
		return
	}

	switch task.Status {
	case "SUCCEEDED":
		if task.ModelURLs.GLB == "" {
			c.JSON(http.StatusOK, gin.H{"status": "failed", "progress": 100, "error": "aucun fichier glb dans le résultat"})
			return
		}
		data, err := h.download(task.ModelURLs.GLB)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "le modèle généré n'a pas pu être téléchargé : " + err.Error()})
			return
		}
		if err := h.gardenService.SetPlantModel(userID, plantID, data); err != nil {
			respondGardenError(c, err, "failed to store 3D model")
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "succeeded", "progress": 100})
	case "FAILED", "CANCELED":
		message := task.TaskError.Message
		if message == "" {
			message = "la génération a échoué"
		}
		c.JSON(http.StatusOK, gin.H{"status": "failed", "progress": task.Progress, "error": message})
	case "IN_PROGRESS":
		c.JSON(http.StatusOK, gin.H{"status": "running", "progress": task.Progress})
	default:
		c.JSON(http.StatusOK, gin.H{"status": "pending", "progress": task.Progress})
	}
}

func (h *PlantModelGenHandler) download(url string) ([]byte, error) {
	response, err := h.client.Get(url)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status %d", response.StatusCode)
	}
	// One byte past the ceiling, so an oversized mesh fails on size in the
	// service rather than being silently cut.
	return io.ReadAll(io.LimitReader(response.Body, service.MaxModelBytes+1))
}
